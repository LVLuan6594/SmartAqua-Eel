import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { boundsOf, centroidOf, pointInGeometry, polygonAreaKm2 } from '../src/features/gis/services/spatial';
import type { FeatureCollection, CommuneProperties, Geometry, VerifiedAquacultureProperties } from '../src/features/gis/types';
import seed from '../src/data/data.json';

const read = <P,>(rel: string): FeatureCollection<P> =>
  JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'public', rel), 'utf8'));

const communes = read<CommuneProperties>('geojson/can-tho/communes-103.geojson');
const city = read('geojson/can-tho/city-boundary.geojson');
const aquaculture = read<VerifiedAquacultureProperties>('geojson/aquaculture/verified-aquaculture.geojson');
const water = read('geojson/aquaculture/verified-water.geojson');
const manifest = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'public/geojson/can-tho/gis-manifest.json'), 'utf8'));

describe('SmartAqua - dữ liệu GIS thực', () => {
  it('có đúng 103 xã/phường và 1 ranh giới thành phố', () => {
    expect(communes.features).toHaveLength(103);
    expect(city.features).toHaveLength(1);
    expect(manifest.totals.communes).toBe(103);
  });

  it('cơ cấu đơn vị hành chính khớp 31 phường / 72 xã', () => {
    const wards = communes.features.filter((f) => f.properties.type === 'ward').length;
    const communesOnly = communes.features.filter((f) => f.properties.type === 'commune').length;
    expect(wards).toBe(31);
    expect(communesOnly).toBe(72);
  });

  it('mọi xã/phường đều có mã, tên và diện tích dương', () => {
    for (const f of communes.features) {
      expect(f.properties.code).toMatch(/^\d{4,5}$/);
      expect(f.properties.fullName.length).toBeGreaterThan(0);
      expect(f.properties.areaKm2 ?? 0).toBeGreaterThan(0);
    }
  });

  it('có Vĩnh Châu (31783) và không có aquaculture xác minh trong đơn vị này', () => {
    const vinhChau = communes.features.find((f) => f.properties.code === '31783');
    expect(vinhChau?.properties.name).toBe('Vĩnh Châu');
    expect(aquaculture.features.filter((f) => f.properties.communeCode === '31783')).toHaveLength(0);
  });

  it('các điểm bể mô phỏng nằm trong đúng xã/phường khai báo', () => {
    for (const p of seed.ponds) {
      const boundary=communes.features.find(f=>f.properties.code===p.communeCode)!;
      expect(pointInGeometry([p.lng,p.lat],boundary.geometry)).toBe(true);
      expect(p.source).toBe('MOCK_DATA');
    }
  });

  it('không gán đối tượng OSM thủy sản chung thành lươn', () => {
    expect(aquaculture.features).toEqual([]);
    expect(water.features).toEqual([]);
  });
});

describe('SmartAqua - tiện ích không gian', () => {
  const square: Geometry = { type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]] };

  it('pointInGeometry nhận diện điểm trong và ngoài', () => {
    expect(pointInGeometry([1, 1], square)).toBe(true);
    expect(pointInGeometry([3, 1], square)).toBe(false);
  });

  it('centroidOf trả về tâm hình học', () => {
    const [lat, lng] = centroidOf(square);
    expect(lat).toBeCloseTo(1, 6);
    expect(lng).toBeCloseTo(1, 6);
  });

  it('boundsOf trả về [[minLat,minLng],[maxLat,maxLng]]', () => {
    expect(boundsOf(square)).toEqual([[0, 0], [2, 2]]);
  });

  it('polygonAreaKm2 tính gần đúng diện tích', () => {
    expect(polygonAreaKm2(square)).toBeGreaterThan(0);
  });
});
