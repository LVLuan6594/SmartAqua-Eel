import { getActiveAccount } from '../auth/authService';
import { pondScope } from '../domain/selectors';
import { store } from '../store/demoStore';
import type { Role } from '../types/models';
import { demoDiaryRepository } from './repositories/demoDiaryRepository';
import { createId } from '../utils/createId';

export type DiaryCollection = 'feedDiaries' | 'medicationDiaries' | 'environmentObservations' | 'growthObservations' | 'healthEvents';
export type DiaryRecord = { id: string; cycleId: string; date: string; notes?: string; createdAt?: string; createdBy?: string; updatedAt?: string; updatedBy?: string; [key: string]: any };
export type DiaryInput = { cycleId: string; date: string; notes?: string; [key: string]: any };

const collectionFor = (kind: string): DiaryCollection => {
  if (['feedDiaries', 'medicationDiaries', 'environmentObservations', 'growthObservations', 'healthEvents'].includes(kind)) return kind as DiaryCollection;
  throw new Error('Loại nhật ký không hợp lệ.');
};
const now = () => new Date().toISOString();
const actor = () => getActiveAccount();
const authorize = (collection: DiaryCollection, action: 'create' | 'update' | 'delete', pondId: string) => {
  const { db, role } = store.snapshot();
  const account = actor();
  const pond = (db.ponds as any[]).find(item => item.id === pondId);
  if (!pond) throw new Error('Không tìm thấy bể nuôi.');
  if (role === 'manager') throw new Error('Vai trò lãnh đạo địa phương chỉ được xem nhật ký.');
  if (role === 'admin') return account?.name || 'Quản trị viên';
  const allowed = pondScope(db, role as Role).some(item => item.id === pondId);
  if (!allowed) throw new Error('Bể nuôi nằm ngoài phạm vi được phân quyền.');
  if (role === 'coop') {
    const permissions = account?.permissions || [];
    if (!permissions.includes('diaries:' + action) && !permissions.includes(collection + ':' + action)) {
      throw new Error('Tài khoản HTX chưa được cấp quyền thao tác nhật ký này.');
    }
  } else if (role !== 'farmer') throw new Error('Vai trò hiện tại không được phép ghi nhật ký.');
  return account?.name || account?.username || (role === 'farmer' ? 'Nông dân' : 'Người dùng');
};
const validate = (input: DiaryInput, collection: DiaryCollection, expectedPondId?: string) => {
  if(input.analysisResult?.species&&!String(input.analysisResult.species).toLowerCase().includes('lươn'))throw new Error('Nhật ký này chỉ tiếp nhận kết quả về lươn.');
  const { db } = store.snapshot();
  if (!input.cycleId) throw new Error('Vui lòng chọn vụ nuôi.');
  const [dateYear, dateMonth, dateDay] = String(input.date || '').split('-').map(Number);
  const parsedDate = new Date(dateYear, dateMonth - 1, dateDay);
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || parsedDate.getFullYear() !== dateYear || parsedDate.getMonth() !== dateMonth - 1 || parsedDate.getDate() !== dateDay) throw new Error('Vui lòng nhập ngày ghi nhận hợp lệ.');
  const cycle = (db.farmingCycles as any[]).find(item => item.id === input.cycleId);
  if (!cycle) throw new Error('Không tìm thấy vụ nuôi đã chọn.');
  const pond = (db.ponds as any[]).find(item => item.id === cycle.pondId);
  if (!pond) throw new Error('Vụ nuôi chưa được liên kết với ao hợp lệ.');
  if (expectedPondId && pond.id !== expectedPondId) throw new Error('Vụ nuôi đã chọn không thuộc ao đang mở.');
  if (input.date < String(cycle.stockingDate || '').slice(0, 10)) throw new Error('Ngày ghi nhận không thể trước ngày thả giống của vụ nuôi.');
  const endDate = cycle.endDate || cycle.harvestDate;
  if (endDate && input.date > String(endDate).slice(0, 10)) throw new Error('Ngày ghi nhận nằm sau thời gian của vụ nuôi.');
  if (input.date > new Date().toISOString().slice(0, 10)) throw new Error('Ngày ghi nhận không thể nằm trong tương lai.');
  const positiveFields: Record<string, string[]> = {
    feedDiaries: ['amountKg', 'feedingTimes'], medicationDiaries: ['amount', 'quantity', 'dosage'],
    environmentObservations: ['temperature', 'ph', 'salinity', 'oxygen', 'alkalinity'],
    growthObservations: ['averageGrams', 'averageLengthCm', 'sampleCount'], healthEvents: ['mortalityCount'],
  };
  for (const field of positiveFields[collection]) {
    const value = input[field];
    if (value === '' || value === null || value === undefined) continue;
    if (!Number.isFinite(Number(value)) || Number(value) < 0) throw new Error('Trường "' + field + '" phải là số không âm.');
  }
  if (collection === 'feedDiaries' && (!(input.productId || String(input.productName || '').trim()) || Number(input.amountKg) <= 0)) throw new Error('Nhập loại thức ăn và lượng thức ăn lớn hơn 0 kg.');
  if (collection === 'medicationDiaries' && (!(input.productId || String(input.productName || '').trim()) || Number(input.amount ?? input.quantity) <= 0 || !String(input.unit || '').trim() || (input.dosage !== '' && input.dosage != null && !String(input.dosageUnit || '').trim()))) throw new Error('Nhập tên sản phẩm, lượng sử dụng và đơn vị. Nếu có liều lượng, hãy nhập đơn vị tương ứng.');
  if (collection === 'environmentObservations' && !['temperature', 'ph', 'salinity', 'oxygen', 'alkalinity'].some(field => input[field] !== '' && input[field] != null)) throw new Error('Nhập ít nhất một chỉ số môi trường đã đo.');
  if (collection === 'growthObservations' && (!Number(input.averageGrams) || Number(input.averageGrams) <= 0)) throw new Error('Nhập khối lượng trung bình lớn hơn 0 g.');
  if (collection === 'healthEvents' && !String(input.summary || input.observation || '').trim()) throw new Error('Nhập tình trạng quan sát được.');
  return pond.id as string;
};
const normalizeInput = (input: DiaryInput): DiaryInput => Object.fromEntries(Object.entries(input).map(([key, value]) => [key, typeof value === 'string' && value.trim() === '' && ['amountKg','feedingTimes','amount','quantity','dosage','temperature','ph','salinity','oxygen','alkalinity','averageGrams','averageLengthCm','sampleCount','mortalityCount'].includes(key) ? null : value])) as DiaryInput;

/** Adapter/service for the existing local DemoDB collections; it does not maintain a second journal store. */
export const diaryService = {
  getByPond: (pondId: string) => demoDiaryRepository.getByPond(pondId),
  getByCycle: (cycleId: string) => demoDiaryRepository.getByCycle(cycleId),
  getById: (id: string) => demoDiaryRepository.getById(id),
  async create(kind: string, input: DiaryInput, expectedPondId?: string) {
    const collection = collectionFor(kind); const values = normalizeInput(input); const pondId = validate(values, collection, expectedPondId); const createdBy = authorize(collection, 'create', pondId);
    const record = { ...values, id: createId('diary'), pondId, source: 'USER_INPUT', createdAt: now(), createdBy } as DiaryRecord;
    await demoDiaryRepository.create(collection, record);
    return record;
  },
  async update(id: string, kind: string, input: DiaryInput, expectedPondId?: string) {
    const collection = collectionFor(kind); const existing = await demoDiaryRepository.getById(id);
    if (!existing || existing.collection !== collection) throw new Error('Không tìm thấy nhật ký cần chỉnh sửa.');
    const values = normalizeInput(input); const pondId = validate(values, collection, expectedPondId); const actorName = authorize(collection, 'update', pondId);
    const cycle = (store.snapshot().db.farmingCycles as any[]).find(item => item.id === values.cycleId);
    if (!cycle || cycle.pondId !== pondId) throw new Error('Vụ nuôi không thuộc ao của nhật ký.');
    const record = { ...existing.record, ...values, id, pondId, source: existing.record.source || 'USER_INPUT', updatedAt: now(), updatedBy: actorName };
    await demoDiaryRepository.update(collection, record);
    return record;
  },
  async delete(id: string) {
    const existing = await demoDiaryRepository.getById(id);
    if (!existing) throw new Error('Không tìm thấy nhật ký cần xóa.');
    const { db } = store.snapshot(); const cycle = (db.farmingCycles as any[]).find(item => item.id === existing.record.cycleId);
    if (!cycle) throw new Error('Không xác định được ao của nhật ký.');
    authorize(existing.collection, 'delete', cycle.pondId);
    await demoDiaryRepository.delete(existing.collection, id);
  },
};
