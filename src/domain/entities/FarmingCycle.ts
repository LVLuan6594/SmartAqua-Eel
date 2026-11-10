import type { EntityBase } from '../sources';

export type CycleStatus = 'preparing' | 'active' | 'harvesting' | 'completed' | 'paused' | string;

/**
 * Vụ nuôi. Luôn liên kết đúng một ao (`pondId`); một ao có nhiều vụ theo thời gian.
 */
export interface FarmingCycle extends EntityBase {
  code: string;
  pondId: string;
  speciesId: string | null;
  speciesName: string | null;
  /** Ngày bắt đầu/thả giống. */
  stockingDate: string | null;
  stockingQuantity: number | null;
  seedBatchId: string | null;
  seedSource: string | null;
  status: CycleStatus;
  expectedHarvestDate: string | null;
  endDate: string | null;
  summary: string | null;
  notes?: string | null;
}
