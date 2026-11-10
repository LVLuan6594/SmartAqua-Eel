/**
 * GIS Adapter – đọc lớp địa lý công khai (ranh giới xã/phường, vùng nuôi có hình học).
 * Ranh giới hành chính là nguồn OFFICIAL_GIS; hình học vùng nuôi từ OSM/vùng demo.
 */
import { canonicalId } from '../../domain/sources';
import type { AdministrativeUnit } from '../../domain/entities';
import type { AquacultureZone } from '../../domain/entities/AquacultureZone';
import type { CommuneProperties, FeatureCollection, Geometry } from '../../features/gis/types';
import { loadGeoJSON } from '../../features/gis/services/gisDataService';

const OG = 'OFFICIAL_GIS' as const;
const OSM = 'OSM_SOURCE' as const;
const MOCK = 'MOCK_DATA' as const;

const COMMUNES_PATH = 'geojson/can-tho/communes-103.geojson';
const ZONES_PATH = 'geojson/aquaculture/verified-zones.geojson';
const DEMO_ZONES_PATH = 'geojson/aquaculture/demo-zones.geojson';

const FILE_COMMUNES = 'public/geojson/can-tho/communes-103.geojson';

/** 103 xã/phường (ranh giới hành chính đã xác minh). */
export async function gisAdministrativeUnits(): Promise<AdministrativeUnit[]> {
  const fc = (await loadGeoJSON(COMMUNES_PATH)) as FeatureCollection<CommuneProperties>;
  return fc.features.map((f) => {
    const p = f.properties;
    return {
      id: canonicalId(OG, p.code),
      code: p.code,
      name: p.name,
      nameEn: p.nameEn,
      fullName: p.fullName,
      type: p.type,
      parentCode: p.parentCode,
      parentName: p.parentName,
      areaKm2: p.areaKm2,
      geometry: f.geometry,
      updatedAt: null,
      source: OG,
      verificationStatus: 'verified',
      sourceRef: { id: 'gis:communes-103', type: OG, recordRef: p.code },
    } satisfies AdministrativeUnit;
  });
}

export const COMMUNES_SOURCE_FILE = FILE_COMMUNES;

/**
 * Nạp hình học vùng nuôi theo `zoneId` (từ lớp xác minh + lớp demo).
 * Chỉ bổ sung hình học cho entity zone đã tồn tại — KHÔNG tạo zone trùng.
 */
export async function gisZoneGeometries(): Promise<Map<string, Geometry>> {
  const map = new Map<string, Geometry>();
  for (const path of [ZONES_PATH, DEMO_ZONES_PATH]) {
    try {
      const fc = (await loadGeoJSON(path)) as FeatureCollection<AquacultureZone & Record<string, unknown>>;
      for (const f of fc.features) {
        const zoneId = (f.properties as any)?.zoneId as string | undefined;
        if (zoneId && f.geometry) map.set(zoneId, f.geometry);
      }
    } catch {
      // Lớp tùy chọn: bỏ qua nếu không tải được.
    }
  }
  return map;
}

/** Bổ sung hình học cho các zone còn thiếu (best-effort). */
export async function enrichZonesWithGeometry(zones: AquacultureZone[]): Promise<AquacultureZone[]> {
  let geometries: Map<string, Geometry>;
  try {
    geometries = await gisZoneGeometries();
  } catch {
    return zones;
  }
  return zones.map((z) => {
    if (z.geometry) return z;
    const g = geometries.get(z.zoneId);
    return g ? { ...z, geometry: g, source: z.source === MOCK ? z.source : z.source } : z;
  });
}

export const GIS_SOURCES = { OG, OSM, MOCK };
