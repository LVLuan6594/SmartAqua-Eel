import type {DemoDB,Role,RecordItem,ForecastScope,ProductionForecastRequest,ProductionForecastResponse,ForecastCycleRow} from '../types/models';
import {scoped} from '../domain/selectors';

const round=(number:number)=>Math.round((number+Number.EPSILON)*100)/100;
const positive=(value:unknown)=>Number.isFinite(Number(value))&&Number(value)>0;
const dateValid=(date:unknown):date is string=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(`${date}T00:00:00Z`))&&new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)===date;
const unique=(items:RecordItem[])=>[...new Map(items.map(item=>[item.id,item])).values()];

export function forecastScopeContext(db:DemoDB,role:Role,scope:ForecastScope){
 if(!scope?.id||!['area','farmer','pond'].includes(scope.kind))return null;
 const collection={area:'aquacultureAreas',farmer:'farmers',pond:'ponds'}[scope.kind];
 const entity=scoped(db,role,collection).find(item=>item.id===scope.id);
 if(!entity)return null;
 const ponds=unique(scoped(db,role,'ponds').filter(pond=>scope.kind==='area'?pond.areaId===scope.id:scope.kind==='farmer'?pond.farmerId===scope.id:pond.id===scope.id));
 const pondIds=new Set(ponds.map(pond=>pond.id));
 const farmers=unique(scoped(db,role,'farmers').filter(farmer=>scope.kind==='area'?farmer.areaId===scope.id:scope.kind==='farmer'?farmer.id===scope.id:farmer.id===entity.farmerId));
 const cycles=unique(scoped(db,role,'farmingCycles').filter(cycle=>pondIds.has(cycle.pondId)));
 const cycleIds=new Set(cycles.map(cycle=>cycle.id));
 const harvests=unique(scoped(db,role,'harvests').filter(harvest=>cycleIds.has(harvest.cycleId)));
 return {entity,ponds,farmers,cycles,harvests};
}

/** Explicit demo assumptions, not a trained biological or statistical model. */
export function scopedProductionForecast(db:DemoDB,role:Role,request:ProductionForecastRequest):ProductionForecastResponse {
 const context=forecastScopeContext(db,role,request.scope);
 if(!context)throw new Error('Hồ sơ dự báo không tồn tại hoặc ngoài phạm vi được giao.');
 const asOf=request.asOf||new Date(Date.now()+7*60*60*1000).toISOString().slice(0,10);
 if(!dateValid(asOf))throw new Error('Ngày dự báo không hợp lệ.');
 const scenario=(db.aiPredictionScenarios as RecordItem[]).find(item=>item.id===request.scenarioId);
 if(!scenario||!positive(scenario.multiplier)||!Number.isFinite(scenario.uncertainty)||scenario.uncertainty<0||scenario.uncertainty>1)throw new Error('Kịch bản dự báo không hợp lệ.');
 const survival=request.survivalRatePercent??80,weight=request.targetWeightGrams??200;
 if(!positive(survival)||survival>100||!positive(weight))throw new Error('Giả định tỷ lệ sống và cỡ thu hoạch chưa hợp lệ.');
 const harvests=context.harvests.filter(harvest=>dateValid(harvest.date)&&harvest.date<=asOf&&positive(harvest.quantityKg));
 const recordedByCycle=new Map<string,number>();
 for(const harvest of harvests)recordedByCycle.set(harvest.cycleId,(recordedByCycle.get(harvest.cycleId)||0)+Number(harvest.quantityKg));
 const currentMonth=asOf.slice(0,7);
 const rows:ForecastCycleRow[]=context.cycles.filter(cycle=>['active','harvesting'].includes(cycle.status)).map(cycle=>{
  const pond=context.ponds.find(pond=>pond.id===cycle.pondId)!;
  const farmer=context.farmers.find(farmer=>farmer.id===pond.farmerId);
  const species=(db.species as RecordItem[]).find(species=>species.id===cycle.speciesId);
  let expected=dateValid(cycle.expectedHarvestDate)?cycle.expectedHarvestDate:null;
  let note='';
  if(!expected&&dateValid(cycle.stockingDate)&&positive(species?.typicalDays)){
   expected=new Date(Date.parse(`${cycle.stockingDate}T00:00:00Z`)+Number(species!.typicalDays)*86400000).toISOString().slice(0,10);
   note='Mốc thu suy từ ngày thả và số ngày nuôi mô phỏng.';
  }
  const recordedKg=round(recordedByCycle.get(cycle.id)||0),overdue=Boolean(expected&&expected<asOf);
  const base={cycleId:cycle.id,cycleCode:String(cycle.code||cycle.id),pondId:pond.id,pondName:String(pond.name||pond.code),farmerName:String(farmer?.name||'Chưa gán hộ'),expectedHarvestDate:expected,scheduledMonth:expected?(expected<asOf?currentMonth:expected.slice(0,7)):null,recordedKg,overdue};
  if(!positive(cycle.stockingQuantity)||!expected)return {...base,remainingKg:null,lowerKg:null,upperKg:null,note:'Thiếu số lượng thả hoặc mốc thu hoạch; chưa tính dự báo.'};
  const gross=Number(cycle.stockingQuantity)*(survival/100)*(weight/1000)*Number(scenario.multiplier);
  return {...base,remainingKg:round(Math.max(0,gross-recordedKg)),lowerKg:round(Math.max(0,gross*(1-scenario.uncertainty)-recordedKg)),upperKg:round(Math.max(0,gross*(1+scenario.uncertainty)-recordedKg)),note:[note,overdue?'Đã quá mốc dự kiến; xếp phần còn lại vào tháng hiện tại để rà soát.':''].filter(Boolean).join(' ')};
 });
 const known=rows.filter(row=>row.remainingKg!==null);
 const sum=(key:'remainingKg'|'lowerKg'|'upperKg')=>rows.length&&!known.length?null:round(known.reduce((total,row)=>total+(row[key]||0),0));
 const monthly=new Map<string,{forecast:number;low:number;high:number}>();
 for(const row of known){const month=row.scheduledMonth!;const item=monthly.get(month)||{forecast:0,low:0,high:0};item.forecast+=row.remainingKg!;item.low+=row.lowerKg!;item.high+=row.upperKg!;monthly.set(month,item);}
 const actual=new Map<string,number>();
 for(const harvest of harvests){const month=harvest.date.slice(0,7);actual.set(month,(actual.get(month)||0)+Number(harvest.quantityKg));}
 const periods=new Set<string>();
 const [year,month]=currentMonth.split('-').map(Number);
 for(let offset=-5;offset<=6;offset++)periods.add(new Date(Date.UTC(year,month-1+offset,1)).toISOString().slice(0,7));
 for(const month of monthly.keys())periods.add(month);
 const points=[...periods].sort().map(period=>({period,...(period<=currentMonth?{actual:round(actual.get(period)||0)}:{}),...(monthly.has(period)?{forecast:round(monthly.get(period)!.forecast),low:round(monthly.get(period)!.low),high:round(monthly.get(period)!.high)}:{})}));
 return {scope:{...request.scope},scopeName:String(context.entity.name||context.entity.code),asOf,isMock:true,points,cycles:rows,
  counts:{farmerCount:context.farmers.length,pondCount:context.ponds.length,activeCycleCount:rows.length,forecastableCycleCount:known.length},
  totals:{recordedKg:round(harvests.reduce((total,harvest)=>total+Number(harvest.quantityKg),0)),remainingKg:sum('remainingKg'),lowerKg:sum('lowerKg'),upperKg:sum('upperKg')},
  assumptions:{survivalRatePercent:survival,targetWeightGrams:weight,multiplier:Number(scenario.multiplier),uncertainty:Number(scenario.uncertainty)}};
}
