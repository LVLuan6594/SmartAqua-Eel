import type { Geometry } from '../../features/gis/types';
import { pointInGeometry, boundsOf, centroidOf, polygonAreaKm2 } from '../../features/gis/services/spatial';
import type { ZonePondRelation } from '../relationships/ZonePondRelation';
import type { DataSourceType } from '../sources';

/** Một vùng nuôi tối thiểu cần cho phép toán không gian. */
export interface ZoneGeometryLike {
  zoneId: string;
  geometry: Geometry | null;
}

/** Điểm đại diện ao nằm trong polygon vùng nuôi hay không (Point-in-Polygon). */
export function pointInZone(lat: number, lng: number, zone: ZoneGeometryLike): boolean {
  if (!zone.geometry) return false;
  return pointInGeometry([lng, lat], zone.geometry);
}

/**
 * Tìm xã/phường chứa một điểm (Point-in-Polygon trên lớp 103 xã/phường).
 * Trả về null nếu điểm nằm ngoài mọi đa giác (không tự suy đoán đơn vị gần nhất).
 */
export function communeContaining(
  lat: number,
  lng: number,
  communes: { code: string; geometry: Geometry }[],
): string | null {
  for (const c of communes) {
    if (pointInGeometry([lng, lat], c.geometry)) return c.code;
  }
  return null;
}

/**
 * Suy ra quan hệ ao × vùng nuôi từ điểm đại diện của ao.
 * `derivedFromPoint=true` và `verificationStatus='needs_review'` để KHÔNG coi kết
 * quả là ranh giới ao đã xác minh.
 */
export function zoneRelationsForPond(
  pondId: string,
  lat: number,
  lng: number,
  zones: ZoneGeometryLike[],
  source: DataSourceType,
): ZonePondRelation[] {
  const out: ZonePondRelation[] = [];
  for (const z of zones) {
    if (pointInZone(lat, lng, z)) {
      out.push({
        zoneId: z.zoneId,
        pondId,
        method: 'point_in_polygon',
        derivedFromPoint: true,
        source,
        verificationStatus: 'needs_review',
      });
    }
  }
  return out;
}

export interface GeometrySummary {
  bounds: [[number, number], [number, number]];
  centroid: [number, number];
  areaKm2: number;
}

export function summarizeGeometry(geometry: Geometry): GeometrySummary {
  return {
    bounds: boundsOf(geometry),
    centroid: centroidOf(geometry),
    areaKm2: polygonAreaKm2(geometry),
  };
}
