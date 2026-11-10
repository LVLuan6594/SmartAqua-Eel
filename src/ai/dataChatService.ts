import type { ChatResponse, DemoDB, RecordItem, Role } from '../types/models';
import { metrics, scoped, sum } from '../domain/selectors';
import { mockAIService } from './mockAIService';

/**
 * Trợ lý dữ liệu cục bộ (deterministic) cho toàn bộ project.
 *
 * Trả lời câu hỏi bằng cách truy vấn trực tiếp bộ dữ liệu SmartAqua đang hoạt động.
 * (không sinh số liệu giả). Tôn trọng phân quyền theo vai trò thông qua các
 * selector `scoped`/`metrics`/`pondScope` sẵn có. Câu hỏi không khớp dữ liệu sẽ
 * được chuyển cho kho tri thức hiện có (mockAIService.chat).
 */

const normalize = (text: string) =>
  text.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

const compact = (text: string) => normalize(text).replace(/[^a-z0-9]/g, '');

const fmt = (n: number, dec = 0) => Number(n || 0).toLocaleString('vi-VN', { maximumFractionDigits: dec });

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Cán bộ quản trị',
  manager: 'Lãnh đạo địa phương',
  coop: 'CEO hợp tác xã',
  farmer: 'Nông dân',
};

const ref = (collection: string, role: Role, db?: DemoDB) => `Dữ liệu mô phỏng · ${collection} · vai trò: ${ROLE_LABEL[role]}${db?.metadata?.asOf ? ` · cập nhật ${db.metadata.asOf}` : ''}`;

const answer = (text: string, collection: string, role: Role, db: DemoDB, matched = true, action?: ChatResponse['action']): ChatResponse => ({
  answer: text,
  reference: ref(collection, role, db),
  matched,
  isMock: true,
  action,
});

export interface DataChatContext {
  question: string;
  db: DemoDB;
  role: Role;
}

type Row = RecordItem;

const asRows = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);

function scopedZones(db: DemoDB, role: Role): Row[] {
  const zones = asRows((db as any).aquacultureZones);
  if (role === 'admin' || role === 'manager') return zones;
  const areaIds = new Set(scoped(db, role, 'ponds').map((pond) => pond.areaId).filter(Boolean));
  const coopId = role === 'coop' ? 'HTX01' : null;
  return zones.filter((zone) => (zone.areaIds || []).some((areaId: string) => areaIds.has(areaId)) || Boolean(coopId && (zone.coopIds || []).includes(coopId)));
}

const nameOf = (db: DemoDB, collection: string, id: string | null | undefined) => {
  if (!id) return '—';
  const row = asRows((db as any)[collection]).find((x) => x.id === id);
  return row?.name || row?.code || id;
};

const codeMatch = (cq: string, value: string | null | undefined) => {
  if (!value) return false;
  const c = compact(value);
  return c.length >= 4 && cq.includes(c);
};

/* --------------------------------- Ý định --------------------------------- */

const ENTITY_COLLECTIONS = ['ponds', 'farmers', 'cooperatives', 'farmingCycles', 'aquacultureAreas'] as const;

function findEntity(db: DemoDB, role: Role, cq: string): ChatResponse | null {
  for (const collection of ENTITY_COLLECTIONS) {
    const rows = collection === 'aquacultureAreas' ? scoped(db, role, 'aquacultureAreas') : scoped(db, role, collection);
    const hit = rows.find((x) => codeMatch(cq, x.code) || codeMatch(cq, x.id));
    if (hit) return entityAnswer(db, role, collection, hit);
  }
  const zone = scopedZones(db, role).find((z) => codeMatch(cq, z.code) || codeMatch(cq, z.zoneId));
  if (zone) return zoneAnswer(db, role, zone);
  return null;
}

function entityAnswer(db: DemoDB, role: Role, collection: string, row: Row): ChatResponse {
  if (collection === 'ponds') {
    const active = asRows((db as any).farmingCycles).filter((c) => c.pondId === row.id && (c.status === 'active' || c.status === 'harvesting'));
    const body = [
      `Bể nuôi ${row.code || row.id} — ${row.name || ''}`.trim(),
      `• Hộ nuôi: ${nameOf(db, 'farmers', row.farmerId)}`,
      `• Vùng nuôi: ${nameOf(db, 'aquacultureAreas', row.areaId)}`,
      `• Diện tích: ${row.areaHa != null ? `${fmt(row.areaHa, 2)} ha` : '—'}`,
      `• Toạ độ: ${row.lat != null ? `${Number(row.lat).toFixed(5)}, ${Number(row.lng).toFixed(5)}` : '—'}`,
      `• Vụ đang nuôi: ${active.length}`,
      `• Trạng thái: ${row.status === 'active' ? 'Đang hoạt động' : row.status || '—'}`,
    ].join('\n');
    return answer(body, 'ponds', role, db);
  }
  if (collection === 'farmers') {
    const ponds = scoped(db, role, 'ponds').filter((p) => p.farmerId === row.id);
    const body = [
      `Hộ nuôi ${row.code || row.id} — ${row.name || ''}`.trim(),
      `• Hợp tác xã: ${nameOf(db, 'cooperatives', row.coopId)}`,
      `• Đơn vị hành chính: ${nameOf(db, 'administrativeUnits', row.unitId)}`,
      `• Số ao: ${ponds.length} · Diện tích: ${fmt(sum(ponds, 'areaHa'), 2)} ha`,
      `• Trạng thái: ${row.status === 'active' ? 'Đang hoạt động' : row.status || '—'}`,
    ].join('\n');
    return answer(body, 'farmers', role, db);
  }
  if (collection === 'cooperatives') {
    const areas = asRows((db as any).aquacultureAreas).filter((a) => a.coopId === row.id);
    const farmerIds = new Set(scoped(db, role, 'farmers').filter((f) => f.coopId === row.id).map((f) => f.id));
    const body = [
      `Hợp tác xã ${row.code || row.id} — ${row.name || ''}`.trim(),
      `• Đơn vị hành chính: ${nameOf(db, 'administrativeUnits', row.unitId)}`,
      `• Số vùng nuôi: ${areas.length} · Diện tích: ${fmt(sum(areas, 'areaHa'), 2)} ha`,
      `• Số hộ nuôi: ${farmerIds.size}`,
      `• Trạng thái: ${row.status === 'active' ? 'Đang hoạt động' : row.status || '—'}`,
    ].join('\n');
    return answer(body, 'cooperatives', role, db);
  }
  if (collection === 'farmingCycles') {
    const harvests = asRows((db as any).harvests).filter((h) => h.cycleId === row.id);
    const feed = asRows((db as any).feedDiaries).filter((f) => f.cycleId === row.id);
    const body = [
      `Vụ nuôi ${row.code || row.id}`,
      `• Bể nuôi: ${nameOf(db, 'ponds', row.pondId)}`,
      `• Loài: ${nameOf(db, 'species', row.speciesId)}`,
      `• Thả giống: ${row.stockingDate || '—'} · SL: ${row.stockingQuantity != null ? fmt(row.stockingQuantity) : '—'}`,
      `• Dự kiến thu: ${row.expectedHarvestDate || '—'}`,
      `• Thức ăn đã ghi: ${feed.length} nhật ký · ${fmt(sum(feed, 'amountKg'), 1)} kg`,
      `• Sản lượng thu: ${fmt(sum(harvests, 'quantityKg'), 1)} kg (${harvests.length} lần)`,
      `• Trạng thái: ${row.status || '—'}`,
    ].join('\n');
    return answer(body, 'farmingCycles', role, db);
  }
  // aquacultureAreas
  const ponds = scoped(db, role, 'ponds').filter((p) => p.areaId === row.id);
  const body = [
    `Vùng nuôi ${row.code || row.id} — ${row.name || ''}`.trim(),
    `• Hợp tác xã: ${nameOf(db, 'cooperatives', row.coopId)}`,
    `• Diện tích: ${row.areaHa != null ? `${fmt(row.areaHa, 2)} ha` : '—'}`,
    `• Số ao: ${ponds.length}`,
    `• Toạ độ: ${row.lat != null ? `${Number(row.lat).toFixed(5)}, ${Number(row.lng).toFixed(5)}` : '—'}`,
  ].join('\n');
  return answer(body, 'aquacultureAreas', role, db);
}

function zoneAnswer(db: DemoDB, role: Role, zone: Row): ChatResponse {
  const links = asRows((db as any).zoneCommuneLinks).filter((l) => l.zoneId === zone.zoneId);
  const communes = links.map((l) => l.communeName).filter(Boolean);
  const body = [
    `Vùng nuôi ${zone.code || zone.zoneId} — ${zone.name || ''}`.trim(),
    `• Loại: ${zone.aquacultureType || '—'}`,
    `• Số ao: ${zone.pondCount != null ? zone.pondCount : '—'}`,
    `• Diện tích: ${zone.totalAreaHa != null ? `${fmt(zone.totalAreaHa, 2)} ha` : '—'}`,
    `• Xã/phường: ${communes.length ? communes.join(', ') : 'Chưa gắn đơn vị hành chính'}`,
    `• Nguồn dữ liệu: ${zone.dataStatus === 'verified' ? 'Xác minh từ nguồn mở' : 'Một phần'}`,
  ].join('\n');
  return answer(body, 'aquacultureZones', role, db);
}

function geographicAnswer(db: DemoDB, role: Role, cq: string): ChatResponse | null {
  const links = asRows((db as any).zoneCommuneLinks);
  const zones = scopedZones(db, role);
  const byName = new Map<string, { code: string; name: string }>();
  for (const l of links) {
    const key = compact(l.communeName || '');
    if (key.length >= 6 && !byName.has(key)) byName.set(key, { code: l.communeCode, name: l.communeName });
  }
  const hit = [...byName.entries()].find(([key]) => cq.includes(key));
  if (!hit) return null;
  const { code, name } = hit[1];
  const matchedZones = zones.filter((z) => (z.communeCodes || []).includes(code));
  const areaHa = matchedZones.reduce((s, z) => s + Number(z.totalAreaHa || 0), 0);
  const mappedObjectCount = matchedZones.reduce((s, z) => s + Number(z.pondCount || 0), 0);
  const zoneIds = new Set(matchedZones.map((z) => z.zoneId));
  const areas = new Set(zones.filter((z) => zoneIds.has(z.zoneId)).flatMap((z) => z.areaIds || []));
  const ponds = scoped(db, role, 'ponds').filter((p) => areas.has(p.areaId));
  const body = [
    `Đơn vị hành chính: ${name}`,
    `• Số vùng nuôi: ${matchedZones.length}`,
    `• Tổng diện tích vùng: ${fmt(areaHa, 2)} ha`,
    `• Đối tượng nuôi được ghi trong lớp vùng: ${fmt(mappedObjectCount)}`,
    `• Bể nuôi liên kết qua vùng: ${fmt(ponds.length)}`,
    `• Mã đơn vị: ${code}`,
    'Lưu ý: quan hệ ao–địa bàn được tổng hợp theo liên kết vùng nuôi; chưa phải quan hệ địa chính đã xác minh.',
  ].join('\n');
  const action = /(hienthi|xemtrenbando|trenbando|map)/.test(cq)
    ? { label: 'Xem địa bàn trên bản đồ GIS', to: `/gis?commune=${encodeURIComponent(code)}` }
    : undefined;
  return answer(body, 'aquacultureZones · zoneCommuneLinks', role, db, true, action);
}

const COUNT_TRIGGER = /(bao nhieu|so luong|tong so|dem |co may|co bao)/;

function countAnswer(db: DemoDB, role: Role, q: string): ChatResponse | null {
  if (!COUNT_TRIGGER.test(q)) return null;
  const m = metrics(db, role);
  const has = (...terms: string[]) => terms.some((t) => new RegExp(`\\b${t}\\b`).test(q));
  const parts: string[] = [];
  if (has('be', 'ao', 'pond')) parts.push(`Bể nuôi: ${fmt(m.pondCount)}`);
  if (has('ho nuoi', 'nong dan', 'ho dan', 'farmer', 'chu ho')) parts.push(`Hộ nuôi: ${fmt(m.farmerCount)}`);
  if (has('vung nuoi', 'vung')) parts.push(`Vùng nuôi: ${fmt(scopedZones(db, role).length)}`);
  if (has('hop tac xa', 'htx', 'coop')) parts.push(`Hợp tác xã: ${fmt(scoped(db, role, 'cooperatives').length)}`);
  if (has('vu nuoi', 'vu', 'cycle')) parts.push(`Vụ nuôi: ${fmt(m.cycles.length)} (đang nuôi ${fmt(m.active)})`);
  if (has('thu hoach', 'harvest')) parts.push(`Lần thu hoạch: ${fmt(m.harvests.length)} · Tổng ${fmt(m.harvestKg, 1)} kg`);
  if (has('nhat ky', 'thuc an', 'feed')) parts.push(`Nhật ký thức ăn: ${fmt(scoped(db, role, 'feedDiaries').length)}`);
  if (has('moi truong', 'environment', 'oxy', 'ph')) parts.push(`Quan sát môi trường: ${fmt(scoped(db, role, 'environmentObservations').length)}`);
  if (has('tang truong', 'growth')) parts.push(`Quan sát tăng trưởng: ${fmt(scoped(db, role, 'growthObservations').length)}`);
  if (has('suc khoe', 'health', 'benh')) parts.push(`Sự kiện sức khoẻ: ${fmt(scoped(db, role, 'healthEvents').length)}`);
  if (has('loai', 'species')) parts.push(`Loài thuỷ sản: ${fmt(asRows((db as any).species).length)}`);
  if (!parts.length) return null;
  return answer(`Theo phạm vi vai trò ${ROLE_LABEL[role]}:\n• ${parts.join('\n• ')}`, 'tổng hợp nhiều bảng', role, db);
}

function productionAnswer(db: DemoDB, role: Role, q: string): ChatResponse | null {
  if (!/(san luong|thu hoach|kg|tan|khoi luong)/.test(q)) return null;
  const year = q.match(/\b(20\d{2})\b/)?.[1];
  const harvests = scoped(db, role, 'harvests').filter((h) => !year || String(h.date || '').startsWith(year));
  const total = sum(harvests, 'quantityKg');
  const byMonth = new Map<string, number>();
  for (const h of harvests) {
    const k = String(h.date || '').slice(0, 7);
    if (k) byMonth.set(k, (byMonth.get(k) || 0) + Number(h.quantityKg || 0));
  }
  const recent = [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 3);
  const lines = [
    `Tổng sản lượng thu hoạch${year ? ` năm ${year}` : ''}: ${fmt(total, 1)} kg (~${fmt(total / 1000, 2)} tấn) từ ${harvests.length} lần thu hoạch.`,
  ];
  if (recent.length) lines.push('Gần đây:', ...recent.map(([k, v]) => `• ${k}: ${fmt(v, 1)} kg`));
  if (!harvests.length) lines.push('Không có phiếu thu hoạch phù hợp trong dữ liệu hiện có.');
  return answer(lines.join('\n'), `harvests${year ? ` · ${year}` : ''}`, role, db);
}

function rankingAnswer(db: DemoDB, role: Role, q: string): ChatResponse | null {
  if (!/(nhieu.*nhat|cao nhat|lon nhat|xep hang|top |so sanh|theo tung xa|tung xa|theo xa)/.test(q)) return null;
  const farmers = scoped(db, role, 'farmers');
  const ponds = scoped(db, role, 'ponds');
  const cycles = scoped(db, role, 'farmingCycles');
  const harvests = scoped(db, role, 'harvests');
  if (/(hop tac xa|htx|coop)/.test(q)) {
    const rows = scoped(db, role, 'cooperatives').map((coop) => {
      const members = farmers.filter((f) => f.coopId === coop.id);
      const memberIds = new Set(members.map((f) => f.id));
      return { name: coop.name, count: members.length, ponds: ponds.filter((p) => memberIds.has(p.farmerId)).length };
    }).sort((a, b) => b.count - a.count).slice(0, 5);
    if (!rows.length) return null;
    const table = ['| Hạng | Hợp tác xã | Hộ nuôi | Ao |', '|---:|---|---:|---:|', ...rows.map((r, i) => `| ${i + 1} | ${r.name} | ${r.count} | ${r.ponds} |`)].join('\n');
    return answer(`Xếp hạng theo số hộ trong phạm vi ${ROLE_LABEL[role]}:\n\n${table}`, 'cooperatives · farmers · ponds', role, db);
  }
  if (/(xa|phuong|dia ban)/.test(q) && /(theo|tung|nhieu nhat|cao nhat|lon nhat|xep hang|top |so sanh)/.test(q)) {
    const allowedZoneIds = new Set(scopedZones(db, role).map((zone) => zone.zoneId));
    const links = asRows((db as any).zoneCommuneLinks).filter((link) => allowedZoneIds.has(link.zoneId));
    const grouped = new Map<string, { code: string; name: string; zones: Map<string, number>; ponds: Set<string>; area: number }>();
    for (const link of links) {
      const item = grouped.get(link.communeCode) || { code: link.communeCode, name: link.communeName, zones: new Map<string, number>(), ponds: new Set<string>(), area: 0 };
      const zone = scopedZones(db, role).find((z) => z.zoneId === link.zoneId);
      if (zone) {
        item.zones.set(zone.zoneId, Number(zone.pondCount || 0));
        item.area += Number(link.intersectionAreaKm2 || 0) * 100;
        const zoneAreas = new Set(zone.areaIds || []);
        ponds.filter((p) => zoneAreas.has(p.areaId)).forEach((p) => item.ponds.add(p.id));
      }
      grouped.set(link.communeCode, item);
    }
    const byArea = /(dien tich|ha|lon nhat)/.test(q);
    const rows = [...grouped.values()].map((row) => ({ ...row, objectCount: [...row.zones.values()].reduce((s, count) => s + count, 0) }))
      .sort((a, b) => byArea ? b.area - a.area : b.objectCount - a.objectCount).slice(0, 10);
    const metric = byArea ? 'Diện tích giao vùng nuôi (ha)' : 'Đối tượng được ghi ở vùng';
    const table = [`| Hạng | Xã/phường | ${metric} |`, '|---:|---|---:|', ...rows.map((r, i) => `| ${i + 1} | ${r.name} | ${byArea ? fmt(r.area, 2) : r.objectCount} |`)].join('\n');
    const code = rows[0]?.code;
    return answer(`Xếp hạng theo ${byArea ? 'diện tích giao các vùng nuôi' : 'số đối tượng được ghi ở các vùng nuôi'}. Số liệu là dữ liệu không gian nguồn mở/đã suy ra theo metadata của vùng; không đồng nghĩa danh sách ao hộ nuôi đã xác minh.\n\n${table}`, 'zoneCommuneLinks · aquacultureZones', role, db, true, code ? { label: `Mở ${rows[0].name} trên GIS`, to: `/gis?commune=${encodeURIComponent(code)}` } : undefined);
  }
  if (/(vu nuoi|vu dang|cycle)/.test(q)) {
    const rows = cycles.filter((c) => c.status === 'active' || c.status === 'harvesting').length;
    return answer(`Hiện có **${fmt(rows)} vụ** đang hoạt động hoặc thu hoạch trong phạm vi ${ROLE_LABEL[role]}.`, 'farmingCycles', role, db);
  }
  return null;
}

function overviewAnswer(db: DemoDB, role: Role): ChatResponse {
  const m = metrics(db, role);
  const body = [
    `Tổng quan dữ liệu hệ thống (vai trò: ${ROLE_LABEL[role]}):`,
    `• Bể nuôi: ${fmt(m.pondCount)} · diện tích ${fmt(m.areaHa, 2)} ha`,
    `• Hộ nuôi: ${fmt(m.farmerCount)} · Vùng nuôi: ${fmt(m.areas)} · HTX: ${fmt(m.coops)}`,
    `• Vùng nuôi (GIS/suy ra): ${fmt(scopedZones(db, role).length)}`,
    `• Vụ nuôi: ${fmt(m.cycles.length)} (đang nuôi ${fmt(m.active)})`,
    `• Sản lượng thu hoạch: ${fmt(m.harvestKg, 1)} kg`,
    `• Nhật ký thức ăn: ${fmt(scoped(db, role, 'feedDiaries').length)} · Quan sát môi trường: ${fmt(scoped(db, role, 'environmentObservations').length)}`,
    `• Quan sát tăng trưởng: ${fmt(scoped(db, role, 'growthObservations').length)} · Sự kiện sức khoẻ: ${fmt(scoped(db, role, 'healthEvents').length)}`,
  ].join('\n');
  return answer(body, 'tổng hợp nhiều bảng', role, db);
}

function gisAnswer(db: DemoDB, role: Role): ChatResponse {
  const featuresAll = asRows((db as any).gisFeatures);
  const allowedIds = new Set<string>();
  if (role !== 'admin' && role !== 'manager') {
    scoped(db, role, 'ponds').forEach((row) => allowedIds.add(row.id));
    scoped(db, role, 'aquacultureAreas').forEach((row) => allowedIds.add(row.id));
    if (role === 'coop') allowedIds.add('HTX01');
  }
  const features = role === 'admin' || role === 'manager' ? featuresAll : featuresAll.filter((feature) => allowedIds.has(feature.entityId));
  const visibleZones = scopedZones(db, role);
  const visibleZoneIds = new Set(visibleZones.map((zone) => zone.zoneId));
  const visibleLinks = asRows((db as any).zoneCommuneLinks).filter((link) => visibleZoneIds.has(link.zoneId));
  const byType = new Map<string, number>();
  for (const f of features) {
    const t = f.entityType || 'khác';
    byType.set(t, (byType.get(t) || 0) + 1);
  }
  const typeLines = [...byType.entries()].map(([t, n]) => `• ${t}: ${fmt(n)}`);
  const body = [
    'Dữ liệu không gian GIS trong hệ thống:',
    `• Vùng nuôi (suy ra): ${fmt(visibleZones.length)}`,
    `• Liên kết vùng – xã/phường: ${fmt(visibleLinks.length)}`,
    `• Đơn vị hành chính: ${fmt(asRows((db as any).administrativeUnits).length)}`,
    `• Đối tượng hình học mô phỏng: ${fmt(features.length)}`,
    ...typeLines,
  ].join('\n');
  return answer(body, 'GIS · aquacultureZones · gisFeatures', role, db);
}

function helpAnswer(db: DemoDB, role: Role): ChatResponse {
  const body = [
    'Xin chào! Tôi là trợ lý dữ liệu SmartAqua (chế độ mô phỏng). Bạn có thể hỏi:',
    '• "Tổng quan dữ liệu hệ thống"',
    '• "Có bao nhiêu bể nuôi / hộ nuôi / vùng nuôi?"',
    '• "Sản lượng thu hoạch toàn hệ thống?"',
    '• "Thông tin ao BE-001" hoặc "hộ HO-001", "vùng VNU-OSM-01"',
    '• "Vùng nuôi ở Phường Bình Thuỷ"',
  ].join('\n');
  return answer(body, 'trợ giúp', role, db);
}

/** Trả lời đồng bộ, thuần — dùng cho kiểm thử. null khi không khớp dữ liệu. */
export function computeDataAnswer({ question, db, role }: DataChatContext): ChatResponse | null {
  const q = normalize(question || '').trim();
  if (!q) return null;
  const cq = compact(question || '');

  const entity = findEntity(db, role, cq);
  if (entity) return entity;

  const ranking = rankingAnswer(db, role, q);
  if (ranking) return ranking;

  const geo = geographicAnswer(db, role, cq);
  if (geo) return geo;

  const counts = countAnswer(db, role, q);
  if (counts) return counts;

  const production = productionAnswer(db, role, q);
  if (production) return production;

  if (/(tong quan|tom tat|thong ke|co gi|du lieu gi|toan bo|toan canh|toan he thong)/.test(q)) {
    return overviewAnswer(db, role);
  }

  if (/(gis|ban do|osm|ranh gioi|lop du lieu|khong gian)/.test(q)) {
    if (role === 'farmer' && scopedZones(db, role).length === 0) return answer('Không có dữ liệu vùng nuôi hoặc lớp GIS được liên kết với ao trong phạm vi hộ đang xem.', 'phạm vi truy cập hiện tại', role, db);
    return gisAnswer(db, role);
  }

  if (/(chao|hello|\bhi\b|xin chao|giup|huong dan|co the hoi|help|ban la ai)/.test(q)) {
    return helpAnswer(db, role);
  }

  return null;
}

/** Wrapper async: ưu tiên dữ liệu nội bộ, sau đó tới kho tri thức hiện có. */
export async function answerDataQuestion(ctx: DataChatContext & { delayMs?: number }): Promise<ChatResponse> {
  const local = computeDataAnswer(ctx);
  if (local) {
    await new Promise((r) => setTimeout(r, ctx.delayMs ?? 550));
    return local;
  }
  try {
    const kb = await mockAIService.chat({ question: ctx.question });
    await new Promise((r) => setTimeout(r, ctx.delayMs ?? 550));
    return kb;
  } catch {
    return {
      answer:
        'Tôi chưa tìm thấy nội dung phù hợp trong dữ liệu hệ thống hoặc kho tri thức. Bạn thử nêu rõ hơn (mã ao/hộ/vùng, xã/phường, hoặc gõ "tổng quan dữ liệu").',
      matched: false,
      isMock: true,
    };
  }
}

export const DATA_CHAT_SUGGESTIONS = [
  'Tổng quan dữ liệu hệ thống',
  'Có bao nhiêu bể nuôi?',
  'Sản lượng thu hoạch toàn hệ thống?',
  'Có bao nhiêu hộ nuôi?',
  'Vùng nuôi ở Phường Bình Thuỷ',
];
