import type { EntityBase } from '../sources';

/** Nhóm nhật ký nuôi trồng. */
export type DiaryCategory =
  | 'feed' // Thức ăn
  | 'medication' // Thuốc/chế phẩm
  | 'environment' // Môi trường
  | 'growth' // Tăng trưởng
  | 'health' // Sức khỏe
  | 'activity'; // Hoạt động chăm sóc

/**
 * Nhật ký nuôi trồng thống nhất: mọi bản ghi liên kết đúng một `cycleId`, có
 * `date` và nguồn dữ liệu. Giá trị đo nằm trong `values` (pH, nhiệt độ, O₂…).
 */
export interface FarmingDiary extends EntityBase {
  cycleId: string;
  category: DiaryCategory;
  date: string;
  /** Giá trị đo/nhập theo trường (amountKg, ph, temperature, oxygen, averageGrams…). */
  values: Record<string, number>;
  productId?: string | null;
  amountKg?: number | null;
  summary?: string | null;
  notes?: string | null;
}
