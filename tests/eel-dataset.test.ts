import {describe,it,expect} from 'vitest';
import seed from '../src/data/data.json';
import {assertEelDataset} from '../src/domain/eelDataset';
import {assertEelDataset as serverAssert} from '../server/validateDataset.mjs';
describe('Ranh giới bộ dữ liệu nuôi lươn',()=>{
 for(const [name,validate]of [['client',assertEelDataset],['server',serverAssert]] as const){
  it(name+': chấp nhận seed và từ chối dữ liệu ngành cũ',()=>{expect(()=>validate(seed)).not.toThrow();const other=structuredClone(seed);other.metadata.datasetId='smart-aqua-legacy';expect(()=>validate(other)).toThrow('nuôi lươn');});
  it(name+': chặn loài khác và bản ghi mồ côi',()=>{const other=structuredClone(seed);other.species[0].code='SHRIMP';expect(()=>validate(other)).toThrow('lươn');const orphan=structuredClone(seed);orphan.harvests[0].cycleId='missing';expect(()=>validate(orphan)).toThrow();});
 }
});
