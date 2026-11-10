import {readFileSync} from 'node:fs';
const db=JSON.parse(readFileSync(new URL('../../src/data/data.json',import.meta.url),'utf8'));
const publicData=JSON.parse(readFileSync(new URL('../../src/data/eel-public-data.json',import.meta.url),'utf8'));
console.log('HỒ SƠ NUÔI LƯƠN MÔ PHỎNG (không phải thống kê toàn thành phố)');
for(const key of ['administrativeUnits','aquacultureAreas','cooperatives','farmers','ponds','farmingCycles','harvests'])console.log(key+': '+db[key].length);
console.log('Diện tích bể mẫu (m²): '+db.ponds.reduce((s,p)=>s+p.areaM2,0));
console.log('Thu hoạch theo phiếu mẫu (kg): '+db.harvests.reduce((s,h)=>s+h.quantityKg,0));
console.log('\nNGUỒN CÔNG KHAI ĐỘC LẬP');
console.log('Nguồn: '+publicData.sources.length+'; quan sát: '+publicData.observations.length+'; độ phủ: '+publicData.coverage.length);
console.log(publicData.coverage.reduce((s,c)=>(s[c.status]=(s[c.status]||0)+1,s),{}));
console.log('Không cộng tồn đọng, mẫu nghiên cứu hoặc số khác kỳ vào KPI thu hoạch demo.');

