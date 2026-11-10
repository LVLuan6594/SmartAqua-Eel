import {describe,it,expect} from 'vitest';
import data from '../src/data/eel-public-data.json';
describe('Nguồn công khai nuôi lươn',()=>{
 it('độ phủ đủ 103 mã duy nhất, ô chưa biết không tự đổi thành 0',()=>{expect(data.coverage).toHaveLength(103);expect(new Set(data.coverage.map(c=>c.communeCode)).size).toBe(103);expect(data.coverage.every(c=>c.households===null&&c.harvestedKg===null)).toBe(true);});
 it('mọi bằng chứng và chỉ tiêu truy được nguồn, không tạo tọa độ hộ thật',()=>{const sources=new Set(data.sources.map(s=>s.id));for(const c of data.coverage)expect(c.evidence.every(e=>sources.has(e.sourceId))).toBe(true);for(const o of data.observations){expect(sources.has(o.sourceId)).toBe(true);expect(o.lat).toBeNull();expect(o.lng).toBeNull();}expect(data.observations.find(o=>o.id==='city-2025')?.communeCodes).toEqual([]);});
 it('giữ hai mốc tồn đọng khác nhau và không dùng làm thu hoạch',()=>{const old=data.observations.find(o=>o.id==='city-unsold-20260415')!,next=data.observations.find(o=>o.id==='city-unsold-20260418')!;expect(old.metrics[0].value).toBe(4000);expect(next.metrics.find(m=>m.name==='unsoldBiomass')?.value).toBe(1600);expect([...old.metrics,...next.metrics].every(m=>m.name!=='harvestQuantity')).toBe(true);});
});

