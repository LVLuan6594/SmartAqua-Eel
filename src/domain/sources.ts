/**
 * Nguồn gốc dữ liệu và chất lượng dữ liệu dùng chung cho toàn hệ thống SmartAqua.
 *
 * Nguyên tắc: một bản ghi có nguồn thật KHÔNG đồng nghĩa đã được xác minh tính
 * chính xác. Vì vậy mọi entity canonical đều mang `source` (nguồn gốc) và
 * `verificationStatus` (tình trạng xác minh) tách biệt nhau.
 */

/** Loại nguồn dữ liệu bắt buộc phân loại theo yêu cầu nghiệp vụ. */
export type DataSourceType =
  | 'PDF_SOURCE' // Dữ liệu trích xuất từ phụ lục
  | 'OFFICIAL_GIS' // Dữ liệu địa lý từ nguồn quản lý được xác minh
  | 'OSM_SOURCE' // Dữ liệu OpenStreetMap
  | 'MOCK_DATA' // Dữ liệu mô phỏng
  | 'USER_INPUT' // Dữ liệu người dùng nhập
  | 'DERIVED_DATA'; // Dữ liệu tính toán từ nguồn khác

export const DATA_SOURCE_LABELS: Record<DataSourceType, string> = {
  PDF_SOURCE: 'Phụ lục PDF',
  OFFICIAL_GIS: 'GIS chính thống',
  OSM_SOURCE: 'OpenStreetMap',
  MOCK_DATA: 'Dữ liệu mô phỏng',
  USER_INPUT: 'Người dùng nhập',
  DERIVED_DATA: 'Dẫn xuất',
};

/** Mã tiền tố ổn định cho id canonical theo nguồn. */
export const SOURCE_ID_PREFIX: Record<DataSourceType, string> = {
  PDF_SOURCE: 'pdf',
  OFFICIAL_GIS: 'ogis',
  OSM_SOURCE: 'osm',
  MOCK_DATA: 'mock',
  USER_INPUT: 'user',
  DERIVED_DATA: 'derived',
};

/** Tình trạng xác minh của bản ghi (mức tin cậy nghiệp vụ, không phải loại nguồn). */
export type VerificationStatus = 'verified' | 'needs_review' | 'unresolved';

export interface DataSourceRef {
  /** Định danh nguồn (khớp DataSource.id). */
  id: string;
  type: DataSourceType;
  /** Trang trong nguồn nếu có (PDF). */
  page?: number;
  /** Tham chiếu bản ghi gốc trong nguồn (mã gốc, osm id…). */
  recordRef?: string;
}

/** Envelope chung cho mọi entity canonical. */
export interface EntityBase {
  /** Id canonical, có namespace: `pdf:92-01-000001`, `mock:A01`, `osm:way/123`… */
  id: string;
  /** Mã nghiệp vụ gốc (giữ nguyên, KHÔNG chuẩn hoá/đổi). */
  source: DataSourceType;
  verificationStatus: VerificationStatus;
  sourceRef?: DataSourceRef;
}

/** Đăng ký một nguồn dữ liệu (file/bảng nguồn, thời điểm nhập…). */
export interface DataSource {
  id: string;
  type: DataSourceType;
  name: string;
  file: string | null;
  url?: string | null;
  page?: number | null;
  importedAt: string;
  sourceDate?: string | null;
  license?: string | null;
}

export type ValidationStatus = 'valid' | 'invalid' | 'warning';
export type ResolutionStatus = 'open' | 'reviewing' | 'resolved' | 'accepted_risk';

/** Vấn đề chất lượng dữ liệu gắn với một bản ghi/trường cụ thể. */
export interface DataQuality {
  recordId: string;
  field: string;
  validationStatus: ValidationStatus;
  verificationStatus: VerificationStatus;
  issueType: string;
  reviewNotes: string;
  resolutionStatus: ResolutionStatus;
}

/** Tạo id canonical ổn định cho một mã nguồn. */
export const canonicalId = (source: DataSourceType, raw: string): string =>
  `${SOURCE_ID_PREFIX[source]}:${raw}`;

/** Loại bỏ phần prefix nguồn khỏi id canonical (trả về mã gốc). */
export const rawIdOf = (id: string): string => {
  const i = id.indexOf(':');
  return i >= 0 ? id.slice(i + 1) : id;
};
