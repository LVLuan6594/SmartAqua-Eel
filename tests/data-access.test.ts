// @vitest-environment jsdom
import {beforeEach,describe,it,expect} from 'vitest';
import {dataAccess} from '../src/services/repositories/dataAccess';
import {store} from '../src/store/demoStore';
import seed from '../src/data/data.json';
import {recordHarvest} from '../src/services/farmingOperationsService';
describe('Kho dữ liệu nuôi lươn thống nhất',()=>{
 beforeEach(()=>{store.reset();});
 it('không trộn PDF cá tra hoặc OSM chưa phân loại vào hồ sơ lươn',async()=>{
  const s=await dataAccess.summary();
  expect(s.facilities).toBe(24);expect(s.ponds).toBe(72);expect(s.cycles).toBe(144);expect(s.administrativeUnits).toBe(103);
  expect(s.sources).not.toContain('PDF_SOURCE');expect(s.sources).not.toContain('OSM_SOURCE');
  expect(s.harvestKg).toBe(seed.harvests.reduce((sum,h)=>sum+h.quantityKg,0));
 });
 it('lọc nguồn và liên kết hộ/bể/xã đúng phạm vi',async()=>{
  const ponds=await dataAccess.ponds.getAll({farmerId:'mock:F001'});
  expect(ponds).toHaveLength(3);expect(ponds.every(p=>p.farmerId==='mock:F001')).toBe(true);
  const cycleIds=new Set((await dataAccess.cycles.getAll({farmerId:'mock:F001'})).map(c=>c.id));
  expect((await dataAccess.harvests.getAll({farmerId:'mock:F001'})).every(h=>cycleIds.has(h.cycleId))).toBe(true);
  expect((await dataAccess.facilities.getAll({farmerId:'mock:F001'}))).toHaveLength(1);
  expect((await dataAccess.facilities.getByCommune('31441'))).toHaveLength(3);
 });
 it('lọc HTX không rò vụ/thu hoạch của HTX khác',async()=>{
  const ponds=await dataAccess.ponds.getAll({cooperativeId:'mock:HTX01'});
  expect(ponds).toHaveLength(9);
  const allowed=new Set(ponds.map(p=>p.id));
  expect((await dataAccess.cycles.getAll({cooperativeId:'mock:HTX01'})).every(c=>allowed.has(c.pondId))).toBe(true);
 });
 it('tổng hợp canonical cập nhật ngay sau ghi thu hoạch',async()=>{
  const before=await dataAccess.summary();
  recordHarvest({id:'H-NEW',cycleId:'C001',date:'2026-10-26',quantityKg:125});
  const after=await dataAccess.summary();
  expect(after.harvestKg).toBe(before.harvestKg+125);expect(after.harvests).toBe(before.harvests+1);
 });
 it('đếm nguồn và tra mã hộ hiện tại',async()=>{
  expect((await dataAccess.sourceBreakdown('ponds')).MOCK_DATA).toBe(72);
  expect((await dataAccess.sourceBreakdown('ponds')).PDF_SOURCE).toBe(0);
  expect((await dataAccess.facilities.search('HO-LUON-001'))[0]?.id).toBe('mock:FAC-F001');
 });
});

