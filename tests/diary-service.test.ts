// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

let store: typeof import('../src/store/demoStore').store;
let diaryService: typeof import('../src/services/diaryService').diaryService;

describe('pond diary service', () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    ({ store } = await import('../src/store/demoStore'));
    store.reset();
    store.setRole('farmer');
    ({ diaryService } = await import('../src/services/diaryService'));
  });

  it('creates, updates, reloads from the same DemoDB collection and deletes a diary', async () => {
    const db = store.snapshot().db;
    const pond = db.ponds.find((item: any) => item.id === 'P001');
    const cycle = db.farmingCycles.find((item: any) => item.pondId === pond.id && item.status === 'active');
    const created = await diaryService.create('feedDiaries', {
      cycleId: cycle.id, date: new Date().toISOString().slice(0, 10), productId: db.feedProducts[0].id,
      amountKg: 2.5, feedingTimes: 2, feedingTime: '07:00, 17:00', notes: 'Bản ghi kiểm thử',
    });
    expect(store.snapshot().db.feedDiaries.some((item: any) => item.id === created.id)).toBe(true);
    expect(created.pondId).toBe(pond.id);
    expect(created.source).toBe('USER_INPUT');

    vi.resetModules();
    ({ store } = await import('../src/store/demoStore'));
    ({ diaryService } = await import('../src/services/diaryService'));
    expect(store.snapshot().db.feedDiaries.some((item: any) => item.id === created.id)).toBe(true);

    await diaryService.update(created.id, 'feedDiaries', { ...created, amountKg: 3, notes: 'Đã cập nhật' });
    expect((await diaryService.getById(created.id))?.record.amountKg).toBe(3);
    await diaryService.delete(created.id);
    expect(await diaryService.getById(created.id)).toBeNull();
  });

  it('rejects invalid cycle links, negative values and read-only role writes', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await expect(diaryService.create('feedDiaries', { cycleId: 'missing-cycle', date: today, productId: 'FD1', amountKg: 1 })).rejects.toThrow('Không tìm thấy vụ nuôi');
    const cycle = store.snapshot().db.farmingCycles.find((item: any) => item.pondId === 'P001' && item.status === 'active');
    await expect(diaryService.create('feedDiaries', { cycleId: cycle.id, date: today, productId: 'FD1', amountKg: -2 })).rejects.toThrow('không âm');
    const otherCycle = store.snapshot().db.farmingCycles.find((item: any) => item.pondId !== 'P001' && item.status === 'active');
    if (otherCycle) await expect(diaryService.create('feedDiaries', { cycleId: otherCycle.id, date: today, productId: 'FD1', amountKg: 1 }, 'P001')).rejects.toThrow('không thuộc ao đang mở');
    store.setRole('manager');
    await expect(diaryService.create('environmentObservations', { cycleId: cycle.id, date: today, ph: 7.5 })).rejects.toThrow('chỉ được xem');
  });

  it('allows empty environment measures but requires at least one recorded measurement', async () => {
    const cycle = store.snapshot().db.farmingCycles.find((item: any) => item.pondId === 'P001' && item.status === 'active');
    const today = new Date().toISOString().slice(0, 10);
    await expect(diaryService.create('environmentObservations', { cycleId: cycle.id, date: today, ph: '', temperature: '', oxygen: '' })).rejects.toThrow('ít nhất một chỉ số');
    const result = await diaryService.create('environmentObservations', { cycleId: cycle.id, date: today, ph: 7.4, temperature: '', oxygen: '' });
    expect(result.ph).toBe(7.4);
    expect(result.temperature).toBeNull();
  });

  it('stores a demo image-analysis result in the pond health diary and restores it after reload', async () => {
    const db = store.snapshot().db;
    const pond = db.ponds.find((item: any) => item.id === 'P001');
    const cycle = db.farmingCycles.find((item: any) => item.pondId === pond.id && item.status === 'active');
    const result = await diaryService.create('healthEvents', {
      cycleId: cycle.id, date: new Date().toISOString().slice(0, 10),
      summary: 'Ghi nhận sức khỏe lươn mô phỏng, chưa có nhận định chuyên môn.',
      observation: 'Đốm đỏ / xuất huyết', symptoms: 'Các chấm đỏ trên da',
      analysisResult: { mode: 'demo', diagnosticStatus: 'unconfirmed', species: 'Lươn đồng', suspectedCondition: null },
      imageRef: '/images/eel-tanks.svg', imageStorage: 'static-demo-reference',
    }, pond.id);
    expect((await diaryService.getById(result.id))?.record.analysisResult.diagnosticStatus).toBe('unconfirmed');

    vi.resetModules();
    ({ store } = await import('../src/store/demoStore'));
    ({ diaryService } = await import('../src/services/diaryService'));
    const restored = await diaryService.getById(result.id);
    expect(restored?.record.pondId).toBe(pond.id);
    expect(restored?.record.cycleId).toBe(cycle.id);
    expect(restored?.record.imageRef).toBe('/images/eel-tanks.svg');
  });
});
