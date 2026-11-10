/**
 * Kho dữ liệu cơ sở nuôi lươn nhập từ phụ lục PDF.
 *
 * Nguồn: `src/data/pdf-facilities.json` (đã khử định danh, sinh bởi
 * `scripts/import-pdf-facilities.mjs`). Đây là **một nguồn dữ liệu chung** được
 * dùng cho cả lớp bản đồ và bảng chi tiết — không tạo bộ dữ liệu thứ hai.
 */
import raw from '../../../data/pdf-facilities.json';
import type {
  DataOrigin,
  ImportedFacility,
  ImportedPond,
  ImportValidationSummary,
  PdfFacilityDataset,
} from '../types';

const dataset = raw as unknown as PdfFacilityDataset;

export const FACILITY_ORIGIN: DataOrigin = 'pdf_import';

const facilities: ImportedFacility[] = dataset.facilities;
const ponds: ImportedPond[] = dataset.ponds;

const pondByIdIndex = new Map<string, ImportedPond>();
const pondsByFacilityIndex = new Map<string, ImportedPond[]>();
for (const p of ponds) {
  pondByIdIndex.set(p.id, p);
  const list = pondsByFacilityIndex.get(p.facilityId);
  if (list) list.push(p);
  else pondsByFacilityIndex.set(p.facilityId, [p]);
}

const facilitiesByCommuneIndex = new Map<string, ImportedFacility[]>();
for (const f of facilities) {
  if (!f.communeCode) continue;
  const list = facilitiesByCommuneIndex.get(f.communeCode);
  if (list) list.push(f);
  else facilitiesByCommuneIndex.set(f.communeCode, [f]);
}

export function getDatasetMetadata() {
  return dataset.metadata;
}

export function getImportValidationSummary(): ImportValidationSummary {
  return dataset.summary;
}

export function getFacilities(): ImportedFacility[] {
  return facilities;
}

export function getPonds(): ImportedPond[] {
  return ponds;
}

export function getFacilityById(id: string | null | undefined): ImportedFacility | null {
  if (!id) return null;
  return facilities.find((f) => f.id === id) || null;
}

export function getPondsByFacility(facilityId: string | null | undefined): ImportedPond[] {
  if (!facilityId) return [];
  return pondsByFacilityIndex.get(facilityId) || [];
}

export function getPondById(id: string | null | undefined): ImportedPond | null {
  if (!id) return null;
  return pondByIdIndex.get(id) || null;
}

export function getFacilitiesByCommune(communeCode: string | null | undefined): ImportedFacility[] {
  if (!communeCode) return [];
  return facilitiesByCommuneIndex.get(communeCode) || [];
}

export interface FacilityLocation {
  id: string;
  lat: number;
  lng: number;
  pondCount: number;
  communeCode: string | null;
  communeName: string | null;
  coordinateConfidence: ImportedFacility['coordinateConfidence'];
}

/** Cơ sở có toạ độ hợp lệ — dùng để dựng lớp điểm trên bản đồ. */
export function getFacilityLocations(): FacilityLocation[] {
  return facilities
    .filter((f) => f.lat != null && f.lng != null)
    .map((f) => ({
      id: f.id,
      lat: f.lat as number,
      lng: f.lng as number,
      pondCount: f.pondCountActual,
      communeCode: f.communeCode,
      communeName: f.communeName,
      coordinateConfidence: f.coordinateConfidence,
    }));
}

export interface FacilityCommuneStats {
  facilityCount: number;
  pondCount: number;
  withCoordinates: number;
  species: string[];
  areaM2Total: number;
}

export function getFacilityCommuneStats(communeCode: string | null | undefined): FacilityCommuneStats {
  const list = getFacilitiesByCommune(communeCode);
  const species = new Set<string>();
  let pondCount = 0;
  let withCoordinates = 0;
  let areaM2Total = 0;
  for (const f of list) {
    pondCount += f.pondCountActual;
    withCoordinates += f.pondsWithCoordinates;
    areaM2Total += f.areaM2Total || 0;
    for (const s of f.species) species.add(s);
  }
  return { facilityCount: list.length, pondCount, withCoordinates, species: [...species], areaM2Total };
}

/** Tìm cơ sở theo mã hoặc theo xã/phường (cho ô tìm kiếm). */
export function searchFacilities(query: string, limit = 40): ImportedFacility[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return facilities
    .filter((f) => f.id.toLowerCase().includes(q) || (f.communeName || '').toLowerCase().includes(q))
    .slice(0, limit);
}
