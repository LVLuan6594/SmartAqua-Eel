/**
 * SmartAqua GIS V3 – Dựng các layer THỰC từ dữ liệu OpenStreetMap đã tải thủ công:
 *   1) Lớp vùng nước (natural=water, không phải ao nuôi)  -> verified-water.geojson
 *   2) Lớp cơ sở nuôi trồng thuỷ sản đã xác minh (tag aquaculture=*)
 *      -> verified-aquaculture.geojson
 *
 * Mỗi đối tượng được:
 *   - Lọc theo tâm nằm TRONG ranh giới TP. Cần Thơ (city-boundary.geojson).
 *   - Gán communeCode / communeName theo ranh giới xã/phường THỰC (103 đơn vị).
 * Không phát sinh hình học giả. Nếu không có dữ liệu -> file rỗng (hiển thị
 * "chưa có dữ liệu không gian xác minh" ở UI).
 *
 * Nguồn: OpenStreetMap contributors, ODbL 1.0 – tải qua Overpass API.
 * Chạy: node scripts/build-gis-layers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RAW_FILE = path.join(__dirname, 'gis-sources', 'osm-can-tho-water-aquaculture.json');
const BOUNDARY_DIR = path.join(ROOT, 'public', 'geojson', 'can-tho');
const OUT_DIR = path.join(ROOT, 'public', 'geojson', 'aquaculture');

const SOURCE = {
  provider: 'OpenStreetMap contributors',
  url: 'https://www.openstreetmap.org',
  license: 'ODbL 1.0',
  licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
  retrieval: 'Overpass API (one-time controlled import)',
  retrievedAt: new Date().toISOString().slice(0, 10),
  crs: 'EPSG:4326 (WGS84)',
  attribution: '© OpenStreetMap contributors (ODbL)',
  verified: true,
};

function round(coords, dec = 6) {
  const f = 10 ** dec;
  if (typeof coords[0] === 'number') return [Math.round(coords[0] * f) / f, Math.round(coords[1] * f) / f];
  return coords.map((c) => round(c, dec));
}

function geoBbox(geom) {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]);
      minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]);
    } else c.forEach(walk);
  };
  walk(geom.coordinates);
  return [minX, minY, maxX, maxY];
}

function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = (yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(pt, poly) {
  if (!pointInRing(pt, poly[0])) return false;
  for (let k = 1; k < poly.length; k++) if (pointInRing(pt, poly[k])) return false;
  return true;
}

function pointInGeometry(pt, geom) {
  if (geom.type === 'Polygon') return pointInPolygon(pt, geom.coordinates);
  if (geom.type === 'MultiPolygon') return geom.coordinates.some((poly) => pointInPolygon(pt, poly));
  return false;
}

function centroidOf(geom) {
  let sx = 0, sy = 0, n = 0;
  const walk = (c) => {
    if (typeof c[0] === 'number') { sx += c[0]; sy += c[1]; n++; } else c.forEach(walk);
  };
  walk(geom.coordinates);
  return n ? [sx / n, sy / n] : [0, 0];
}

function wayToRing(geometry) {
  if (!geometry || geometry.length < 4) return null;
  const f = geometry[0], l = geometry[geometry.length - 1];
  if (f.lat !== l.lat || f.lon !== l.lon) return null;
  return geometry.map((p) => [p.lon, p.lat]);
}

function elementGeometry(el) {
  if (el.type === 'way') {
    const ring = wayToRing(el.geometry);
    return ring ? { type: 'Polygon', coordinates: [ring] } : null;
  }
  if (el.type === 'relation' && el.tags && /multipolygon/.test(el.tags.type || '')) {
    const polys = [];
    for (const m of el.members || []) {
      if (m.role === 'outer' && m.type === 'way' && m.geometry) {
        const ring = wayToRing(m.geometry);
        if (ring) polys.push([ring]);
      }
    }
    if (!polys.length) return null;
    return polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys };
  }
  return null;
}

function isAquaculture(tags) {
  return !!tags.aquaculture || tags.landuse === 'aquaculture';
}

function featureProps(el, tags, tagsSubset) {
  return {
    osmType: el.type,
    osmId: el.id,
    osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    name: tags.name || '',
    ...tagsSubset,
    source: SOURCE.provider,
    license: SOURCE.license,
  };
}

function main() {
  if (!fs.existsSync(RAW_FILE)) throw new Error('Thiếu file nguồn: ' + RAW_FILE);
  const raw = JSON.parse(fs.readFileSync(RAW_FILE, 'utf8'));
  const city = JSON.parse(fs.readFileSync(path.join(BOUNDARY_DIR, 'city-boundary.geojson'), 'utf8'));
  const cityGeom = city.features[0].geometry;
  const communes = JSON.parse(fs.readFileSync(path.join(BOUNDARY_DIR, 'communes-103.geojson'), 'utf8'));

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const communeIdx = communes.features.map((f) => ({ code: f.properties.code, name: f.properties.name, fullName: f.properties.fullName, geom: f.geometry }));

  const aqua = [];
  const water = [];
  let skippedOpen = 0;
  let skippedOutside = 0;

  for (const el of raw.elements) {
    const tags = el.tags || {};
    const geom = elementGeometry(el);
    if (!geom) { skippedOpen++; continue; }
    const c = centroidOf(geom);
    if (!pointInGeometry(c, cityGeom)) { skippedOutside++; continue; }

    const rounded = { ...geom, coordinates: round(geom.coordinates) };
    const owner = communeIdx.find((cm) => pointInGeometry(c, cm.geom));
    const base = {
      communeCode: owner ? owner.code : null,
      communeName: owner ? owner.fullName : null,
      centroid: [Math.round(c[0] * 1e6) / 1e6, Math.round(c[1] * 1e6) / 1e6],
    };

    if (isAquaculture(tags)) {
      aqua.push({
        type: 'Feature',
        id: `${el.type}/${el.id}`,
        bbox: geoBbox(rounded),
        properties: {
          ...featureProps(el, tags, {
            aquaculture: tags.aquaculture || (tags.landuse === 'aquaculture' ? 'unspecified' : ''),
            produce: tags.produce || '',
            water: tags.water || '',
            landuse: tags.landuse || '',
          }),
          ...base,
        },
        geometry: rounded,
      });
    } else if (tags.natural === 'water') {
      water.push({
        type: 'Feature',
        id: `${el.type}/${el.id}`,
        bbox: geoBbox(rounded),
        properties: {
          ...featureProps(el, tags, { water: tags.water || '', natural: 'water', intermittent: tags.intermittent || '' }),
          ...base,
        },
        geometry: rounded,
      });
    }
  }

  const aquaOut = { type: 'FeatureCollection', name: 'can-tho-verified-aquaculture', features: aqua };
  const waterOut = { type: 'FeatureCollection', name: 'can-tho-verified-water', features: water };
  fs.writeFileSync(path.join(OUT_DIR, 'verified-aquaculture.geojson'), JSON.stringify(aquaOut));
  fs.writeFileSync(path.join(OUT_DIR, 'verified-water.geojson'), JSON.stringify(waterOut));

  const byCommune = {};
  for (const f of aqua) byCommune[f.properties.communeName || 'không xác định'] = (byCommune[f.properties.communeName || 'không xác định'] || 0) + 1;

  const manifestPath = path.join(BOUNDARY_DIR, 'gis-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.layers['aquaculture/verified-water.geojson'] = { ...SOURCE, description: 'Vùng nước tự nhiên (natural=water) trong TP. Cần Thơ', count: water.length };
  manifest.layers['aquaculture/verified-aquaculture.geojson'] = { ...SOURCE, description: 'Cơ sở nuôi trồng thuỷ sản đã xác minh (tag aquaculture=*)', count: aqua.length };
  manifest.verifiedAquacultureByCommune = byCommune;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Aquaculture: ${aqua.length} | Water: ${water.length} | bỏ (không khép kín): ${skippedOpen} | bỏ (ngoài TP): ${skippedOutside}`);
  console.log('Phân bố aquaculture theo xã/phường:', JSON.stringify(byCommune));
  const vc = aqua.filter((f) => f.properties.communeCode === '31783');
  console.log('Vĩnh Châu aquaculture:', vc.length);
}

try { main(); } catch (e) { console.error('LỖI:', e.message); process.exit(1); }
