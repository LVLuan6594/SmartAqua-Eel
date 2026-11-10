/**
 * Rollback dữ liệu gốc về bản sao lưu trước migration.
 *
 * Mặc định khôi phục từ bản sao lưu gần nhất do `migrate.mjs` tạo
 * (`src/data/backups/data.pre-migrate.*.json`). Có thể chỉ định tệp khác:
 *   node scripts/data-migration/rollback.mjs --from src/data/backups/<file>.json
 *
 * Trước khi khôi phục, trạng thái hiện tại được sao lưu thành
 * `data.pre-rollback.<ts>.json` để không mất dữ liệu.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { latestBackup } from './migrate.mjs';
import { assertEelDataset } from '../../server/validateDataset.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const DATA_FILE = resolve(ROOT, 'src/data/data.json');
const BACKUP_DIR = resolve(ROOT, 'src/data/backups');

const argOf = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};

const from = argOf('--from') || latestBackup();
if (!from || !existsSync(from)) {
  console.error('Không tìm thấy bản sao lưu để khôi phục. Dùng --from <đường dẫn>.');
  process.exit(1);
}

// kiểm tra tệp sao lưu có phải JSON hợp lệ của DB
let backupDb;
try {
  backupDb = JSON.parse(readFileSync(from, 'utf8'));
  assertEelDataset(backupDb);
  if (!backupDb || !Array.isArray(backupDb.ponds)) throw new Error('sai cấu trúc');
} catch (e) {
  console.error(`Tệp sao lưu không hợp lệ: ${from} (${e.message})`);
  process.exit(1);
}

mkdirSync(BACKUP_DIR, { recursive: true });
if (existsSync(DATA_FILE)) {
  const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const pre = join(BACKUP_DIR, `data.pre-rollback.${ts}.json`);
  writeFileSync(pre, readFileSync(DATA_FILE));
  console.log(`Sao lưu trạng thái hiện tại: ${pre.replace(ROOT + '\\', '').replace(/\\/g, '/')}`);
}

writeFileSync(DATA_FILE, `${JSON.stringify(backupDb, null, 2)}\n`, 'utf8');
console.log(`Đã khôi phục src/data/data.json từ: ${from.replace(ROOT + '\\', '').replace(/\\/g, '/')}`);
console.log(`schemaVersion sau khôi phục: ${backupDb.metadata?.schemaVersion ?? 1}`);

// liệt kê các bản sao lưu khả dụng
console.log('Bản sao lưu khả dụng:');
for (const f of readdirSync(BACKUP_DIR).filter((x) => x.endsWith('.json')).sort()) console.log(`  - ${f}`);
