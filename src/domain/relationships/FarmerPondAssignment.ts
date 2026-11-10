import type { DataSourceType, VerificationStatus } from '../sources';

export type FarmerPondRole = 'owner' | 'manager' | 'worker';
export type AssignmentStatus = 'active' | 'ended' | 'needs_review';

/**
 * Phân công nông dân ↔ ao. KHÔNG tự liên kết chủ cơ sở trong PDF với tài khoản;
 * chỉ ghi nhận khi có nguồn xác nhận.
 */
export interface FarmerPondAssignment {
  farmerId: string;
  pondId: string;
  role: FarmerPondRole;
  startDate: string | null;
  endDate: string | null;
  status: AssignmentStatus;
  confirmedBy: string | null;
  source: DataSourceType;
  verificationStatus: VerificationStatus;
}
