import * as pcNamespace from 'polygon-clipping';

export type Pair = [number, number];
export type Ring = Pair[];
export type Poly = Ring[];
export type MultiPoly = Poly[];

interface Clipper {
  intersection: (geom: MultiPoly, ...geoms: MultiPoly[]) => MultiPoly;
  union: (geom: MultiPoly, ...geoms: MultiPoly[]) => MultiPoly;
  difference: (geom: MultiPoly, ...geoms: MultiPoly[]) => MultiPoly;
}

const pc = ((pcNamespace as unknown as { default?: Clipper }).default ?? (pcNamespace as unknown as Clipper));

export function intersectPolygons(a: MultiPoly, b: MultiPoly): MultiPoly {
  if (!a.length || !b.length) return [];
  try {
    return pc.intersection(a, b);
  } catch {
    return [];
  }
}

export function unionPolygons(a: MultiPoly, b: MultiPoly): MultiPoly {
  if (!a.length) return b;
  if (!b.length) return a;
  try {
    return pc.union(a, b);
  } catch {
    return a;
  }
}
