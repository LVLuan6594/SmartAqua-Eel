import type { DataSourceType, VerificationStatus } from '../sources';

/** Bốn vai trò hợp lệ của SmartAqua. */
export type SmartAquaRole = 'admin' | 'farmer' | 'coop' | 'manager';

/**
 * Phân công người dùng ↔ ao (dùng cho Nông dân). Trong Mock Mode chỉ mô phỏng
 * hành vi giao diện; back-end thật phải thực thi kiểm soát truy cập dữ liệu.
 */
export interface UserPondAssignment {
  userId: string;
  pondId: string;
  roleId: SmartAquaRole;
  startDate: string | null;
  endDate: string | null;
  status: 'active' | 'ended';
  source: DataSourceType;
  verificationStatus: VerificationStatus;
}
