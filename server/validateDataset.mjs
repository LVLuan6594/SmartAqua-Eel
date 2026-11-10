export function assertEelDataset(db){
 if(db?.metadata?.datasetId!=='cantho-eel-demo-v1'||db.metadata.speciesScope!=='eel-only')throw Error('Chỉ chấp nhận bộ dữ liệu nuôi lươn Cần Thơ hiện tại.');
 for(const key of ['administrativeUnits','cooperatives','aquacultureAreas','farmers','ponds','species','farmingCycles','feedDiaries','medicationDiaries','environmentObservations','growthObservations','healthEvents','harvests','gisFeatures','aquacultureZones','zoneCommuneLinks','auditLogs','notifications'])if(!Array.isArray(db[key]))throw Error('Thiếu danh mục '+key);
 if(db.species.length!==1||db.species[0].id!=='SP1'||db.species[0].code!=='EEL')throw Error('Hệ thống chỉ quản lý lươn.');
 const ids=key=>{const rows=db[key],set=new Set(rows.map(r=>r.id));if(set.size!==rows.length||rows.some(r=>!r.id))throw Error('Định danh trùng/rỗng trong '+key);return set;};
 const units=ids('administrativeUnits'),coops=ids('cooperatives'),areas=ids('aquacultureAreas'),farmers=ids('farmers'),ponds=ids('ponds'),cycles=ids('farmingCycles');
 for(const c of db.cooperatives)if(!units.has(c.unitId))throw Error('HTX thiếu xã/phường.');
 for(const a of db.aquacultureAreas)if(!units.has(a.unitId)||!coops.has(a.coopId))throw Error('Vùng thiếu địa bàn/HTX.');
 for(const f of db.farmers)if(!areas.has(f.areaId))throw Error('Hộ thiếu vùng.');
 for(const p of db.ponds)if(!farmers.has(p.farmerId)||!areas.has(p.areaId)||!(Number(p.areaHa)>0))throw Error('Bể thiếu quan hệ/diện tích hợp lệ.');
 for(const c of db.farmingCycles)if(!ponds.has(c.pondId)||c.speciesId!=='SP1')throw Error('Vụ không thuộc bể hoặc loài lươn hợp lệ.');
 for(const key of ['feedDiaries','medicationDiaries','environmentObservations','growthObservations','healthEvents','harvests']){ids(key);for(const r of db[key])if(!cycles.has(r.cycleId))throw Error('Bản ghi không thuộc vụ: '+key);}
 for(const h of db.harvests)if(!Number.isFinite(h.quantityKg)||h.quantityKg<=0)throw Error('Sản lượng không hợp lệ.');
}
