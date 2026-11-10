import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = JSON.parse(fs.readFileSync(path.join(root, 'src/data/data.json'), 'utf8'));
const pad = (value) => String(value).padStart(2, '0');
const addDays = (date, days) => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
const mockSource = { source: 'MOCK_DATA', verificationStatus: 'needs_review', mockBatchId: 'mock-history-2024-v1' };
const records = {
  farmingCycles: [], stockingEvents: [], feedDiaries: [], medicationDiaries: [],
  environmentObservations: [], growthObservations: [], harvests: [], healthEvents: [],
};

const speciesById = new Map(base.species.map((item) => [item.id, item]));
const seedsBySpecies = new Map();
for (const seed of base.seedBatches) {
  if (!seedsBySpecies.has(seed.speciesId)) seedsBySpecies.set(seed.speciesId, seed);
}

base.ponds.forEach((pond, index) => {
  const priorCycles = base.farmingCycles.filter((cycle) => cycle.pondId === pond.id);
  const speciesId = priorCycles[0]?.speciesId || base.species[index % base.species.length]?.id;
  const species = speciesById.get(speciesId);
  const seed = seedsBySpecies.get(speciesId);
  const n = index + 1;
  const stockingDate = `2024-${pad((index % 8) + 1)}-${pad(3 + ((index * 7) % 24))}`;
  const days = Number(species?.typicalDays || 120);
  const expectedHarvestDate = addDays(stockingDate, days);
  const stockingQuantity = 52000 + ((index * 1379) % 26000);
  const harvestedQuantity = Math.round(stockingQuantity * (0.62 + (index % 7) * 0.015) * (0.022 + (index % 3) * 0.001));
  const cycleId = `CH24-${pad(n)}`;
  records.farmingCycles.push({
    ...mockSource, id: cycleId, code: `VU-MP24-${pad(n)}`, pondId: pond.id, speciesId,
    seedBatchId: seed?.id || null, stockingDate, stockingQuantity, status: 'completed',
    expectedHarvestDate, notes: 'Dữ liệu mô phỏng bổ sung · vụ lịch sử 2024',
  });
  records.stockingEvents.push({ ...mockSource, id: `ST-MP24-${pad(n)}`, cycleId, date: stockingDate, quantity: stockingQuantity });
  records.harvests.push({
    ...mockSource, id: `HR-MP24-${pad(n)}`, cycleId, date: expectedHarvestDate,
    quantityKg: harvestedQuantity, notes: 'Thu hoạch mô phỏng · vụ lịch sử 2024',
  });

  for (const [entry, dayOffset] of [15, 32, 50, 68, 86, 102].entries()) {
    records.feedDiaries.push({
      ...mockSource, id: `FE-MP24-${pad(n)}-${entry + 1}`, cycleId,
      date: addDays(stockingDate, dayOffset), productId: index % 2 ? 'FD1' : 'FD2',
      amountKg: Math.round((harvestedQuantity * 1.28 / 6) * 10) / 10,
      notes: 'Lịch cho ăn mô phỏng theo giai đoạn nuôi',
    });
  }
  for (const [entry, dayOffset] of [30, 75, 100].entries()) {
    records.environmentObservations.push({
      ...mockSource, id: `EN-MP24-${pad(n)}-${entry + 1}`, cycleId,
      date: addDays(stockingDate, dayOffset), ph: Number((7.1 + ((index + entry) % 9) * 0.1).toFixed(1)),
      temperature: Number((27.4 + ((index * 2 + entry) % 18) * 0.1).toFixed(1)),
      oxygen: Number((4.6 + ((index + entry * 3) % 12) * 0.1).toFixed(1)),
      notes: 'Quan trắc mô phỏng',
    });
  }
  for (const [entry, dayOffset] of [48, 88].entries()) {
    records.growthObservations.push({
      ...mockSource, id: `GR-MP24-${pad(n)}-${entry + 1}`, cycleId,
      date: addDays(stockingDate, dayOffset), averageGrams: Number((8 + entry * 6 + (index % 5) * 0.4).toFixed(1)),
      notes: 'Theo dõi tăng trưởng mô phỏng',
    });
  }
  if (index % 3 === 0) {
    records.medicationDiaries.push({
      ...mockSource, id: `ME-MP24-${pad(n)}`, cycleId, date: addDays(stockingDate, 74),
      productId: index % 2 ? 'MD1' : 'MD2', amount: Number((0.5 + (index % 5) * 0.2).toFixed(1)),
      notes: 'Ghi nhận mô phỏng; không phải hướng dẫn sử dụng',
    });
  }
  if (index % 8 === 0) {
    records.healthEvents.push({
      ...mockSource, id: `HE-MP24-${pad(n)}`, cycleId, date: addDays(stockingDate, 82),
      summary: 'Theo dõi hoạt động ao theo kịch bản mô phỏng', status: 'resolved',
    });
  }
});

const output = {
  metadata: { id: 'mock-history-2024-v1', source: 'MOCK_DATA', label: 'Dữ liệu mô phỏng', year: 2024, generatedFrom: 'src/data/data.json pond ids', geometryIncluded: false },
  ...records,
};
fs.writeFileSync(path.join(root, 'src/data/mock-history-2024.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Generated 2024 mock history for ${base.ponds.length} existing ponds (${Object.entries(records).map(([key, rows]) => `${key}: ${rows.length}`).join(', ')}).`);
