import {describe,it,expect} from 'vitest';
import seed from '../src/data/data.json';
import {areaMapPoints,communeAquaculturePolygons} from '../src/features/gis/services/areaMapRepository';
import {readFileSync} from 'node:fs';

describe('Điểm vùng nuôi và số liệu popup GIS',()=>{
 it('polygon địa bàn dùng nguyên ranh giới hành chính, không dùng hộp chữ nhật quanh điểm vùng',()=>{
  const boundaries=JSON.parse(readFileSync('public/geojson/can-tho/communes-103.geojson','utf8'));
  const polygons=communeAquaculturePolygons(seed,'admin',boundaries);
  expect(polygons.features).toHaveLength(8);
  for(const feature of polygons.features){
   expect(feature.geometry).toEqual(boundaries.features.find((boundary:any)=>boundary.properties.code===feature.properties.code).geometry);
   expect(feature.geometry).not.toEqual(seed.gisFeatures.find(item=>item.entityId===feature.properties.areaIds[0])?.geometry);
  }
  const own=communeAquaculturePolygons(seed,'farmer',boundaries);
  expect(own.features).toHaveLength(1);expect(own.features[0].properties).toMatchObject({farmerCount:1,pondCount:3,pondAreaM2:60});
 });
 it('tạo điểm từ tọa độ vùng và tổng hợp đúng hộ/bể, tách diện tích vùng khỏi diện tích bể',()=>{
  const points=areaMapPoints(seed,'admin');
  expect(points).toHaveLength(8);
  expect(points[0]).toMatchObject({id:'A01',farmerCount:3,pondCount:9,pondAreaM2:188,zoneAreaM2:900,pondsWithArea:9,isSynthetic:true});
  expect(points[0].lat).toBe(seed.aquacultureAreas[0].lat);
 });
 it('không tạo tọa độ khi giá trị trống, không hữu hạn hoặc ngoài khoảng',()=>{
  for(const bad of [undefined,null,'', ' ',NaN,Infinity,91]){
   const db=structuredClone(seed);(db.aquacultureAreas[0] as any).lat=bad;
   expect(areaMapPoints(db,'admin').some(point=>point.id==='A01')).toBe(false);
  }
  const db=structuredClone(seed);db.aquacultureAreas[0].lng=181;
  expect(areaMapPoints(db,'admin')).toHaveLength(7);
 });
 it('chỉ cộng hộ và bể thuộc phạm vi vai trò',()=>{
  expect(areaMapPoints(seed,'farmer')[0]).toMatchObject({id:'A01',farmerCount:1,pondCount:3,pondAreaM2:60});
  expect(areaMapPoints(seed,'farmer')).toHaveLength(1);
  expect(areaMapPoints(seed,'coop')).toHaveLength(1);
 });
 it('không suy diện tích còn thiếu thành 0 và hỗ trợ hồ sơ cũ chỉ có ha',()=>{
  const db=structuredClone(seed);
  for(const pond of db.ponds.filter(pond=>pond.areaId==='A01')){delete (pond as any).areaM2;delete (pond as any).areaHa;}
  expect(areaMapPoints(db,'admin')[0]).toMatchObject({pondAreaM2:null,pondsWithArea:0,pondCount:9});
  (db.ponds[0] as any).areaHa=.002;
  expect(areaMapPoints(db,'admin')[0]).toMatchObject({pondAreaM2:20,pondsWithArea:1});
 });
 it('đọc lại số liệu và tọa độ sau khi sửa hồ sơ, không giữ snapshot seed cũ',()=>{
  const db=structuredClone(seed);
  db.ponds[0].areaM2=30;db.ponds[0].areaHa=.003;db.aquacultureAreas[0].lat=10.1;
  const result=areaMapPoints(db,'admin')[0];
  expect(result.pondAreaM2).toBe(202);
  expect(result.lat).toBe(10.1);
  expect(result.activeCycleCount).toBe(db.farmingCycles.filter(cycle=>db.ponds.some(pond=>pond.areaId==='A01'&&pond.id===cycle.pondId)&&['active','harvesting'].includes(cycle.status)).length);
 });
});
