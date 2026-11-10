import {readFileSync} from 'node:fs';
const db=JSON.parse(readFileSync(new URL('../src/data/data.json',import.meta.url)));
const ids=(name)=>new Set(db[name].map(x=>x.id));
const assert=(value, msg)=>{if(!value)throw Error(msg)};
const pond=ids('ponds'),area=ids('aquacultureAreas'),farmer=ids('farmers'),cycle=ids('farmingCycles');
for(const p of db.ponds){assert(area.has(p.areaId),'Pond without area '+p.id); assert(farmer.has(p.farmerId),'Pond without farmer '+p.id)}
for(const c of db.farmingCycles)assert(pond.has(c.pondId),'Cycle without pond '+c.id);
for(const x of [...db.feedDiaries,...db.harvests,...db.medicationDiaries])assert(cycle.has(x.cycleId),'Orphan record '+x.id);
for(const f of db.gisFeatures)assert( [...area,...pond,...ids('cooperatives')].includes(f.entityId),'Orphan geometry '+f.id);
for(const h of db.harvests)assert(h.quantityKg>0,'Invalid harvest '+h.id);
console.log(`PASS mock relations: ${db.aquacultureAreas.length} regions, ${db.ponds.length} ponds, ${db.farmingCycles.length} cycles, ${db.harvests.length} harvests, ${db.gisFeatures.length} geometries`);
