import { describe, it, expect } from 'vitest';
import { dataAccess } from '../src/services/repositories/dataAccess';
import { pointInZone, communeContaining, zoneRelationsForPond } from '../src/domain/rules/spatialRelationshipRules';
import { isValidCoordinate, isValidIsoDate, m2ToHa, validateHarvest } from '../src/domain/rules/validationRules';
import type { Geometry } from '../src/features/gis/types';

const square: Geometry = {
  type: 'Polygon',
  coordinates: [
    [
      [105, 10],
      [105.1, 10],
      [105.1, 10.1],
      [105, 10.1],
      [105, 10],
    ],
  ],
};

describe('Toàn vẹn tham chiếu (qua facade)', () => {
  it('mọi ao gắn cơ sở tồn tại', async () => {
    const [ponds, facilities] = await Promise.all([dataAccess.ponds.getAll(), dataAccess.facilities.getAll()]);
    const ids = new Set(facilities.map((f) => f.id));
    const orphans = ponds.filter((p) => p.facilityId && !ids.has(p.facilityId));
    expect(orphans).toEqual([]);
  });

  it('mọi vụ nuôi gắn ao tồn tại; mọi thu hoạch gắn vụ tồn tại', async () => {
    const [ponds, cycles, harvests] = await Promise.all([
      dataAccess.ponds.getAll(),
      dataAccess.cycles.getAll(),
      dataAccess.harvests.getAll(),
    ]);
    const pondIds = new Set(ponds.map((p) => p.id));
    const cycleIds = new Set(cycles.map((c) => c.id));
    expect(cycles.filter((c) => !pondIds.has(c.pondId))).toEqual([]);
    expect(harvests.filter((h) => !cycleIds.has(h.cycleId))).toEqual([]);
  });

  it('liên kết cơ sở ↔ ao đối xứng', async () => {
    const [ponds, facilities] = await Promise.all([dataAccess.ponds.getAll(), dataAccess.facilities.getAll()]);
    const pondIds = new Set(ponds.map((p) => p.id));
    const broken = facilities.flatMap((f) => f.pondIds.filter((id) => !pondIds.has(id)));
    expect(broken).toEqual([]);
  });
});

describe('Quan hệ không gian', () => {
  it('Point-in-Polygon cho vùng nuôi và xã/phường', () => {
    expect(pointInZone(10.05, 105.05, { zoneId: 'Z1', geometry: square })).toBe(true);
    expect(pointInZone(11, 106, { zoneId: 'Z1', geometry: square })).toBe(false);
    expect(communeContaining(10.05, 105.05, [{ code: 'X1', geometry: square }])).toBe('X1');
    expect(communeContaining(11, 106, [{ code: 'X1', geometry: square }])).toBeNull();
  });

  it('quan hệ ao–vùng suy từ điểm đại diện được đánh dấu chờ xác minh', () => {
    const rels = zoneRelationsForPond('pdf:fac/pond', 10.05, 105.05, [{ zoneId: 'Z1', geometry: square }], 'OSM_SOURCE');
    expect(rels).toHaveLength(1);
    expect(rels[0]).toMatchObject({ zoneId: 'Z1', derivedFromPoint: true, verificationStatus: 'needs_review', method: 'point_in_polygon' });
  });
});

describe('Quy tắc kiểm tra dữ liệu', () => {
  it('toạ độ, ngày và quy đổi diện tích', () => {
    expect(isValidCoordinate(10.08, 105.74)).toBe(true);
    expect(isValidCoordinate(0, 0)).toBe(false);
    expect(isValidIsoDate('2026-08-12')).toBe(true);
    expect(isValidIsoDate('2026-13-40')).toBe(false);
    expect(m2ToHa(10000)).toBe(1);
  });

  it('phát hiện phiếu thu hoạch không hợp lệ', () => {
    const issues = validateHarvest({
      id: 'h1',
      cycleId: '',
      pondId: null,
      date: 'bad',
      quantityKg: 0,
      quantityUnit: 'kg',
      batchNo: null,
      status: 'recorded',
      updatedBy: null,
      source: 'MOCK_DATA',
      verificationStatus: 'unresolved',
    });
    expect(issues.map((i) => i.issueType)).toContain('INVALID_DATE');
    expect(issues.map((i) => i.issueType)).toContain('INVALID_QUANTITY');
  });
});
