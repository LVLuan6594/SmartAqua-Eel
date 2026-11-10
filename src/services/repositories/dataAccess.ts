/**
 * Data Access Facade – điểm truy cập dữ liệu canonical duy nhất cho toàn hệ thống.
 *
 * Tổng hợp nhiều nguồn (mô phỏng + phụ lục PDF + GIS) thành entity chuẩn, áp bộ lọc
 * `DomainScope` (nguồn, xã/phường, HTX, nông dân, vùng) và cung cấp số liệu tổng hợp.
 * Entity giữ nguyên nguồn gốc & tình trạng xác minh; KHÔNG trộn/ghi đè giữa các nguồn.
 */
import type { DataSourceType } from '../../domain/sources';
import { dedupeById, filterByScope, filterBySource, type DomainScope } from '../../domain/scope';
import type {
  AdministrativeUnit,
  AquacultureFacility,
  AquacultureZone,
  Cooperative,
  Farmer,
  FarmingCycle,
  FarmingDiary,
  Harvest,
  Pond,
} from '../../domain/entities';
import type {
  AdministrativeUnitRepository,
  AquacultureZoneRepository,
  BreakdownKind,
  CooperativeRepository,
  DataAccess,
  DataSummary,
  DiaryRepository,
  FacilityRepository,
  FarmerRepository,
  FarmingCycleRepository,
  HarvestRepository,
  PondRepository,
  SourceCounts,
} from '../contracts/queries';
import { mockDataset } from './mockAdapter';
import { pdfFacilities, pdfPonds } from './pdfAdapter';
import { enrichZonesWithGeometry, gisAdministrativeUnits } from './gisAdapter';

const ALL_SOURCE_TYPES: DataSourceType[] = [
  'PDF_SOURCE',
  'OFFICIAL_GIS',
  'OSM_SOURCE',
  'MOCK_DATA',
  'USER_INPUT',
  'DERIVED_DATA',
];

function countsOf<T extends { source: DataSourceType }>(rows: T[]): SourceCounts {
  const out = {} as SourceCounts;
  for (const t of ALL_SOURCE_TYPES) out[t] = 0;
  for (const r of rows) out[r.source] = (out[r.source] || 0) + 1;
  return out;
}

/* ------------------------------- Nạp nguồn ------------------------------- */

async function allAdministrativeUnits(): Promise<AdministrativeUnit[]> {
  let gis: AdministrativeUnit[] = [];
  try {
    gis = await gisAdministrativeUnits();
  } catch {
    gis = [];
  }
  return dedupeById([...gis, ...mockDataset().administrativeUnits]);
}

async function allZones(): Promise<AquacultureZone[]> {
  return dedupeById(await enrichZonesWithGeometry(mockDataset().zones));
}

const allCooperatives = (): Cooperative[] => mockDataset().cooperatives;
const allFacilities = (): AquacultureFacility[] => dedupeById([...pdfFacilities(), ...mockDataset().facilities]);
const allFarmers = (): Farmer[] => mockDataset().farmers;
const allPonds = (): Pond[] => dedupeById([...pdfPonds(), ...mockDataset().ponds]);
const allCycles = (): FarmingCycle[] => mockDataset().cycles;
const allDiaries = (): FarmingDiary[] => mockDataset().diaries;
const allHarvests = (): Harvest[] => mockDataset().harvests;

/* --------------------- Bộ lọc phạm vi cho từng loại ---------------------- */

function scopeAdminUnits(rows: AdministrativeUnit[], scope: DomainScope): AdministrativeUnit[] {
  let out = filterBySource(rows, scope);
  if (scope.communeCodes?.length) {
    const set = new Set(scope.communeCodes);
    out = out.filter((u) => set.has(u.code));
  }
  if(scope.farmerId||scope.cooperativeId||scope.zoneId){const codes=new Set(scopePonds(allPonds(),scope).map(p=>p.communeCode));out=out.filter(u=>codes.has(u.code));}
  return out;
}

function scopeZones(rows: AquacultureZone[], scope: DomainScope): AquacultureZone[] {
  let out = filterBySource(rows, scope);
  if (scope.communeCodes?.length) {
    const set = new Set(scope.communeCodes);
    out = out.filter((z) => z.communeCodes.some((c) => set.has(c)));
  }
  if (scope.zoneId) out = out.filter((z) => z.zoneId === scope.zoneId);
  if(scope.cooperativeId){const coopId=scope.cooperativeId.replace(/^mock:/,'');out=out.filter(z=>z.coopIds.includes(coopId));}
  if(scope.farmerId){const zoneIds=new Set(scopePonds(allPonds(),scope).flatMap(p=>p.zoneIds));out=out.filter(z=>zoneIds.has(z.zoneId));}
  return out;
}

function scopeFacilities(rows: AquacultureFacility[], scope: DomainScope): AquacultureFacility[] {
  let out = filterBySource(rows, scope);
  if (scope.communeCodes?.length) {
    const set = new Set(scope.communeCodes);
    out = out.filter((f) => (f.communeCode ? set.has(f.communeCode) : false));
  }
  if(scope.cooperativeId||scope.farmerId||scope.zoneId){const facilityIds=new Set(scopePonds(allPonds(),scope).map(p=>p.facilityId));out=out.filter(f=>facilityIds.has(f.id));}
  return out;
}

function scopePonds(rows: Pond[], scope: DomainScope): Pond[] {
  return filterByScope(rows as any, scope) as unknown as Pond[];
}

function scopeCycles(rows: FarmingCycle[], scope: DomainScope): FarmingCycle[] {
  const pondIds = restrictedPondIds(scope);
  let out = filterBySource(rows, scope);
  if (pondIds) out = out.filter((c) => pondIds.has(c.pondId));
  return out;
}

function scopeDiaries(rows: FarmingDiary[], scope: DomainScope): FarmingDiary[] {
  const pondIds = restrictedPondIds(scope);
  let out = filterBySource(rows, scope);
  if (pondIds) {
    const cycleIds = new Set(allCycles().filter((c) => pondIds.has(c.pondId)).map((c) => c.id));
    out = out.filter((d) => cycleIds.has(d.cycleId));
  }
  return out;
}

function scopeHarvests(rows: Harvest[], scope: DomainScope): Harvest[] {
  const pondIds = restrictedPondIds(scope);
  let out = filterBySource(rows, scope);
  if (pondIds) {
    const cycleIds = new Set(allCycles().filter((c) => pondIds.has(c.pondId)).map((c) => c.id));
    out = out.filter((h) => cycleIds.has(h.cycleId));
  }
  return out;
}

/** Tập id ao bị giới hạn khi scope chỉ định địa bàn/vùng/nông dân (null = không giới hạn). */
function restrictedPondIds(scope: DomainScope): Set<string> | null {
  if (!scope.communeCodes?.length && !scope.zoneId && !scope.farmerId && !scope.cooperativeId) return null;
  const ponds = scopePonds(allPonds(), scope);
  return new Set(ponds.map((p) => p.id));
}

/* ------------------------------ Repositories ----------------------------- */

const administrativeUnits: AdministrativeUnitRepository = {
  getAll: async (scope = {}) => scopeAdminUnits(await allAdministrativeUnits(), scope),
  getById: async (id) => (await allAdministrativeUnits()).find((u) => u.id === id) ?? null,
  count: async (scope = {}) => scopeAdminUnits(await allAdministrativeUnits(), scope).length,
  getByCode: async (code) => (await allAdministrativeUnits()).find((u) => u.code === code) ?? null,
  search: async (query, limit = 20) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return scopeAdminUnits(await allAdministrativeUnits(), {}).filter(
      (u) => u.name.toLowerCase().includes(q) || u.code.includes(q),
    ).slice(0, limit);
  },
};

const zones: AquacultureZoneRepository = {
  getAll: async (scope = {}) => scopeZones(await allZones(), scope),
  getById: async (id) => (await allZones()).find((z) => z.id === id || z.zoneId === id) ?? null,
  count: async (scope = {}) => scopeZones(await allZones(), scope).length,
  getByCommune: async (communeCode) => (await allZones()).filter((z) => z.communeCodes.includes(communeCode)),
};

const cooperatives: CooperativeRepository = {
  getAll: async (scope = {}) => {let rows=filterBySource(allCooperatives(),scope);if(scope.cooperativeId)rows=rows.filter(c=>c.id===scope.cooperativeId);if(scope.farmerId){const ids=new Set(allFarmers().filter(f=>f.id===scope.farmerId).map(f=>f.cooperativeId));rows=rows.filter(c=>ids.has(c.id));}if(scope.communeCodes?.length){const units=new Set(scope.communeCodes);rows=rows.filter(c=>c.scopeCommuneCodes.some(code=>units.has(code)));}return rows;},
  getById: async (id) => allCooperatives().find((c) => c.id === id) ?? null,
  count: async (scope = {}) => (await cooperatives.getAll(scope)).length,
};

const facilities: FacilityRepository = {
  getAll: async (scope = {}) => scopeFacilities(allFacilities(), scope),
  getById: async (id) => allFacilities().find((f) => f.id === id) ?? null,
  count: async (scope = {}) => scopeFacilities(allFacilities(), scope).length,
  getByCommune: async (communeCode) => allFacilities().filter((f) => f.communeCode === communeCode),
  search: async (query, limit = 40) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allFacilities()
      .filter(
        (f) =>
          (f.codeOriginal || '').toLowerCase().includes(q) ||
          (f.communeName || '').toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q),
      )
      .slice(0, limit);
  },
};

const farmers: FarmerRepository = {
  getAll: async (scope = {}) => {let rows=filterBySource(allFarmers(),scope);if(scope.farmerId)rows=rows.filter(f=>f.id===scope.farmerId);if(scope.cooperativeId)rows=rows.filter(f=>f.cooperativeId===scope.cooperativeId);if(scope.communeCodes?.length){const allowed=new Set(scopePonds(allPonds(),scope).map(p=>p.farmerId));rows=rows.filter(f=>allowed.has(f.id));}return rows;},
  getById: async (id) => allFarmers().find((f) => f.id === id) ?? null,
  count: async (scope = {}) => (await farmers.getAll(scope)).length,
  getByFacility: async (facilityId) => allFarmers().filter((f) => f.facilityId === facilityId),
};

const ponds: PondRepository = {
  getAll: async (scope = {}) => scopePonds(allPonds(), scope),
  getById: async (id) => allPonds().find((p) => p.id === id) ?? null,
  count: async (scope = {}) => scopePonds(allPonds(), scope).length,
  getByFacility: async (facilityId) => allPonds().filter((p) => p.facilityId === facilityId),
  getByFarmer: async (farmerId) => allPonds().filter((p) => p.farmerId === farmerId),
  getByAdministrativeUnit: async (communeCode) => allPonds().filter((p) => p.communeCode === communeCode),
  getByZone: async (zoneId) => allPonds().filter((p) => p.zoneIds.includes(zoneId)),
};

const cycles: FarmingCycleRepository = {
  getAll: async (scope = {}) => scopeCycles(allCycles(), scope),
  getById: async (id) => allCycles().find((c) => c.id === id) ?? null,
  count: async (scope = {}) => scopeCycles(allCycles(), scope).length,
  getByPond: async (pondId) => allCycles().filter((c) => c.pondId === pondId),
};

const diaries: DiaryRepository = {
  getAll: async (scope = {}) => scopeDiaries(allDiaries(), scope),
  getById: async (id) => allDiaries().find((d) => d.id === id) ?? null,
  count: async (scope = {}) => scopeDiaries(allDiaries(), scope).length,
  getByCycle: async (cycleId) => allDiaries().filter((d) => d.cycleId === cycleId),
};

const harvests: HarvestRepository = {
  getAll: async (scope = {}) => scopeHarvests(allHarvests(), scope),
  getById: async (id) => allHarvests().find((h) => h.id === id) ?? null,
  count: async (scope = {}) => scopeHarvests(allHarvests(), scope).length,
  getByCycle: async (cycleId) => allHarvests().filter((h) => h.cycleId === cycleId),
};

/* -------------------------------- Tổng hợp ------------------------------- */

async function summary(scope: DomainScope = {}): Promise<DataSummary> {
  const [units, z, cops, facs, fms, pds, cyc, harv] = await Promise.all([
    administrativeUnits.getAll(scope),
    zones.getAll(scope),
    cooperatives.getAll(scope),
    facilities.getAll(scope),
    farmers.getAll(scope),
    ponds.getAll(scope),
    cycles.getAll(scope),
    harvests.getAll(scope),
  ]);
  const sourceSet = new Set<DataSourceType>();
  const track = (rows: { source: DataSourceType }[]) => rows.forEach((r) => sourceSet.add(r.source));
  track(units);
  track(z);
  track(facs);
  track(fms);
  track(pds);
  track(cyc);
  track(harv);

  let pondAreaHa = 0;
  for (const p of pds) {
    if (p.areaHa != null) pondAreaHa += p.areaHa;
    else if (p.areaM2 != null) pondAreaHa += p.areaM2 / 10000;
  }

  return {
    administrativeUnits: units.length,
    zones: z.length,
    cooperatives: cops.length,
    facilities: facs.length,
    farmers: fms.length,
    ponds: pds.length,
    cycles: cyc.length,
    activeCycles: cyc.filter((c) => c.status === 'active' || c.status === 'harvesting').length,
    harvests: harv.length,
    harvestKg: harv.reduce((s, h) => s + h.quantityKg, 0),
    pondAreaHa: Math.round(pondAreaHa * 100) / 100,
    facilitiesWithCoordinates: facs.filter((f) => f.lat != null && f.lng != null).length,
    sources: [...sourceSet],
  };
}

async function sourceBreakdown(kind: BreakdownKind, scope: DomainScope = {}): Promise<SourceCounts> {
  switch (kind) {
    case 'facilities':
      return countsOf(scopeFacilities(allFacilities(), scope));
    case 'ponds':
      return countsOf(scopePonds(allPonds(), scope));
    case 'zones':
      return countsOf(scopeZones(await allZones(), scope));
    case 'cycles':
      return countsOf(scopeCycles(allCycles(), scope));
    case 'farmers':
      return countsOf(await farmers.getAll(scope));
    default:
      return countsOf([]);
  }
}

export const dataAccess: DataAccess = {
  administrativeUnits,
  zones,
  cooperatives,
  facilities,
  farmers,
  ponds,
  cycles,
  diaries,
  harvests,
  summary,
  sourceBreakdown,
};

export { ALL_SOURCE_TYPES };
