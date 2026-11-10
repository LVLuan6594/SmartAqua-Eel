import type { Geometry } from '../types';

export type LatLng = [number, number];
export type Bounds = [[number, number], [number, number]];

export function bboxOf(geometry: Geometry): [number, number, number, number] {
  let minX = 180;
  let minY = 90;
  let maxX = -180;
  let maxY = -90;
  const walk = (coords: any) => {
    if (typeof coords[0] === 'number') {
      minX = Math.min(minX, coords[0]);
      maxX = Math.max(maxX, coords[0]);
      minY = Math.min(minY, coords[1]);
      maxY = Math.max(maxY, coords[1]);
      return;
    }
    coords.forEach(walk);
  };
  walk(geometry.coordinates);
  return [minX, minY, maxX, maxY];
}

export function pointInRing(point: LatLng, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point: LatLng, polygon: number[][][]): boolean {
  if (!pointInRing(point, polygon[0])) return false;
  for (let k = 1; k < polygon.length; k++) if (pointInRing(point, polygon[k])) return false;
  return true;
}

export function pointInGeometry(point: LatLng, geometry: Geometry): boolean {
  if (geometry.type === 'Polygon') return pointInPolygon(point, geometry.coordinates);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.some((poly: number[][][]) => pointInPolygon(point, poly));
  return false;
}

function ringArea(ring: number[][]): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return sum / 2;
}

function ringCentroid(ring: number[][]): [number, number, number] {
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += cross;
    cx += (ring[j][0] + ring[i][0]) * cross;
    cy += (ring[j][1] + ring[i][1]) * cross;
  }
  if (a === 0) return [0, 0, 0];
  a *= 0.5;
  return [cx / (6 * a), cy / (6 * a), a];
}

export function centroidOf(geometry: Geometry): LatLng {
  if (geometry.type === 'Point') return [geometry.coordinates[1], geometry.coordinates[0]];
  const polygons: number[][][][] = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let best: [number, number, number] | null = null;
  for (const poly of polygons) {
    const [cx, cy, a] = ringCentroid(poly[0]);
    const area = Math.abs(a);
    if (!best || area > Math.abs(best[2])) best = [cx, cy, area];
  }
  if (!best) return [0, 0];
  return [best[1], best[0]];
}

export function boundsOf(geometry: Geometry): Bounds {
  const [minX, minY, maxX, maxY] = bboxOf(geometry);
  return [
    [minY, minX],
    [maxY, maxX],
  ];
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function polygonAreaKm2(geometry: Geometry): number {
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return 0;
  const meanLat = centroidOf(geometry)[0];
  const mPerDegLat = 111132.92 - 559.82 * Math.cos(2 * (meanLat * Math.PI) / 180);
  const mPerDegLng = 111412.84 * Math.cos((meanLat * Math.PI) / 180) - 93.5 * Math.cos((3 * meanLat * Math.PI) / 180);
  const polygons: number[][][][] = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let total = 0;
  for (const poly of polygons) {
    for (let r = 0; r < poly.length; r++) {
      const area = Math.abs(ringArea(poly[r])) * mPerDegLat * mPerDegLng;
      total += r === 0 ? area : -area;
    }
  }
  return total / 1_000_000;
}
