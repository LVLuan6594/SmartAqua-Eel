import type { DataSourceType, EntityBase } from './sources';
import type { SmartAquaRole } from './relationships/UserPondAssignment';

/**
 * Bộ lọc dùng chung cho Dashboard, GIS, báo cáo và danh mục.
 * Bảo đảm mọi màn hình đọc cùng một định nghĩa đối tượng và cùng bộ lọc.
 */
export interface DomainScope {
  /** Nguồn dữ liệu được đưa vào tập kết quả. Bỏ trống = tất cả nguồn. */
  sources?: DataSourceType[];
  /** Giới hạn theo mã xã/phường. */
  communeCodes?: string[];
  cooperativeId?: string;
  farmerId?: string;
  zoneId?: string;
}

/** Lọc tập kết quả theo nguồn gốc (nếu scope chỉ định nguồn). */
export function filterBySource<T extends { source: DataSourceType }>(rows: T[], scope: DomainScope): T[] {
  if (!scope.sources || scope.sources.length === 0) return rows;
  const allow = new Set(scope.sources);
  return rows.filter((r) => allow.has(r.source));
}

/**
 * Loại trùng theo id canonical (giữ bản ghi xuất hiện trước).
 * Dùng trước mọi phép tổng hợp để tránh đếm trùng khi gộp nhiều nguồn.
 */
export function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

/** Tập con của một entity rơi vào phạm vi địa bàn/HTX/ao/vùng. */
export function filterByScope<T extends EntityBase & Record<string, unknown>>(
  rows: T[],
  scope: DomainScope,
): T[] {
  const bySource = filterBySource(rows, scope);
  const communeSet = scope.communeCodes && scope.communeCodes.length ? new Set(scope.communeCodes) : null;
  return bySource.filter((r) => {
    if (communeSet) {
      const code = (r.communeCode as string | null) ?? null;
      if (!code || !communeSet.has(code)) return false;
    }
    if (scope.cooperativeId && r.cooperativeId !== scope.cooperativeId) return false;
    if (scope.farmerId && r.farmerId !== scope.farmerId) return false;
    if (scope.zoneId) {
      const zones = (r.zoneIds as string[] | undefined) ?? ((r.zoneId as string | undefined) ? [r.zoneId as string] : []);
      if (!zones.includes(scope.zoneId)) return false;
    }
    return true;
  });
}

/** Phạm vi mặc định khi không lọc: dùng tất cả nguồn (kết quả sẽ mang nhãn nguồn). */
export const ALL_SOURCES_SCOPE: DomainScope = {};

/** Phạm vi chỉ dữ liệu nhập từ phụ lục PDF. */
export const IMPORTED_SCOPE: DomainScope = { sources: ['PDF_SOURCE'] };

/** Phạm vi chỉ dữ liệu mô phỏng. */
export const MOCK_SCOPE: DomainScope = { sources: ['MOCK_DATA'] };

/** Nguồn dữ liệu có thể chọn trên giao diện (bộ lọc nguồn). */
export type SourceFilterId = 'all' | 'imported' | 'mock' | 'osm';
export const SOURCE_FILTERS: { id: SourceFilterId; label: string; sources: DataSourceType[] | null }[] = [
  { id: 'all', label: 'Hồ sơ lươn & địa bàn tham chiếu', sources: null },
  { id: 'mock', label: 'Hồ sơ nuôi lươn mô phỏng', sources: ['MOCK_DATA'] },
];

export function scopeForSourceFilter(id: SourceFilterId, base: DomainScope = {}): DomainScope {
  const def = SOURCE_FILTERS.find((f) => f.id === id);
  if (!def || !def.sources) return { ...base, sources: undefined };
  return { ...base, sources: def.sources };
}

/**
 * Phạm vi mô phỏng theo vai trò (Mock Mode – chỉ minh hoạ giao diện).
 * admin/manager: toàn hệ thống; farmer: ao được giao; coop: vùng trong phạm vi HTX.
 */
export interface RoleScopeHint {
  role: SmartAquaRole;
  farmerId?: string;
  cooperativeId?: string;
  communeCodes?: string[];
}

export function roleScopeHint(role: SmartAquaRole, hints: Omit<RoleScopeHint, 'role'> = {}): DomainScope {
  if (role === 'admin' || role === 'manager') return { ...hints };
  if (role === 'farmer') return { farmerId: hints.farmerId, ...hints };
  return { cooperativeId: hints.cooperativeId, ...hints };
}
