/**
 * Mock Adapter – ánh xạ `src/data/data.json` (dữ liệu mô phỏng) sang entity
 * canonical. Đây là nguồn DUY NHẤT đọc trực tiếp file seed; mọi tầng khác đi qua
 * facade. Dữ liệu mô phỏng luôn mang `source='MOCK_DATA'` và được đánh dấu
 * `verificationStatus='unresolved'` để không lẫn với dữ liệu thực.
 *
 * Ánh xạ (xem docs/data-relationships.md):
 *  - administrativeUnits → AdministrativeUnit (type 'mock')
 *  - aquacultureZones    → AquacultureZone (nguồn theo dữ liệu: mock/OSM/GIS)
 *  - cooperatives        → Cooperative
 *  - farmers (Hộ nuôi)   → AquacultureFacility (household) + Farmer
 *  - ponds               → Pond
 *  - farmingCycles       → FarmingCycle
 *  - *Diaries/*Observations → FarmingDiary
 *  - harvests            → Harvest
 */
import {store} from '../../store/demoStore';
import type { DemoDB } from '../../types/models';
import { canonicalId, type DataSourceType } from '../../domain/sources';
import { normalizeDisplayDB } from '../../domain/normalizeDisplayData';
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
import type { ZoneGeometryStatus, ZoneDataStatus } from '../../domain/entities/AquacultureZone';
import type { Geometry } from '../../features/gis/types';

const rows = <T>(key: string): T[] => {const db=store.snapshot().db;return Array.isArray(db[key])?db[key] as T[]:[];};

const MOCK = 'MOCK_DATA' as const;
const mockId = (raw: string) => canonicalId(MOCK, raw);

function zoneSource(zoneId: string, dataStatus: string): DataSourceType {
  if (dataStatus === 'mock') return MOCK;
  if (zoneId.startsWith('Z-OSM')) return 'OSM_SOURCE';
  if (zoneId.startsWith('Z-SCT')) return 'OFFICIAL_GIS';
  return MOCK;
}

export interface MockDataset {
  administrativeUnits: AdministrativeUnit[];
  zones: AquacultureZone[];
  cooperatives: Cooperative[];
  facilities: AquacultureFacility[];
  farmers: Farmer[];
  ponds: Pond[];
  cycles: FarmingCycle[];
  diaries: FarmingDiary[];
  harvests: Harvest[];
}

function build(): MockDataset {
  const areas = rows<any>('aquacultureAreas');
  const areaById = new Map(areas.map((a) => [a.id, a]));

  const administrativeUnits: AdministrativeUnit[] = rows<any>('administrativeUnits').map((u) => ({
    id: canonicalId('OFFICIAL_GIS',u.code),
    code: u.code,
    name: u.name,
    type: u.type || 'commune',
    parentCode: null,
    parentName: null,
    areaKm2: null,
    geometry: null,
    source: 'OFFICIAL_GIS',
    verificationStatus: 'verified',
    sourceRef: { id: 'mock:seed', type: MOCK, recordRef: u.id },
  }));

  const zoneAreaIds = new Map<string, string[]>();
  const zones: AquacultureZone[] = rows<any>('aquacultureZones').map((z) => {
    const src = zoneSource(z.zoneId, z.dataStatus);
    zoneAreaIds.set(z.zoneId, z.areaIds || []);
    return {
      id: canonicalId(src, z.zoneId),
      zoneId: z.zoneId,
      code: z.code,
      name: z.name,
      aquacultureType: z.aquacultureType,
      species: z.species || [],
      geometryStatus: z.geometryStatus as ZoneGeometryStatus,
      dataStatus: z.dataStatus as ZoneDataStatus,
      totalAreaHa: z.totalAreaHa ?? null,
      communeCodes: z.communeCodes || [],
      areaIds: z.areaIds || [],
      coopIds: z.coopIds || [],
      geometry: (z.geometry as Geometry | null) ?? null,
      geometrySourceId: z.geometrySourceId ?? null,
      updatedAt: z.updatedAt ?? null,
      source: src,
      verificationStatus: z.dataStatus === 'verified' ? 'verified' : z.dataStatus === 'mock' ? 'needs_review' : 'unresolved',
      sourceRef: { id: 'mock:seed', type: src, recordRef: z.zoneId },
    };
  });

  const zoneByArea = new Map<string, string[]>();
  for (const z of zones) {
    for (const areaId of z.areaIds) {
      const list = zoneByArea.get(areaId);
      if (list) list.push(z.zoneId);
      else zoneByArea.set(areaId, [z.zoneId]);
    }
  }

  const cooperatives: Cooperative[] = rows<any>('cooperatives').map((c) => {
    const areaIds = areas.filter((a) => a.coopId === c.id).map((a) => a.id);
    const zoneIds = zones.filter((z) => z.coopIds.includes(c.id)).map((z) => z.zoneId);
    return {
      id: mockId(c.id),
      code: c.code,
      name: c.name,
      scopeCommuneCodes: c.unitId ? [c.unitId] : [],
      zoneIds,
      areaIds,
      status: c.status || 'active',
      contact: c.contact ?? null,
      facilityIds: [],
      source: MOCK,
      verificationStatus: 'unresolved',
      sourceRef: { id: 'mock:seed', type: MOCK, recordRef: c.id },
    };
  });

  const farmersRows = rows<any>('farmers');
  const pondsRows = rows<any>('ponds');
  const pondsByFarmer = new Map<string, any[]>();
  for (const p of pondsRows) {
    const list = pondsByFarmer.get(p.farmerId);
    if (list) list.push(p);
    else pondsByFarmer.set(p.farmerId, [p]);
  }

  const facilities: AquacultureFacility[] = [];
  const farmers: Farmer[] = farmersRows.map((f) => {
    const facilityId = canonicalId(MOCK, `FAC-${f.id}`);
    const area = areaById.get(f.areaId);
    facilities.push({
      id: facilityId,
      codeOriginal: f.code,
      facilityType: 'household',
      displayName: f.name,
      addressSource: null,
      addressCurrent: null,
      communeCode: f.communeCode ?? f.unitId ?? null,
      communeName: rows<any>('administrativeUnits').find(u=>u.id===f.unitId)?.name ?? null,
      mappingMethod: 'address',
      lat: pondsByFarmer.get(f.id)?.[0]?.lat ?? null,
      lng: pondsByFarmer.get(f.id)?.[0]?.lng ?? null,
      coordinateConfidence: 'none',
      pondIds: (pondsByFarmer.get(f.id) || []).map((p) => mockId(p.id)),
      pondCountSource: (pondsByFarmer.get(f.id) || []).length,
      species: ['Lươn đồng'],
      areaM2Total: (pondsByFarmer.get(f.id)||[]).reduce((sum,p)=>sum+Number(p.areaM2??p.areaHa*10000),0),
      pondsWithArea: (pondsByFarmer.get(f.id)||[]).length,
      pondsWithCoordinates: (pondsByFarmer.get(f.id)||[]).filter(p=>p.lat!=null&&p.lng!=null).length,
      sourceIndex: null,
      sourcePage: null,
      source: MOCK,
      verificationStatus: 'unresolved',
      sourceRef: { id: 'mock:seed', type: MOCK, recordRef: f.id },
    });
    void area;
    return {
      id: mockId(f.id),
      code: f.code,
      name: f.name,
      accountId: null,
      facilityId,
      cooperativeId: f.coopId ? mockId(f.coopId) : null,
      areaId: f.areaId ?? null,
      unitId: f.unitId ?? null,
      pondIds: (pondsByFarmer.get(f.id) || []).map((p) => mockId(p.id)),
      linkStatus: 'needs_review',
      status: f.status || 'active',
      source: MOCK,
      verificationStatus: 'unresolved',
      sourceRef: { id: 'mock:seed', type: MOCK, recordRef: f.id },
    };
  });

  const farmerById = new Map(farmersRows.map((f) => [f.id, f]));
  const ponds: Pond[] = pondsRows.map((p) => {
    const farmer = farmerById.get(p.farmerId);
    const areaHa = Number(p.areaHa) || null;
    return {
      id: mockId(p.id),
      code: p.code,
      name: p.name ?? null,
      facilityId: farmer ? canonicalId(MOCK, `FAC-${farmer.id}`) : null,
      farmerId: p.farmerId ? mockId(p.farmerId) : null,
      areaId: p.areaId ?? null,
      cooperativeId: areaById.get(p.areaId)?.coopId ? mockId(areaById.get(p.areaId)!.coopId) : null,
      communeCode: p.communeCode ?? areaById.get(p.areaId)?.unitId ?? null,
      zoneIds: zoneByArea.get(p.areaId) || [],
      areaHa,
      areaM2: areaHa != null ? Math.round(areaHa * 10000) : null,
      areaUnit: areaHa != null ? 'm2' : null,
      species: 'Lươn đồng',
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      geometry: null,
      geometryScope: p.lat != null && p.lng != null ? 'representative_point' : null,
      coordConfidence: p.lat != null && p.lng != null ? 'medium' : 'none',
      status: p.status || 'active',
      origin: MOCK,
      source: MOCK,
      verificationStatus: 'unresolved',
      sourceRef: { id: 'mock:seed', type: MOCK, recordRef: p.id },
    };
  });

  const cycles: FarmingCycle[] = rows<any>('farmingCycles').map((c) => ({
    id: mockId(c.id),
    code: c.code,
    pondId: mockId(c.pondId),
    speciesId: c.speciesId ?? null,
    speciesName: 'Lươn đồng',
    stockingDate: c.stockingDate ?? null,
    stockingQuantity: c.stockingQuantity ?? null,
    seedBatchId: c.seedBatchId ?? null,
    seedSource: c.seedSource ?? null,
    status: c.status || 'active',
    expectedHarvestDate: c.expectedHarvestDate ?? null,
    endDate: c.endDate ?? null,
    summary: null,
    notes: c.notes ?? null,
    source: MOCK,
    verificationStatus: 'unresolved',
    sourceRef: { id: 'mock:seed', type: MOCK, recordRef: c.id },
  }));

  const diaries: FarmingDiary[] = [];
  const pushDiary = (
    items: any[],
    category: FarmingDiary['category'],
    valuesOf: (r: any) => Record<string, number>,
    extra: (r: any) => Partial<FarmingDiary> = () => ({}),
  ) => {
    for (const r of items) {
      diaries.push({
        id: mockId(r.id),
        cycleId: mockId(r.cycleId),
        category,
        date: r.date,
        values: valuesOf(r),
        ...extra(r),
        source: MOCK,
        verificationStatus: 'unresolved',
        sourceRef: { id: 'mock:seed', type: MOCK, recordRef: r.id },
      });
    }
  };
  pushDiary(rows<any>('feedDiaries'), 'feed', (r) => ({ amountKg: Number(r.amountKg) || 0 }), (r) => ({ productId: r.productId ?? null, amountKg: Number(r.amountKg) || 0, notes: r.notes ?? null }));
  pushDiary(rows<any>('medicationDiaries'), 'medication', (r) => ({ amountKg: Number(r.amount) || 0 }), (r) => ({ productId: r.productId ?? null, amountKg: Number(r.amount) || 0, notes: r.notes ?? null }));
  pushDiary(rows<any>('environmentObservations'), 'environment', (r) => ({ ph: Number(r.ph) || 0, temperature: Number(r.temperature) || 0, oxygen: Number(r.oxygen) || 0 }));
  pushDiary(rows<any>('growthObservations'), 'growth', (r) => ({ averageGrams: Number(r.averageGrams) || 0 }));
  pushDiary(rows<any>('healthEvents'), 'health', () => ({}), (r) => ({ summary: r.summary ?? null, notes: r.status ?? null }));
  pushDiary(rows<any>('stockingEvents'), 'activity', (r) => ({ quantity: Number(r.quantity) || 0 }));

  const harvests: Harvest[] = rows<any>('harvests').map((h, i) => ({
    id: mockId(h.id),
    cycleId: mockId(h.cycleId),
    pondId: null,
    date: h.date,
    quantityKg: Number(h.quantityKg) || 0,
    quantityUnit: 'kg',
    batchNo: i + 1,
    status: 'recorded',
    updatedBy: null,
    notes: h.notes ?? null,
    source: MOCK,
    verificationStatus: 'unresolved',
    sourceRef: { id: 'mock:seed', type: MOCK, recordRef: h.id },
  }));

  return { administrativeUnits, zones, cooperatives, facilities, farmers, ponds, cycles, diaries, harvests };
}

let cached: MockDataset | null = null;
let cachedDB: DemoDB | null = null;

/** Truy cập dữ liệu mock đã chuẩn hoá (memo hoá). */
export function mockDataset(): MockDataset {
  if (!cached || cachedDB!==store.snapshot().db) {cached = build();cachedDB=store.snapshot().db;}
  return cached;
}
