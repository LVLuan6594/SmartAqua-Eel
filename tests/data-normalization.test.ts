import {describe,it,expect} from 'vitest';
import {canonicalId,rawIdOf} from '../src/domain/sources';
import {dedupeById,scopeForSourceFilter} from '../src/domain/scope';
import {mockDataset} from '../src/services/repositories/mockAdapter';
import {pdfFacilities,pdfPonds} from '../src/services/repositories/pdfAdapter';
describe('Chuẩn hóa hồ sơ nuôi lươn',()=>{
 it('giữ namespace và mã nghiệp vụ',()=>{expect(canonicalId('MOCK_DATA','P001')).toBe('mock:P001');expect(rawIdOf('mock:P001')).toBe('P001');expect(dedupeById([{id:'x'},{id:'x'}])).toHaveLength(1);});
 it('mọi cụm và vụ đều chỉ nuôi lươn',()=>{const ds=mockDataset();expect(ds.zones).toHaveLength(8);expect(ds.zones.every(z=>z.source==='MOCK_DATA'&&z.species.join() === 'SP1')).toBe(true);expect(ds.cycles.every(c=>c.speciesId==='SP1')).toBe(true);});
 it('hộ thành cơ sở và mọi bể liên kết đối xứng',()=>{const ds=mockDataset();for(const farmer of ds.farmers){const facility=ds.facilities.find(f=>f.id===farmer.facilityId)!;expect(facility.pondIds).toEqual(farmer.pondIds);expect(farmer.pondIds.every(id=>ds.ponds.some(p=>p.id===id&&p.facilityId===facility.id))).toBe(true);}});
 it('diện tích bể dùng m² và quy đổi chính xác sang ha',()=>{for(const p of mockDataset().ponds){expect(p.areaUnit).toBe('m2');expect(p.areaM2).toBeGreaterThan(0);expect(p.areaHa).toBeCloseTo(p.areaM2!/10000,8);}});
 it('nguồn PDF cũ không còn dữ liệu hoạt động',()=>{expect(pdfFacilities()).toEqual([]);expect(pdfPonds()).toEqual([]);});
 it('bộ lọc mock không đưa dữ liệu tham chiếu vào KPI nghiệp vụ',()=>{expect(scopeForSourceFilter('mock').sources).toEqual(['MOCK_DATA']);expect(scopeForSourceFilter('all').sources).toBeUndefined();});
});

