import { store } from '../../store/demoStore';
import type { DiaryCollection, DiaryRecord } from '../diaryService';

/** Persistence adapter over the existing DemoDB diary collections (no second data store). */
export const demoDiaryRepository = {
  async getByPond(pondId: string): Promise<{ collection: DiaryCollection; record: DiaryRecord }[]> {
    const { db } = store.snapshot();
    const cycles = new Set((db.farmingCycles as any[]).filter(cycle => cycle.pondId === pondId).map(cycle => cycle.id));
    return (['feedDiaries', 'medicationDiaries', 'environmentObservations', 'growthObservations', 'healthEvents'] as DiaryCollection[])
      .flatMap(collection => ((db[collection] || []) as DiaryRecord[]).filter(record => cycles.has(record.cycleId)).map(record => ({ collection, record })));
  },
  async getByCycle(cycleId: string) {
    const { db } = store.snapshot();
    return (['feedDiaries', 'medicationDiaries', 'environmentObservations', 'growthObservations', 'healthEvents'] as DiaryCollection[])
      .flatMap(collection => ((db[collection] || []) as DiaryRecord[]).filter(record => record.cycleId === cycleId).map(record => ({ collection, record })));
  },
  async getById(id: string) {
    const { db } = store.snapshot();
    for (const collection of ['feedDiaries', 'medicationDiaries', 'environmentObservations', 'growthObservations', 'healthEvents'] as DiaryCollection[]) {
      const record = ((db[collection] || []) as DiaryRecord[]).find(item => item.id === id);
      if (record) return { collection, record };
    }
    return null;
  },
  async create(collection: DiaryCollection, record: DiaryRecord) { store.upsert(collection, record); return record; },
  async update(collection: DiaryCollection, record: DiaryRecord) { store.upsert(collection, record); return record; },
  async delete(collection: DiaryCollection, id: string) { store.remove(collection, id); },
};
