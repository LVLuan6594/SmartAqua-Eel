import type { DataSourceType, EntityBase } from '../sources';

/** Loại cơ sở – phân biệt cơ sở nuôi với tài khoản người dùng (không mặc nhiên là hộ). */
export type FacilityType = 'household' | 'enterprise' | 'cooperative' | 'unknown';

export type MappingMethod = 'coordinate' | 'address' | 'unresolved';
export type CoordinateConfidence = 'high' | 'medium' | 'low' | 'none';
export type FacilityOrigin = Extract<DataSourceType, 'PDF_SOURCE' | 'MOCK_DATA' | 'USER_INPUT'> | 'PDF';

/**
 * Cơ sở nuôi (gộp cả cơ sở nhập từ phụ lục PDF và vùng mock nghiệp vụ).
 * `codeOriginal` bảo toàn mã gốc (vd `92-01-000001`); id canonical có namespace
 * (`pdf:92-01-000001`). Đã khử định danh: KHÔNG có họ tên chủ/SĐT.
 */
export interface AquacultureFacility extends EntityBase {
  codeOriginal: string | null;
  facilityType: FacilityType;
  displayName: string;
  addressSource: string | null;
  addressCurrent: string | null;
  communeCode: string | null;
  communeName: string | null;
  mappingMethod: MappingMethod;
  lat: number | null;
  lng: number | null;
  coordinateConfidence: CoordinateConfidence;
  pondIds: string[];
  /** Số ao theo hồ sơ nguồn (có thể lớn hơn số ao đang truy xuất được). */
  pondCountSource: number;
  species: string[];
  areaM2Total: number | null;
  pondsWithArea: number;
  pondsWithCoordinates: number;
  /** Thứ tự/trang nguồn (phụ lục PDF). */
  sourceIndex: number | null;
  sourcePage: number | null;
}
