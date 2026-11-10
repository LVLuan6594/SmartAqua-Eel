import type { EntityBase } from '../sources';

/**
 * Hợp tác xã. Phạm vi quản lý (địa bàn, vùng, cơ sở) được giao tường minh —
 * KHÔNG mặc định gán mọi hộ trong một xã cho một HTX.
 */
export interface Cooperative extends EntityBase {
  code: string;
  name: string;
  /** Địa bàn hoạt động (mã đơn vị hành chính). */
  scopeCommuneCodes: string[];
  /** Vùng nuôi trong phạm vi quản lý (id vùng). */
  zoneIds: string[];
  /** Vùng mock liên quan (areaIds) – giữ tương thích dữ liệu demo. */
  areaIds: string[];
  status: string;
  contact?: string | null;
  /** Id nông dân/cơ sở được giao (nếu có thông tin xác minh). */
  facilityIds: string[];
}
