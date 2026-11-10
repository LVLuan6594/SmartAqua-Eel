import type { EntityBase } from '../sources';
import type { Geometry } from '../../features/gis/types';

export type ZoneGeometryStatus = 'verified' | 'digitized' | 'derived' | 'unavailable' | 'synthetic';
export type ZoneDataStatus = 'verified' | 'partial' | 'mock';

/**
 * Vùng nuôi. Một vùng nuôi có thể giao nhiều xã/phường (quan hệ nhiều–nhiều,
 * xem `ZoneAdministrativeUnit`). Nếu chỉ có toạ độ đại diện thì KHÔNG tạo polygon.
 */
export interface AquacultureZone extends EntityBase {
  /** Khóa vùng (giữ nguyên mã nguồn: Z-OSM-01, ZM01, Z-SCT-01…). */
  zoneId: string;
  code: string;
  name: string;
  aquacultureType: string;
  species: string[];
  geometryStatus: ZoneGeometryStatus;
  dataStatus: ZoneDataStatus;
  totalAreaHa: number | null;
  /** Mã xã/phường giao cắt (dẫn xuất, xem ZoneAdministrativeUnit để biết diện tích giao). */
  communeCodes: string[];
  /** Liên kết tới vùng mock (aquacultureAreas) – rỗng với vùng dữ liệu thực. */
  areaIds: string[];
  coopIds: string[];
  geometry: Geometry | null;
  geometrySourceId?: string | null;
  updatedAt?: string | null;
  sourceUrl?: string | null;
}
