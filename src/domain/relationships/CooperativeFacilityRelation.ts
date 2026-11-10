import type { DataSourceType, VerificationStatus } from '../sources';

export type CooperativeFacilityRelationshipStatus = 'active' | 'ended' | 'pending' | 'needs_review';

/**
 * Liên kết HTX × cơ sở/hộ. KHÔNG mặc định gán cơ sở cho HTX chỉ vì cùng địa bàn:
 * quan hệ chỉ tồn tại khi có nguồn xác nhận.
 */
export interface CooperativeFacilityRelation {
  cooperativeId: string;
  facilityId: string;
  scope: string;
  relationshipStatus: CooperativeFacilityRelationshipStatus;
  validFrom: string | null;
  validTo: string | null;
  source: DataSourceType;
  verificationStatus: VerificationStatus;
}
