import { intersectPolygons } from './clipping';
import type { MultiPoly } from './clipping';
import { bboxOf, polygonAreaKm2 } from './spatial';
import type { Geometry } from '../types';

export interface CommuneGeom {
  code: string;
  name: string;
  fullName: string;
  geometry: Geometry;
}

export interface ZoneIntersection {
  communeCode: string;
  areaKm2: number;
  share: number;
}

/**
 * Giao rất nhỏ (do sai số hình học/simplification) không được coi là quan hệ hành chính thực.
 * Ngưỡng dưới đây loại các mảnh giao < 0.5 ha.
 */
export const MIN_INTERSECTION_KM2 = 0.005;

export function toMultiPolygon(geom: Geometry | null | undefined): MultiPoly {
  if (!geom) return [];
  if (geom.type === 'Polygon') return [geom.coordinates as MultiPoly[number]];
  if (geom.type === 'MultiPolygon') return geom.coordinates as MultiPoly;
  return [];
}

function bboxOverlap(a: number[], b: number[]): boolean {
  return !(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1]);
}

export function intersectionAreaKm2(a: Geometry, b: Geometry): number {
  const geom = intersectPolygons(toMultiPolygon(a), toMultiPolygon(b));
  if (!geom.length) return 0;
  return polygonAreaKm2({ type: 'MultiPolygon', coordinates: geom });
}

/**
 * Xác định các xã/phường giao với vùng nuôi bằng phép giao hình học thực,
 * trả về diện tích phần giao và tỷ trọng trên tổng diện tích giao.
 * Áp dụng tiền lọc bounding-box để tránh tính toán không cần thiết.
 */
export function zoneCommunes(zone: Geometry, communes: CommuneGeom[], minKm2 = MIN_INTERSECTION_KM2): ZoneIntersection[] {
  const zoneBbox = bboxOf(zone);
  const raw: ZoneIntersection[] = [];
  let total = 0;
  for (const c of communes) {
    if (!bboxOverlap(zoneBbox, bboxOf(c.geometry))) continue;
    const areaKm2 = intersectionAreaKm2(zone, c.geometry);
    if (areaKm2 <= 0) continue;
    total += areaKm2;
    raw.push({ communeCode: c.code, areaKm2, share: 0 });
  }
  return raw
    .map((r) => ({ ...r, share: total > 0 ? r.areaKm2 / total : 0 }))
    .filter((r) => r.areaKm2 >= minKm2)
    .sort((a, b) => b.areaKm2 - a.areaKm2);
}
