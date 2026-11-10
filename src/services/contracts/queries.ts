/**
 * Hợp đồng truy vấn canonical cho toàn hệ thống.
 *
 * Mọi phân hệ (bảng điều khiển, danh mục, bản đồ, báo cáo) đọc dữ liệu qua các
 * hợp đồng này — không đọc trực tiếp `data.json`/GeoJSON từ component.
 * Id trả về đã ở dạng canonical (có namespace nguồn).
 */
import type { DataSourceType } from '../../domain/sources';
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
import type { DomainScope } from '../../domain/scope';

export interface ReadRepository<T> {
  getAll(scope?: DomainScope): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  count(scope?: DomainScope): Promise<number>;
}

export interface AdministrativeUnitRepository extends ReadRepository<AdministrativeUnit> {
  getByCode(code: string): Promise<AdministrativeUnit | null>;
  search(query: string, limit?: number): Promise<AdministrativeUnit[]>;
}

export interface AquacultureZoneRepository extends ReadRepository<AquacultureZone> {
  getByCommune(communeCode: string): Promise<AquacultureZone[]>;
}

export interface CooperativeRepository extends ReadRepository<Cooperative> {}

export interface FacilityRepository extends ReadRepository<AquacultureFacility> {
  getByCommune(communeCode: string): Promise<AquacultureFacility[]>;
  search(query: string, limit?: number): Promise<AquacultureFacility[]>;
}

export interface FarmerRepository extends ReadRepository<Farmer> {
  getByFacility(facilityId: string): Promise<Farmer[]>;
}

export interface PondRepository extends ReadRepository<Pond> {
  getByFacility(facilityId: string): Promise<Pond[]>;
  getByFarmer(farmerId: string): Promise<Pond[]>;
  getByAdministrativeUnit(communeCode: string): Promise<Pond[]>;
  getByZone(zoneId: string): Promise<Pond[]>;
}

export interface FarmingCycleRepository extends ReadRepository<FarmingCycle> {
  getByPond(pondId: string): Promise<FarmingCycle[]>;
}

export interface DiaryRepository extends ReadRepository<FarmingDiary> {
  getByCycle(cycleId: string): Promise<FarmingDiary[]>;
}

export interface HarvestRepository extends ReadRepository<Harvest> {
  getByCycle(cycleId: string): Promise<Harvest[]>;
}

/** Đếm số bản ghi theo nguồn — phục vụ báo cáo chất lượng dữ liệu và bộ lọc nguồn. */
export type SourceCounts = Record<DataSourceType, number>;

export interface DataAccess {
  administrativeUnits: AdministrativeUnitRepository;
  zones: AquacultureZoneRepository;
  cooperatives: CooperativeRepository;
  facilities: FacilityRepository;
  farmers: FarmerRepository;
  ponds: PondRepository;
  cycles: FarmingCycleRepository;
  diaries: DiaryRepository;
  harvests: HarvestRepository;
  /** Tổng hợp nhanh (đã áp scope) cho dashboard/báo cáo. */
  summary(scope?: DomainScope): Promise<DataSummary>;
  /** Đếm theo nguồn cho một loại thực thể. */
  sourceBreakdown(kind: BreakdownKind, scope?: DomainScope): Promise<SourceCounts>;
}

export type BreakdownKind = 'facilities' | 'ponds' | 'zones' | 'cycles' | 'farmers';

export interface DataSummary {
  administrativeUnits: number;
  zones: number;
  cooperatives: number;
  facilities: number;
  farmers: number;
  ponds: number;
  cycles: number;
  activeCycles: number;
  harvests: number;
  harvestKg: number;
  pondAreaHa: number;
  /** Số cơ sở có toạ độ (có thể hiển thị trên bản đồ). */
  facilitiesWithCoordinates: number;
  /** Nguồn dữ liệu xuất hiện trong tập kết quả. */
  sources: DataSourceType[];
}
