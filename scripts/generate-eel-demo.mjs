import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const asOf='2026-10-26';
const datasetId='cantho-eel-demo-v1';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,data)=>{const target=path.join(root,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(data,null,2)+'\n');};
const communes=read('public/geojson/can-tho/communes-103.geojson').features;
const publicData=read('src/data/eel-public-data.json');
const source={source:'MOCK_DATA',verificationStatus:'needs_review',isSynthetic:true};
const db={metadata:{datasetId,schemaVersion:2,version:'3.0.0',title:'SmartAqua Eel — Nuôi lươn Cần Thơ',asOf,isSynthetic:true,speciesScope:'eel-only',note:'Hồ sơ hộ, bể, tọa độ và giao dịch đều mô phỏng. Số liệu báo chí lưu riêng; không dùng hồ sơ demo làm thống kê thực.',sourceRegistry:['mock:eel-seed','gis:communes-103'],appliedMockBatches:[]}};
for(const key of ['users','roles','administrativeUnits','cooperatives','aquacultureAreas','farmers','ponds','species','seedSuppliers','seedBatches','farmingCycles','stockingEvents','feedProducts','medicationProducts','feedDiaries','medicationDiaries','healthEvents','growthObservations','environmentObservations','harvests','gisLayers','gisFeatures','aiKnowledgeBase','aiImageScenarios','aiPredictionScenarios','aiModelMetadata','productionHistory','notifications','auditLogs','supportRequests','reviewRequests','aquacultureZones','zoneCommuneLinks','dataSources','userPondAssignments','dataQualityIssues'])db[key]=[];
db.roles=[{id:'admin',name:'Quản trị hệ thống'},{id:'manager',name:'Lãnh đạo địa phương'},{id:'coop',name:'Quản lý HTX / tổ hợp tác'},{id:'farmer',name:'Hộ nuôi lươn'}];
db.users=[{id:'USR1',name:'Quản trị demo',role:'admin'},{id:'USR2',name:'Lãnh đạo demo',role:'manager'},{id:'USR5',name:'Quản lý HTX demo',role:'coop',coopId:'HTX01'},{id:'USR6',name:'Hộ nuôi lươn demo',role:'farmer',farmerId:'F001'}];
db.administrativeUnits=communes.map(({properties:p})=>({id:p.code,code:p.code,name:p.fullName,type:p.type,parentCode:'92',communeCode:p.code,source:'OFFICIAL_GIS',verificationStatus:'verified',eelEvidenceStatus:publicData.coverage.find(c=>c.communeCode===p.code)?.status||'not_found_in_collected_sources'}));
db.species=[{id:'SP1',code:'EEL',name:'Lươn đồng',scientificName:'Monopterus albus',typicalDays:300,waterType:'freshwater',targetWeightGrams:200}];
db.seedSuppliers=[{id:'SUP1',name:'Cơ sở giống lươn mô phỏng 01',status:'active',...source},{id:'SUP2',name:'Cơ sở giống lươn mô phỏng 02',status:'active',...source}];
db.feedProducts=[{id:'FD1',name:'Thức ăn viên cho lươn giống (mẫu)',speciesId:'SP1',unit:'kg',...source},{id:'FD2',name:'Thức ăn viên cho lươn thương phẩm (mẫu)',speciesId:'SP1',unit:'kg',...source}];
db.medicationProducts=[{id:'MD1',name:'Chế phẩm sinh học ghi nhận mẫu',unit:'g',...source},{id:'MD2',name:'Sản phẩm chăm sóc nước ghi nhận mẫu',unit:'ml',...source}];
const pointInRing=([x,y],ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const[a,b]=ring[i],[c,d]=ring[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}return inside;};
const within=(p,g)=>{const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;return polys.some(poly=>pointInRing(p,poly[0])&&!poly.slice(1).some(r=>pointInRing(p,r)));};
const position=(g)=>{const values=[];const walk=c=>typeof c[0]==='number'?values.push(c):c.forEach(walk);walk(g.coordinates);const xs=values.map(p=>p[0]),ys=values.map(p=>p[1]);const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);for(let y=1;y<30;y++)for(let x=1;x<30;x++){const p=[minX+(maxX-minX)*x/30,minY+(maxY-minY)*y/30];if(within(p,g))return p;}throw Error('Không chọn được điểm mô phỏng trong xã');};
const rect=(lng,lat,dx=.000018)=>({type:'Polygon',coordinates:[[[lng-dx,lat-dx],[lng+dx,lat-dx],[lng+dx,lat+dx],[lng-dx,lat+dx],[lng-dx,lat-dx]]]});
const pad=(n,size=3)=>String(n).padStart(size,'0');
const plusDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
// Small, explicitly synthetic fixtures in eight places with current public evidence.
const selected=['31441','31342','31237','31168','31741','31537','31258','31396'];
selected.forEach((code,areaIndex)=>{
 const unit=db.administrativeUnits.find(u=>u.code===code),boundary=communes.find(f=>f.properties.code===code);
 const [lng,lat]=position(boundary.geometry),n=areaIndex+1,areaId='A'+pad(n,2),coopId='HTX'+pad(n,2),zoneId='ZEEL'+pad(n,2);
 db.cooperatives.push({id:coopId,code:'HTX-LUON-'+pad(n,2),name:`Tổ hợp tác lươn mô phỏng ${unit.name}`,unitId:code,communeCode:code,status:'active',contact:'Thông tin mô phỏng',...source});
 db.aquacultureAreas.push({id:areaId,code:'VNU-LUON-'+pad(n,2),name:`Cụm nuôi lươn mô phỏng ${unit.name}`,unitId:code,communeCode:code,coopId,areaHa:.08+n*.01,lat,lng,status:'active',...source});
 db.aquacultureZones.push({zoneId,id:zoneId,code:'VNU-LUON-'+pad(n,2),name:`Cụm nuôi lươn mô phỏng ${unit.name}`,aquacultureType:'Nuôi lươn không bùn trong bể',species:['SP1'],geometryStatus:'synthetic',dataStatus:'mock',totalAreaHa:.08+n*.01,communeCodes:[code],areaIds:[areaId],coopIds:[coopId],geometry:null,geometrySourceId:'demo:'+areaId,updatedAt:asOf,...source});
 db.zoneCommuneLinks.push({zoneId,communeCode:code,communeName:unit.name,intersectionAreaKm2:0,shareOfZone:1,method:'declared_demo',...source});
 db.gisFeatures.push({id:'gis-'+areaId,entityId:areaId,entityType:'area',geometry:rect(lng,lat,.0007),properties:{label:`Cụm lươn mô phỏng ${unit.name}`},...source});
 for(let f=0;f<3;f++){
  const farmerNo=areaIndex*3+f+1,farmerId='F'+pad(farmerNo);
  db.farmers.push({id:farmerId,code:'HO-LUON-'+pad(farmerNo),name:`Hộ nuôi lươn mô phỏng ${pad(farmerNo)}`,areaId,coopId,unitId:code,communeCode:code,status:'active',...source});
  for(let p=0;p<3;p++){
   const i=areaIndex*9+f*3+p+1,pondId='P'+pad(i),areaM2=12+(i%5)*4;
   const plng=lng+(f-1)*.00015,plat=lat+(p-1)*.00012;
   if(!within([plng,plat],boundary.geometry))throw Error('Điểm demo ngoài địa bàn '+pondId);
   db.ponds.push({id:pondId,code:'BE-'+pad(i),name:`Bể lươn ${pad(i)}`,farmerId,areaId,unitId:code,communeCode:code,areaM2,areaHa:areaM2/10000,areaUnit:'m2',lat:plat,lng:plng,cultureSystem:i%3?'lined_tank':'recirculating_tank',waterType:'freshwater',speciesId:'SP1',status:'active',...source});
   db.gisFeatures.push({id:'gis-'+pondId,entityId:pondId,entityType:'pond',geometry:rect(plng,plat),properties:{label:`Bể lươn mô phỏng ${pad(i)}`},...source});
   db.userPondAssignments.push({userId:farmerId==='F001'?'USR6':null,pondId,roleId:'farmer',source:'MOCK_DATA',verificationStatus:'needs_review',status:'active'});
   const seedBatchId='SEED'+pad(i);
   db.seedBatches.push({id:seedBatchId,code:'GIONG-LUON-'+pad(i),speciesId:'SP1',supplierId:i%2?'SUP1':'SUP2',quantity:areaM2*350,...source});
   for(const historic of [true,false]){
    const cycleId=historic?'HC'+pad(i):'C'+pad(i),stockingDate=historic?'2025-01-10':plusDays('2026-04-01',i%45),endDate=historic?plusDays(stockingDate,280+i%20):undefined;
    db.farmingCycles.push({id:cycleId,code:(historic?'VU25-':'VU26-')+pad(i),pondId,speciesId:'SP1',seedBatchId,stockingDate,stockingQuantity:areaM2*350,status:historic?'completed':i%9===0?'preparing':i%7===0?'harvesting':'active',expectedHarvestDate:plusDays(stockingDate,300),...(endDate?{endDate}:{}),notes:'Vụ lươn mô phỏng, không phải hồ sơ hộ thực',...source});
    db.stockingEvents.push({id:'ST-'+cycleId,cycleId,date:stockingDate,quantity:areaM2*350,...source});
    for(let d=0;d<6;d++){
     const date=plusDays(stockingDate,d*25+5);
     db.feedDiaries.push({id:`FE-${cycleId}-${d}`,cycleId,date,productId:d<2?'FD1':'FD2',amountKg:+(areaM2*(.15+d*.04)).toFixed(2),feedingTimes:2,notes:'Nhật ký mô phỏng',...source});
     db.environmentObservations.push({id:`EN-${cycleId}-${d}`,cycleId,date,temperature:27+i%4,ph:7+(d%3)*.2,oxygen:4.8+(i%3)*.2,salinity:0,notes:'Chỉ số nước ngọt mô phỏng',...source});
     db.growthObservations.push({id:`GR-${cycleId}-${d}`,cycleId,date,averageGrams:5+d*22,sampleCount:20,...source});
    }
    if(historic||i%7===0){const date=historic?endDate:'2026-10-20';db.harvests.push({id:'HR-'+cycleId,cycleId,pondId,date,quantityKg:historic?areaM2*(55+i%10):areaM2*12,quantityUnit:'kg',batchNo:1,status:historic?'final':'recorded',notes:'Phiếu thu hoạch lươn mô phỏng',...source});}
   }
  }
 }
});
db.aiKnowledgeBase=[{id:'KB1',topic:'Nhật ký thức ăn cho lươn',species:'Lươn đồng',keywords:['nhật ký','thức ăn','cho ăn'],answer:'Ghi ngày, bể, vụ lươn, loại thức ăn, khối lượng thực tế và ghi chú. Các bản ghi mẫu phục vụ demo, không phải định mức cho ăn.',source:'Hướng dẫn thao tác demo nuôi lươn'},{id:'KB2',topic:'Theo dõi nước trong bể lươn',species:'Lươn đồng',keywords:['môi trường','nước','oxy','ph'],answer:'Ghi lại các chỉ số đã đo và diễn biến thực tế theo bể/vụ. Không dùng thông số mô phỏng làm khuyến cáo kỹ thuật.',source:'Hướng dẫn thao tác demo nuôi lươn'},{id:'KB3',topic:'Sức khỏe lươn',species:'Lươn đồng',keywords:['bệnh','sức khỏe','bỏ ăn'],answer:'Ghi nhận dấu hiệu, thời điểm, số lượng ảnh hưởng và liên hệ cán bộ chuyên môn. Demo không chẩn đoán hoặc đưa phác đồ điều trị.',source:'Giới hạn AI demo' }];
db.aiPredictionScenarios=[{id:'PRS1',name:'Cơ sở mô phỏng',multiplier:1,uncertainty:.2},{id:'PRS2',name:'Thuận lợi mô phỏng',multiplier:1.1,uncertainty:.2},{id:'PRS3',name:'Bất lợi mô phỏng',multiplier:.85,uncertainty:.3}];
db.notifications=[{id:'N1',title:'Demo chỉ quản lý nuôi lươn',body:'Hồ sơ sản xuất mô phỏng; xem Dữ liệu công khai để tra nguồn và độ phủ 103 xã/phường.'}];
db.supportRequests=[{id:'SUPPORT1',farmerId:'F001',type:'support',createdAt:asOf,message:'Yêu cầu hỗ trợ ghi nhật ký bể lươn mô phỏng',status:'pending',response:''}];
db.dataSources=[{id:'mock:eel-seed',type:'MOCK_DATA',name:'Hồ sơ nuôi lươn mô phỏng',file:'src/data/data.json',importedAt:asOf,sourceDate:asOf,license:null},{id:'gis:communes-103',type:'OFFICIAL_GIS',name:'Ranh giới tham chiếu 103 xã/phường',file:'public/geojson/can-tho/communes-103.geojson',importedAt:asOf,license:'MIT'}];
write('src/data/data.json',db);write('data/seeds/data.json',db);
if(process.argv.includes('--reset-runtime'))write('data/runtime/data.json',db);
write('public/geojson/demo-features.geojson',{type:'FeatureCollection',features:db.gisFeatures.map(f=>({type:'Feature',id:f.id,geometry:f.geometry,properties:{...f.properties,entityId:f.entityId,entityType:f.entityType,source:'MOCK_DATA',isSynthetic:true}}))});
// Old unrelated datasets are emptied; their adapters remain as future import contracts.
write('src/data/mock-history-2024.json',{metadata:{id:'eel-no-legacy-history',source:'MOCK_DATA'},...Object.fromEntries(['farmingCycles','stockingEvents','feedDiaries','medicationDiaries','environmentObservations','growthObservations','harvests','healthEvents'].map(k=>[k,[]]))});
const zero={sourcePages:0,totalFacilities:0,totalPonds:0,uniquePonds:0,duplicatePondCodes:0,facilitiesWithCoordinates:0,facilitiesWithoutCoordinates:0,pondsWithCoordinates:0,pondsWithoutCoordinates:0,pondsWithArea:0,pondsWithoutArea:0,coordinateOutliers:0,coordinateLowConfidence:0,areaUnitEvidenceRows:0,mappedByCoordinate:0,mappedByAddress:0,unresolved:0,ownersDetected:0,speciesDistribution:[],totalAreaM2:0,generatedFrom:'disabled-for-eel-demo',crs:'EPSG:4326',areaUnit:'m2',deidentified:true};
write('src/data/pdf-facilities.json',{metadata:{title:'Chưa nhập hồ sơ cơ sở nuôi lươn',sourceFile:'',sourcePages:0,level:'disabled',crs:'EPSG:4326',asOf,areaUnit:'m2',deidentified:true,deidentificationNote:'Không dùng phụ lục cá tra của phiên bản cũ',provenance:'Không có dữ liệu',disclaimer:'Nguồn nhập ngoài chưa được kết nối'},facilities:[],ponds:[],summary:zero});
// Image scenarios are curated separately; preserve the user's eel reference catalog.
for(const file of ['verified-aquaculture','verified-water','verified-zones','verified-ponds','verified-facilities','pdf-cantho-facilities','demo-zones'])write(`public/geojson/aquaculture/${file}.geojson`,{type:'FeatureCollection',features:[]});
write('public/geojson/aquaculture/zone-commune-links.json',db.zoneCommuneLinks);
const manifestFile='public/geojson/can-tho/gis-manifest.json';
const manifest=JSON.parse(fs.readFileSync(path.join(root,manifestFile),'utf8'));
delete manifest.zoneSummary;
manifest.layers=Object.fromEntries(Object.entries(manifest.layers).filter(([key])=>key.startsWith('can-tho/')));
manifest.eelDemo={businessCoordinates:'synthetic',datasetId,excludedLegacyLayers:true,publicResearchFile:'src/data/eel-public-data.json',clusters:db.aquacultureAreas.length,tanks:db.ponds.length};
write(manifestFile,manifest);
console.log(JSON.stringify({datasetId,communes:103,demoCommunes:selected.length,households:db.farmers.length,tanks:db.ponds.length,cycles:db.farmingCycles.length,harvests:db.harvests.length}));
