import React from 'react';
import {ArrowUpRight,ChevronDown,LandPlot,MapPin,Ruler,Users,Waves} from 'lucide-react';
import {regionImageFor} from '../../../domain/aquacultureImages';
import {num} from '../../../domain/selectors';
import type {AreaMapPoint} from '../services/areaMapRepository';

export default function AreaMapPopup({point,onDetails,onProfile,maxHeight=360}:{point:AreaMapPoint;onDetails:()=>void;onProfile:()=>void;maxHeight?:number}) {
 return <article className="eel-map-card" style={{'--gis-popup-height':`${maxHeight}px`} as React.CSSProperties} aria-label={`Thông tin ${point.name}`}>
  <header className="eel-map-card-header">
   <span className="eel-map-card-kind">VÙNG NUÔI / TRANG TRẠI</span>
   <div className="eel-map-card-heading"><img src={regionImageFor(point.id)} alt="Ảnh minh họa vùng nuôi lươn"/><div><h2>{point.name}</h2><span className="eel-map-card-code">{point.code}</span></div></div>
   <div className="eel-map-card-place"><MapPin size={12}/><span>{point.unitName}</span>{point.isSynthetic&&<small>Mô phỏng</small>}</div>
  </header>
  <div className="eel-map-card-body">
  <dl className="eel-map-card-metrics">
   <div><dt><Users size={13}/> Hộ nuôi</dt><dd>{num(point.farmerCount)}</dd></div>
   <div><dt><Waves size={13}/> Bể nuôi</dt><dd>{num(point.pondCount)}</dd></div>
   <div className="is-area-metric"><dt><Ruler size={13}/> Tổng diện tích bể</dt><dd>{point.pondAreaM2===null?'Chưa có':<>{num(point.pondAreaM2,1)} <small>m²</small></>}</dd></div>
   <div><dt><LandPlot size={13}/> Diện tích vùng</dt><dd>{point.zoneAreaM2===null?'Chưa có':<>{num(point.zoneAreaM2,1)} <small>m²</small></>}</dd></div>
  </dl>
  <p className="eel-map-card-area-note">Diện tích bể là tổng của các hộ trong phạm vi xem.{point.pondsWithArea<point.pondCount&&` Có diện tích cho ${point.pondsWithArea}/${point.pondCount} bể.`}</p>
  <details className="eel-map-card-more"><summary>HTX, vụ nuôi và tọa độ <ChevronDown size={14}/></summary><div className="eel-map-card-meta"><span>Vụ đang hoạt động <strong>{num(point.activeCycleCount)}</strong></span><span>HTX / tổ hợp tác <strong>{point.coopName}</strong></span></div><div className="eel-map-card-coordinate">{point.isSynthetic?'Tọa độ mô phỏng':'Tọa độ hồ sơ'}: {point.lat.toFixed(6)}, {point.lng.toFixed(6)}</div></details>
  </div>
  <footer className="eel-map-card-actions"><button type="button" onClick={onDetails}>Xem hộ & bể nuôi <ArrowUpRight size={14}/></button><button type="button" onClick={onProfile}>Mở hồ sơ</button></footer>
 </article>;
}
