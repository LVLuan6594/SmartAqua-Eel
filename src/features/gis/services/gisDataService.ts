import type { FeatureCollection, GisManifest, LayerDefinition, LayerGroupMeta } from '../types';

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export const assetUrl = (rel: string) => `${BASE}/${rel.replace(/^\//, '')}`;

export const MANIFEST_PATH = 'geojson/can-tho/gis-manifest.json';

const LEGACY_LAYER_DEFINITIONS: LayerDefinition[] = [
  {
    id: 'city',
    label: 'Ranh giới TP. Cần Thơ',
    caption: 'Địa giới thành phố mới (mã 92)',
    path: 'geojson/can-tho/city-boundary.geojson',
    accent: '#1F5CA9',
    defaultOn: true,
    kind: 'boundary',
    group: 'boundary',
    manifestKey: 'can-tho/city-boundary.geojson',
  },
  {
    id: 'communes',
    label: '103 xã / phường',
    caption: 'Ranh giới xã, phường sau sắp xếp 2025',
    path: 'geojson/can-tho/communes-103.geojson',
    accent: '#00AFEF',
    defaultOn: true,
    kind: 'commune',
    group: 'boundary',
    manifestKey: 'can-tho/communes-103.geojson',
  },
  {
    id: 'zones',
    label: 'Vùng nuôi (suy ra)',
    caption: 'Ranh giới vùng nuôi suy ra từ cụm ao OSM – tham chiếu',
    path: 'geojson/aquaculture/verified-zones.geojson',
    accent: '#0E8F7E',
    defaultOn: false,
    kind: 'zone',
    group: 'zones',
    manifestKey: 'aquaculture/verified-zones.geojson',
  },
  {
    id: 'aquaculture',
    label: 'Bể nuôi (xác minh)',
    caption: 'Đối tượng OSM có tag aquaculture',
    path: 'geojson/aquaculture/verified-ponds.geojson',
    accent: '#E8873A',
    defaultOn: true,
    kind: 'verified',
    group: 'aquaculture',
    manifestKey: 'aquaculture/verified-ponds.geojson',
  },
  {
    id: 'facilities',
    label: 'Cơ sở hạ tầng (xác minh)',
    caption: 'Trại giống, cơ sở cung ứng có vị trí xác minh',
    path: 'geojson/aquaculture/verified-facilities.geojson',
    accent: '#9C6ADE',
    defaultOn: false,
    kind: 'facility',
    group: 'aquaculture',
    manifestKey: 'aquaculture/verified-facilities.geojson',
  },
  {
    id: 'facilitiesPdf',
    label: 'Cơ sở nuôi (phụ lục PDF)',
    caption: 'Cơ sở nuôi trồng theo danh sách phụ lục — điểm đại diện, đã khử định danh',
    path: 'geojson/aquaculture/pdf-cantho-facilities.geojson',
    accent: '#C2410C',
    defaultOn: true,
    kind: 'facility',
    group: 'aquaculture',
  },
  {
    id: 'mockZones',
    label: 'Vùng nuôi Vĩnh Châu (mô phỏng)',
    caption: 'Ranh giới minh hoạ; không phải ranh giới thực đã xác minh',
    path: 'geojson/aquaculture/demo-zones.geojson',
    accent: '#D64545',
    defaultOn: false,
    kind: 'zone',
    group: 'demo',
    manifestKey: 'aquaculture/demo-zones.geojson',
  },
  {
    id: 'water',
    label: 'Vùng nước (xác minh)',
    caption: 'Mặt nước tự nhiên từ OpenStreetMap',
    path: 'geojson/aquaculture/verified-water.geojson',
    accent: '#2F80C9',
    defaultOn: false,
    kind: 'verified',
    group: 'reference',
    manifestKey: 'aquaculture/verified-water.geojson',
  },
  {
    id: 'demo',
    label: 'Dữ liệu mô phỏng',
    caption: 'Vùng nuôi, ao, HTX minh hoạ — không phải dữ liệu thực',
    path: 'geojson/demo-features.geojson',
    accent: '#8A98A5',
    defaultOn: false,
    kind: 'demo',
    group: 'demo',
  },
];

export const LAYER_DEFINITIONS: LayerDefinition[] = LEGACY_LAYER_DEFINITIONS.filter(d=>['city','communes'].includes(d.id));
export const LAYER_GROUPS: LayerGroupMeta[] = [
  { id: 'boundary', label: 'Ranh giới hành chính', caption: 'Địa giới thành phố và xã/phường 2025' },
  { id: 'zones', label: 'Vùng nuôi thuỷ sản', caption: 'Ranh giới vùng nuôi (suy ra từ dữ liệu mở)' },
  { id: 'aquaculture', label: 'Bể nuôi & cơ sở (xác minh)', caption: 'Đối tượng đã xác minh từ nguồn mở' },
  { id: 'reference', label: 'Dữ liệu tham khảo', caption: 'Sông, kênh và mặt nước' },
  { id: 'demo', label: 'Dữ liệu mô phỏng', caption: 'Lớp nghiệp vụ mô phỏng, không phải dữ liệu thực' },
];

const cache = new Map<string, Promise<FeatureCollection>>();

export function loadGeoJSON(path: string): Promise<FeatureCollection> {
  if (!cache.has(path)) {
    const url = assetUrl(path);
    const promise = fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Không tải được lớp dữ liệu (${res.status}): ${path}`);
        return (await res.json()) as FeatureCollection;
      })
      .catch((err) => {
        cache.delete(path);
        throw err;
      });
    cache.set(path, promise);
  }
  return cache.get(path)!;
}

let manifestPromise: Promise<GisManifest> | null = null;

export function loadManifest(): Promise<GisManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(assetUrl(MANIFEST_PATH))
      .then(async (res) => {
        if (!res.ok) throw new Error(`Không tải được manifest GIS (${res.status})`);
        return (await res.json()) as GisManifest;
      })
      .catch((err) => {
        manifestPromise = null;
        throw err;
      });
  }
  return manifestPromise;
}

export function clearGisCache() {
  cache.clear();
  manifestPromise = null;
}
