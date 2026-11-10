import type { EntityBase } from '../sources';
import type { Geometry } from '../../features/gis/types';

/**
 * Đơn vị hành chính (103 xã/phường TP. Cần Thơ sau sắp xếp 2025).
 * Khóa nghiệp vụ = mã hành chính (`code`) khi đã xác minh; KHÔNG dùng tên làm khóa.
 */
export interface AdministrativeUnit extends EntityBase {
  /** Mã hành chính (vd `31168`) – khóa tham chiếu nghiệp vụ. */
  code: string;
  name: string;
  nameEn?: string;
  fullName?: string;
  type: 'city' | 'ward' | 'commune' | 'special' | 'mock';
  parentCode: string | null;
  parentName: string | null;
  areaKm2: number | null;
  geometry?: Geometry | null;
  updatedAt?: string | null;
}
