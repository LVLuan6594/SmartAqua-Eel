import React,{useEffect,useMemo,useRef} from 'react';
import L from 'leaflet';
import {Marker,Popup,Tooltip,useMap} from 'react-leaflet';
import {useMediaQuery} from '@mui/material';
import AreaMapPopup from './AreaMapPopup';
import type {AreaMapPoint} from '../services/areaMapRepository';
import '../area-map.css';

export interface AreaPopupRequest {areaId:string;nonce:number}
export interface AreaPointLayerProps {
 points:AreaMapPoint[]; selectedId:string|null; request?:AreaPopupRequest|null; measureActive:boolean;
 onSelect:(point:AreaMapPoint)=>void; onDetails:(point:AreaMapPoint)=>void; onProfile:(point:AreaMapPoint)=>void;
}
const pinSvg='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10H3Z"/><path d="M8 20v-6h8v6M7 10h10"/></svg>';
function AreaMarker({point,selected,request,measureActive,onSelect,onDetails,onProfile,popupHeight}:{point:AreaMapPoint;selected:boolean;request:AreaPopupRequest|null|undefined;measureActive:boolean;onSelect:AreaPointLayerProps['onSelect'];onDetails:AreaPointLayerProps['onDetails'];onProfile:AreaPointLayerProps['onProfile'];popupHeight:number}) {
 const marker=useRef<L.Marker>(null),map=useMap();
 const icon=useMemo(()=>L.divIcon({className:`eel-area-marker${selected?' is-selected':''}`,html:`<span class="eel-area-marker-body">${pinSvg}</span>`,iconSize:[36,42],iconAnchor:[18,40],popupAnchor:[0,-36],tooltipAnchor:[20,-22]}),[selected]);
 useEffect(()=>{
  if(request?.areaId!==point.id||measureActive)return;
  map.setView([point.lat,point.lng],Math.max(map.getZoom(),13),{animate:false});
  marker.current?.openPopup();
 },[request,point.id,point.lat,point.lng,map,measureActive]);
 return <Marker ref={marker} position={[point.lat,point.lng]} icon={icon} title={point.name} alt={point.name} keyboard={!measureActive} riseOnHover zIndexOffset={selected?800:200} eventHandlers={{click:()=>{if(!measureActive){map.stop();onSelect(point);}}}}>
  {!selected&&<Tooltip direction="top" offset={[0,-35]}>{point.name} · {point.farmerCount} hộ · {point.pondCount} bể</Tooltip>}
  {!measureActive&&<Popup key={popupHeight} className="eel-area-popup" minWidth={220} maxWidth={360} maxHeight={popupHeight} autoPanPadding={[16,16]} eventHandlers={{add:event=>{event.target.getElement()?.querySelector('.leaflet-popup-close-button')?.setAttribute('aria-label','Đóng thông tin vùng nuôi');}}}><AreaMapPopup point={point} maxHeight={popupHeight} onDetails={()=>onDetails(point)} onProfile={()=>onProfile(point)}/></Popup>}
 </Marker>;
}
export default function AreaPointLayer({points,selectedId,request,measureActive,onSelect,onDetails,onProfile}:AreaPointLayerProps) {
 const smallScreen=useMediaQuery('(max-width:600px)');
 return <>{points.map(point=><AreaMarker key={point.id} point={point} selected={selectedId===point.id} request={request} measureActive={measureActive} onSelect={onSelect} onDetails={onDetails} onProfile={onProfile} popupHeight={smallScreen?310:380}/>)}</>;
}
