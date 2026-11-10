import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertEelDataset} from '../../server/validateDataset.mjs';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
export function runValidation(){
 const errors=[],warnings=[];
 try{
  const db=read('src/data/data.json');assertEelDataset(db);
  const publicData=read('src/data/eel-public-data.json'),boundaries=read('public/geojson/can-tho/communes-103.geojson');
  const codes=new Set(boundaries.features.map(f=>f.properties.code));
  if(codes.size!==103||db.administrativeUnits.length!==103)throw Error('Danh mục hành chính phải đủ 103 đơn vị.');
  if(publicData.coverage.length!==103||new Set(publicData.coverage.map(c=>c.communeCode)).size!==103||publicData.coverage.some(c=>!codes.has(c.communeCode)))throw Error('Độ phủ nguồn công khai không khớp 103 mã.');
  const sourceIds=new Set(publicData.sources.map(s=>s.id));
  if(publicData.observations.some(o=>!sourceIds.has(o.sourceId)||o.communeCodes.some(c=>!codes.has(c))))throw Error('Quan sát công khai thiếu nguồn hoặc sai mã xã.');
  for(const p of db.ponds)if(!codes.has(p.communeCode)||Math.abs(p.areaM2/10000-p.areaHa)>1e-9)throw Error('Bể sai địa bàn hoặc đơn vị diện tích.');
  for(const file of ['src/data/pdf-facilities.json']){const old=read(file);if(old.facilities.length||old.ponds.length)throw Error('Dữ liệu PDF ngành cũ còn tồn tại.');}
  const unknown=publicData.coverage.filter(c=>c.status==='not_found_in_collected_sources').length;
  warnings.push(unknown+' xã/phường chưa thấy trong tập nguồn công khai; không suy diễn là không nuôi lươn.');
  console.log('PASS: chỉ lươn, 103 xã/phường, khóa ngoại, diện tích và nguồn công khai.');
 }catch(error){errors.push(error.message);}
 errors.forEach(e=>console.error('ERROR: '+e));warnings.forEach(w=>console.log('NOTE: '+w));
 console.log(errors.length?'THẤT BẠI: '+errors.length+' lỗi':'ĐẠT: 0 lỗi');
 return {ok:errors.length===0,errors,warnings};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url)))process.exit(runValidation().ok?0:1);

