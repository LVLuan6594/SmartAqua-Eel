import { useMemo } from 'react';
import { useDemo } from '../../../store/demoStore';
import { zonesOf } from '../services/aquacultureRepository';
import type { LinkedZone } from '../services/aquacultureRepository';
import type { DemoDB, Role } from '../../../types/models';

export interface UseAquacultureZonesResult {
  db: DemoDB;
  role: Role;
  zones: LinkedZone[];
}

/** Truy cập bảng vùng nuôi (thực + mô phỏng) gắn với kho dữ liệu nghiệp vụ để phản ánh cập nhật. */
export function useAquacultureZones(): UseAquacultureZonesResult {
  const { db, role } = useDemo();
  const zones = useMemo(() => zonesOf(db), [db]);
  return { db, role, zones };
}
