import {describe,it,expect} from 'vitest';
import db from '../src/data/data.json';
import {metrics,pondScope,productionByMonth} from '../src/domain/selectors';
describe('Quan hệ và chỉ tiêu nuôi lươn',()=>{
 it('chỉ có một đối tượng lươn và 103 đơn vị hành chính',()=>{expect(db.metadata.speciesScope).toBe('eel-only');expect(db.species.map(s=>s.code)).toEqual(['EEL']);expect(db.administrativeUnits).toHaveLength(103);});
 it('bể gắn đúng hộ và vùng',()=>{for(const p of db.ponds){expect(db.farmers.some(f=>f.id===p.farmerId&&f.areaId===p.areaId)).toBe(true);expect(db.aquacultureAreas.some(a=>a.id===p.areaId)).toBe(true);}});
 it('phạm vi hộ không bao gồm bể của hộ khác',()=>{const p=pondScope(db,'farmer');expect(p).toHaveLength(3);expect(p.every(p=>p.farmerId==='F001')).toBe(true);});
 it('KPI sản lượng chỉ cộng phiếu thu hoạch',()=>{expect(metrics(db,'admin').harvestKg).toBe(db.harvests.reduce((sum,h)=>sum+h.quantityKg,0));});
 it('chuỗi tháng khớp phiếu theo năm',()=>{for(const year of [2025,2026]){const result=productionByMonth(db,'admin',{},year);const total=db.harvests.filter(h=>h.date.startsWith(year+'-')).reduce((s,h)=>s+h.quantityKg,0);expect(result.reduce((s,r)=>s+r.value,0)).toBeCloseTo(total,0);}});
});

