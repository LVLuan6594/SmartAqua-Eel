import { store } from '../store/demoStore';

const isOpenCycle = (cycle: any) => cycle.status !== 'completed';
const isHarvestableCycle = (cycle: any) => ['active', 'harvesting'].includes(cycle.status);

export function getOpenCycleForPond(pondId: string) {
  return store.snapshot().db.farmingCycles.find((cycle: any) => cycle.pondId === pondId && isOpenCycle(cycle)) || null;
}

export function assertCanStartCycle(db: any, pondId: string, cycleId?: string) {
  if (!db.ponds.some((pond: any) => pond.id === pondId)) throw new Error('Không tìm thấy bể nuôi hợp lệ.');
  const existing = db.farmingCycles.find((cycle: any) => cycle.pondId === pondId && cycle.id !== cycleId && isOpenCycle(cycle));
  if (existing) throw new Error('Bể nuôi này đang có một vụ nuôi chưa kết thúc. Vui lòng hoàn tất hoặc kết thúc vụ nuôi hiện tại trước khi tạo vụ nuôi mới.');
}

export function saveFarmingCycle(record: any) {
  if(record.speciesId!=='SP1')throw new Error('Chỉ được tạo vụ nuôi lươn.');
  store.transaction((db) => {
    if (record.status !== 'completed') assertCanStartCycle(db, record.pondId, record.id);
    else if (!db.ponds.some((pond: any) => pond.id === record.pondId)) throw new Error('Không tìm thấy bể nuôi hợp lệ.');
    const current = db.farmingCycles.find((cycle: any) => cycle.id === record.id);
    const next = current ? { ...current, ...record } : record;
    const rows = db.farmingCycles as any[];
    const index = rows.findIndex((cycle) => cycle.id === record.id);
    if (index < 0) rows.unshift(next); else rows[index] = next;
    return db;
  }, `${record.code ? 'Lưu vụ nuôi' : 'Tạo vụ nuôi'} ${record.id}`);
}

export function finishFarmingCycle(cycleId: string) {
  store.transaction((db) => {
    const cycle = db.farmingCycles.find((item: any) => item.id === cycleId) as any;
    if (!cycle || cycle.status === 'completed') throw new Error('Vụ nuôi không còn ở trạng thái có thể kết thúc.');
    if (!(db.harvests as any[]).some((harvest) => harvest.cycleId === cycleId)) throw new Error('Cần có ít nhất một phiếu thu hoạch hợp lệ trước khi kết thúc vụ.');
    cycle.status = 'completed';
    cycle.endDate = new Date().toISOString().slice(0, 10);
    return db;
  }, `Kết thúc vụ nuôi ${cycleId}`);
}

export interface HarvestInput {
  id: string;
  cycleId: string;
  date: string;
  quantityKg: number;
  notes?: string;
}

export function recordHarvest(input: HarvestInput, finishCycle = false) {
  store.transaction((db) => {
    const cycle = db.farmingCycles.find((item: any) => item.id === input.cycleId) as any;
    if (!cycle || !db.ponds.some((pond: any) => pond.id === cycle.pondId)) throw new Error('Không tìm thấy vụ nuôi hoặc bể nuôi hợp lệ để ghi thu hoạch.');
    if (!isHarvestableCycle(cycle)) throw new Error(cycle.status === 'completed' ? 'Vụ nuôi đã kết thúc; không thể ghi thêm đợt thu hoạch thông thường.' : 'Chỉ có thể ghi thu hoạch cho vụ nuôi đang hoạt động.');
    if (!input.date || (cycle.stockingDate && input.date < cycle.stockingDate)) throw new Error('Ngày thu hoạch phải hợp lệ và không trước ngày thả giống.');
    if (!Number.isFinite(input.quantityKg) || input.quantityKg <= 0) throw new Error('Sản lượng thu hoạch phải lớn hơn 0 kg.');

    const previous = (db.harvests as any[]).filter((harvest) => harvest.cycleId === cycle.id);
    (db.harvests as any[]).unshift({
      ...input,
      pondId: cycle.pondId,
      quantityUnit: 'kg',
      batchNo: previous.length + 1,
      status: finishCycle ? 'final' : 'recorded',
      updatedBy: null,
    });
    // A normal harvest keeps the cycle open for later harvest batches.
    cycle.status = finishCycle ? 'completed' : 'harvesting';
    if (finishCycle) cycle.endDate = input.date;
    return db;
  }, `${finishCycle ? 'Thu hoạch và kết thúc vụ' : 'Ghi đợt thu hoạch'} ${input.cycleId}`);
}
