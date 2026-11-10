/**
 * SmartAqua GIS V3 – Tải dữ liệu ranh giới hành chính THỰC của TP. Cần Thơ mới
 * (sau Nghị quyết 1668/NQ-UBTVQH15): 1 ranh giới thành phố + 103 xã/phường.
 *
 * Nguồn: ThangLeQuoc/vietnamese-provinces-database (MIT)
 *   json/geojson/92_can_tho/{...}
 *   Bản đồ tham chiếu "Bản đồ Đơn vị hành chính Việt Nam" do NXB Tài nguyên –
 *   Môi trường và Bản đồ Việt Nam (Bộ NN&MT) phát hành; dữ liệu GIS 2025.
 *
 * Chạy: node scripts/fetch-gis-data.mjs [--simplify <tolerance>]
 * Không chạy tự động từ UI. Chỉ dùng cho tác vụ nhập liệu có kiểm soát.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'geojson', 'can-tho');

const RAW_BASE =
  'https://raw.githubusercontent.com/ThangLeQuoc/vietnamese-provinces-database/master/json/geojson/92_can_tho';

const WARDS = `31120_cai_khe 31135_ninh_kieu 31147_tan_an 31150_an_binh 31153_o_mon 31157_thoi_long 31162_phuoc_thoi 31168_binh_thuy 31174_thoi_an_dong 31183_long_tuyen 31186_cai_rang 31201_hung_phu 31207_thot_not 31213_tan_loc 31217_trung_nhut 31228_thuan_hung 31231_thanh_an 31232_vinh_thanh 31237_vinh_trinh 31246_thanh_quoi 31249_thanh_phu 31255_trung_hung 31258_thoi_lai 31261_co_do 31264_thoi_hung 31273_dong_hiep 31282_dong_thuan 31288_truong_thanh 31294_truong_xuan 31299_phong_dien 31309_truong_long 31315_nhon_ai 31321_vi_thanh 31333_vi_tan 31338_hoa_luu 31340_nga_bay 31342_tan_hoa 31348_truong_long_tay 31360_thanh_xuan 31366_chau_thanh 31369_dong_phuoc 31378_phu_huu 31393_hoa_an 31396_hiep_hung 31399_tan_binh 31408_thanh_hoa 31411_dai_thanh 31420_phung_hiep 31426_phuong_binh 31432_tan_phuoc_hung 31441_vi_thuy 31453_vinh_thuan_dong 31459_vinh_tuong 31465_vi_thanh_1 31471_long_my 31473_long_binh 31480_long_phu_1 31489_vinh_vien 31492_luong_tam 31495_xa_phien 31507_soc_trang 31510_phu_loi 31528_ke_sach 31531_an_lac_thon 31537_phong_nam 31540_thoi_an_hoi 31552_nhon_my 31561_dai_hai 31567_my_tu 31569_phu_tam 31570_ho_dac_kien 31579_long_hung 31582_thuan_hoa 31591_my_huong 31594_an_ninh 31603_my_phuoc 31615_an_thanh 31633_cu_lao_dung 31639_long_phu 31645_dai_ngai 31654_truong_khanh 31666_tan_thanh 31673_tran_de 31675_lieu_tu 31679_lich_hoi_thuong 31684_my_xuyen 31687_tai_van 31699_thanh_thoi_an 31708_nhu_gia 31717_hoa_tu 31723_ngoc_to 31726_gia_hoa 31732_nga_nam 31741_tan_long 31753_my_quoi 31756_phu_loc 31759_lam_tan 31777_vinh_loi 31783_vinh_chau 31789_khanh_hoa 31795_vinh_hai 31804_vinh_phuoc 31810_lai_hoa`.split(/\s+/);

const SOURCE = {
  provider: 'ThangLeQuoc/vietnamese-provinces-database (MIT)',
  url: 'https://github.com/ThangLeQuoc/vietnamese-provinces-database/tree/master/json/geojson/92_can_tho',
  upstream: 'Bản đồ Đơn vị hành chính Việt Nam 2025 – NXB Tài nguyên, Môi trường và Bản đồ Việt Nam (Bộ Nông nghiệp & Môi trường)',
  license: 'MIT (dữ liệu tham chiếu từ nguồn bản đồ nhà nước; xem README kho dữ liệu)',
  adminSource: 'Nghị quyết 1668/NQ-UBTVQH15 (16/06/2025) – 103 xã/phường',
  retrievedAt: new Date().toISOString().slice(0, 10),
  crs: 'EPSG:4326 (WGS84)',
  verified: true,
};

async function get(url, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'SmartAqua-Demo-GIS-Import/3.0' } });
      if (res.ok) return await res.text();
      lastErr = new Error('HTTP ' + res.status);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  throw lastErr;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

function wardType(fullName) {
  if (!fullName) return 'commune';
  if (fullName.startsWith('Phường')) return 'ward';
  if (fullName.startsWith('Xã')) return 'commune';
  if (fullName.startsWith('Đặc khu')) return 'special';
  return 'commune';
}

function classifyUnit(slug) {
  const name = slug.replace(/^\d+_/, '');
  const urban = /^(cai_khe|ninh_kieu|tan_an|an_binh|o_mon|binh_thuy|thoi_an_dong|long_tuyen|cai_rang|hung_phu|thot_not|tan_loc|trung_nhut|vi_thanh|nga_bay|soc_trang|vinh_chau|vinh_phuoc|khanh_hoa|my_xuyen|vi_thuy|vinh_tuong|long_my|phu_loi|nga_nam|phu_loc|lam_tan|vi_tan)/;
  return urban.test(name);
}

function simplifyRing(ring, tol) {
  if (ring.length <= 4) return ring;
  const sqTol = tol * tol;
  const sqSegDist = (p, a, b) => {
    let x = a[0], y = a[1];
    let dx = b[0] - x, dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = b[0]; y = b[1]; } else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = p[0] - x; dy = p[1] - y;
    return dx * dx + dy * dy;
  };
  const getSqSegDist = sqSegDist;
  const markers = new Uint8Array(ring.length);
  markers[0] = 1; markers[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0, index = -1;
    for (let k = first + 1; k < last; k++) {
      const d = getSqSegDist(ring[k], ring[first], ring[last]);
      if (d > maxDist) { maxDist = d; index = k; }
    }
    if (maxDist > sqTol) { markers[index] = 1; stack.push([first, index], [index, last]); }
  }
  const out = ring.filter((_, i) => markers[i]);
  return out.length >= 4 ? out : ring;
}

function simplifyGeometry(geom, tol) {
  if (!tol) return geom;
  const doRing = (r) => simplifyRing(r, tol);
  if (geom.type === 'Polygon') return { ...geom, coordinates: geom.coordinates.map(doRing) };
  if (geom.type === 'MultiPolygon') return { ...geom, coordinates: geom.coordinates.map((p) => p.map(doRing)) };
  return geom;
}

function round(coords, dec) {
  const f = 10 ** dec;
  if (typeof coords[0] === 'number') return [Math.round(coords[0] * f) / f, Math.round(coords[1] * f) / f];
  return coords.map((c) => round(c, dec));
}

function roundGeometry(geom, dec) {
  return { ...geom, coordinates: round(geom.coordinates, dec) };
}

function computeBbox(geom) {
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

async function main() {
  const args = process.argv.slice(2);
  const tolIdx = args.indexOf('--simplify');
  const tol = tolIdx >= 0 ? Number(args[tolIdx + 1]) || 0 : 0;
  const dec = 6;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  process.stdout.write('Tải ranh giới thành phố... ');
  const cityRaw = JSON.parse(await get(`${RAW_BASE}/92_can_tho.geojson`));
  const cityFeature = cityRaw.features[0];
  console.log(cityFeature.properties.fullName);

  process.stdout.write(`Tải ${WARDS.length} xã/phường... `);
  const wardRaws = await mapLimit(WARDS, 6, async (slug) => {
    const raw = JSON.parse(await get(`${RAW_BASE}/wards/${slug}.geojson`));
    return { slug, feature: raw.features[0] };
  });
  console.log('xong');

  const features = wardRaws.map(({ slug, feature }) => {
    const p = feature.properties || {};
    const geom = roundGeometry(simplifyGeometry(feature.geometry, tol), dec);
    return {
      type: 'Feature',
      id: String(p.code),
      bbox: computeBbox(geom),
      properties: {
        code: String(p.code),
        name: p.name,
        nameEn: p.nameEn || '',
        fullName: p.fullName || `Xã ${p.name}`,
        codeName: p.codeName || '',
        type: wardType(p.fullName),
        areaKm2: typeof p.areaKm2 === 'number' ? p.areaKm2 : null,
        parentCode: '92',
        parentName: 'Thành phố Cần Thơ',
        gisServerId: p.gisServerId || '',
        postalCode: p.postalCode || '',
        slug,
      },
      geometry: geom,
    };
  });

  const cityGeom = roundGeometry(simplifyGeometry(cityFeature.geometry, tol), dec);
  const cityOut = {
    type: 'FeatureCollection',
    name: 'can-tho-city-boundary',
    bbox: computeBbox(cityGeom),
    features: [
      {
        type: 'Feature',
        id: '92',
        bbox: computeBbox(cityGeom),
        properties: {
          code: '92',
          name: cityFeature.properties.name,
          fullName: cityFeature.properties.fullName,
          type: 'city',
          areaKm2: cityFeature.properties.areaKm2,
          gisServerId: cityFeature.properties.gisServerId,
        },
        geometry: cityGeom,
      },
    ],
  };

  const communesOut = {
    type: 'FeatureCollection',
    name: 'can-tho-communes-103',
    bbox: computeBbox({ type: 'MultiPolygon', coordinates: features.map((f) => f.geometry.coordinates) }),
    features,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'city-boundary.geojson'), JSON.stringify(cityOut));
  fs.writeFileSync(path.join(OUT_DIR, 'communes-103.geojson'), JSON.stringify(communesOut));

  const manifest = {
    generatedAt: new Date().toISOString(),
    administrativeDecision: 'Nghị quyết 1668/NQ-UBTVQH15 ngày 16/06/2025',
    totals: { communes: features.length, wards: features.filter((f) => f.properties.type === 'ward').length, communesOnly: features.filter((f) => f.properties.type === 'commune').length },
    simplification: tol > 0 ? { toleranceDeg: tol } : null,
    coordinatePrecisionDecimals: dec,
    layers: {
      'can-tho/city-boundary.geojson': { ...SOURCE, description: 'Ranh giới TP. Cần Thơ mới (34 tỉnh/thành, mã 92)' },
      'can-tho/communes-103.geojson': { ...SOURCE, description: 'Ranh giới 103 xã/phường sau sắp xếp' },
    },
  };
  fs.writeFileSync(path.join(OUT_DIR, 'gis-manifest.json'), JSON.stringify(manifest, null, 2));

  const sizes = ['city-boundary.geojson', 'communes-103.geojson'].map((f) => `${f}: ${(fs.statSync(path.join(OUT_DIR, f)).size / 1024).toFixed(0)} KB`);
  console.log(`Đã lưu ${features.length} xã/phường (${manifest.totals.wards} phường / ${manifest.totals.communesOnly} xã).`);
  console.log(sizes.join(' | '));
}

main().catch((e) => {
  console.error('LỖI:', e.message);
  process.exit(1);
});
