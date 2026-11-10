import type { DemoDB, Role } from '../../../types/models';
import { getActiveAccount } from '../../../auth/authService';
import {pondScope} from '../../../domain/selectors';
import type { AquacultureZone, AquacultureZoneProperties, ZoneCommuneLink } from '../types';

export interface LinkedZone extends AquacultureZoneProperties {
  areaIds: string[];
  coopIds: string[];
  geometrySourceId: string | null;
  evidence?: string;
  sourceUrl?: string;
}

const rows = <T,>(db: DemoDB, key: string): T[] => (Array.isArray((db as any)[key]) ? ((db as any)[key] as T[]) : []);

export const zonesOf = (db: DemoDB): LinkedZone[] => rows<LinkedZone>(db, 'aquacultureZones');

export const zoneById = (db: DemoDB, zoneId: string | null | undefined): LinkedZone | null =>
  zoneId ? zonesOf(db).find((z) => z.zoneId === zoneId) || null : null;

export const zoneByAreaId = (db: DemoDB, areaId: string): LinkedZone | null =>
  zonesOf(db).find((z) => z.areaIds?.includes(areaId)) || null;

export const zoneByDemoSource = (db: DemoDB, entityId: string): LinkedZone | null =>
  zonesOf(db).find((z) => z.geometrySourceId === `demo:${entityId}`) || null;

export const linksOf = (db: DemoDB, zoneId: string): ZoneCommuneLink[] =>
  rows<ZoneCommuneLink>(db, 'zoneCommuneLinks')
    .filter((l) => l.zoneId === zoneId)
    .sort((a, b) => b.intersectionAreaKm2 - a.intersectionAreaKm2);

/**
 * Khu vực nghiệp vụ mà vai trò hiện tại được phép xem.
 * null = không giới hạn (cán bộ quản trị, lãnh đạo).
 */
export function visibleAreaIds(db: DemoDB, role: Role): string[] | null {
  if (role === 'admin') return null;
  if (role === 'farmer') {
    const account = getActiveAccount();
    if (account?.pondIds?.length) return [...new Set(rows<any>(db, 'ponds').filter(p=>account.pondIds!.includes(p.id)).map(p=>p.areaId))];
    const farmer = rows<any>(db, 'farmers').find((f) => f.id === (getActiveAccount()?.farmerId||'F001'));
    return farmer ? [farmer.areaId] : [];
  }
  if(role==='coop')return rows<any>(db,'aquacultureAreas').filter((a) => a.coopId === (getActiveAccount()?.coopId||'HTX01')).map((a) => a.id);
  if(!getActiveAccount())return null;
  const unitIds=getActiveAccount()?.unitIds||[];
  const coopIds=new Set(rows<any>(db,'cooperatives').filter(c=>unitIds.includes(c.unitId)).map(c=>c.id));
  return rows<any>(db, 'aquacultureAreas').filter((a) => coopIds.has(a.coopId)).map((a) => a.id);
}

const areasAllowed = (db: DemoDB, role: Role, areaIds: string[]): boolean => {
  const visible = visibleAreaIds(db, role);
  if (!visible) return true;
  return areaIds.some((id) => visible.includes(id));
};

export interface ZoneAccess {
  allowed: boolean;
  /** Lý do bị hạn chế, hiển thị cho người dùng. */
  reason?: string;
}

export function zoneAccess(db: DemoDB, role: Role, zone: LinkedZone): ZoneAccess {
  const businessAreas = zone.areaIds || [];
  if (businessAreas.length === 0) return { allowed: true };
  if (areasAllowed(db, role, businessAreas)) return { allowed: true };
  return { allowed: false, reason: 'Vai trò hiện tại không có quyền xem hộ nuôi trong địa bàn này.' };
}

export const farmersOfZone = (db: DemoDB, zone: LinkedZone, role: Role): any[] => {
  const visible = visibleAreaIds(db, role);
  const areaIds = zone.areaIds || [];
  const farmerIds=new Set(pondScope(db,role).map(p=>p.farmerId));
  return rows<any>(db, 'farmers').filter((f) => areaIds.includes(f.areaId) && farmerIds.has(f.id) && (!visible || visible.includes(f.areaId)));
};

export const pondsOfZone = (db: DemoDB, zone: LinkedZone, role: Role): any[] => {
  const visible = visibleAreaIds(db, role);
  const areaIds = zone.areaIds || [];
  return pondScope(db,role).filter((p) => areaIds.includes(p.areaId) && (!visible || visible.includes(p.areaId)));
};

export const farmerById = (db: DemoDB, id: string | null) => rows<any>(db, 'farmers').find((f) => f.id === id) || null;
export const pondById = (db: DemoDB, id: string | null) => rows<any>(db, 'ponds').find((p) => p.id === id) || null;
export const cycleById = (db: DemoDB, id: string | null) => rows<any>(db, 'farmingCycles').find((c) => c.id === id) || null;

export const pondsOfFarmer = (db: DemoDB, farmerId: string): any[] => rows<any>(db, 'ponds').filter((p) => p.farmerId === farmerId);
export const cyclesOfPond = (db: DemoDB, pondId: string): any[] =>
  rows<any>(db, 'farmingCycles')
    .filter((c) => c.pondId === pondId)
    .sort((a, b) => String(b.stockingDate).localeCompare(String(a.stockingDate)));

export const label = (db: DemoDB, key: string, id: string | null | undefined, field = 'name'): string => {
  if (!id) return '—';
  const found = rows<any>(db, key).find((r) => r.id === id);
  return (found && found[field]) || id;
};

export interface CycleDiaries {
  stocking: any | null;
  feed: any[];
  medication: any[];
  environment: any[];
  growth: any[];
  health: any[];
  harvest: any[];
}

const byDate = (a: any, b: any) => String(a.date).localeCompare(String(b.date));

export function diariesOfCycle(db: DemoDB, cycleId: string): CycleDiaries {
  return {
    stocking: rows<any>(db, 'stockingEvents').find((s) => s.cycleId === cycleId) || null,
    feed: rows<any>(db, 'feedDiaries').filter((d) => d.cycleId === cycleId).sort(byDate),
    medication: rows<any>(db, 'medicationDiaries').filter((d) => d.cycleId === cycleId).sort(byDate),
    environment: rows<any>(db, 'environmentObservations').filter((d) => d.cycleId === cycleId).sort(byDate),
    growth: rows<any>(db, 'growthObservations').filter((d) => d.cycleId === cycleId).sort(byDate),
    health: rows<any>(db, 'healthEvents').filter((d) => d.cycleId === cycleId).sort(byDate),
    harvest: rows<any>(db, 'harvests').filter((d) => d.cycleId === cycleId).sort(byDate),
  };
}

export interface CycleKpis {
  stockingQuantity: number;
  feedKg: number;
  harvestKg: number;
  harvestCount: number;
  days: number;
  averageGrams: number | null;
  fcr: number | null;
  seedBatchCode: string | null;
  supplierName: string | null;
  speciesName: string | null;
}

export function cycleKpis(db: DemoDB, cycle: any, diaries?: CycleDiaries): CycleKpis {
  const d = diaries || diariesOfCycle(db, cycle.id);
  const feedKg = d.feed.reduce((s, r) => s + (Number(r.amountKg) || 0), 0);
  const harvestKg = d.harvest.reduce((s, r) => s + (Number(r.quantityKg) || 0), 0);
  const growth = d.growth.at(-1);
  const seed = rows<any>(db, 'seedBatches').find((b) => b.id === cycle.seedBatchId);
  const start = cycle.stockingDate ? new Date(String(cycle.stockingDate)).getTime() : null;
  const end = d.harvest.at(-1)?.date ? new Date(String(d.harvest.at(-1).date)).getTime() : Date.now();
  return {
    stockingQuantity: Number(cycle.stockingQuantity) || 0,
    feedKg,
    harvestKg,
    harvestCount: d.harvest.length,
    days: start ? Math.max(0, Math.round((end - start) / 86400000)) : 0,
    averageGrams: growth ? Number(growth.averageGrams) : null,
    fcr: harvestKg > 0 && feedKg > 0 ? Math.round((feedKg / harvestKg) * 100) / 100 : null,
    seedBatchCode: seed?.code || null,
    supplierName: seed ? label(db, 'seedSuppliers', seed.supplierId) : null,
    speciesName: label(db, 'species', cycle.speciesId),
  };
}

export interface ZoneKpis {
  farmerCount: number;
  pondCount: number;
  activeCycles: number;
  harvestKg: number;
  areaHa: number;
}

export function zoneKpis(db: DemoDB, zone: LinkedZone, role: Role): ZoneKpis {
  const farmers = farmersOfZone(db, zone, role);
  const ponds = pondsOfZone(db, zone, role);
  const pondIds = new Set(ponds.map((p) => p.id));
  const cycles = rows<any>(db, 'farmingCycles').filter((c) => pondIds.has(c.pondId));
  const cycleIds = new Set(cycles.map((c) => c.id));
  const harvestKg = rows<any>(db, 'harvests')
    .filter((h) => cycleIds.has(h.cycleId))
    .reduce((s, h) => s + (Number(h.quantityKg) || 0), 0);
  return {
    farmerCount: farmers.length,
    pondCount: ponds.length,
    activeCycles: cycles.filter((c) => c.status === 'active' || c.status === 'harvesting').length,
    harvestKg,
    areaHa: ponds.reduce((s, p) => s + (Number(p.areaHa) || 0), 0),
  };
}
