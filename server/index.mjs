import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { createDataStore } from './dataStore.mjs';
import {assertEelDataset} from './validateDataset.mjs';

const app = express();
const port = Number(process.env.PORT || 8080);
const store = createDataStore();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: 'demo-json-backend', timestamp: new Date().toISOString() });
});

app.get('/api/data', (_req, res) => {
  res.json(store.getAll());
});
app.get('/api/eel-public-data',(_req,res)=>res.sendFile(path.resolve('src/data/eel-public-data.json')));

app.post('/api/data', (req, res) => {
  try {
    const nextDb = req.body;
    assertEelDataset(nextDb);
    const result = store.replaceAll(nextDb);
    return res.json({ ok: true, data: result });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Save failed' });
  }
});

app.get('/api/data/:collection', (req, res) => {
  const { collection } = req.params;
  const rows = store.getCollection(collection);
  res.json(rows);
});
app.get('/api/data/:collection/:id',(req,res)=>{const item=store.getCollection(req.params.collection).find(r=>r.id===req.params.id);return item?res.json(item):res.status(404).json({error:'Không tìm thấy bản ghi'});});

app.post('/api/data/:collection', (req, res) => {
  const { collection } = req.params;
  const input = req.body;
  const current = store.getCollection(collection);
  const existing = current.find((row) => row.id === input.id);
  const next = existing ? current.map((row) => row.id === input.id ? { ...row, ...input } : row) : [input, ...current];
  try {
    const db = store.upsertCollection(collection, next);
    res.status(201).json({ ok: true, item: input, data: db });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Upsert failed' });
  }
});

app.put('/api/data/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  const current = store.getCollection(collection);
  const index = current.findIndex((row) => row.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy bản ghi' });
  }
  const merged = { ...current[index], ...req.body };
  const next = current.map((row) => row.id === id ? merged : row);
  const db = store.upsertCollection(collection, next);
  return res.json({ ok: true, item: merged, data: db });
});

app.delete('/api/data/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  const current = store.getCollection(collection);
  const next = current.filter((row) => row.id !== id);
  const db = store.upsertCollection(collection, next);
  return res.json({ ok: true, removedId: id, data: db });
});

app.get('/api/demo/export', (_req, res) => {
  const fileName = `smart-aqua-runtime-${Date.now()}.json`;
  const filePath = path.join(process.cwd(), 'data', 'exports', fileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  store.exportSnapshot(filePath);
  res.download(filePath, fileName);
});

app.post('/api/demo/reset', (_req, res) => {
  try {
    const db = store.resetToSeed();
    res.json({ ok: true, data: db });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Reset failed' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`SmartAqua demo backend running at http://localhost:${port}`);
});
