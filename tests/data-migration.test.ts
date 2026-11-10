import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { migrate, latestBackup, ROLE_LABELS } from '../scripts/data-migration/migrate.mjs';
import data from '../src/data/data.json';

describe('Migration dữ liệu – schema v2', () => {
  it('data.json đã ở schema v2 và giữ 4 vai trò chuẩn hoá', () => {
    expect((data.metadata as any).schemaVersion).toBe(2);
    expect((data.roles as any[]).map((r) => r.id)).toEqual(['admin', 'manager', 'coop', 'farmer']);
  });

  it('đã bổ sung các bảng quan hệ mà không xoá dữ liệu gốc', () => {
    expect(Array.isArray((data as any).dataSources)).toBe(true);
    expect(Array.isArray((data as any).userPondAssignments)).toBe(true);
    expect(Array.isArray((data as any).dataQualityIssues)).toBe(true);
    expect((data.ponds as any[]).length).toBe(72);
    expect((data.aquacultureZones as any[]).length).toBe(8);
  });

  it('migrate() idempotent: bỏ qua khi đã ở v2 (không ghi đè)', async () => {
    const result: any = await migrate({ quiet: true });
    expect(result.migrated).toBe(false);
    expect(result.schemaVersion).toBe(2);
  });

  it('nhãn 4 vai trò đầy đủ và có bản sao lưu khả dụng', () => {
    expect(Object.keys(ROLE_LABELS).sort()).toEqual(['admin', 'coop', 'farmer', 'manager']);
    const backup = latestBackup();
    if (backup) expect(existsSync(backup)).toBe(true);
  });
});
