export type CommuneType = 'city' | 'ward' | 'commune' | 'special';

export interface Geometry {
  type: 'Polygon' | 'MultiPolygon' | 'Point' | 'LineString' | 'MultiLineString';
  coordinates: any;
}

export interface GeoFeature<P = Record<string, any>> {
  type: 'Feature';
  id?: string;
  bbox?: [number, number, number, number];
  properties: P;
  geometry: Geometry;
}

export interface FeatureCollection<P = Record<string, any>> {
  type: 'FeatureCollection';
  name?: string;
  bbox?: [number, number, number, number];
  features: GeoFeature<P>[];
}

export interface CommuneProperties {
  code: string;
  name: string;
  nameEn: string;
  fullName: string;
  codeName: string;
  type: CommuneType;
  areaKm2: number | null;
  parentCode: string;
  parentName: string;
  gisServerId: string;
  postalCode: string;
  slug: string;
}

export interface VerifiedAquacultureProperties {
  osmType: 'way' | 'relation';
  osmId: number;
  osmUrl: string;
  name: string;
  aquaculture: string;
  produce: string;
  water: string;
  landuse: string;
  communeCode: string | null;
  communeName: string | null;
  centroid: [number, number];
  source: string;
  license: string;
}

export interface VerifiedWaterProperties {
  osmType: 'way' | 'relation';
  osmId: number;
  osmUrl: string;
  name: string;
  water: string;
  natural: string;
  intermittent: string;
  communeCode: string | null;
  communeName: string | null;
  centroid: [number, number];
  source: string;
  license: string;
}

export interface LayerSourceMeta {
  provider: string;
  url: string;
  license: string;
  licenseUrl?: string;
  upstream?: string;
  adminSource?: string;
  retrieval?: string;
  retrievedAt: string;
  crs: string;
  attribution?: string;
  verified: boolean;
  description?: string;
  count?: number;
}

export interface GisManifest {
  generatedAt: string;
  administrativeDecision: string;
  totals: { communes: number; wards: number; communesOnly: number };
  simplification: { toleranceDeg: number } | null;
  coordinatePrecisionDecimals: number;
  layers: Record<string, LayerSourceMeta>;
  verifiedAquacultureByCommune: Record<string, number>;
}

export type LayerId = 'city' | 'communes' | 'zones' | 'aquaculture' | 'facilities' | 'facilitiesPdf' | 'water' | 'mockZones' | 'demo';

/** UI toggles: every data layer plus the "tên xã/phường" label switch (no data fetch). */
export type ToggleId = LayerId | 'communeLabels';

export type LayerGroupId = 'boundary' | 'zones' | 'aquaculture' | 'reference' | 'demo';

export interface LayerGroupMeta {
  id: LayerGroupId;
  label: string;
  caption: string;
}

export type LatLngTuple = [number, number];

export interface MapStatus {
  zoom: number;
  center: LatLngTuple;
  pointer: LatLngTuple | null;
  distanceKm: number | null;
  areaKm2: number | null;
  pointCount: number;
}

export interface LayerDataState {
  city?: FeatureCollection<Record<string, any>>;
  communes?: FeatureCollection<CommuneProperties>;
  zones?: FeatureCollection<AquacultureZoneProperties>;
  aquaculture?: FeatureCollection<VerifiedAquacultureProperties>;
  facilities?: FeatureCollection<VerifiedFacilityProperties>;
  facilitiesPdf?: FeatureCollection<PdfFacilityProperties>;
  water?: FeatureCollection<VerifiedWaterProperties>;
  mockZones?: FeatureCollection<AquacultureZoneProperties>;
  demo?: FeatureCollection<Record<string, any>>;
}

export interface LayerDefinition {
  id: LayerId;
  label: string;
  caption: string;
  path: string;
  accent: string;
  defaultOn: boolean;
  kind: 'boundary' | 'commune' | 'verified' | 'zone' | 'facility' | 'demo';
  group: LayerGroupId;
  manifestKey?: string;
}

/** Loại 3 – cơ sở hạ tầng thuỷ sản có vị trí xác minh (trại giống, cơ sở cung ứng…). */
export interface VerifiedFacilityProperties {
  facilityType: string;
  name: string;
  operator: string;
  osmType?: 'node' | 'way' | 'relation';
  osmId?: number;
  osmUrl?: string;
  communeCode: string | null;
  communeName: string | null;
  centroid: [number, number];
  source: string;
  license: string;
}

/** Cơ sở nuôi nhập từ phụ lục PDF (điểm đại diện, đã khử định danh). */
export interface PdfFacilityProperties {
  facilityId: string;
  sourceIndex: number | null;
  communeCode: string | null;
  communeName: string | null;
  pondCount: number;
  species: string;
  areaM2Total: number | null;
  coordinateConfidence: CoordinateConfidence;
  mappingMethod: MappingMethod;
  verificationStatus: VerificationStatus;
  origin: DataOrigin;
  sourcePage: number;
}

/** Trạng thái hình học của vùng nuôi – quyết định cách hiển thị và mức độ tin cậy. */
export type ZoneGeometryStatus = 'verified' | 'digitized' | 'derived' | 'unavailable' | 'synthetic';

/** Nguồn gốc dữ liệu nghiệp vụ của vùng nuôi (thực / một phần / mô phỏng). */
export type ZoneDataStatus = 'verified' | 'partial' | 'mock';

export interface AquacultureZoneProperties {
  zoneId: string;
  code: string;
  name: string;
  aquacultureType: string;
  species: string[];
  geometryStatus: ZoneGeometryStatus;
  dataStatus: ZoneDataStatus;
  totalAreaHa: number | null;
  communeCodes: string[];
  geometrySourceId: string | null;
  evidence?: string;
  updatedAt: string | null;
}

export interface AquacultureZone extends AquacultureZoneProperties {
  /** Liên kết tới các vùng nuôi mock (aquacultureAreas) – rỗng với vùng dữ liệu thực. */
  areaIds: string[];
  coopIds: string[];
  /** Ranh giới có thể không tồn tại (Loại 2 – có hoạt động, chưa có ranh giới xác minh). */
  geometry: Geometry | null;
  sourceUrl?: string;
}

export interface ZoneCommuneLink {
  zoneId: string;
  communeCode: string;
  communeName: string;
  intersectionAreaKm2: number;
  shareOfZone: number;
}

export type { GeoFeature as GisFeature };

/* ------------------------- Dữ liệu nhập từ phụ lục PDF ------------------------ */

/** Nguồn gốc dữ liệu — phân biệt rõ dữ liệu nhập từ phụ lục với dữ liệu xác minh/mô phỏng. */
export type DataOrigin = 'pdf_import' | 'verified_gis' | 'mock';

/** Cách xác định đơn vị hành chính cho một cơ sở. */
export type MappingMethod = 'coordinate' | 'address' | 'unresolved';

/** Trạng thái kiểm chứng của bản ghi nhập. */
export type VerificationStatus = 'verified' | 'needs_review';

export type CoordinateConfidence = 'high' | 'medium' | 'low' | 'none';

/** Ánh xạ đơn vị hành chính (xã/phường) kèm phương pháp và mức kiểm chứng. */
export interface AdministrativeMapping {
  communeCode: string | null;
  communeName: string | null;
  mappingMethod: MappingMethod;
  verificationStatus: VerificationStatus;
}

/** Bể nuôi nhập từ phụ lục PDF (đã khử định danh). */
export interface ImportedPond {
  id: string;
  code: string;
  facilityId: string;
  name: string | null;
  ordinal: number | null;
  areaRaw: string | null;
  areaM2: number | null;
  species: string | null;
  lat: number | null;
  lng: number | null;
  coordConfidence: CoordinateConfidence;
  coordDeltaPx: number | null;
  origin: DataOrigin;
  sourcePage: number;
  duplicateOf?: string;
}

/** Cơ sở nuôi nhập từ phụ lục PDF (đã khử định danh: không có họ tên/SĐT). */
export interface ImportedFacility extends AdministrativeMapping {
  id: string;
  sourceIndex: number | null;
  addressFacility: string | null;
  addressFarming: string | null;
  pondCountActual: number;
  pondIds: string[];
  species: string[];
  areaM2Total: number | null;
  pondsWithArea: number;
  pondsWithCoordinates: number;
  lat: number | null;
  lng: number | null;
  coordinateConfidence: CoordinateConfidence;
  origin: DataOrigin;
  sourcePage: number;
}

export interface ImportValidationSummary {
  sourcePages: number;
  totalFacilities: number;
  totalPonds: number;
  uniquePonds: number;
  duplicatePondCodes: number;
  facilitiesWithCoordinates: number;
  facilitiesWithoutCoordinates: number;
  pondsWithCoordinates: number;
  pondsWithoutCoordinates: number;
  pondsWithArea: number;
  pondsWithoutArea: number;
  coordinateOutliers: number;
  coordinateLowConfidence: number;
  areaUnitEvidenceRows: number;
  mappedByCoordinate: number;
  mappedByAddress: number;
  unresolved: number;
  ownersDetected: number;
  speciesDistribution: string[];
  totalAreaM2: number;
  generatedFrom: string;
  crs: string;
  areaUnit: string;
}

export interface PdfFacilityDataset {
  metadata: {
    title: string;
    sourceFile: string;
    sourcePages: number;
    level: string;
    crs: string;
    asOf: string;
    areaUnit: string;
    deidentified: boolean;
    deidentificationNote: string;
    provenance: string;
    disclaimer: string;
  };
  facilities: ImportedFacility[];
  ponds: ImportedPond[];
  summary: ImportValidationSummary;
}
