import type { DemoDB } from '../types/models';

const DISPLAY_FIELDS = new Set([
  'name', 'label', 'title', 'description', 'subtitle', 'notes', 'body', 'message',
  'answer', 'question', 'summary', 'purpose', 'inspection', 'source', 'assessment',
]);

export function normalizeDisplayText(value: string): string {
  return value
    .replace(/\bVùng nuôi demo\s+(\d+)\b/gi, (_match, number: string) => `Vùng nuôi số ${number}`)
    .replace(/\bCơ sở giống demo\s+(\d+)\b/gi, (_match, number: string) => `Trại giống thủy sản khu vực ${number}`)
    .replace(/\bChế phẩm demo\s+(\d+)\b/gi, (_match, number: string) => `Chế phẩm sinh học ${number}`)
    .replace(/Vùng nuôi tôm Vĩnh Châu\s*\(mô phỏng\)/gi, 'Vùng nuôi tôm Vĩnh Châu')
    .replace(/\bNuôi tôm nước lợ \(siêu thâm canh\)\s*[–-]\s*MÔ PHỎNG\b/gi, 'Nuôi tôm nước lợ (siêu thâm canh)')
    .replace(/\bbản demo\b/gi, 'môi trường dữ liệu mô phỏng')
    .replace(/\bdemo\b/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .trim();
}

export function normalizeDisplayData<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => normalizeDisplayData(item)) as T;
  if (!value || typeof value !== 'object') return value;
  const normalized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    normalized[key] = typeof item === 'string' && DISPLAY_FIELDS.has(key)
      ? normalizeDisplayText(item)
      : normalizeDisplayData(item);
  }
  return normalized as T;
}

export const normalizeDisplayDB = (db: DemoDB): DemoDB => normalizeDisplayData(db);
