import React from 'react';
import {GeoJSON,Popup,Tooltip} from 'react-leaflet';
import {useMediaQuery} from '@mui/material';
import {ArrowUpRight,LandPlot,MapPin,Ruler,Users,Waves} from 'lucide-react';
import {num} from '../../../domain/selectors';
import type {FeatureCollection} from '../types';
import type {CommuneAquacultureProperties} from '../services/areaMapRepository';

export default function CommuneAquacultureLayer({data,selectedCode,measureActive,onDetails}:{data:FeatureCollection<CommuneAquacultureProperties>;selectedCode:string|null;measureActive:boolean;onDetails:(code:string)=>void}){
 const smallScreen=useMediaQuery('(max-width:600px)'),popupHeight=smallScreen?310:360;
 return <>{data.features.map(feature=>{
  const item=feature.properties,selected=item.code===selectedCode;
  return <GeoJSON key={`${item.code}:${measureActive}:${JSON.stringify(item)}`} data={feature as any} interactive={!measureActive} bubblingMouseEvents={false} style={{color:selected?'#C98B26':'#158F86',weight:selected?3:2,fillColor:selected?'#F2BF5B':'#33B5A2',fillOpacity:selected?.23:.16}}>
   <Tooltip sticky>{item.name} · {item.areaCount} vùng · {item.farmerCount} hộ · {item.pondCount} bể</Tooltip>
   {!measureActive&&<Popup key={popupHeight} className="eel-area-popup" minWidth={220} maxWidth={360} maxHeight={popupHeight} autoPanPadding={[16,16]} eventHandlers={{add:event=>{event.target.getElement()?.querySelector('.leaflet-popup-close-button')?.setAttribute('aria-label','Đóng thông tin địa bàn');}}}>
    <article className="eel-map-card" style={{'--gis-popup-height':`${popupHeight}px`} as React.CSSProperties} aria-label={`Địa bàn nuôi lươn ${item.name}`}>
     <header className="eel-map-card-header">
      <span className="eel-map-card-kind">ĐỊA BÀN CÓ HỒ SƠ NUÔI LƯƠN</span>
      <div className="eel-map-card-heading"><span className="eel-map-card-icon"><LandPlot size={23}/></span><div><h2>{item.name}</h2><span className="eel-map-card-code">Mã địa bàn · {item.code}</span></div></div>
      <div className="eel-map-card-place"><MapPin size={12}/><span>Ranh giới xã/phường thực</span>{item.isSynthetic&&<small>Hồ sơ mô phỏng</small>}</div>
     </header>
     <div className="eel-map-card-body">
     <dl className="eel-map-card-metrics"><div><dt><LandPlot size={13}/> Vùng / cụm nuôi</dt><dd>{num(item.areaCount)}</dd></div><div><dt><Users size={13}/> Hộ nuôi</dt><dd>{num(item.farmerCount)}</dd></div><div><dt><Waves size={13}/> Bể nuôi</dt><dd>{num(item.pondCount)}</dd></div><div className="is-area-metric"><dt><Ruler size={13}/> Tổng diện tích bể</dt><dd>{item.pondAreaM2===null?'Chưa có':<>{num(item.pondAreaM2,1)} <small>m²</small></>}</dd></div></dl>
     <p className="eel-map-card-area-note">Phần tô màu là địa bàn xã/phường, không phải toàn bộ diện tích đang nuôi lươn.{item.pondsWithArea<item.pondCount&&` Có diện tích cho ${item.pondsWithArea}/${item.pondCount} bể.`}</p>
     </div>
     <footer className="eel-map-card-actions"><button type="button" onClick={()=>onDetails(item.code)}>Xem các vùng trong địa bàn <ArrowUpRight size={14}/></button></footer>
    </article>
   </Popup>}
  </GeoJSON>;
 })}</>;
}
