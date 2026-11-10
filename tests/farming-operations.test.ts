// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { store } from '../src/store/demoStore';
import { assertCanStartCycle, recordHarvest, saveFarmingCycle } from '../src/services/farmingOperationsService';

describe('farming operation state validation', () => {
  beforeEach(() => store.reset());
  afterEach(() => store.reset());

  it('blocks a second uncompleted cycle for the same pond at service level', () => {
    const db = store.snapshot().db;
    const existing = db.farmingCycles.find((cycle: any) => cycle.pondId === 'P001' && cycle.status !== 'completed');
    expect(existing).toBeTruthy();
    expect(() => assertCanStartCycle(db, 'P001', 'new-cycle')).toThrow();
    expect(() => saveFarmingCycle({ id: 'new-cycle', pondId: 'P001', status: 'active' })).toThrow();
    expect(store.snapshot().db.farmingCycles.some((cycle: any) => cycle.id === 'new-cycle')).toBe(false);
  });

  it('allows multiple harvest batches without ending the cycle, then ends only when confirmed', () => {
    const cycle = store.snapshot().db.farmingCycles.find((item: any) => item.pondId === 'P001' && ['active', 'harvesting'].includes(item.status)) as any;
    expect(cycle).toBeTruthy();
    const harvestDate = cycle.stockingDate > '2020-01-01' ? cycle.stockingDate : '2020-01-02';
    recordHarvest({ id: 'harvest-batch-a', cycleId: cycle.id, date: harvestDate, quantityKg: 12 });
    expect(store.snapshot().db.farmingCycles.find((item: any) => item.id === cycle.id)?.status).toBe('harvesting');
    recordHarvest({ id: 'harvest-batch-b', cycleId: cycle.id, date: harvestDate, quantityKg: 8 });
    expect(store.snapshot().db.harvests.filter((item: any) => item.id.startsWith('harvest-batch-'))).toHaveLength(2);
    expect(store.snapshot().db.farmingCycles.find((item: any) => item.id === cycle.id)?.status).toBe('harvesting');

    recordHarvest({ id: 'harvest-final', cycleId: cycle.id, date: harvestDate, quantityKg: 5 }, true);
    expect(store.snapshot().db.farmingCycles.find((item: any) => item.id === cycle.id)?.status).toBe('completed');
    expect(() => recordHarvest({ id: 'harvest-after-close', cycleId: cycle.id, date: harvestDate, quantityKg: 1 })).toThrow();
  });

  it('rejects harvests without a valid active cycle and does not persist a record', () => {
    const cycle = store.snapshot().db.farmingCycles.find((item: any) => item.pondId === 'P001' && ['active', 'harvesting'].includes(item.status)) as any;
    store.transaction((db) => { (db.farmingCycles.find((item: any) => item.id === cycle.id) as any).status = 'completed'; return db; }, 'test-close-cycle');
    const count = store.snapshot().db.harvests.length;
    expect(() => recordHarvest({ id: 'invalid-harvest', cycleId: cycle.id, date: '2026-01-01', quantityKg: 1 })).toThrow();
    expect(store.snapshot().db.harvests).toHaveLength(count);
  });
});
