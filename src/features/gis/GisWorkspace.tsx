import React,{useMemo,useState,useEffect,useRef} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {Alert,Box,Button,Chip,Drawer,IconButton,Stack,Typography,useMediaQuery} from '@mui/material';
import {ChevronRight,MapPin,X} from 'lucide-react';
import MapCanvas from './components/MapCanvas';
import type {AreaPopupRequest} from './components/AreaPointLayer';
import AquacultureDrilldown,{EMPTY_DRILL} from './components/AquacultureDrilldown';
import type {DrillState} from './components/AquacultureDrilldown';
import {defaultLayerState,useGisData} from './hooks/useGisData';
import {boundsOf} from './services/spatial';
import {zoneByAreaId} from './services/aquacultureRepository';
import {areaMapPoints,communeAquaculturePolygons} from './services/areaMapRepository';
import type {AreaMapPoint} from './services/areaMapRepository';
import {useDemo} from '../../store/demoStore';
import {num,scoped} from '../../domain/selectors';
import {coverageLabels,usePublicEelData} from '../../services/repositories/publicEelRepository';
import type {GeoFeature,ToggleId} from './types';

const normalized=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');

export default function GisWorkspace(){
 const {db,role}=useDemo(),[params]=useSearchParams(),navigate=useNavigate();
 const wide=useMediaQuery('(min-width:1200px)');
 const [commune,setCommune]=useState(params.get('commune')||'');
 const [query,setQuery]=useState(''),[showDemo,setShowDemo]=useState(false),[showAreas,setShowAreas]=useState(true);
 const [panel,setPanel]=useState(false),[measure,setMeasure]=useState(false),[basemap,setBasemap]=useState<'osm'|'satellite'>('osm');
 const [drill,setDrill]=useState<DrillState>(EMPTY_DRILL);
 const [selectedAreaId,setSelectedAreaId]=useState<string|null>(null);
 const [popupRequest,setPopupRequest]=useState<AreaPopupRequest|null>(null);
 const [focus,setFocus]=useState<{bounds:{min:[number,number];max:[number,number]}|null;nonce:number}>({bounds:null,nonce:0});
 const handledEntity=useRef('');
 const enabled=useMemo(()=>({...defaultLayerState(),city:true,communes:true,demo:false,communeLabels:false} as Record<ToggleId,boolean>),[]);
 const {layers,errors}=useGisData(enabled),{data:publicData}=usePublicEelData();
 const allAreaPoints=useMemo(()=>areaMapPoints(db,role),[db,role]);
 const points=useMemo(()=>allAreaPoints.filter(point=>!commune||point.unitId===commune),[allAreaPoints,commune]);
 const areaPolygons=useMemo(()=>{
  const collection=communeAquaculturePolygons(db,role,layers.communes);
  return {...collection,features:collection.features.filter(feature=>!commune||feature.properties.code===commune)};
 },[db,role,layers.communes,commune]);
 const demo=useMemo(()=>{
  const ponds=scoped(db,role,'ponds').filter(pond=>!commune||pond.unitId===commune||pond.communeCode===commune);
  const areas=scoped(db,role,'aquacultureAreas').filter(area=>!commune||area.unitId===commune);
  const allowed=new Set([...ponds,...areas].map(item=>item.id));
  return {type:'FeatureCollection' as const,features:db.gisFeatures.filter((feature:any)=>feature.entityType==='pond'&&allowed.has(feature.entityId)).map((feature:any)=>({type:'Feature' as const,id:feature.id,geometry:feature.geometry,properties:{...feature.properties,entityType:feature.entityType,entityId:feature.entityId}}))};
 },[db,role,commune]);
 const mapLayers={...layers,demo};
 const selection=layers.communes?.features.find(feature=>feature.properties.code===commune);
 const coverage=publicData?.coverage.find(item=>item.communeCode===commune);
 const areasWithoutCoordinates=scoped(db,role,'aquacultureAreas').filter(area=>(!commune||area.unitId===commune)&&!allAreaPoints.some(point=>point.id===area.id));
 const fly=(geometry:any)=>{const bounds=boundsOf(geometry);setFocus(current=>({bounds:{min:bounds[0],max:bounds[1]},nonce:current.nonce+1}));};
 useEffect(()=>{
  if(selection)fly(selection.geometry);
  else setFocus(current=>({bounds:null,nonce:current.nonce+1}));
 },[selection]);
 useEffect(()=>{
  const code=params.get('commune');
  if(code){setCommune(code);setDrill(EMPTY_DRILL);}
 },[params]);

 const showAreaDetails=(point:AreaMapPoint)=>{
  const zone=zoneByAreaId(db,point.id);
  setSelectedAreaId(point.id);
  if(zone){setDrill({...EMPTY_DRILL,zoneId:zone.zoneId});setPanel(true);}
  else navigate(`/areas/${encodeURIComponent(point.id)}`);
 };
 const openAreaPopup=(point:AreaMapPoint)=>{
  setSelectedAreaId(point.id);setShowAreas(true);setMeasure(false);setPanel(false);
  setPopupRequest(current=>({areaId:point.id,nonce:(current?.nonce||0)+1}));
 };
 const selectDemo=(feature:GeoFeature)=>{
  const id=feature.properties.entityId,type=feature.properties.entityType;
  if(type==='area'){
   const point=allAreaPoints.find(point=>point.id===id);
   if(point){openAreaPopup(point);return;}
  }
  const pond=type==='pond'?db.ponds.find((pond:any)=>pond.id===id):null;
  const zone=zoneByAreaId(db,pond?pond.areaId:id);
  if(zone){setSelectedAreaId(pond?.areaId||id);setDrill({zoneId:zone.zoneId,farmerId:pond?.farmerId||null,pondId:pond?.id||null,cycleId:null});setPanel(true);}
 };
 useEffect(()=>{
  const id=params.get('entity');
  if(!id||handledEntity.current===id)return;
  const point=allAreaPoints.find(point=>point.id===id);
  if(point){handledEntity.current=id;if(commune&&commune!==point.unitId)setCommune('');openAreaPopup(point);return;}
  const feature=demo.features.find((feature:any)=>feature.properties.entityId===id);
  if(feature){handledEntity.current=id;selectDemo(feature);fly(feature.geometry);}
 },[params,allAreaPoints,demo]);

 const info=drill.zoneId?
  <AquacultureDrilldown state={drill} onNavigate={patch=>setDrill(current=>({...current,...patch}))} onClear={()=>setDrill(EMPTY_DRILL)}/>:
  <Box sx={{p:2,overflowY:'auto',height:'100%'}}>
   <Typography variant="h6" sx={{fontSize:17,fontWeight:700}}>{selection?.properties.fullName||'Vùng nuôi trên bản đồ'}</Typography>
   <Typography variant="body2" color="text.secondary" sx={{my:1}}>Nhấp điểm màu xanh để xem thông tin nhanh. Chọn một vùng bên dưới để định vị và mở popup.</Typography>
   <Chip size="small" label={`${points.length} vùng có tọa độ`} sx={{mb:.5}}/>
   <div className="gis-area-list">{points.map(point=><button type="button" key={point.id} className={selectedAreaId===point.id?'is-selected':''} onClick={()=>openAreaPopup(point)} aria-label={`Định vị ${point.name}`}><span className="gis-area-list-icon"><MapPin size={17}/></span><span className="gis-area-list-copy"><strong>{point.name.replace(/^Cụm nuôi lươn mô phỏng\s*/,'Cụm lươn ')}</strong><small>{point.farmerCount} hộ · {point.pondCount} bể · {point.pondAreaM2===null?'Chưa có diện tích':`${num(point.pondAreaM2,1)} m² bể`}</small></span><ChevronRight size={15}/></button>)}</div>
   {!points.length&&<Alert severity="info" sx={{mt:1.5}}>Chưa có vùng nuôi có tọa độ trong địa bàn và phạm vi đang xem.</Alert>}
   {areasWithoutCoordinates.length>0&&<Typography variant="caption" color="text.secondary" display="block" sx={{mt:1}}>Có {areasWithoutCoordinates.length} vùng chưa có tọa độ hợp lệ, chưa đặt điểm trên bản đồ.</Typography>}
   <Alert severity="info" sx={{my:2,fontSize:12}}>Hồ sơ và tọa độ hiện tại là mô phỏng. Ranh giới 103 xã/phường là lớp tham chiếu.</Alert>
   {coverage&&<><Typography variant="subtitle2">Nguồn công khai tại địa bàn</Typography><Chip size="small" sx={{mt:1}} label={coverageLabels[coverage.status]}/><p>{coverage.note}</p>{coverage.evidence.map((e,index)=>{
    const source=publicData!.sources.find(source=>source.id===e.sourceId);
    return source?<p key={index}><a href={source.url} target="_blank" rel="noreferrer">{source.publisher} · {source.publishedAt||'Chưa rõ ngày xuất bản'}</a>{e.note&&<small style={{display:'block'}}>{e.note}</small>}</p>:null;
   })}</>}
   <Button href="/public-data" variant="outlined" fullWidth size="small" sx={{mt:1}}>Xem số liệu và nguồn công khai</Button>
  </Box>;

 return <div className="gis-page">
  <div className="gis-head">
   <div className="gis-title"><div><div className="eyebrow">GIS · NUÔI LƯƠN CẦN THƠ</div><h1>Bản đồ vùng nuôi & trang trại</h1><p>Nhấp điểm vùng nuôi để xem hộ, bể và diện tích. Hồ sơ và tọa độ đang dùng dữ liệu mô phỏng.</p></div></div>
   <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
    <input aria-label="Tìm xã/phường trên GIS" placeholder="Tìm tên xã/phường…" value={query} onChange={event=>setQuery(event.target.value)} style={{padding:10,maxWidth:200}}/>
    <select aria-label="Chọn xã/phường trên GIS" value={commune} onChange={event=>{setCommune(event.target.value);setDrill(EMPTY_DRILL);setSelectedAreaId(null);setPopupRequest(null);setPanel(false);}}><option value="">Toàn thành phố</option>{(layers.communes?.features||[]).filter(feature=>feature.properties.code===commune||normalized(feature.properties.fullName).includes(normalized(query))).map(feature=><option key={feature.properties.code} value={feature.properties.code}>{feature.properties.fullName}</option>)}</select>
    <Button variant={showAreas?'contained':'outlined'} aria-pressed={showAreas} size="small" onClick={()=>{if(showAreas)setPopupRequest(null);setShowAreas(value=>!value);}}>Vùng nuôi ({points.length})</Button>
    <Button variant={showDemo?'contained':'outlined'} aria-pressed={showDemo} size="small" onClick={()=>setShowDemo(value=>!value)}>Bể nuôi</Button>
    <Button size="small" onClick={()=>setBasemap(value=>value==='osm'?'satellite':'osm')}>{basemap==='osm'?'Ảnh vệ tinh':'Bản đồ đường'}</Button>
    <Button size="small" onClick={()=>{setDrill(EMPTY_DRILL);setPanel(value=>!value);}}>Danh sách vùng</Button>
   </Stack>
   {Object.values(errors).length>0&&<Alert severity="error">{Object.values(errors).join(' · ')}</Alert>}
  </div>
  <div className="gis-workspace" style={{gridTemplateColumns:wide?'minmax(0,1fr) 324px':'minmax(0,1fr)'}}>
   <MapCanvas enabled={{...enabled,demo:showDemo}} layers={mapLayers} basemap={basemap} selectedCommune={commune||null} selectedVerifiedId={null} selectedZoneId={drill.zoneId} selectedDemoId={drill.pondId} selectedFacilityId={null} facilityPonds={[]}
    areaPoints={showAreas?points:[]} areaPolygons={showAreas?areaPolygons:{type:'FeatureCollection',features:[]}} selectedAreaId={selectedAreaId} areaPopupRequest={popupRequest}
    onSelectArea={point=>setSelectedAreaId(point.id)} onOpenCommuneDetails={code=>{setCommune(code);setDrill(EMPTY_DRILL);setPanel(true);}} onOpenAreaDetails={showAreaDetails} onOpenAreaProfile={point=>navigate(`/areas/${encodeURIComponent(point.id)}`)}
    focusBounds={focus.bounds} focusNonce={focus.nonce} measureActive={measure} onToggleMeasure={()=>setMeasure(value=>!value)}
    onSelectCommune={feature=>{setCommune(feature.properties.code);setDrill(EMPTY_DRILL);setSelectedAreaId(null);setPopupRequest(null);setPanel(true);}}
    onSelectVerified={()=>{}} onSelectZone={()=>{}} onSelectFacility={()=>{}} onSelectFacilityPond={()=>{}} onSelectDemo={selectDemo}/>
   {wide&&<div className="gis-panel">{info}</div>}
  </div>
  <div className="gis-statusbar"><span className="gis-marker-hint"><i/> {points.length} điểm vùng · {areaPolygons.features.length} địa bàn có hồ sơ nuôi</span><span>Ranh giới xã/phường thực từ zoom 11 · Bể mô phỏng từ zoom 14</span></div>
  {!wide&&<Drawer anchor="right" open={panel} onClose={()=>setPanel(false)} PaperProps={{sx:{width:360,maxWidth:'92vw'}}}><Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',px:2,py:1,borderBottom:'1px solid #e4edf2'}}><Typography fontWeight={700}>Thông tin GIS</Typography><IconButton aria-label="Đóng thông tin GIS" onClick={()=>setPanel(false)}><X size={18}/></IconButton></Box>{info}</Drawer>}
 </div>;
}
