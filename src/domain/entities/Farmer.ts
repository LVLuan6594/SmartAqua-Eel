import type { EntityBase } from '../sources';

/** Trạng thái liên kết giữa hồ sơ nông dân với tài khoản/cơ sở. */
export type FarmerLinkStatus = 'linked' | 'unlinked' | 'needs_review';

/**
 * Nông dân / hộ quản lý ao. Tài khoản đăng nhập (`accountId`) tách biệt và chỉ
 * tồn tại khi có xác nhận — KHÔNG tự tạo tài khoản từ tên chủ cơ sở trong PDF.
 */
export interface Farmer extends EntityBase {
  code: string;
  name: string;
  /** Id tài khoản liên kết (nếu có). */
  accountId: string | null;
  /** Cơ sở liên quan đã xác minh (nếu có). */
  facilityId: string | null;
  /** HTX được giao (nếu có). */
  cooperativeId: string | null;
  /** Vùng mock liên quan (areaId) – giữ tương thích demo. */
  areaId?: string | null;
  unitId?: string | null;
  /** Ao được phép quản lý (dẫn xuất từ FarmerPondAssignment). */
  pondIds: string[];
  linkStatus: FarmerLinkStatus;
  status: string;
}
