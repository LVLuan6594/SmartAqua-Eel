import type { DemoDB } from '../types/models';
export const EEL_DATASET_ID = 'cantho-eel-demo-v1';
export const EEL_SPECIES_ID = 'SP1';
export function assertEelDataset(value: unknown): asserts value is DemoDB {
 const db=value as DemoDB;
 if(db?.metadata?.datasetId!==EEL_DATASET_ID||db.metadata.speciesScope!=='eel-only')throw new Error('Chỉ chấp nhận bộ dữ liệu demo nuôi lươn Cần Thơ phiên bản hiện tại.');
 for(const key of ['administrativeUnits','cooperatives','aquacultureAreas','farmers','ponds','species','farmingCycles','feedDiaries','medicationDiaries','environmentObservations','growthObservations','healthEvents','harvests','gisFeatures','aquacultureZones','zoneCommuneLinks','auditLogs','notifications'])if(!Array.isArray(db[key]))throw new Error(`Thiếu danh mục ${key}.`);
 if(db.species.length!==1||db.species[0].id!==EEL_SPECIES_ID||db.species[0].code!=='EEL')throw new Error('Hệ thống chỉ quản lý lươn.');
 const ids=(key:string)=>{const rows=db[key] as {id:string}[],set=new Set(rows.map(r=>r.id));if(set.size!==rows.length||rows.some(r=>!r.id))throw new Error(`Định danh trùng hoặc rỗng trong ${key}.`);return set;};
 const units=ids('administrativeUnits'),coops=ids('cooperatives'),areas=ids('aquacultureAreas'),farmers=ids('farmers'),ponds=ids('ponds'),cycles=ids('farmingCycles');
 for(const c of db.cooperatives)if(!units.has(c.unitId))throw new Error('HTX chưa gắn xã/phường.');
 for(const a of db.aquacultureAreas)if(!units.has(a.unitId)||!coops.has(a.coopId))throw new Error('Vùng nuôi chưa liên kết địa bàn/HTX.');
 for(const f of db.farmers)if(!areas.has(f.areaId))throw new Error('Hộ nuôi chưa gắn vùng.');
 for(const p of db.ponds)if(!farmers.has(p.farmerId)||!areas.has(p.areaId)||!(Number(p.areaHa)>0))throw new Error('Bể nuôi thiếu quan hệ hoặc diện tích hợp lệ.');
 for(const c of db.farmingCycles)if(!ponds.has(c.pondId)||c.speciesId!==EEL_SPECIES_ID)throw new Error('Vụ nuôi phải thuộc bể và đối tượng lươn hợp lệ.');
 for(const key of ['feedDiaries','medicationDiaries','environmentObservations','growthObservations','healthEvents','harvests']){ids(key);for(const r of db[key])if(!cycles.has(r.cycleId))throw new Error(`Bản ghi ${key} không thuộc vụ hợp lệ.`);}
 for(const h of db.harvests)if(!Number.isFinite(h.quantityKg)||h.quantityKg<=0)throw new Error('Sản lượng thu hoạch phải lớn hơn 0.');
}
