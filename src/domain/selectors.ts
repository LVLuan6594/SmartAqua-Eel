import type {DemoDB,Role,RecordItem} from '../types/models';
import {getActiveAccount} from '../auth/authService';
export const dateVi=(date?:string)=>date?new Date(date+'T12:00:00').toLocaleDateString('vi-VN'):'—';
export const num=(value:number|undefined,dec=0)=>Number(value||0).toLocaleString('vi-VN',{maximumFractionDigits:dec});
export const kg=(v:number|undefined)=>`${num(v,1)} kg`;
export const sum=(list:RecordItem[],key:string)=>list.reduce((n,x)=>n+Number(x[key]||0),0);
export const pondScope=(db:DemoDB,role:Role)=>{
 const ponds=db.ponds as RecordItem[];
 const account=getActiveAccount();
 if(role==='farmer'){
  if(account?.farmerId)return ponds.filter(x=>x.farmerId===account.farmerId);
  if(account?.pondIds?.length)return ponds.filter(x=>account.pondIds!.includes(x.id));
  if(account?.role==='farmer')return [];
  return ponds.filter(x=>x.farmerId==='F001');
 }
 if(role==='coop'){const coopId=account?.coopId||'HTX01';const areas=new Set((db.aquacultureAreas as RecordItem[]).filter(x=>x.coopId===coopId).map(x=>x.id));return ponds.filter(x=>areas.has(x.areaId));}
 if(role==='manager'){
  if(!account)return ponds;
  const unitIds=account?.unitIds;
  if(!unitIds?.length)return [];
  const coops=new Set((db.cooperatives as RecordItem[]).filter(x=>unitIds.includes(x.unitId)).map(x=>x.id));
  const areas=new Set((db.aquacultureAreas as RecordItem[]).filter(x=>coops.has(x.coopId)).map(x=>x.id));
  return ponds.filter(x=>areas.has(x.areaId));
 }
 return ponds;
};
export const scopeIds=(db:DemoDB,role:Role)=>new Set(pondScope(db,role).map(x=>x.id));
export const scoped=(db:DemoDB,role:Role,collection:string):RecordItem[]=>{
 const rows=db[collection] as RecordItem[]; if(!Array.isArray(rows))return [];
 if(!['farmer','coop','manager'].includes(role))return rows;
 const account=getActiveAccount(),allowed=pondScope(db,role),ids=new Set(allowed.map(x=>x.id));
 const areas=new Set(allowed.map(x=>x.areaId));
 if(role==='manager'&&account?.unitIds?.length){
  const coops=new Set((db.cooperatives as RecordItem[]).filter(x=>account.unitIds!.includes(String(x.unitId))).map(x=>x.id));
  (db.aquacultureAreas as RecordItem[]).filter(x=>coops.has(String(x.coopId))).forEach(x=>areas.add(x.id));
 }
 const farmers=new Set(allowed.map(x=>x.farmerId));
 if(role==='manager')(db.farmers as RecordItem[]).filter(x=>areas.has(String(x.areaId))).forEach(x=>farmers.add(x.id));
 if(role==='farmer'&&account?.farmerId){
  const ownFarmer=(db.farmers as RecordItem[]).find(x=>x.id===account.farmerId);
  if(ownFarmer){farmers.add(ownFarmer.id);areas.add(String(ownFarmer.areaId));}
 }
 const cycles=new Set((db.farmingCycles as RecordItem[]).filter(x=>ids.has(x.pondId)).map(x=>x.id));
 if(collection==='ponds')return allowed;
 if(collection==='farmers')return rows.filter(x=>farmers.has(x.id));
 if(collection==='aquacultureAreas')return rows.filter(x=>areas.has(x.id));
 if(collection==='cooperatives')return rows.filter(x=>(db.aquacultureAreas as RecordItem[]).some(a=>areas.has(a.id)&&a.coopId===x.id));
 if(collection==='administrativeUnits'&&role==='manager'){const unitIds=getActiveAccount()?.unitIds||[];return rows.filter(x=>unitIds.includes(x.id));}
 if(collection==='farmingCycles')return rows.filter(x=>cycles.has(x.id));
 if(['feedDiaries','medicationDiaries','growthObservations','environmentObservations','harvests','healthEvents'].includes(collection))return rows.filter(x=>cycles.has(x.cycleId));
 return rows;
};
export const metrics=(db:DemoDB,role:Role,filter?:{areaId?:string;speciesId?:string})=>{
 let ponds=pondScope(db,role);if(filter?.areaId)ponds=ponds.filter(p=>p.areaId===filter.areaId);
 const pondIds=new Set(ponds.map(p=>p.id));let cycles=(db.farmingCycles as RecordItem[]).filter(c=>pondIds.has(c.pondId));
 if(filter?.speciesId)cycles=cycles.filter(c=>c.speciesId===filter.speciesId);
 const cycleIds=new Set(cycles.map(c=>c.id));const pondForCycles=filter?.speciesId?ponds.filter(p=>cycles.some(c=>c.pondId===p.id)):ponds;
 const areaIds=new Set(pondForCycles.map(p=>p.areaId));const farmerIds=new Set(pondForCycles.map(p=>p.farmerId));
 const harvests=(db.harvests as RecordItem[]).filter(h=>cycleIds.has(h.cycleId));
 const active=cycles.filter(c=>c.status==='active'||c.status==='harvesting');
 const selectedAreas=(db.aquacultureAreas as RecordItem[]).filter(a=>areaIds.has(a.id));
 return {areas:areaIds.size,zoneAreaHa:sum(selectedAreas,'areaHa'),coops:new Set(selectedAreas.map(a=>a.coopId)).size,farmerCount:farmerIds.size,pondCount:pondForCycles.length,areaHa:sum(pondForCycles,'areaHa'),active:active.length,harvestKg:sum(harvests,'quantityKg'),cycles,ponds:pondForCycles,harvests};
};
export const productionByMonth=(db:DemoDB,role:Role,filter?:{areaId?:string;speciesId?:string},year=2026)=>{
 const selected=metrics(db,role,filter), byMonth=new Map<string,number>();
 for(const h of selected.harvests){if(!String(h.date).startsWith(`${year}-`))continue;const k=String(h.date).slice(0,7);byMonth.set(k,(byMonth.get(k)||0)+Number(h.quantityKg||0));}
 const months=Array.from({length:12},(_,i)=>{return `${year}-${String(i+1).padStart(2,'0')}`});
 return months.map(k=>({month:k.slice(5),value:Math.round(byMonth.get(k)||0),yearMonth:k}));
};
export const daysSince=(iso:string)=>Math.max(0,Math.floor((Date.now()-new Date(iso+'T00:00:00').getTime())/86400000));
export const canWrite=(role:Role,collection:string)=>{
 if(role==='manager')return false;
 if(role==='farmer')return ['feedDiaries','medicationDiaries','environmentObservations','growthObservations','healthEvents','harvests','farmingCycles','supportRequests'].includes(collection);
 if(role==='coop')return ['feedDiaries','harvests','farmingCycles','supportRequests'].includes(collection);
 return true;
};
export const canCreate=(role:Role,collection:string)=>{
 if(role==='admin')return true;
 if(role==='manager')return ['aquacultureAreas','farmers','ponds'].includes(collection);
 if(role==='farmer')return collection==='ponds';
 return false;
};
export const byId=(db:DemoDB,collection:string,id:string)=> (db[collection] as RecordItem[]).find(v=>v.id===id);
export const cycleName=(db:DemoDB,cycleId:string)=>{
 const c=byId(db,'farmingCycles',cycleId);return c?`${c.code} · ${byId(db,'ponds',c.pondId)?.code||''}`:cycleId;
};
