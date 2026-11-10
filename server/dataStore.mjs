import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {assertEelDataset} from './validateDataset.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const seedDir = path.join(dataDir, 'seeds');
const runtimeDir = path.join(dataDir, 'runtime');
const runtimeFile = path.join(runtimeDir, 'data.json');
const backupDir = path.join(dataDir, 'backups');
const LOCK_FILE = path.join(runtimeDir, '.write.lock');
const schemaVersion = 2;

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function readJson(filePath, fallback = null) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    if (!text.trim()) return fallback;
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(filePath, value) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

function ensureRuntimeData() {
  ensureDir(seedDir);
  ensureDir(runtimeDir);
  ensureDir(backupDir);

  const seedPath = path.join(seedDir, 'data.json');
  const runtimeExists = fs.existsSync(runtimeFile);

  if (!runtimeExists) {
    if (!fs.existsSync(seedPath)) {
      throw new Error('Seed file missing: data/seeds/data.json');
    }
    const seed = readJson(seedPath, null);
    if (!seed || !seed.metadata) {
      throw new Error('Seed file is invalid JSON or missing metadata');
    }
    writeJsonAtomic(runtimeFile, { ...seed, metadata: { ...seed.metadata, runtimeSource: 'seed' } });
  }

  const runtime = readJson(runtimeFile, null);
  if (!runtime || !runtime.metadata || runtime.metadata.schemaVersion !== schemaVersion) {
    const seed = readJson(seedPath, null) || runtime || {};
    const merged = {
      ...seed,
      ...(runtime || {}),
      metadata: {
        ...(seed.metadata || {}),
        ...(runtime?.metadata || {}),
        schemaVersion,
        isSynthetic: true,
        title: 'SmartAqua – dữ liệu trình diễn',
      },
    };
    writeJsonAtomic(runtimeFile, merged);
  }

  const ready=readJson(runtimeFile);
  assertEelDataset(ready);
  return ready;
}

function withLock(task) {
  const lockWaitMs = 100;
  const started = Date.now();
  while (fs.existsSync(LOCK_FILE)) {
    if (Date.now() - started > 3000) {
      throw new Error('Data store is busy. Please retry in a moment.');
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, lockWaitMs);
  }

  fs.writeFileSync(LOCK_FILE, String(Date.now()), 'utf8');
  try {
    return task();
  } finally {
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch {}
  }
}

function backupRuntime() {
  const runtime = readJson(runtimeFile, null);
  if (!runtime) return;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(backupDir, `data-backup-${timestamp}.json`);
  writeJsonAtomic(target, runtime);
}

export function createDataStore() {
  ensureRuntimeData();

  return {
    getAll() {
      return readJson(runtimeFile, { metadata: { schemaVersion } });
    },
    listCollections() {
      const db = this.getAll();
      return Object.keys(db).filter((key) => key !== 'metadata');
    },
    getCollection(name) {
      const db = this.getAll();
      return Array.isArray(db[name]) ? db[name] : [];
    },
    upsertCollection(name, rows) {
      return withLock(() => {
        const db = this.getAll();
        const target = readJson(runtimeFile, null) || db;
        db[name] = rows;
        assertEelDataset(db);
        backupRuntime();
        writeJsonAtomic(runtimeFile, { ...target, ...db, metadata: { ...(target.metadata || {}), ...(db.metadata || {}), schemaVersion } });
        return this.getAll();
      });
    },
    replaceAll(nextDb) {
      return withLock(() => {
        assertEelDataset(nextDb);
        backupRuntime();
        writeJsonAtomic(runtimeFile, { ...nextDb, metadata: { ...nextDb.metadata, schemaVersion } });
        return this.getAll();
      });
    },
    resetToSeed() {
      return withLock(() => {
        const seedPath = path.join(seedDir, 'data.json');
        const seed = readJson(seedPath, null);
        if (!seed) {
          throw new Error('Seed file not found');
        }
        backupRuntime();
        writeJsonAtomic(runtimeFile, { ...seed, metadata: { ...seed.metadata, schemaVersion, runtimeSource: 'seed' } });
        return this.getAll();
      });
    },
    exportSnapshot(filePath) {
      const db = this.getAll();
      writeJsonAtomic(filePath, db);
      return filePath;
    },
  };
}

