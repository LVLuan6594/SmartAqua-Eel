/**
 * Nhập dữ liệu cơ sở nuôi từ phụ lục PDF — có kiểm soát phiên bản (idempotent).
 *
 * - Tính checksum SHA-256 của tệp PDF nguồn.
 * - Nếu checksum + đầu ra chưa thay đổi → bỏ qua (trừ khi truyền --force).
 * - Nếu thay đổi → chạy lại `scripts/import-pdf-facilities.mjs`.
 * - Ghi manifest `src/data/import-manifest.json` (checksum, thời điểm, số liệu, diff).
 *
 * Chạy: node scripts/data-import/import-facilities.mjs [--force]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const SOURCE_PDF = resolve(ROOT, 'docs/source-data/pl2-danh-sach-thuy-san-chu-luc-1.pdf');
const OUT_JSON = resolve(ROOT, 'src/data/pdf-facilities.json');
const OUT_GEOJSON = resolve(ROOT, 'public/geojson/aquaculture/pdf-cantho-facilities.geojson');
const MANIFEST = resolve(ROOT, 'src/data/import-manifest.json');
const force = process.argv.includes('--force');

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const rel = (p) => p.replace(ROOT + '\\', '').replace(ROOT + '/', '').replace(/\\/g, '/');

if (!existsSync(SOURCE_PDF)) {
  console.error(`Không tìm thấy PDF nguồn: ${rel(SOURCE_PDF)}`);
  process.exit(1);
}

const checksum = sha256(readFileSync(SOURCE_PDF));
const outputsExist = existsSync(OUT_JSON) && existsSync(OUT_GEOJSON);
let prev = null;
if (existsSync(MANIFEST)) {
  try {
    prev = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  } catch {
    prev = null;
  }
}

if (!force && prev && prev.sourceChecksum === checksum && outputsExist) {
  console.log(`Nguồn PDF không đổi (sha256 ${checksum.slice(0, 12)}…). Bỏ qua nhập lại (idempotent).`);
  process.exit(0);
}

console.log(`Phát hiện thay đổi nguồn${prev ? '' : ' (lần nhập đầu)'}. Chạy trích xuất…`);
const res = spawnSync(process.execPath, [resolve(ROOT, 'scripts/import-pdf-facilities.mjs')], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (res.status !== 0) {
  console.error(`Trích xuất thất bại (mã ${res.status}).`);
  process.exit(res.status || 1);
}

const dataset = JSON.parse(readFileSync(OUT_JSON, 'utf8'));
const outputChecksum = sha256(readFileSync(OUT_JSON));
const summary = dataset.summary || {};
const parseCounts = (s) => ({
  totalFacilities: s.totalFacilities ?? 0,
  totalPonds: s.totalPonds ?? 0,
  facilitiesWithCoordinates: s.facilitiesWithCoordinates ?? 0,
  pondsWithCoordinates: s.pondsWithCoordinates ?? 0,
});

const diff = {};
if (prev?.counts) {
  const before = parseCounts(prev.counts);
  const after = parseCounts(summary);
  for (const k of Object.keys(after)) diff[k] = after[k] - before[k];
}

const manifest = {
  schemaVersion: 2,
  generatedBy: 'scripts/data-import/import-facilities.mjs',
  sourceFile: rel(SOURCE_PDF),
  sourceChecksum: checksum,
  outputFile: rel(OUT_JSON),
  outputChecksum,
  outputGeojson: rel(OUT_GEOJSON),
  importedAt: new Date().toISOString(),
  counts: parseCounts(summary),
  diff,
  note: 'Idempotent: chỉ nhập lại khi checksum nguồn thay đổi. Dữ liệu đã khử định danh.',
};

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Đã nhập: ${summary.totalFacilities} cơ sở, ${summary.totalPonds} dòng ao.`);
console.log(`Manifest: ${rel(MANIFEST)} (sha256 nguồn ${checksum.slice(0, 12)}…)`);
if (Object.keys(diff).length) console.log('Thay đổi so với lần trước:', JSON.stringify(diff));
