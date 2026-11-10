import type { DataQuality } from '../sources';
import type { Pond } from '../entities/Pond';
import type { FarmingCycle } from '../entities/FarmingCycle';
import type { Harvest } from '../entities/Harvest';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Ngày ISO hợp lệ (YYYY-MM-DD, tồn tại thật). */
export function isValidIsoDate(value: string | null | undefined): boolean {
  if (!value || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Miền toạ độ hợp lệ cho TP. Cần Thơ (WGS84). */
export const CAN_THO_BBOX = { minLat: 8.5, maxLat: 11.2, minLng: 103.0, maxLng: 107.6 };

export function isValidCoordinate(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat == null || lng == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= CAN_THO_BBOX.minLat && lat <= CAN_THO_BBOX.maxLat && lng >= CAN_THO_BBOX.minLng && lng <= CAN_THO_BBOX.maxLng;
}

export function isValidCode(code: string | null | undefined): boolean {
  return typeof code === 'string' && code.trim().length > 0;
}

/** Đơn vị m² → ha (1 ha = 10.000 m²). */
export const m2ToHa = (m2: number | null | undefined): number | null =>
  m2 == null ? null : Math.round((m2 / 10000) * 10000) / 10000;

function issue(recordId: string, field: string, issueType: string, notes: string): DataQuality {
  return {
    recordId,
    field,
    validationStatus: 'invalid',
    verificationStatus: 'needs_review',
    issueType,
    reviewNotes: notes,
    resolutionStatus: 'open',
  };
}

/** Kiểm tra tính hợp lệ của một ao; trả về danh sách vấn đề (rỗng = hợp lệ). */
export function validatePond(pond: Pond): DataQuality[] {
  const out: DataQuality[] = [];
  if (!isValidCode(pond.code)) out.push(issue(pond.id, 'code', 'MISSING_CODE', 'Ao thiếu mã gốc.'));
  if (pond.lat != null || pond.lng != null) {
    if (!isValidCoordinate(pond.lat, pond.lng)) out.push(issue(pond.id, 'lat/lng', 'INVALID_COORDINATE', 'Toạ độ ngoài miền hoặc thiếu cặp lat/lng.'));
  }
  if (pond.areaM2 != null && pond.areaM2 <= 0) out.push(issue(pond.id, 'areaM2', 'INVALID_AREA', 'Diện tích phải lớn hơn 0.'));
  return out;
}

/** Kiểm tra vụ nuôi hợp lệ và không trùng thời gian bất hợp lệ với vụ khác cùng ao. */
export function validateCycle(cycle: FarmingCycle, siblings: FarmingCycle[] = []): DataQuality[] {
  const out: DataQuality[] = [];
  if (!cycle.pondId) out.push(issue(cycle.id, 'pondId', 'MISSING_POND', 'Vụ nuôi không liên kết ao.'));
  if (!isValidIsoDate(cycle.stockingDate)) out.push(issue(cycle.id, 'stockingDate', 'INVALID_DATE', 'Ngày thả giống không hợp lệ.'));
  if (cycle.stockingQuantity != null && cycle.stockingQuantity <= 0) out.push(issue(cycle.id, 'stockingQuantity', 'INVALID_QUANTITY', 'Số lượng thả phải lớn hơn 0.'));
  const open = ['active', 'harvesting'];
  for (const other of siblings) {
    if (other.id === cycle.id || other.pondId !== cycle.pondId) continue;
    if (open.includes(cycle.status) && open.includes(other.status)) {
      out.push(issue(cycle.id, 'status', 'CYCLE_OVERLAP', `Ao đã có vụ đang hoạt động (${other.code || other.id}).`));
      break;
    }
  }
  return out;
}

/** Kiểm tra phiếu thu hoạch. */
export function validateHarvest(h: Harvest): DataQuality[] {
  const out: DataQuality[] = [];
  if (!h.cycleId) out.push(issue(h.id, 'cycleId', 'MISSING_CYCLE', 'Phiếu thu hoạch không liên kết vụ nuôi.'));
  if (!isValidIsoDate(h.date)) out.push(issue(h.id, 'date', 'INVALID_DATE', 'Ngày thu hoạch không hợp lệ.'));
  if (!(h.quantityKg > 0)) out.push(issue(h.id, 'quantityKg', 'INVALID_QUANTITY', 'Sản lượng phải lớn hơn 0.'));
  return out;
}
