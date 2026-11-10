/**
 * SmartAqua GIS V4 – Dựng lớp VÙNG NUÔI THUỶ SẢN + quan hệ vùng × xã/phường.
 *
 * Việc script làm (chạy lại được, idempotent):
 *   1) verified-zones.geojson  – vùng nuôi SUY RA từ cụm ao OSM (geometryStatus=derived).
 *   2) verified-ponds.geojson  – bản sao có tên chuẩn của ao OSM (verified-aquaculture).
 *   3) verified-facilities.geojson – cơ sở hạ tầng có vị trí xác minh (hiện trống).
 *   4) demo-zones.geojson      – MỘT vùng demo gắn nhãn "mô phỏng" nằm trong Vĩnh Châu,
 *                                dạng MultiPolygon trải trên 2 xã/phường (kịch bản 2).
 *   5) zone-commune-links.json – quan hệ nhiều–nhiều vùng × xã/phường (diện tích giao).
 *   6) Cập nhật gis-manifest.json (nguồn, giấy phép, số lượng, mức xác minh).
 *   7) Cập nhật src/data/data.json: bảng `aquacultureZones`, `zoneCommuneLinks`
 *      và cụm dữ liệu nghiệp vụ MÔ PHỎNG cho vùng Vĩnh Châu (A11, F031.., P061.., vụ, nhật ký).
 *
 * Nguyên tắc: KHÔNG bịa ranh giới cho khu vực thiếu dữ liệu. Vùng không có polygon
 * được ghi vào bảng đăng ký (geometryStatus=unavailable) và không vẽ trên bản đồ.
 *
 * Chạy: node scripts/build-aquaculture-zones.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import polygonClipping from 'polygon-clipping';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CANTHO_DIR = path.join(ROOT, 'public', 'geojson', 'can-tho');
const OUT_DIR = path.join(ROOT, 'public', 'geojson', 'aquaculture');
const DATA_FILE = path.join(ROOT, 'src', 'data', 'data.json');

const TODAY = '2026-10-15';

const OSM_LICENSE = {
  provider: 'OpenStreetMap contributors',
  url: 'https://www.openstreetmap.org',
  license: 'ODbL 1.0',
  licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
  retrieval: 'Overpass API (one-time controlled import)',
  retrievedAt: TODAY,
  crs: 'EPSG:4326 (WGS84)',
  attribution: '© OpenStreetMap contributors (ODbL)',
};
const DEMO_LICENSE = {
  provider: 'SmartAqua (dữ liệu mô phỏng nội bộ)',
  url: 'https://localhost/smartaqua',
  license: 'Nội bộ – không phải dữ liệu thực, không phân phối lại như dữ liệu xác minh',
  retrievedAt: TODAY,
  crs: 'EPSG:4326 (WGS84)',
  attribution: 'DỮ LIỆU MÔ PHỎNG – SmartAqua demo',
  verified: false,
};

// ---------- tiện ích hình học ----------
const round = (c, d = 6) => (typeof c[0] === 'number' ? [+c[0].toFixed(d), +c[1].toFixed(d)] : c.map((x) => round(x, d)));
function bboxOf(geom) {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  const walk = (c) => {
    if (typeof c[0] === 'number') { minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]); minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]); }
    else c.forEach(walk);
  };
  walk(geom.coordinates);
  return [minX, minY, maxX, maxY];
}
function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function pointInPolygon(pt, poly) {
  if (!pointInRing(pt, poly[0])) return false;
  for (let k = 1; k < poly.length; k++) if (pointInRing(pt, poly[k])) return false;
  return true;
}
function pointInGeometry(pt, geom) {
  if (!geom) return false;
  if (geom.type === 'Polygon') return pointInPolygon(pt, geom.coordinates);
  if (geom.type === 'MultiPolygon') return geom.coordinates.some((p) => pointInPolygon(pt, p));
  return false;
}
function centroidOf(geom) {
  let sx = 0, sy = 0, n = 0;
  const walk = (c) => { if (typeof c[0] === 'number') { sx += c[0]; sy += c[1]; n++; } else c.forEach(walk); };
  walk(geom.coordinates);
  return n ? [sx / n, sy / n] : [0, 0];
}
function ringArea(ring) {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return s / 2;
}
/** diện tích km2, dùng công thức vĩ độ trung bình (đồng bộ với services/spatial.ts) */
function polygonAreaKm2(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  const meanLat = centroidOf(geom)[1];
  const mPerDegLat = 111132.92 - 559.82 * Math.cos((2 * meanLat * Math.PI) / 180);
  const mPerDegLng = 111412.84 * Math.cos((meanLat * Math.PI) / 180) - 93.5 * Math.cos((3 * meanLat * Math.PI) / 180);
  let total = 0;
  for (const poly of polys) for (let r = 0; r < poly.length; r++) {
    const a = Math.abs(ringArea(poly[r])) * mPerDegLat * mPerDegLng;
    total += r === 0 ? a : -a;
  }
  return total / 1e6;
}
function haversineKm(a, b) {
  const R = 6371, t = (x) => (x * Math.PI) / 180;
  const dLat = t(b[0] - a[0]), dLng = t(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(a[0])) * Math.cos(t(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function toMulti(geom) {
  if (geom.type === 'Polygon') return [geom.coordinates];
  if (geom.type === 'MultiPolygon') return geom.coordinates;
  return [];
}
function intersectAreaKm2(a, b) {
  try {
    const r = polygonClipping.intersection(toMulti(a), toMulti(b));
    if (!r || !r.length) return 0;
    return polygonAreaKm2({ type: 'MultiPolygon', coordinates: r });
  } catch { return 0; }
}
function convexHull(points) {
  const pts = points.map((p) => [p[0], p[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const uniq = pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
  if (uniq.length < 3) return null;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of uniq) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  const upper = [];
  for (let i = uniq.length - 1; i >= 0; i--) { const p = uniq[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  if (hull.length < 3) return null;
  hull.push([hull[0][0], hull[0][1]]);
  return hull;
}

// ---------- nạp dữ liệu ----------
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const communes = readJson(path.join(CANTHO_DIR, 'communes-103.geojson'));
const communeIdx = communes.features.map((f) => ({ code: f.properties.code, name: f.properties.name, fullName: f.properties.fullName, slug: f.properties.slug, geometry: f.geometry, bbox: bboxOf(f.geometry) }));
const ponds = readJson(path.join(OUT_DIR, 'verified-aquaculture.geojson'));
const demoFeatures = readJson(path.join(ROOT, 'public', 'geojson', 'demo-features.geojson'));

const bboxOverlap = (a, b) => !(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1]);
function linksFor(geom, minKm2 = 0.005) {
  const zb = bboxOf(geom);
  const raw = [];
  let total = 0;
  for (const c of communeIdx) {
    if (!bboxOverlap(zb, c.bbox)) continue;
    const a = intersectAreaKm2(geom, c.geometry);
    if (a <= 0) continue;
    total += a;
    raw.push({ code: c.code, name: c.fullName, areaKm2: a });
  }
  return raw
    .map((r) => ({ communeCode: r.code, communeName: r.name, intersectionAreaKm2: +r.areaKm2.toFixed(6), shareOfZone: total > 0 ? +(r.areaKm2 / total).toFixed(4) : 0 }))
    .filter((r) => r.intersectionAreaKm2 >= minKm2)
    .sort((a, b) => b.intersectionAreaKm2 - a.intersectionAreaKm2);
}

// ---------- 1. vùng nuôi suy ra từ cụm ao OSM ----------
function deriveOsmZones(list) {
  const THRESH = 1.6; // km
  const MIN_PONDS = 3;
  const clusters = [];
  for (const p of list) {
    const c = p.properties.centroid;
    let target = null;
    for (const cl of clusters) if (cl.some((q) => haversineKm(c, q.properties.centroid) <= THRESH)) { target = cl; break; }
    if (target) target.push(p); else clusters.push([p]);
  }
  const zones = [];
  let n = 0;
  for (const cl of clusters) {
    if (cl.length < MIN_PONDS) continue;
    const verts = [];
    for (const p of cl) {
      const walk = (c) => { if (typeof c[0] === 'number') verts.push([+c[0].toFixed(6), +c[1].toFixed(6)]); else c.forEach(walk); };
      walk(p.geometry.coordinates);
    }
    const hull = convexHull(verts);
    if (!hull) continue;
    const geometry = { type: 'Polygon', coordinates: [round(hull)] };
    const areaHa = +cl.reduce((s, p) => s + polygonAreaKm2(p.geometry) * 100, 0).toFixed(2);
    const byCommune = {};
    for (const p of cl) byCommune[p.properties.communeName || 'Không xác định'] = (byCommune[p.properties.communeName || 'Không xác định'] || 0) + 1;
    const dominant = Object.entries(byCommune).sort((a, b) => b[1] - a[1])[0][0];
    const species = [...new Set(cl.map((p) => p.properties.aquaculture).filter(Boolean))];
    n += 1;
    zones.push({
      zoneId: `Z-OSM-${String(n).padStart(2, '0')}`,
      code: `VNU-OSM-${String(n).padStart(2, '0')}`,
      name: `Vùng nuôi suy ra – ${dominant}`,
      aquacultureType: species.length === 1 ? `Nuôi ${species[0]}` : 'Nuôi trồng (nhiều loài)',
      species,
      geometryStatus: 'derived',
      derivedFrom: 'Cụm ao nuôi OSM (landuse/aquaculture)',
      totalAreaHa: areaHa,
      pondCount: cl.length,
      geometry,
    });
  }
  return zones;
}

const osmZones = deriveOsmZones(ponds.features);

// ---------- 2. vùng demo Vĩnh Châu (MultiPolygon, mô phỏng) ----------
function rectAround(lat, lng, dLat, dLng) {
  return [[lng - dLng, lat - dLat], [lng + dLng, lat - dLat], [lng + dLng, lat + dLat], [lng - dLng, lat + dLat], [lng - dLng, lat - dLat]];
}
const DEMO_VC_ZONE = {
  zoneId: 'ZV01',
  code: 'VNU-MP-VC01',
  name: 'Vùng nuôi tôm Vĩnh Châu (mô phỏng)',
  aquacultureType: 'Nuôi tôm nước lợ (siêu thâm canh) – MÔ PHỎNG',
  species: ['shrimp'],
  geometryStatus: 'synthetic',
  dataStatus: 'mock',
  geometry: {
    type: 'MultiPolygon',
    coordinates: [
      [rectAround(9.3605, 106.0410, 0.011, 0.013)],
      [rectAround(9.3950, 106.0560, 0.007, 0.009)],
    ],
  },
};

// ---------- 3. quan hệ vùng × xã/phường ----------
const zoneCommuneLinks = [];
const zonesOut = [];

for (const z of osmZones) {
  const links = linksFor(z.geometry);
  zoneCommuneLinks.push(...links.map((l) => ({ zoneId: z.zoneId, ...l })));
  zonesOut.push({
    type: 'Feature',
    id: z.zoneId,
    bbox: bboxOf(z.geometry),
    properties: {
      zoneId: z.zoneId,
      code: z.code,
      name: z.name,
      aquacultureType: z.aquacultureType,
      species: z.species,
      geometryStatus: z.geometryStatus,
      dataStatus: 'verified',
      totalAreaHa: z.totalAreaHa,
      pondCount: z.pondCount,
      communeCodes: links.map((l) => l.communeCode),
      geometrySourceId: null,
      updatedAt: TODAY,
    },
    geometry: z.geometry,
  });
}

const demoLinks = linksFor(DEMO_VC_ZONE.geometry);
zoneCommuneLinks.push(...demoLinks.map((l) => ({ zoneId: DEMO_VC_ZONE.zoneId, ...l })));

// vùng mock ZM01..ZM10 dùng lại polygon vùng demo hiện có (demo-features.geojson)
const demoAreaFeatures = demoFeatures.features.filter((f) => f.properties.entityType === 'area');
const mockAreaLinks = [];
for (const f of demoAreaFeatures) {
  const links = linksFor(f.geometry);
  const zoneId = `ZM${f.properties.entityId.slice(1)}`;
  mockAreaLinks.push({ zoneId, links, entityId: f.properties.entityId });
  zoneCommuneLinks.push(...links.map((l) => ({ zoneId, ...l })));
}

// ---------- 4. ghi geojson ----------
fs.mkdirSync(OUT_DIR, { recursive: true });
const write = (name, obj) => fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(obj));

write('verified-zones.geojson', { type: 'FeatureCollection', name: 'can-tho-verified-aquaculture-zones', features: zonesOut });
write('verified-ponds.geojson', { ...ponds, name: 'can-tho-verified-ponds' });
write('verified-facilities.geojson', { type: 'FeatureCollection', name: 'can-tho-verified-facilities', features: [] });
write('demo-zones.geojson', {
  type: 'FeatureCollection',
  name: 'smartaqua-demo-zones',
  features: [
    {
      type: 'Feature',
      id: DEMO_VC_ZONE.zoneId,
      bbox: bboxOf(DEMO_VC_ZONE.geometry),
      properties: {
        zoneId: DEMO_VC_ZONE.zoneId,
        code: DEMO_VC_ZONE.code,
        name: DEMO_VC_ZONE.name,
        aquacultureType: DEMO_VC_ZONE.aquacultureType,
        species: DEMO_VC_ZONE.species,
        geometryStatus: DEMO_VC_ZONE.geometryStatus,
        dataStatus: 'mock',
        totalAreaHa: +polygonAreaKm2(DEMO_VC_ZONE.geometry).toFixed(2) * 100,
        communeCodes: demoLinks.map((l) => l.communeCode),
        geometrySourceId: null,
        updatedAt: TODAY,
      },
      geometry: DEMO_VC_ZONE.geometry,
    },
  ],
});

// ---------- 5. bảng đăng ký Loại 2 (có hoạt động, chưa có ranh giới) ----------
const REGISTRY = [
  { key: 'Vĩnh Châu', kind: 'Tôm nước lợ', evidence: 'Đề án Phát triển nuôi tôm nước lợ tỉnh Sóc Trăng 2023–2025 (NQ 55/NQ-HĐND); hệ thống thuỷ lợi ~2.100 ha phục vụ nuôi trồng.', url: 'https://thuvienphapluat.vn/van-ban/Linh-vuc-khac/Nghi-quyet-55-NQ-HDND-2023-De-an-Phat-trien-nuoi-tom-nuoc-lo-Soc-Trang-giai-doan-2023-2025-582172.aspx' },
  { key: 'Trần Đề', kind: 'Tôm nước lợ', evidence: 'Nằm trong 05 huyện/thị xã nuôi tôm trọng điểm (NQ 55/NQ-HĐND 2023).', url: 'https://vietnamnews.vn/economy/1662201/soc-trang-boosts-brackish-water-shrimp-farming-to-enhance-export-value.html' },
  { key: 'Mỹ Xuyên', kind: 'Tôm nước lợ', evidence: 'Nằm trong 05 huyện/thị xã nuôi tôm trọng điểm (NQ 55/NQ-HĐND 2023).', url: 'https://vietnamnews.vn/economy/1662201/soc-trang-boosts-brackish-water-shrimp-farming-to-enhance-export-value.html' },
  { key: 'Cù Lao Dung', kind: 'Tôm nước lợ', evidence: 'Nằm trong 05 huyện/thị xã nuôi tôm trọng điểm (NQ 55/NQ-HĐND 2023).', url: 'https://vietnamnews.vn/economy/1662201/soc-trang-boosts-brackish-water-shrimp-farming-to-enhance-export-value.html' },
  { key: 'Long Phú', kind: 'Tôm nước lợ', evidence: 'Nằm trong 05 huyện/thị xã nuôi tôm trọng điểm (NQ 55/NQ-HĐND 2023).', url: 'https://vietnamnews.vn/economy/1662201/soc-trang-boosts-brackish-water-shrimp-farming-to-enhance-export-value.html' },
  { key: 'Ngã Năm', kind: 'Thuỷ sản nước ngọt', evidence: 'Khu vực nuôi thuỷ sản nước ngọt (định hướng khảo sát); chưa tìm được lớp polygon công khai.', url: '' },
  { key: 'Kế Sách', kind: 'Thuỷ sản nước ngọt', evidence: 'Khu vực nuôi thuỷ sản nước ngọt (định hướng khảo sát); chưa tìm được lớp polygon công khai.', url: '' },
  { key: 'Mỹ Tú', kind: 'Thuỷ sản nước ngọt', evidence: 'Khu vực nuôi thuỷ sản nước ngọt (định hướng khảo sát); chưa tìm được lớp polygon công khai.', url: '' },
  { key: 'Thạnh Trị', kind: 'Thuỷ sản nước ngọt', evidence: 'Khu vực nuôi thuỷ sản nước ngọt (định hướng khảo sát); chưa tìm được lớp polygon công khai.', url: '' },
  { key: 'Sóc Trăng', kind: 'Tôm nước lợ', evidence: 'Trung tâm hành chính – dịch vụ ngành hàng tôm; chưa có lớp polygon công khai.', url: '' },
];
const registryZones = REGISTRY.map((r, i) => {
  const matches = communeIdx.filter((c) => c.name.includes(r.key) || c.fullName.includes(r.key));
  return {
    zoneId: `Z-SCT-${String(i + 1).padStart(2, '0')}`,
    code: `VNU-SCT-${String(i + 1).padStart(2, '0')}`,
    name: `Khu vực nuôi trồng ${r.key} (chưa có ranh giới xác minh)`,
    aquacultureType: r.kind,
    species: r.kind.includes('nước lợ') ? ['shrimp'] : [],
    geometryStatus: 'unavailable',
    dataStatus: 'partial',
    totalAreaHa: null,
    communeCodes: matches.map((c) => c.code),
    geometrySourceId: null,
    evidence: r.evidence,
    sourceUrl: r.url,
    updatedAt: TODAY,
  };
});

// ---------- 6. ghi bảng liên kết ----------
write('zone-commune-links.json', {
  generatedAt: TODAY,
  method: 'polygon-clipping intersection + diện tích vĩ độ trung bình; ngưỡng 0.5 ha',
  links: zoneCommuneLinks,
});

// ---------- 7. cập nhật manifest ----------
const manifestPath = path.join(CANTHO_DIR, 'gis-manifest.json');
const manifest = readJson(manifestPath);
manifest.layers['aquaculture/verified-zones.geojson'] = {
  ...OSM_LICENSE,
  verified: true,
  description: 'Ranh giới vùng nuôi SUY RA từ cụm ao nuôi OSM (không phải ranh giới quy hoạch)',
  count: zonesOut.length,
  derivation: 'Convex hull của các ao OSM lân cận; chỉ mang tính tham chiếu.',
};
manifest.layers['aquaculture/verified-ponds.geojson'] = { ...OSM_LICENSE, verified: true, description: 'Ao/cơ sở nuôi trồng xác minh từ OSM (landuse=aquaculture / aquaculture=*)', count: ponds.features.length };
manifest.layers['aquaculture/verified-facilities.geojson'] = { ...OSM_LICENSE, verified: true, description: 'Cơ sở hạ tầng thuỷ sản có vị trí xác minh (trại giống, cơ sở cung ứng)', count: 0 };
manifest.layers['aquaculture/zone-commune-links.json'] = { ...OSM_LICENSE, verified: true, description: 'Quan hệ nhiều–nhiều vùng nuôi × xã/phường (diện tích phần giao)', count: zoneCommuneLinks.length };
manifest.layers['aquaculture/demo-zones.geojson'] = { ...DEMO_LICENSE, description: 'VÙNG NUÔI MÔ PHỎNG phục vụ trình diễn – không phải dữ liệu thực', count: 1 };
manifest.zoneSummary = {
  derivedZones: zonesOut.length,
  derivedPonds: ponds.features.length,
  registryZones: registryZones.length,
  mockZones: 1 + mockAreaLinks.length,
  multiCommuneZones: [...new Set(zoneCommuneLinks.map((l) => l.zoneId))].filter((id) => zoneCommuneLinks.filter((l) => l.zoneId === id).length > 1).length,
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

// ---------- 8. cập nhật data.json (vùng, liên kết, và cụm mock Vĩnh Châu) ----------
const db = readJson(DATA_FILE);
const GEN = {
  units: ['U4'], coops: ['HTX07'], areas: ['A11'],
  farmers: ['F031', 'F032', 'F033'], ponds: ['P061', 'P062', 'P063', 'P064', 'P065', 'P066', 'P067'],
  seedBatches: [], cycles: [], stocking: [], feed: [], med: [], env: [], growth: [], health: [], harvests: [],
};
for (let i = 81; i <= 87; i++) {
  GEN.seedBatches.push(`B0${i}`); GEN.cycles.push(`C0${i}`); GEN.stocking.push(`ST0${i}`);
}
GEN.med = ['ME081', 'ME082', 'ME083'];
GEN.health = ['H081', 'H082'];
GEN.harvests = ['HR081', 'HR082', 'HR083', 'HR084'];
const isGen = (id) => Object.values(GEN).flat().includes(id) || /^FE08[1-7]-\d+$/.test(id) || /^E08[1-7]-\d+$/.test(id) || /^G08[1-7]-\d+$/.test(id);
const prune = (name) => { if (Array.isArray(db[name])) db[name] = db[name].filter((r) => !isGen(r.id)); };

['administrativeUnits', 'cooperatives', 'aquacultureAreas', 'farmers', 'ponds', 'seedBatches', 'farmingCycles', 'stockingEvents', 'feedDiaries', 'medicationDiaries', 'environmentObservations', 'growthObservations', 'healthEvents', 'harvests'].forEach(prune);

let seed = 20261015;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const round2 = (x) => Math.round(x * 100) / 100;

db.administrativeUnits.push({ id: 'U4', code: 'MP-VC', name: 'Địa bàn mô phỏng Vĩnh Châu' });
db.cooperatives.push({ id: 'HTX07', code: 'HTX-VC', name: 'HTX thuỷ sản mô phỏng Vĩnh Châu', unitId: 'U4', contact: 'Liên hệ mẫu (không có dữ liệu cá nhân)', status: 'active' });
db.aquacultureAreas.push({ id: 'A11', code: 'VNU-VC01', name: 'Vùng nuôi tôm Vĩnh Châu (mô phỏng)', coopId: 'HTX07', unitId: 'U4', areaHa: 128.4, lat: 9.3605, lng: 106.041, status: 'active', zoneId: 'ZV01', note: 'DỮ LIỆU NGHIỆP VỤ MÔ PHỎNG' });

db.farmers.push(
  { id: 'F031', code: 'HO-VC-001', name: 'Hộ nuôi Vĩnh Châu 001 (mô phỏng)', areaId: 'A11', coopId: 'HTX07', unitId: 'U4', phone: '', status: 'active', zoneId: 'ZV01' },
  { id: 'F032', code: 'HO-VC-002', name: 'Hộ nuôi Vĩnh Châu 002 (mô phỏng)', areaId: 'A11', coopId: 'HTX07', unitId: 'U4', phone: '', status: 'active', zoneId: 'ZV01' },
  { id: 'F033', code: 'HO-VC-003', name: 'Hộ nuôi Vĩnh Châu 003 (mô phỏng)', areaId: 'A11', coopId: 'HTX07', unitId: 'U4', phone: '', status: 'active', zoneId: 'ZV01' },
);

const pondSpec = [
  ['P061', 'F031', 1.6, 9.3565, 106.0362], ['P062', 'F031', 1.35, 9.3601, 106.0440], ['P063', 'F031', 1.82, 9.3648, 106.0388],
  ['P064', 'F032', 1.44, 9.3592, 106.0472], ['P065', 'F032', 1.95, 9.3632, 106.0496],
  ['P066', 'F033', 1.28, 9.3941, 106.0524], ['P067', 'F033', 1.72, 9.3962, 106.0596],
];
pondSpec.forEach(([id, farmerId, areaHa, lat, lng], i) => {
  db.ponds.push({ id, code: `AO-VC-${String(i + 1).padStart(3, '0')}`, name: `Ao Vĩnh Châu ${String(i + 1).padStart(2, '0')} (mô phỏng)`, areaId: 'A11', farmerId, areaHa, lat, lng, status: 'active', zoneId: 'ZV01' });
});

const cycleSpec = [
  ['C081', 'P061', 'SP1', 'active', '2026-07-28', 105], ['C082', 'P062', 'SP1', 'active', '2026-08-02', 105],
  ['C083', 'P063', 'SP1', 'harvesting', '2026-07-15', 105], ['C084', 'P064', 'SP2', 'active', '2026-08-10', 125],
  ['C085', 'P065', 'SP1', 'active', '2026-08-18', 105], ['C086', 'P066', 'SP1', 'completed', '2026-05-06', 105],
  ['C087', 'P067', 'SP2', 'active', '2026-08-25', 125],
];
const addDays = (iso, d) => new Date(new Date(iso + 'T00:00:00').getTime() + d * 86400000).toISOString().slice(0, 10);

cycleSpec.forEach(([cid, pid, speciesId, status, start, days]) => {
  const n = Number(cid.slice(1));
  const qty = Math.round(60000 + rnd() * 60000);
  db.seedBatches.push({ id: `B0${n}`, code: `LO-GIONG-VC-${String(n - 80).padStart(2, '0')}`, supplierId: 'SUP1', speciesId, inspection: 'Minh hoạ – chưa xác minh' });
  db.farmingCycles.push({ id: cid, code: `VU-VC-${String(n - 80).padStart(3, '0')}`, pondId: pid, speciesId, seedBatchId: `B0${n}`, stockingDate: start, stockingQuantity: qty, status, expectedHarvestDate: addDays(start, days), notes: 'DỮ LIỆU NGHIỆP VỤ MÔ PHỎNG' });
  db.stockingEvents.push({ id: `ST0${n}`, cycleId: cid, date: start, quantity: qty, seedBatchId: `B0${n}` });
  for (let i = 0; i < 12; i++) {
    const d = addDays(start, 3 + i * 5);
    if (d > TODAY) break;
    db.feedDiaries.push({ id: `FE0${n}-${String(i).padStart(2, '0')}`, cycleId: cid, date: d, productId: `FD${1 + (i % 4)}`, amountKg: round2(4 + rnd() * 9), notes: '' });
  }
  for (let i = 0; i < 14; i++) {
    const d = addDays(start, 4 + i * 6);
    if (d > TODAY) break;
    db.environmentObservations.push({ id: `E0${n}-${i}`, cycleId: cid, date: d, ph: round2(7.2 + rnd() * 1.2), temperature: round2(26 + rnd() * 4), oxygen: round2(4.5 + rnd() * 2), salinity: round2(12 + rnd() * 18) });
  }
  for (let i = 0; i < 6; i++) {
    const d = addDays(start, 8 + i * 14);
    if (d > TODAY) break;
    db.growthObservations.push({ id: `G0${n}-${i}`, cycleId: cid, date: d, averageGrams: round2(2.5 + i * (18 / 6) + rnd() * 2) });
  }
});
db.medicationDiaries.push(
  { id: 'ME081', cycleId: 'C081', date: '2026-08-20', productId: 'MD1', amount: 1.2, purpose: 'Xử lý nước ao (mô phỏng)', notes: 'Minh hoạ; không phải chỉ định dùng thuốc' },
  { id: 'ME082', cycleId: 'C083', date: '2026-09-02', productId: 'MD2', amount: 0.8, purpose: 'Bổ sung khoáng (mô phỏng)', notes: 'Minh hoạ' },
  { id: 'ME083', cycleId: 'C084', date: '2026-09-18', productId: 'MD3', amount: 1.5, purpose: 'Men vi sinh (mô phỏng)', notes: 'Minh hoạ' },
);
db.healthEvents.push(
  { id: 'H081', cycleId: 'C083', date: '2026-09-25', summary: 'Cần theo dõi dấu hiệu bất thường (mô phỏng)', status: 'expert_review' },
  { id: 'H082', cycleId: 'C084', date: '2026-10-05', summary: 'Tôm giảm ăn nhẹ (mô phỏng)', status: 'open' },
);
db.harvests.push(
  { id: 'HR081', cycleId: 'C086', date: '2026-09-10', quantityKg: 812.4, notes: 'Đợt 1 (mô phỏng)' },
  { id: 'HR082', cycleId: 'C086', date: '2026-09-22', quantityKg: 646.1, notes: 'Đợt 2 (mô phỏng)' },
  { id: 'HR083', cycleId: 'C086', date: '2026-10-01', quantityKg: 388.9, notes: 'Đợt 3 – kết thúc vụ (mô phỏng)' },
  { id: 'HR084', cycleId: 'C083', date: '2026-10-12', quantityKg: 274.5, notes: 'Thu tỉa (mô phỏng)' },
);

// bảng vùng nuôi + liên kết
const zoneRecords = [];
for (const f of zonesOut) {
  const p = f.properties;
  zoneRecords.push({ ...p, areaIds: [], coopIds: [], geometryStatus: 'derived', dataStatus: 'verified', geometry: null, sourceUrl: p.verifiedSourceUrl || undefined });
}
for (const { zoneId, links, entityId } of mockAreaLinks) {
  const area = db.aquacultureAreas.find((a) => a.id === entityId);
  zoneRecords.push({
    zoneId, code: `VNU-MP-${entityId}`, name: area ? area.name : `Vùng nuôi mô phỏng ${entityId}`,
    aquacultureType: 'Nuôi trồng (mô phỏng)', species: ['SP1'], geometryStatus: 'synthetic', dataStatus: 'mock',
    totalAreaHa: area ? area.areaHa : null, communeCodes: links.map((l) => l.communeCode),
    geometrySourceId: `demo:${entityId}`, areaIds: [entityId], coopIds: area ? [area.coopId] : [], geometry: null, updatedAt: TODAY,
  });
}
zoneRecords.push({
  zoneId: DEMO_VC_ZONE.zoneId, code: DEMO_VC_ZONE.code, name: DEMO_VC_ZONE.name,
  aquacultureType: DEMO_VC_ZONE.aquacultureType, species: DEMO_VC_ZONE.species,
  geometryStatus: 'synthetic', dataStatus: 'mock', totalAreaHa: areaHaOf(DEMO_VC_ZONE.geometry),
  communeCodes: demoLinks.map((l) => l.communeCode), geometrySourceId: 'aquaculture/demo-zones.geojson#ZV01',
  areaIds: ['A11'], coopIds: ['HTX07'], geometry: null, updatedAt: TODAY,
});
for (const r of registryZones) zoneRecords.push({ ...r, areaIds: [], coopIds: [], geometry: null });

db.aquacultureZones = zoneRecords;
db.zoneCommuneLinks = zoneCommuneLinks;

function areaHaOf(geom) { return + (polygonAreaKm2(geom) * 100).toFixed(2); }

fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));

console.log(`Vùng suy ra từ OSM: ${zonesOut.length} (ao: ${ponds.features.length})`);
console.log(`Vùng đăng ký (chưa có ranh giới): ${registryZones.length}`);
console.log(`Vùng mock: ${1 + mockAreaLinks.length} | Liên kết vùng×xã: ${zoneCommuneLinks.length}`);
const multi = [...new Set(zoneCommuneLinks.map((l) => l.zoneId))].filter((id) => zoneCommuneLinks.filter((l) => l.zoneId === id).length > 1);
console.log('Vùng trải nhiều xã/phường:', multi.join(', ') || '(không)');
console.log('ZV01 giao:', demoLinks.map((l) => `${l.communeName}=${l.intersectionAreaKm2}km²`).join(' | '));
