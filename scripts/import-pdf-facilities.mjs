/**
 * Trích xuất phụ lục PDF "Danh sách cơ sở nuôi trồng thuỷ sản đối tượng chủ lực"
 * thành dữ liệu có cấu trúc cho SmartAqua GIS.
 *
 * Đầu vào : docs/source-data/pl2-danh-sach-thuy-san-chu-luc-1.pdf  (PII - không đưa vào bản dựng)
 * Đầu ra  : src/data/pdf-facilities.json                    (nguồn chi tiết, đã khử định danh)
 *           public/geojson/aquaculture/pdf-cantho-facilities.geojson (điểm cơ sở cho bản đồ)
 *           docs/pdf-data-import-validation.md              (báo cáo kiểm định)
 *
 * Nguyên tắc: KHÔNG bịa dữ liệu. Mọi giá trị suy luận đều gắn cờ độ tin cậy / trạng thái.
 * Đã khử định danh: loại bỏ họ tên chủ cơ sở và số điện thoại khỏi tệp xuất.
 *
 * Chạy: node scripts/import-pdf-facilities.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PDF_PATH = resolve(ROOT, 'docs/source-data/pl2-danh-sach-thuy-san-chu-luc-1.pdf');
const COMMUNES_PATH = resolve(ROOT, 'public/geojson/can-tho/communes-103.geojson');
const OUT_JSON = resolve(ROOT, 'src/data/pdf-facilities.json');
const OUT_GEOJSON = resolve(ROOT, 'public/geojson/aquaculture/pdf-cantho-facilities.geojson');
const OUT_MD = resolve(ROOT, 'docs/pdf-data-import-validation.md');

const ORIGIN = 'pdf_import';
const AS_OF = '2025';
const CRS = 'EPSG:4326';
const BBOX = { latMin: 8.5, latMax: 11.2, lngMin: 103.0, lngMax: 107.6 };
const ROW_TOL = 5;

const CODE_RE = /^\d{2}-\d{2}-\d+-\d+$/;
const POND_RE = /^A[o0]\s*0*(\d+)$/i;
const AREA_THOUSANDS_RE = /^\d{1,3}(?:\.\d{3})+$/;
const AREA_PLAIN_RE = /^\d{3,6}$/;
const PHONE_RE = /^0[\d\s.]{8,}$/;
const INT_RE = /^\d{1,3}$/;
const COORDISH_RE = /^\d{1,3}[.,\d]*$/;

const HEADER_RE = /^(tt|họ tên|địa chỉ|số điện|mã số|số lượng|diện tích|toạ độ|tọa độ|đối tượng|nuôi trồng|danh sách|ghi chú)/i;
const ADDRESS_HINT_RE = /(\bấp\b|\bkhu vực\b|\bkv\b|\blô\b|\bq\.|\bp\.|\bx\.|\bh\.|\btt\.|\bthị trấn\b|\bđường\b|\bql\b|\bsố\b)/i;
const SPECIES_RE = /(cá|tôm|cua|ếch|lươn|ba ba|trê|rô|mè|chép|trắm|điêu hồng)/i;

/* ---------------------------------- helpers --------------------------------- */

const stripDiacritics = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

const norm = (s) => stripDiacritics(String(s || '')).toLowerCase().replace(/\s+/g, ' ').trim();

function coordValue(raw, kind) {
  const s = String(raw).trim().replace(/\s/g, '');
  let m = s.match(/^(\d{1,3})[.,](\d{1,7})$/);
  if (m) {
    const v = Number(`${m[1]}.${m[2]}`);
    return Number.isFinite(v) ? v : null;
  }
  const digits = s.replace(/[^0-9]/g, '');
  if (kind === 'lat' && (digits.length === 7 || digits.length === 8) && digits.startsWith('10')) {
    return Number(`10.${digits.slice(2)}`);
  }
  if (kind === 'lng' && (digits.length === 8 || digits.length === 9) && digits.startsWith('105')) {
    return Number(`105.${digits.slice(3)}`);
  }
  return null;
}

function parseArea(raw) {
  const cleaned = String(raw).replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned.replace(/\./g, ''));
  return Number.isFinite(num) && num > 0 ? num : null;
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygonCoords(point, polygon) {
  if (!pointInRing(point, polygon[0])) return false;
  for (let k = 1; k < polygon.length; k++) if (pointInRing(point, polygon[k])) return false;
  return true;
}

function bboxOfGeometry(geom) {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      minX = Math.min(minX, c[0]);
      maxX = Math.max(maxX, c[0]);
      minY = Math.min(minY, c[1]);
      maxY = Math.max(maxY, c[1]);
      return;
    }
    c.forEach(walk);
  };
  walk(geom.coordinates);
  return { minX, minY, maxX, maxY };
}

/* ------------------------------ load boundaries ----------------------------- */

const communesFC = JSON.parse(readFileSync(COMMUNES_PATH, 'utf8'));
const communes = communesFC.features.map((f) => ({
  code: f.properties.code,
  name: f.properties.name,
  fullName: f.properties.fullName,
  type: f.properties.type,
  geom: f.geometry,
  bbox: bboxOfGeometry(f.geometry),
}));
const communeByName = new Map();
for (const c of communes) communeByName.set(norm(c.name), c);

function mapCoordinate(lat, lng) {
  if (lat == null || lng == null) return null;
  const pt = [lng, lat];
  for (const c of communes) {
    const b = c.bbox;
    if (lng < b.minX || lng > b.maxX || lat < b.minY || lat > b.maxY) continue;
    const g = c.geom;
    if (g.type === 'Polygon') {
      if (pointInPolygonCoords(pt, g.coordinates)) return c;
    } else if (g.type === 'MultiPolygon') {
      if (g.coordinates.some((poly) => pointInPolygonCoords(pt, poly))) return c;
    }
  }
  return null;
}

function mapAddress(address) {
  if (!address) return null;
  const tokens = String(address)
    .split(/[,;]/)
    .map((t) => norm(t));
  const candidates = [];
  for (const t of tokens) {
    const cleaned = t.replace(/^(p\.|x\.|q\.|h\.|tt\.|phuong|xa|quan|huyen|thi tran)\s*/, '').trim();
    if (!cleaned) continue;
    for (const [name, c] of communeByName) {
      if (cleaned === name) candidates.push({ c, len: name.length, exact: true });
      else if (cleaned.includes(name)) candidates.push({ c, len: name.length, exact: false });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => (b.exact - a.exact) || (b.len - a.len));
  return candidates[0];
}

/* -------------------------------- extract PDF ------------------------------- */

const data = new Uint8Array(readFileSync(PDF_PATH));
const doc = await getDocument({ data, useSystemFonts: true }).promise;

const codes = []; // { page, y, x, center, str }
const cells = []; // all meaningful text cells { page, y, x, center, str, kind }

for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const content = await page.getTextContent();
  for (const it of content.items) {
    if (!('str' in it)) continue;
    const str = it.str.trim();
    if (!str) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    const width = it.width || 0;
    const center = x + width / 2;
    if (CODE_RE.test(str)) {
      codes.push({ page: p, y, x, center, str });
    } else {
      cells.push({ page: p, y, x, center, str });
    }
  }
  page.cleanup();
}
await doc.destroy();

// group codes into facility blocks (consecutive rows with same prefix)
codes.sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
const prefixOf = (code) => code.replace(/-\d+$/, '');

const blocks = [];
for (const c of codes) {
  const prefix = prefixOf(c.str);
  const last = blocks[blocks.length - 1];
  if (last && last.prefix === prefix && last.page === c.page) {
    last.codes.push(c);
  } else {
    blocks.push({ prefix, page: c.page, codes: [c] });
  }
}

function nearestCell(block, codeCell, predicate, kind) {
  let best = null;
  let bestDelta = Infinity;
  for (const cell of cells) {
    if (cell.page !== codeCell.page) continue;
    if (!predicate(cell)) continue;
    const delta = Math.abs(cell.y - codeCell.y);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = cell;
    }
  }
  return best && bestDelta <= ROW_TOL ? { cell: best, delta: bestDelta, kind } : null;
}

const isPondName = (c) => POND_RE.test(c.str);
const isAreaCell = (c) => (AREA_THOUSANDS_RE.test(c.str) || AREA_PLAIN_RE.test(c.str)) && c.center < 458;
const isSpeciesCell = (c) => SPECIES_RE.test(c.str) && c.center >= 445 && c.center < 485 && !POND_RE.test(c.str);
const isLatCell = (c) => c.center >= 484 && c.center < 514 && COORDISH_RE.test(c.str);
const isLngCell = (c) => c.center >= 514 && COORDISH_RE.test(c.str);

const ponds = [];
const stats = {
  coordOutliers: 0,
  areaUnitEvidence: 0,
  dupCodes: 0,
  coordLowConfidence: 0,
};

for (const block of blocks) {
  for (const codeCell of block.codes) {
    const pondMatch = nearestCell(block, codeCell, isPondName);
    const areaMatch = nearestCell(block, codeCell, isAreaCell);
    const speciesMatch = nearestCell(block, codeCell, isSpeciesCell);
    const latMatch = nearestCell(block, codeCell, isLatCell);
    const lngMatch = nearestCell(block, codeCell, isLngCell);

    let lat = latMatch ? coordValue(latMatch.cell.str, 'lat') : null;
    let lng = lngMatch ? coordValue(lngMatch.cell.str, 'lng') : null;
    if (lat != null && (lat < BBOX.latMin || lat > BBOX.latMax)) { stats.coordOutliers++; lat = null; }
    if (lng != null && (lng < BBOX.lngMin || lng > BBOX.lngMax)) { stats.coordOutliers++; lng = null; }
    if (lat == null || lng == null) { lat = null; lng = null; }

    const coordDelta = latMatch || lngMatch ? Math.max(latMatch?.delta ?? 0, lngMatch?.delta ?? 0) : null;
    let coordConfidence = 'none';
    if (lat != null && lng != null) {
      if (coordDelta != null && coordDelta <= 1.5) coordConfidence = 'high';
      else if (coordDelta != null && coordDelta <= 3.5) coordConfidence = 'medium';
      else { coordConfidence = 'low'; stats.coordLowConfidence++; }
    }

    const nameRaw = pondMatch ? pondMatch.cell.str.replace(/\s+/g, ' ') : null;
    const ordinal = POND_RE.test(nameRaw || '') ? Number((nameRaw.match(POND_RE) || [])[1]) : null;
    const areaRaw = areaMatch ? areaMatch.cell.str : null;
    const areaM2 = areaRaw ? parseArea(areaRaw) : null;
    if (areaRaw && /m|²|2/i.test(areaRaw)) stats.areaUnitEvidence++;

    ponds.push({
      code: codeCell.str,
      facilityId: block.prefix,
      name: nameRaw ? nameRaw.replace(/^A[o0]/i, 'Ao') : null,
      ordinal,
      areaRaw,
      areaM2,
      species: speciesMatch ? speciesMatch.cell.str.toLowerCase() : null,
      lat,
      lng,
      coordConfidence,
      coordDeltaPx: coordDelta,
      origin: ORIGIN,
      sourcePage: codeCell.page,
    });
  }
}

// duplicate codes
const seen = new Map();
for (const p of ponds) {
  const n = (seen.get(p.code) || 0) + 1;
  seen.set(p.code, n);
}
for (const p of ponds) {
  if (seen.get(p.code) > 1) {
    stats.dupCodes++;
    p.duplicateOf = p.code;
    p.id = `${p.code}-D${ponds.filter((x) => x.code === p.code).indexOf(p) + 1}`;
  } else {
    p.id = p.code;
  }
}

/* ------------------------------ facility metadata --------------------------- */

function leftCellsInRange(block) {
  const ys = block.codes.map((c) => c.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return cells.filter(
    (c) =>
      c.page === block.page &&
      c.y >= minY - 8 &&
      c.y <= maxY + 8 &&
      c.center < 430 &&
      !HEADER_RE.test(c.str) &&
      !CODE_RE.test(c.str) &&
      !POND_RE.test(c.str) &&
      !isAreaCell(c),
  );
}

const facilities = [];
for (const block of blocks) {
  const left = leftCellsInRange(block);
  const centerY = (Math.min(...block.codes.map((c) => c.y)) + Math.max(...block.codes.map((c) => c.y))) / 2;
  const sorted = [...left].sort((a, b) => Math.abs(a.y - centerY) - Math.abs(b.y - centerY));

  let sourceIndex = null;
  let owner = null;
  const addresses = [];
  for (const c of sorted) {
    if (sourceIndex == null && INT_RE.test(c.str) && c.x < 66) { sourceIndex = Number(c.str); continue; }
    if (PHONE_RE.test(c.str)) continue; // khử định danh: không lưu SĐT
    if (ADDRESS_HINT_RE.test(c.str)) {
      if (!addresses.includes(c.str)) addresses.push(c.str);
      continue;
    }
    if (owner == null && c.str.length > 3 && !INT_RE.test(c.str)) owner = c.str;
  }

  const blockPonds = ponds.filter((p) => p.facilityId === block.prefix && block.codes.some((cc) => cc.str === p.code));
  const withCoord = blockPonds.filter((p) => p.lat != null && p.lng != null);
  let lat = null, lng = null;
  if (withCoord.length) {
    const sortedLat = withCoord.map((p) => p.lat).sort((a, b) => a - b);
    const sortedLng = withCoord.map((p) => p.lng).sort((a, b) => a - b);
    lat = Number(sortedLat[Math.floor(sortedLat.length / 2)].toFixed(6));
    lng = Number(sortedLng[Math.floor(sortedLng.length / 2)].toFixed(6));
  }

  let commune = null;
  let mappingMethod = 'unresolved';
  if (lat != null && lng != null) {
    commune = mapCoordinate(lat, lng);
    if (commune) mappingMethod = 'coordinate';
  }
  if (!commune && addresses.length) {
    const byAddr = mapAddress(addresses[0]);
    if (byAddr) { commune = byAddr.c; mappingMethod = 'address'; }
  }

  const areaVals = blockPonds.map((p) => p.areaM2).filter((v) => v != null);

  facilities.push({
    id: block.prefix,
    sourceIndex,
    addressFacility: addresses[0] || null,
    addressFarming: addresses[1] || addresses[0] || null,
    pondCountActual: blockPonds.length,
    pondIds: blockPonds.map((p) => p.id),
    species: [...new Set(blockPonds.map((p) => p.species).filter(Boolean))],
    areaM2Total: areaVals.length ? areaVals.reduce((a, b) => a + b, 0) : null,
    pondsWithArea: areaVals.length,
    pondsWithCoordinates: withCoord.length,
    lat,
    lng,
    coordinateConfidence: withCoord.length ? (withCoord.some((p) => p.coordConfidence === 'low') ? 'low' : withCoord.some((p) => p.coordConfidence === 'medium') ? 'medium' : 'high') : 'none',
    communeCode: commune ? commune.code : null,
    communeName: commune ? commune.name : null,
    mappingMethod,
    verificationStatus: commune ? 'verified' : 'needs_review',
    origin: ORIGIN,
    sourcePage: block.page,
    _ownerDetected: owner != null, // dùng nội bộ cho báo cáo, KHÔNG xuất ra JSON
  });
}

/* --------------------------------- summary ---------------------------------- */

const summary = {
  sourcePages: doc.numPages,
  totalFacilities: facilities.length,
  totalPonds: ponds.length,
  uniquePonds: ponds.length - stats.dupCodes,
  duplicatePondCodes: stats.dupCodes,
  facilitiesWithCoordinates: facilities.filter((f) => f.lat != null).length,
  facilitiesWithoutCoordinates: facilities.filter((f) => f.lat == null).length,
  pondsWithCoordinates: ponds.filter((p) => p.lat != null).length,
  pondsWithoutCoordinates: ponds.filter((p) => p.lat == null).length,
  pondsWithArea: ponds.filter((p) => p.areaM2 != null).length,
  pondsWithoutArea: ponds.filter((p) => p.areaM2 == null).length,
  coordinateOutliers: stats.coordOutliers,
  coordinateLowConfidence: stats.coordLowConfidence,
  areaUnitEvidenceRows: stats.areaUnitEvidence,
  mappedByCoordinate: facilities.filter((f) => f.mappingMethod === 'coordinate').length,
  mappedByAddress: facilities.filter((f) => f.mappingMethod === 'address').length,
  unresolved: facilities.filter((f) => f.mappingMethod === 'unresolved').length,
  ownersDetected: facilities.filter((f) => f._ownerDetected).length,
  speciesDistribution: [...new Set(ponds.map((p) => p.species).filter(Boolean))],
  totalAreaM2: facilities.reduce((s, f) => s + (f.areaM2Total || 0), 0),
  generatedFrom: 'pl2-danh-sach-thuy-san-chu-luc-1.pdf',
  crs: CRS,
  areaUnit: 'm2',
};

/* --------------------------------- outputs ---------------------------------- */

const dataset = {
  metadata: {
    title: 'Danh sách cơ sở nuôi trồng thuỷ sản đối tượng chủ lực — trích từ phụ lục PDF',
    sourceFile: 'pl2-danh-sach-thuy-san-chu-luc-1.pdf',
    sourcePages: doc.numPages,
    level: 'xã/phường',
    crs: CRS,
    asOf: AS_OF,
    areaUnit: 'm2',
    deidentified: true,
    deidentificationNote: 'Đã loại bỏ họ tên chủ cơ sở và số điện thoại. Giữ mã cơ sở/ao, địa chỉ cơ sở, xã/phường, diện tích, đối tượng nuôi, toạ độ.',
    provenance: 'Phụ lục kèm danh mục cơ sở nuôi trồng thuỷ sản (bản PDF do đơn vị quản lý cung cấp).',
    disclaimer:
      'Toạ độ là điểm đại diện cho ao/cơ sở theo phụ lục, KHÔNG phải ranh giới ao. Diện tích ghi theo phụ lục (đơn vị m²), chưa kiểm định thực địa. Dữ liệu dùng cho trình diễn, cần đối chiếu trước khi ra quyết định.',
  },
  facilities: facilities.map(({ _ownerDetected, ...f }) => f),
  ponds,
  summary,
};

mkdirSync(dirname(OUT_JSON), { recursive: true });
mkdirSync(dirname(OUT_GEOJSON), { recursive: true });
writeFileSync(OUT_JSON, JSON.stringify(dataset, null, 2), 'utf8');

const geojson = {
  type: 'FeatureCollection',
  name: 'pdf-cantho-facilities',
  metadata: {
    title: dataset.metadata.title,
    source: dataset.metadata.sourceFile,
    crs: CRS,
    origin: ORIGIN,
    deidentified: true,
    note: 'Điểm cơ sở (trung vị toạ độ các ao có trong phụ lục). Không phải ranh giới ao.',
  },
  features: dataset.facilities
    .filter((f) => f.lat != null && f.lng != null)
    .map((f) => ({
      type: 'Feature',
      id: f.id,
      properties: {
        facilityId: f.id,
        sourceIndex: f.sourceIndex,
        communeCode: f.communeCode,
        communeName: f.communeName,
        pondCount: f.pondCountActual,
        species: f.species.join(', '),
        areaM2Total: f.areaM2Total,
        coordinateConfidence: f.coordinateConfidence,
        mappingMethod: f.mappingMethod,
        verificationStatus: f.verificationStatus,
        origin: ORIGIN,
        sourcePage: f.sourcePage,
      },
      geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
    })),
};
writeFileSync(OUT_GEOJSON, JSON.stringify(geojson, null, 2), 'utf8');

const pct = (n, d) => `${n}/${d} (${d ? Math.round((n / d) * 100) : 0}%)`;
const md = `# Kiểm định dữ liệu nhập từ PDF — Danh sách cơ sở nuôi trồng thuỷ sản

> Sinh tự động bởi \`scripts/import-pdf-facilities.mjs\`. **Không chỉnh sửa thủ công.**

## 1. Nguồn

| Thuộc tính | Giá trị |
|---|---|
| Tệp nguồn | \`docs/source-data/pl2-danh-sach-thuy-san-chu-luc-1.pdf\` (PII – ngoài \`public/\`) |
| Số trang | ${summary.sourcePages} |
| Hệ toạ độ | ${summary.crs} |
| Đơn vị diện tích | m² (theo ký hiệu "m²" trong phụ lục) |
| Khử định danh | Có — loại bỏ họ tên chủ cơ sở và số điện thoại |

## 2. Số liệu sau trích xuất (tính trực tiếp từ dữ liệu, không ước lượng)

| Chỉ tiêu | Giá trị |
|---|---|
| Số cơ sở | ${summary.totalFacilities} |
| Số dòng ao (bản ghi) | ${summary.totalPonds} |
| Ao duy nhất (không trùng mã) | ${summary.uniquePonds} |
| Dòng ao trùng mã | ${summary.duplicatePondCodes} |
| Cơ sở có toạ độ | ${pct(summary.facilitiesWithCoordinates, summary.totalFacilities)} |
| Cơ sở thiếu toạ độ | ${pct(summary.facilitiesWithoutCoordinates, summary.totalFacilities)} |
| Ao có toạ độ | ${pct(summary.pondsWithCoordinates, summary.totalPonds)} |
| Ao có diện tích | ${pct(summary.pondsWithArea, summary.totalPonds)} |
| Ao thiếu diện tích | ${pct(summary.pondsWithoutArea, summary.totalPonds)} |
| Toạ độ ngoài miền hợp lệ (đã loại) | ${summary.coordinateOutliers} |
| Toạ độ độ tin cậy thấp | ${summary.coordinateLowConfidence} |
| Dòng có bằng chứng đơn vị "m²" | ${summary.areaUnitEvidenceRows} |
| Họ tên chủ cơ sở đã phát hiện (đã loại bỏ) | ${summary.ownersDetected} |

## 3. Gán đơn vị hành chính

| Phương pháp | Số cơ sở |
|---|---|
| Theo toạ độ (point-in-polygon, 103 xã/phường) | ${summary.mappedByCoordinate} |
| Theo địa chỉ (khớp tên xã/phường) | ${summary.mappedByAddress} |
| Chưa xác định (cần rà soát) | ${summary.unresolved} |

## 4. Chất lượng & vấn đề đã biết

- **Mã ao không nhất quán độ dài phần đệm**: ví dụ \`92-01-000001-0001\` và \`92-01-0003-001\`. Mã gốc được **giữ nguyên**, không chuẩn hoá lại.
- **Trùng mã ao trong nguồn**: ${summary.duplicatePondCodes} dòng. Cờ \`duplicateOf\` được gắn và \`id\` thêm hậu tố \`-D{n}\`.
- **Toạ độ lỗi định dạng** (ví dụ \`10.174.407\`, \`105,55,89,78\`): đã chuẩn hoá; nếu vẫn ngoài miền hợp lệ thì bị loại (${summary.coordinateOutliers} giá trị).
- **Toạ độ là điểm đại diện**, không phải ranh giới ao. Không suy diễn hình học vùng từ điểm.
- **Diện tích theo phụ lục**, một số dòng thiếu (ghi chú nguồn: "hộ không có diện tích là hộ chưa đăng ký lại theo nghị định 26").
- **Địa chỉ mang tên đơn vị hành chính cũ** (quận/huyện trước sắp xếp 2025). Gán xã/phường mới ưu tiên theo toạ độ.
- **Đối tượng nuôi** trong phụ lục chỉ có: ${summary.speciesDistribution.join(', ') || '—'}.

## 5. Tái lập

\`\`\`powershell
node scripts/import-pdf-facilities.mjs
\`\`\`
`;

writeFileSync(OUT_MD, md, 'utf8');

console.log(JSON.stringify(summary, null, 2));
console.log('\nWrote:', OUT_JSON);
console.log('Wrote:', OUT_GEOJSON);
console.log('Wrote:', OUT_MD);
