import type { DemoDB, RecordItem, Role } from '../../types/models';
import { scoped } from '../selectors';

export type ProductionPeriod = 'month' | 'quarter' | 'year';
export interface AreaAnalyticsFilter {
  areaId?: string;
  unitId?: string;
  speciesId?: string;
  year?: number | 'all';
}
export interface AreaAnalyticsRow {
  areaId: string;
  code: string;
  name: string;
  status: string;
  unitId: string | null;
  unitName: string;
  coopName: string;
  aquacultureType: string;
  declaredSpecies: string[];
  zoneAreaHa: number;
  farmerCount: number;
  pondCount: number;
  pondAreaHa: number;
  cycleCount: number;
  activeCycleCount: number;
  harvestKg: number;
  species: { id: string; name: string; cycleCount: number; harvestKg: number }[];
}
export interface AreaAnalytics {
  areas: AreaAnalyticsRow[];
  totals: { areaCount: number; zoneAreaHa: number; farmerCount: number; pondCount: number; pondAreaHa: number; cycleCount: number; activeCycleCount: number; harvestKg: number };
  species: { id: string; name: string; cycleCount: number; harvestKg: number }[];
  byUnit: { id: string; name: string; areaCount: number; farmerCount: number; pondCount: number; harvestKg: number }[];
  production: { key: string; label: string; harvestKg: number }[];
  years: number[];
}

const unique = <T extends { id: string }>(items: T[]) => [...new Map(items.map((item) => [item.id, item])).values()];
const num = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const active = (cycle: RecordItem) => cycle.status === 'active' || cycle.status === 'harvesting';

function periodKey(date: string, period: ProductionPeriod) {
  const year = date.slice(0, 4);
  const month = Number(date.slice(5, 7));
  if (period === 'year') return year;
  if (period === 'quarter') return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
  return date.slice(0, 7);
}

function periodLabel(key: string, period: ProductionPeriod) {
  if (period === 'year') return key;
  if (period === 'quarter') return `Quý ${key.slice(-1)} · ${key.slice(0, 4)}`;
  return `${key.slice(5, 7)}/${key.slice(0, 4)}`;
}

export function areaAnalytics(db: DemoDB, role: Role, filter: AreaAnalyticsFilter = {}, period: ProductionPeriod = 'month'): AreaAnalytics {
  const areas = unique(scoped(db, role, 'aquacultureAreas').filter((area) => (!filter.areaId || area.id === filter.areaId) && (!filter.unitId || area.unitId === filter.unitId)));
  const areaIds = new Set(areas.map((area) => area.id));
  const farmers = unique(scoped(db, role, 'farmers').filter((farmer) => areaIds.has(String(farmer.areaId))));
  const ponds = unique(scoped(db, role, 'ponds').filter((pond) => areaIds.has(String(pond.areaId))));
  const pondIds = new Set(ponds.map((pond) => pond.id));
  const cycles = unique(scoped(db, role, 'farmingCycles').filter((cycle) => pondIds.has(String(cycle.pondId)) && (!filter.speciesId || cycle.speciesId === filter.speciesId)));
  const cycleIds = new Set(cycles.map((cycle) => cycle.id));
  const harvests = unique(scoped(db, role, 'harvests').filter((harvest) => cycleIds.has(String(harvest.cycleId)) && (filter.year === undefined || filter.year === 'all' || String(harvest.date).startsWith(String(filter.year)))));
  const cycleById = new Map(cycles.map((cycle) => [cycle.id, cycle]));
  const pondById = new Map(ponds.map((pond) => [pond.id, pond]));
  const speciesById = new Map((db.species as RecordItem[]).map((species) => [species.id, species]));
  const unitById = new Map((db.administrativeUnits as RecordItem[]).map((unit) => [unit.id, unit]));
  const coopById = new Map((db.cooperatives as RecordItem[]).map((coop) => [coop.id, coop]));
  const zones = Array.isArray(db.aquacultureZones) ? db.aquacultureZones as RecordItem[] : [];

  const harvestByCycle = new Map<string, number>();
  for (const harvest of harvests) harvestByCycle.set(String(harvest.cycleId), (harvestByCycle.get(String(harvest.cycleId)) || 0) + num(harvest.quantityKg));
  const pondByArea = new Map<string, RecordItem[]>();
  for (const pond of ponds) pondByArea.set(String(pond.areaId), [...(pondByArea.get(String(pond.areaId)) || []), pond]);
  const farmerByArea = new Map<string, RecordItem[]>();
  for (const farmer of farmers) farmerByArea.set(String(farmer.areaId), [...(farmerByArea.get(String(farmer.areaId)) || []), farmer]);

  const areaRows: AreaAnalyticsRow[] = areas.map((area) => {
    const linkedZone = zones.find((zone) => Array.isArray(zone.areaIds) && zone.areaIds.includes(area.id));
    const areaPonds = pondByArea.get(area.id) || [];
    const areaPondIds = new Set(areaPonds.map((pond) => pond.id));
    const areaCycles = cycles.filter((cycle) => areaPondIds.has(String(cycle.pondId)));
    const areaHarvestKg = areaCycles.reduce((total, cycle) => total + (harvestByCycle.get(cycle.id) || 0), 0);
    const speciesTotals = new Map<string, { cycleCount: number; harvestKg: number }>();
    for (const cycle of areaCycles) {
      const value = speciesTotals.get(String(cycle.speciesId)) || { cycleCount: 0, harvestKg: 0 };
      value.cycleCount += 1;
      value.harvestKg += harvestByCycle.get(cycle.id) || 0;
      speciesTotals.set(String(cycle.speciesId), value);
    }
    return {
      areaId: area.id, code: String(area.code || area.id), name: String(area.name || area.id), status: String(area.status || 'unknown'),
      unitId: area.unitId ? String(area.unitId) : null, unitName: String(unitById.get(String(area.unitId))?.name || 'Chưa gán địa bàn'),
      coopName: String(coopById.get(String(area.coopId))?.name || '—'),
      aquacultureType: String(linkedZone?.aquacultureType || 'Chưa cập nhật'),
      declaredSpecies: Array.isArray(linkedZone?.species) ? linkedZone.species.map((id: string) => String(speciesById.get(id)?.name || id)) : [],
      zoneAreaHa: num(area.areaHa),
      farmerCount: unique(farmerByArea.get(area.id) || []).length, pondCount: areaPonds.length,
      pondAreaHa: areaPonds.reduce((total, pond) => total + num(pond.areaHa), 0),
      cycleCount: areaCycles.length, activeCycleCount: areaCycles.filter(active).length, harvestKg: areaHarvestKg,
      species: [...speciesTotals.entries()].map(([id, value]) => ({ id, name: String(speciesById.get(id)?.name || id), ...value })).sort((a, b) => b.cycleCount - a.cycleCount),
    };
  });

  const speciesTotals = new Map<string, { cycleCount: number; harvestKg: number }>();
  for (const cycle of cycles) {
    const value = speciesTotals.get(String(cycle.speciesId)) || { cycleCount: 0, harvestKg: 0 };
    value.cycleCount += 1;
    value.harvestKg += harvestByCycle.get(cycle.id) || 0;
    speciesTotals.set(String(cycle.speciesId), value);
  }
  const species = [...speciesTotals.entries()].map(([id, value]) => ({ id, name: String(speciesById.get(id)?.name || id), ...value })).sort((a, b) => b.cycleCount - a.cycleCount);

  const unitGroups = new Map<string, AreaAnalyticsRow[]>();
  for (const row of areaRows) {
    const id = row.unitId || 'unassigned';
    unitGroups.set(id, [...(unitGroups.get(id) || []), row]);
  }
  const byUnit = [...unitGroups.entries()].map(([id, rows]) => ({
    id, name: rows[0]?.unitName || 'Chưa gán địa bàn', areaCount: rows.length,
    farmerCount: rows.reduce((sum, row) => sum + row.farmerCount, 0),
    pondCount: rows.reduce((sum, row) => sum + row.pondCount, 0),
    harvestKg: rows.reduce((sum, row) => sum + row.harvestKg, 0),
  })).sort((a, b) => b.harvestKg - a.harvestKg);

  const selectedAreaIds = new Set(areaRows.map((row) => row.areaId));
  const productionMap = new Map<string, number>();
  for (const harvest of harvests) {
    const cycle = cycleById.get(String(harvest.cycleId));
    const pond = cycle ? pondById.get(String(cycle.pondId)) : undefined;
    if (!pond || !selectedAreaIds.has(String(pond.areaId))) continue;
    const key = periodKey(String(harvest.date), period);
    productionMap.set(key, (productionMap.get(key) || 0) + num(harvest.quantityKg));
  }
  const production = [...productionMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, harvestKg]) => ({ key, label: periodLabel(key, period), harvestKg }));
  const years = [...new Set((db.harvests as RecordItem[]).map((harvest) => Number(String(harvest.date).slice(0, 4))).filter(Number.isFinite))].sort((a, b) => b - a);

  return {
    areas: areaRows,
    totals: {
      areaCount: areaRows.length, zoneAreaHa: areaRows.reduce((sum, row) => sum + row.zoneAreaHa, 0),
      farmerCount: unique(farmers).length, pondCount: unique(ponds).length, pondAreaHa: unique(ponds).reduce((sum, pond) => sum + num(pond.areaHa), 0),
      cycleCount: unique(cycles).length, activeCycleCount: cycles.filter(active).length, harvestKg: harvests.reduce((sum, harvest) => sum + num(harvest.quantityKg), 0),
    },
    species, byUnit, production, years,
  };
}

export function productionByPeriod(db: DemoDB, role: Role, filter: AreaAnalyticsFilter = {}, period: ProductionPeriod = 'month') {
  return areaAnalytics(db, role, filter, period).production;
}

export function farmerAnalytics(db: DemoDB, role: Role, farmerId: string, year?: number | 'all') {
  const farmer = scoped(db, role, 'farmers').find((item) => item.id === farmerId);
  if (!farmer) return null;
  const ponds = unique(scoped(db, role, 'ponds').filter((pond) => pond.farmerId === farmerId));
  const pondIds = new Set(ponds.map((pond) => pond.id));
  const cycles = unique(scoped(db, role, 'farmingCycles').filter((cycle) => pondIds.has(String(cycle.pondId))));
  const cycleIds = new Set(cycles.map((cycle) => cycle.id));
  const harvests = unique(scoped(db, role, 'harvests').filter((item) => cycleIds.has(String(item.cycleId)) && (year === undefined || year === 'all' || String(item.date).startsWith(String(year)))));
  const harvestKgByCycle = new Map<string, number>();
  for (const harvest of harvests) harvestKgByCycle.set(String(harvest.cycleId), (harvestKgByCycle.get(String(harvest.cycleId)) || 0) + num(harvest.quantityKg));
  const speciesById = new Map((db.species as RecordItem[]).map((species) => [species.id, species]));
  const speciesTotals = new Map<string, { cycleCount: number; harvestKg: number }>();
  for (const cycle of cycles) {
    const value = speciesTotals.get(String(cycle.speciesId)) || { cycleCount: 0, harvestKg: 0 };
    value.cycleCount += 1;
    value.harvestKg += harvestKgByCycle.get(cycle.id) || 0;
    speciesTotals.set(String(cycle.speciesId), value);
  }
  return {
    farmer,
    ponds,
    cycles,
    activeCycleCount: cycles.filter(active).length,
    pondAreaHa: ponds.reduce((sum, pond) => sum + num(pond.areaHa), 0),
    harvestKg: harvests.reduce((sum, harvest) => sum + num(harvest.quantityKg), 0),
    species: [...speciesTotals.entries()].map(([id, value]) => ({ id, name: String(speciesById.get(id)?.name || id), ...value })).sort((a, b) => b.cycleCount - a.cycleCount),
  };
}
