import type { DataSourceType, VerificationStatus } from '../sources';

export type FacilityPondRelationshipType = 'owns' | 'manages';

/**
 * Quan hệ cơ sở ↔ ao (một cơ sở nhiều ao). Bảo toàn mã ao; ao không tìm được
 * cơ sở phải đánh dấu chờ đối chiếu (`needs_review`).
 */
export interface FacilityPondRelation {
  facilityId: string;
  pondId: string;
  relationshipType: FacilityPondRelationshipType;
  source: DataSourceType;
  verificationStatus: VerificationStatus;
  method: string;
}
