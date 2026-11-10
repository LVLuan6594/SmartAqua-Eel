import {describe,it,expect} from 'vitest';
import seed from '../src/data/data.json';
import {areaAnalytics} from '../src/domain/analytics/areaAnalytics';
describe('Thống kê cụm nuôi lươn',()=>{
 it('giữ diện tích cụm riêng với diện tích bể và lấy sản lượng theo phiếu',()=>{const result=areaAnalytics(seed,'admin',{year:2025},'year');expect(result.areas).toHaveLength(8);expect(result.totals.zoneAreaHa).toBe(seed.aquacultureAreas.reduce((s,a)=>s+a.areaHa,0));expect(result.totals.pondAreaHa).toBeCloseTo(seed.ponds.reduce((s,p)=>s+p.areaHa,0));expect(result.totals.zoneAreaHa).not.toBe(result.totals.pondAreaHa);expect(result.totals.harvestKg).toBe(seed.harvests.filter(h=>h.date.startsWith('2025')).reduce((s,h)=>s+h.quantityKg,0));});
 it('lọc địa bàn và hộ không trộn dữ liệu ngoài phạm vi',()=>{const r=areaAnalytics(seed,'farmer',{areaId:'A01',speciesId:'SP1',year:2025},'year');expect(r.totals.pondCount).toBe(3);expect(r.totals.harvestKg).toBeGreaterThan(0);expect(r.areas.map(a=>a.areaId)).toEqual(['A01']);});
});

