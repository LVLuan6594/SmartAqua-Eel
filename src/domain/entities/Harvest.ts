import type { EntityBase } from '../sources';

/**
 * Phiếu thu hoạch. Một vụ nuôi được phép có nhiều đợt thu hoạch (nhiều phiếu).
 */
export interface Harvest extends EntityBase {
  cycleId: string;
  pondId: string | null;
  date: string;
  quantityKg: number;
  quantityUnit: 'kg';
  /** Số đợt (theo vụ). */
  batchNo: number | null;
  status: string;
  updatedBy: string | null;
  notes?: string | null;
}
