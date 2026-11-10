import { describe, expect, it } from 'vitest';
import { normalizeDisplayData, normalizeDisplayText } from '../src/domain/normalizeDisplayData';

describe('display data normalization', () => {
  it('replaces demo wording in names while retaining clear simulation wording', () => {
    expect(normalizeDisplayText('Vùng nuôi demo 01')).toBe('Vùng nuôi số 01');
    expect(normalizeDisplayText('Cơ sở giống demo 2')).toBe('Trại giống thủy sản khu vực 2');
    expect(normalizeDisplayText('Bản demo')).toBe('môi trường dữ liệu mô phỏng');
  });

  it('normalizes display labels without changing identifiers or geometry', () => {
    const input = {
      id: 'A01',
      name: 'Vùng nuôi demo 01',
      geometrySourceId: 'demo:zone-01',
      geometry: { coordinates: [[[106, 9], [107, 9], [106, 9]]] },
    };

    expect(normalizeDisplayData(input)).toEqual({
      ...input,
      name: 'Vùng nuôi số 01',
    });
  });
});
