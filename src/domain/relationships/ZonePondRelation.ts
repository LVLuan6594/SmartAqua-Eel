import type { DataSourceType, VerificationStatus } from '../sources';

/** Cách suy ra quan hệ ao × vùng nuôi. */
export type ZonePondMethod =
  | 'declared_area' // ao thuộc vùng theo dữ liệu khai báo (mock areaId)
  | 'point_in_polygon' // điểm đại diện ao nằm trong polygon vùng
  | 'geometry_intersects'; // polygon ao giao polygon vùng

/**
 * Quan hệ ao × vùng nuôi. Trường hợp chỉ có toạ độ: ghi rõ quan hệ SUY RA từ
 * điểm đại diện (không coi là ranh giới ao đã xác minh).
 */
export interface ZonePondRelation {
  zoneId: string;
  pondId: string;
  method: ZonePondMethod;
  /** true nếu quan hệ suy ra từ điểm đại diện (độ tin cậy thấp hơn). */
  derivedFromPoint: boolean;
  source: DataSourceType;
  verificationStatus: VerificationStatus;
}
