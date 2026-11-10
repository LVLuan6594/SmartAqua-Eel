import type { MapStatus } from '../types';

type Listener = (status: MapStatus) => void;

let current: MapStatus = {
  zoom: 9,
  center: [9.9, 105.76],
  pointer: null,
  distanceKm: null,
  areaKm2: null,
  pointCount: 0,
};

const listeners = new Set<Listener>();
let queued: Partial<MapStatus> = {};
let frame = 0;

export function publishStatus(patch: Partial<MapStatus>) {
  queued = { ...queued, ...patch };
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    current = { ...current, ...queued };
    queued = {};
    listeners.forEach((l) => l(current));
  });
}

export function getStatus(): MapStatus {
  return current;
}

export function subscribeStatus(listener: Listener) {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

export function resetStatus() {
  current = { ...current, pointer: null, distanceKm: null, areaKm2: null, pointCount: 0 };
  listeners.forEach((l) => l(current));
}
