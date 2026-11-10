/**
 * PDF Adapter – ánh xạ dữ liệu nhập từ phụ lục (`src/data/pdf-facilities.json`) sang
 * entity canonical. Dữ liệu đã khử định danh nên KHÔNG có nông dân/tài khoản.
 *
 * Lưu ý chất lượng nguồn: phụ lục có trùng mã cơ sở (253 bản ghi / 248 mã) và trùng
 * mã ao. Adapter giữ toàn bộ bản ghi: mã cơ sở trùng được phân biệt bằng hậu tố
 * nguồn (`#<sourceIndex>`); ao dùng id nguồn duy nhất nên không mất dòng.
 */
import {
  getFacilities,
  getPonds,
  getFacilitiesByCommune,
  getFacilityLocations,
} from '../../features/gis/services/facilityRepository';
import { canonicalId } from '../../domain/sources';
import type { AquacultureFacility, Pond } from '../../domain/entities';

const PDF = 'PDF_SOURCE' as const;
const FILE = 'src/data/pdf-facilities.json';

const facilityBaseId = (raw: string) => canonicalId(PDF, raw);
const pondIdOf = (facilityRaw: string, pondId: string) => canonicalId(PDF, `${facilityRaw}/${pondId}`);

let facilitiesCache: AquacultureFacility[] | null = null;
let pondsCache: Pond[] | null = null;

function buildPonds(): Pond[] {
  return getPonds().map((p) => ({
    id: pondIdOf(p.facilityId, p.id),
    code: p.code,
    name: p.name,
    facilityId: facilityBaseId(p.facilityId),
    farmerId: null,
    communeCode: null,
    zoneIds: [],
    areaM2: p.areaM2,
    areaHa: p.areaM2 != null ? Math.round((p.areaM2 / 10000) * 10000) / 10000 : null,
    areaUnit: p.areaM2 != null ? 'm2' : null,
    species: p.species,
    lat: p.lat,
    lng: p.lng,
    geometry: null,
    geometryScope: p.lat != null && p.lng != null ? 'representative_point' : null,
    coordConfidence: p.coordConfidence,
    status: 'declared',
    duplicateOf: p.duplicateOf,
    origin: PDF,
    source: PDF,
    verificationStatus: 'needs_review',
    sourceRef: { id: 'pdf:pl2', type: PDF, page: p.sourcePage, recordRef: p.id },
  }));
}

function buildFacilities(): AquacultureFacility[] {
  const ponds = pdfPonds();
  const byFacility = new Map<string, string[]>();
  for (const p of ponds) {
    const raw = p.facilityId?.startsWith('pdf:') ? p.facilityId.slice(4) : p.facilityId;
    if (!raw) continue;
    const list = byFacility.get(raw);
    if (list) list.push(p.id);
    else byFacility.set(raw, [p.id]);
  }

  const seen = new Set<string>();
  return getFacilities().map((f) => {
    const base = facilityBaseId(f.id);
    let id = base;
    if (seen.has(base)) id = `${base}#${f.sourceIndex ?? ''}`;
    else seen.add(base);
    return {
      id,
      codeOriginal: f.id,
      facilityType: 'household',
      displayName: f.id,
      addressSource: f.addressFacility,
      addressCurrent: f.addressFarming,
      communeCode: f.communeCode,
      communeName: f.communeName,
      mappingMethod: f.mappingMethod,
      lat: f.lat,
      lng: f.lng,
      coordinateConfidence: f.coordinateConfidence,
      pondIds: byFacility.get(f.id) || [],
      pondCountSource: f.pondCountActual,
      species: f.species,
      areaM2Total: f.areaM2Total,
      pondsWithArea: f.pondsWithArea,
      pondsWithCoordinates: f.pondsWithCoordinates,
      sourceIndex: f.sourceIndex,
      sourcePage: f.sourcePage,
      source: PDF,
      verificationStatus: f.verificationStatus,
      sourceRef: { id: 'pdf:pl2', type: PDF, page: f.sourcePage, recordRef: f.id },
    };
  });
}

export function pdfFacilities(): AquacultureFacility[] {
  if (!facilitiesCache) facilitiesCache = buildFacilities();
  return facilitiesCache;
}

export function pdfPonds(): Pond[] {
  if (!pondsCache) pondsCache = buildPonds();
  return pondsCache;
}

export const pdfFacilityById = (canonicalOrRawId: string): AquacultureFacility | null => {
  const list = pdfFacilities();
  const raw = canonicalOrRawId.startsWith('pdf:') ? canonicalOrRawId : facilityBaseId(canonicalOrRawId);
  return list.find((x) => x.id === raw || x.codeOriginal === canonicalOrRawId) ?? null;
};

export const pdfFacilitiesForCommune = (communeCode: string) =>
  getFacilitiesByCommune(communeCode).map((f) => facilityBaseId(f.id));

/** Vị trí cơ sở PDF (điểm đại diện) để dựng lớp bản đồ. */
export const pdfFacilityLocations = () => getFacilityLocations();

export const PDF_SOURCE_FILE = FILE;
