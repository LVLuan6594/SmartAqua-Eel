import type { DataSourceType, EntityBase } from '../sources';
import type { Geometry } from '../../features/gis/types';
import type { CoordinateConfidence } from './AquacultureFacility';

/** Phạm vi áp dụng của hình học/tọa độ (không đồng nhất toạ độ cơ sở với toạ độ ao). */
export type GeometryScope = 'representative_point' | 'pond_boundary' | null;

/**
 * Bể nuôi. Một cơ sở/hộ có thể quản lý nhiều ao; một ao có thể qua nhiều vụ nuôi.
 * Toạ độ (nếu có) thường là điểm đại diện, KHÔNG phải ranh giới ao.
 */
export interface Pond extends EntityBase {
  cooperativeId?: string | null;
  /** Mã ao gốc (giữ nguyên: `92-01-000001-0001` hoặc `BE-001`). */
  code: string;
  name: string | null;
  facilityId: string | null;
  farmerId: string | null;
  /** Vùng mock liên quan (areaId) – giữ tương thích demo. */
  areaId?: string | null;
  communeCode: string | null;
  /** Vùng nuôi liên quan (dẫn xuất qua ZonePondRelation). */
  zoneIds: string[];
  areaM2: number | null;
  areaHa: number | null;
  areaUnit: 'm2' | 'ha' | null;
  species: string[] | string | null;
  lat: number | null;
  lng: number | null;
  geometry?: Geometry | null;
  geometryScope: GeometryScope;
  coordConfidence: CoordinateConfidence;
  /** Trạng thái sử dụng (active…) nếu nguồn có. */
  status: string;
  /** Ao trùng mã nguồn (nếu phát hiện). */
  duplicateOf?: string;
  /** Nguồn ghi nhận toạ độ/đơn vị (để truy vết). */
  origin?: DataSourceType;
}
