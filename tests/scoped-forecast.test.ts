import {describe,it,expect} from 'vitest';
import seed from '../src/data/data.json';
import {scopedProductionForecast,forecastScopeContext} from '../src/ai/scopedForecast';
import type {DemoDB,ForecastScope} from '../src/types/models';

const predict=(scope:ForecastScope,db:DemoDB=seed,scenarioId='PRS1')=>scopedProductionForecast(db,'admin',{scope,scenarioId,asOf:'2026-10-26'});
describe('Dự báo thu hoạch theo vùng, hộ và bể',()=>{
 it('tổng vùng bằng tổng các hộ và bể, không lấy dữ liệu vùng khác',()=>{
  const area=predict({kind:'area',id:'A01'});
  const farms=seed.farmers.filter(farmer=>farmer.areaId==='A01').map(farmer=>predict({kind:'farmer',id:farmer.id}));
  const ponds=seed.ponds.filter(pond=>pond.areaId==='A01').map(pond=>predict({kind:'pond',id:pond.id}));
  expect(area.totals.remainingKg).toBe(farms.reduce((sum,result)=>sum+(result.totals.remainingKg||0),0));
  expect(area.totals.remainingKg).toBe(ponds.reduce((sum,result)=>sum+(result.totals.remainingKg||0),0));
  expect(area.counts).toMatchObject({farmerCount:3,pondCount:9,activeCycleCount:8});
  expect(area.cycles.every(cycle=>seed.ponds.find(pond=>pond.id===cycle.pondId)?.areaId==='A01')).toBe(true);
 });
 it('giới hạn dự báo vùng của nông dân về đúng các bể được giao',()=>{
  const result=scopedProductionForecast(seed,'farmer',{scope:{kind:'area',id:'A01'},scenarioId:'PRS1',asOf:'2026-10-26'});
  expect(result.counts).toMatchObject({farmerCount:1,pondCount:3});
  expect(result.cycles.every(cycle=>['P001','P002','P003'].includes(cycle.pondId))).toBe(true);
  expect(forecastScopeContext(seed,'farmer',{kind:'farmer',id:'F004'})).toBeNull();
  expect(()=>scopedProductionForecast(seed,'farmer',{scope:{kind:'pond',id:'P010'},scenarioId:'PRS1'})).toThrow('phạm vi');
 });
 it('trừ phiếu đã thu đúng một lần, không đưa vụ hoàn tất hoặc chuẩn bị vào phần còn lại',()=>{
  const db=structuredClone(seed),scope:ForecastScope={kind:'pond',id:'P001'};
  const before=predict(scope,db);db.harvests.push({...db.harvests[0],id:'TEST-PARTIAL',cycleId:'C001',pondId:'P001',date:'2026-10-25',quantityKg:15});
  const partial=predict(scope,db);
  expect(partial.totals.remainingKg).toBe(before.totals.remainingKg!-15);
  expect(partial.totals.recordedKg).toBe(before.totals.recordedKg+15);
  db.farmingCycles.find(cycle=>cycle.id==='C001')!.status='completed';
  expect(predict(scope,db).totals.remainingKg).toBe(0);
  expect(predict({kind:'pond',id:'P009'}).counts.activeCycleCount).toBe(0);
 });
 it('không sinh sản lượng mặc định khi thiếu số lượng thả',()=>{
  const db=structuredClone(seed);db.farmingCycles.find(cycle=>cycle.id==='C001')!.stockingQuantity=0;
  const result=predict({kind:'pond',id:'P001'},db);
  expect(result.totals.remainingKg).toBeNull();expect(result.counts.forecastableCycleCount).toBe(0);
  expect(result.cycles[0].note).toContain('Thiếu');
 });
 it('giữ năm của mốc thu và đánh dấu vụ quá mốc, không tạo dự báo trong quá khứ',()=>{
  const db=structuredClone(seed);db.farmingCycles.find(cycle=>cycle.id==='C001')!.expectedHarvestDate='2026-09-01';
  const result=predict({kind:'pond',id:'P001'},db);
  expect(result.cycles[0]).toMatchObject({overdue:true,scheduledMonth:'2026-10'});
  expect(result.points.filter(point=>point.forecast!==undefined).map(point=>point.period)).toEqual(['2026-10']);
  expect(predict({kind:'pond',id:'P002'}).cycles[0].scheduledMonth).toMatch(/^2027-/);
 });
 it('không cộng phiếu có ngày sau thời điểm dự báo và không tạo khoảng âm',()=>{
  const db=structuredClone(seed),scope:ForecastScope={kind:'pond',id:'P001'};
  const before=predict(scope,db);
  db.harvests.push({...db.harvests[0],id:'FUTURE',cycleId:'C001',pondId:'P001',date:'2027-01-01',quantityKg:99999});
  expect(predict(scope,db).totals).toEqual(before.totals);
  db.harvests.at(-1)!.date='2026-10-26';
  expect(predict(scope,db).totals.remainingKg).toBe(0);
  expect(predict(scope,db).totals.lowerKg).toBe(0);
 });
 it('các kịch bản cùng phạm vi có kết quả khác nhau và dải được gắn là giả định',()=>{
  const scope:ForecastScope={kind:'farmer',id:'F001'},base=predict(scope),better=predict(scope,seed,'PRS2'),worse=predict(scope,seed,'PRS3');
  expect(better.totals.remainingKg!).toBeGreaterThan(base.totals.remainingKg!);
  expect(worse.totals.remainingKg!).toBeLessThan(base.totals.remainingKg!);
  expect(base.totals.lowerKg!).toBeLessThanOrEqual(base.totals.remainingKg!);
  expect(base.totals.upperKg!).toBeGreaterThanOrEqual(base.totals.remainingKg!);
  expect(base.assumptions).toMatchObject({survivalRatePercent:80,targetWeightGrams:200});
  expect(base.isMock).toBe(true);
 });
});
