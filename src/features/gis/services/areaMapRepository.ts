import type {DemoDB,Role,RecordItem} from '../../../types/models';
import {scoped} from '../../../domain/selectors';
import type {FeatureCollection,CommuneProperties} from '../types';

export interface AreaMapPoint {
 id:string; code:string; name:string; unitId:string; unitName:string; coopName:string;
 lat:number; lng:number; farmerCount:number; pondCount:number;
 pondAreaM2:number|null; pondsWithArea:number; zoneAreaM2:number|null;
 activeCycleCount:number; isSynthetic:boolean;
}
export interface CommuneAquacultureProperties {code:string;name:string;areaKm2:number|null;areaIds:string[];areaCount:number;farmerCount:number;pondCount:number;pondAreaM2:number|null;pondsWithArea:number;isSynthetic:boolean}

/** Administrative coverage uses the actual commune boundary, never a box around a farm point. */
export function communeAquaculturePolygons(db:DemoDB,role:Role,boundaries?:FeatureCollection<CommuneProperties>):FeatureCollection<CommuneAquacultureProperties>{
 const areas=unique(scoped(db,role,'aquacultureAreas')),farmers=unique(scoped(db,role,'farmers')),ponds=unique(scoped(db,role,'ponds'));
 return {type:'FeatureCollection',features:(boundaries?.features||[]).flatMap(boundary=>{
  const local=areas.filter(area=>area.unitId===boundary.properties.code);
  if(!local.length)return [];
  const ids=new Set(local.map(area=>area.id)),localPonds=ponds.filter(pond=>ids.has(pond.areaId));
  const known=localPonds.map(areaM2).filter((value):value is number=>value!==null);
  return [{type:'Feature' as const,id:boundary.properties.code,geometry:boundary.geometry,properties:{code:boundary.properties.code,name:boundary.properties.fullName,areaKm2:boundary.properties.areaKm2,areaIds:[...ids],areaCount:ids.size,farmerCount:farmers.filter(farmer=>ids.has(farmer.areaId)).length,pondCount:localPonds.length,pondsWithArea:known.length,pondAreaM2:known.length?known.reduce((sum,value)=>sum+value,0):localPonds.length?null:0,isSynthetic:local.some(area=>Boolean(area.isSynthetic??db.metadata.isSynthetic))}}];
 })};
}

function coordinate(value:unknown,min:number,max:number):number|null {
 if(value==null || (typeof value!=='number'&&typeof value!=='string') || String(value).trim()==='')return null;
 const number=Number(value);return Number.isFinite(number)&&number>=min&&number<=max?number:null;
}
function areaM2(item:RecordItem):number|null {
 const m2=coordinate(item.areaM2,0,Number.MAX_SAFE_INTEGER);
 if(m2!==null&&m2>0)return m2;
 const ha=coordinate(item.areaHa,0,Number.MAX_SAFE_INTEGER/10000);
 return ha!==null&&ha>0?ha*10000:null;
}
const unique=(items:RecordItem[])=>[...new Map(items.map(item=>[item.id,item])).values()];

/** Read current business records, so coordinates and popup totals follow edits and role scope. */
export function areaMapPoints(db:DemoDB,role:Role):AreaMapPoint[] {
 const farmers=unique(scoped(db,role,'farmers')),ponds=unique(scoped(db,role,'ponds'));
 const cycles=unique(scoped(db,role,'farmingCycles'));
 return unique(scoped(db,role,'aquacultureAreas')).flatMap(area=>{
  const lat=coordinate(area.lat,-90,90),lng=coordinate(area.lng,-180,180);
  if(lat===null||lng===null)return [];
  const areaPonds=ponds.filter(pond=>pond.areaId===area.id),pondIds=new Set(areaPonds.map(pond=>pond.id));
  const knownAreas=areaPonds.map(areaM2).filter((value):value is number=>value!==null);
  const unit=(db.administrativeUnits as RecordItem[]).find(unit=>unit.id===area.unitId);
  const coop=(db.cooperatives as RecordItem[]).find(coop=>coop.id===area.coopId);
  return [{id:area.id,code:String(area.code||area.id),name:String(area.name||area.code||area.id),
   unitId:String(area.unitId||''),unitName:String(unit?.fullName||unit?.name||'Chưa gán địa bàn'),coopName:String(coop?.name||'Chưa cập nhật HTX'),
   lat,lng,farmerCount:farmers.filter(farmer=>farmer.areaId===area.id).length,pondCount:areaPonds.length,
   pondAreaM2:knownAreas.length?knownAreas.reduce((sum,value)=>sum+value,0):areaPonds.length?null:0,
   pondsWithArea:knownAreas.length,zoneAreaM2:areaM2(area),
   activeCycleCount:cycles.filter(cycle=>pondIds.has(cycle.pondId)&&['active','harvesting'].includes(cycle.status)).length,
   isSynthetic:Boolean(area.isSynthetic??db.metadata.isSynthetic)}];
 });
}
