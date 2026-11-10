import type { DataSourceType, VerificationStatus } from '../sources';

/** Loại quan hệ vùng nuôi × đơn vị hành chính (nhiều–nhiều). */
export type ZoneAdminRelationshipType = 'intersects' | 'contains' | 'within';

/**
 * Quan hệ vùng nuôi × xã/phường. Được xác lập từ hình học có nguồn tin cậy
 * (giao cắt đa giác) — KHÔNG tạo quan hệ dựa trên khoảng cách gần nhất.
 */
export interface ZoneAdministrativeUnit {
  zoneId: string;
  administrativeUnitId: string;
  communeCode: string;
  relationshipType: ZoneAdminRelationshipType;
  /** Diện tích phần giao (km²) nếu tính được. */
  intersectionAreaKm2: number | null;
  shareOfZone: number | null;
  method: string;
  source: DataSourceType;
  verificationStatus: VerificationStatus;
}
