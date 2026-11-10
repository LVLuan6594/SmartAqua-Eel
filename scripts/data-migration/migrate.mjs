/**
 * Migration dữ liệu gốc (`src/data/data.json`) lên schema v2 — chỉ THÊM, không xoá/đổi id.
 *
 * Thay đổi:
 *  - metadata.schemaVersion = 2, metadata.sourceRegistry
 *  - thêm `dataSources` (đăng ký nguồn), `userPondAssignments`, `dataQualityIssues`
 *  - chuẩn hoá vai trò về 4 vai trò; gộp staff/gis/expert → admin
 *
 * An toàn: sao lưu trước khi ghi; idempotent (bỏ qua nếu schemaVersion >= 2).
 * Chạy: node scripts/data-migration/migrate.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const DATA_FILE = resolve(ROOT, 'src/data/data.json');
const BACKUP_DIR = resolve(ROOT, 'src/data/backups');
const SCHEMA_VERSION = 2;

export const ROLE_LABELS = {
  admin: 'Quản trị hệ thống',
  manager: 'Lãnh đạo địa phương',
  coop: 'CEO HTX',
  farmer: 'Nông dân',
};
const ROLE_MERGE = { staff: 'admin', gis: 'admin', expert: 'admin' };

const now = () => new Date().toISOString();
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');

function backup() {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const dest = join(BACKUP_DIR, `data.pre-migrate.${stamp()}.json`);
  writeFileSync(dest, readFileSync(DATA_FILE));
  return dest;
}

export function migrate({ quiet = false } = {}) {
  const log = (...a) => { if (!quiet) console.log(...a); };
  const db = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  const current = db.metadata?.schemaVersion ?? 1;
  if (current >= SCHEMA_VERSION) {
    log(`Đã ở schema v${current} — không cần migration (idempotent).`);
    return { migrated: false, schemaVersion: current };
  }

  const backupPath = backup();
  log(`Sao lưu: ${backupPath.replace(ROOT + '\\', '').replace(/\\/g, '/')}`);

  const rolesBefore = (db.roles || []).map((r) => r.id);
  const mergedRoles = [...new Set(rolesBefore.map((r) => ROLE_MERGE[r] || r))];
  const ordered = ['admin', 'manager', 'coop', 'farmer'].filter((r) => mergedRoles.includes(r));
  for (const r of mergedRoles) if (!ordered.includes(r)) ordered.push(r);
  db.roles = ordered.map((id) => ({ id, name: ROLE_LABELS[id] || id }));

  let usersChanged = 0;
  for (const u of db.users || []) {
    if (ROLE_MERGE[u.role]) {
      u.role = ROLE_MERGE[u.role];
      usersChanged++;
    }
  }

  db.metadata = db.metadata || {};
  db.metadata.schemaVersion = SCHEMA_VERSION;
  db.metadata.sourceRegistry = ['mock:seed', 'pdf:pl2', 'gis:communes-103'];

  db.dataSources = db.dataSources || [
    { id: 'mock:seed', type: 'MOCK_DATA', name: 'Dữ liệu trình diễn', file: 'src/data/data.json', importedAt: db.metadata.asOf || now(), license: null },
    { id: 'pdf:pl2', type: 'PDF_SOURCE', name: 'Danh sách cơ sở nuôi trồng thuỷ sản (phụ lục)', file: 'src/data/pdf-facilities.json', importedAt: now(), license: null },
    { id: 'gis:communes-103', type: 'OFFICIAL_GIS', name: 'Ranh giới 103 xã/phường', file: 'public/geojson/can-tho/communes-103.geojson', importedAt: now(), license: null },
  ];

  if (!Array.isArray(db.userPondAssignments)) {
    const out = [];
    for (const p of db.ponds || []) {
      if (!p.farmerId) continue;
      out.push({
        userId: p.farmerId,
        pondId: p.id,
        roleId: 'farmer',
        startDate: null,
        endDate: null,
        status: 'active',
        source: 'MOCK_DATA',
        verificationStatus: 'needs_review',
      });
    }
    db.userPondAssignments = out;
  }
  if (!Array.isArray(db.dataQualityIssues)) db.dataQualityIssues = [];

  writeFileSync(DATA_FILE, `${JSON.stringify(db, null, 2)}\n`, 'utf8');

  const report = {
    schemaVersion: SCHEMA_VERSION,
    migratedAt: now(),
    backupPath,
    rolesBefore,
    rolesAfter: db.roles.map((r) => r.id),
    usersRoleMerged: usersChanged,
    added: ['dataSources', 'userPondAssignments', 'dataQualityIssues'],
    userPondAssignments: db.userPondAssignments.length,
  };
  const logPath = join(BACKUP_DIR, `migration.${stamp()}.json`);
  writeFileSync(logPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  log(`Vai trò: [${rolesBefore.join(', ')}] → [${report.rolesAfter.join(', ')}] (${usersChanged} tài khoản gộp về admin)`);
  log(`Thêm: dataSources (${db.dataSources.length}), userPondAssignments (${db.userPondAssignments.length}), dataQualityIssues`);
  log(`Hoàn tất migration v${SCHEMA_VERSION}. Nhật ký: ${logPath.replace(ROOT + '\\', '').replace(/\\/g, '/')}`);
  return { migrated: true, schemaVersion: SCHEMA_VERSION, report };
}

export function latestBackup() {
  if (!existsSync(BACKUP_DIR)) return null;
  const files = readdirSync(BACKUP_DIR).filter((f) => f.startsWith('data.pre-migrate.') && f.endsWith('.json')).sort();
  return files.length ? join(BACKUP_DIR, files[files.length - 1]) : null;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) migrate();
