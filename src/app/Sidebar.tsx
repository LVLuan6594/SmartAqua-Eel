import React, {useEffect, useState} from 'react';
import {NavLink, useLocation} from 'react-router-dom';
import {Collapse, Tooltip} from '@mui/material';
import {LayoutDashboard, MapPinned, Layers3, Warehouse, ScanEye, BarChart3, Settings2, Database, PanelLeftClose, PanelLeftOpen, Waves, Home, ClipboardCheck, ChevronRight, MapPin, Store, Search, X} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {useDemo} from '../store/demoStore';
import {scoped} from '../domain/selectors';
import {permissionFor} from '../auth/authService';
import './sidebar.css';

type LinkItem = {to:string; label:string; Icon:LucideIcon; detail?:string};
type NavSection = {label:string; items:LinkItem[]};
const areasLink:LinkItem = {to:'/areas', label:'Vùng nuôi & hộ nuôi', Icon:Layers3};
const nav:Record<string, NavSection[]> = {
 admin:[
  {label:'Điều hành', items:[{to:'/dashboard',label:'Tổng quan hệ thống',Icon:LayoutDashboard},{to:'/gis',label:'Bản đồ GIS',Icon:MapPinned},{to:'/reports',label:'Thống kê & báo cáo',Icon:BarChart3}]},
  {label:'Quản lý nuôi lươn',items:[areasLink,{to:'/cooperatives',label:'Hợp tác xã',Icon:Warehouse}]},
  {label:'Quản trị',items:[{to:'/admin',label:'Quản trị hệ thống',Icon:Settings2},{to:'/integration',label:'Dữ liệu & tích hợp',Icon:Database},{to:'/review',label:'Yêu cầu hỗ trợ',Icon:ClipboardCheck}]},
  {label:'Ứng dụng AI',items:[{to:'/ai/image',label:'Phân tích ảnh',Icon:ScanEye}]}
 ],
 manager:[
  {label:'Điều hành',items:[{to:'/dashboard',label:'IOC Tổng quan',Icon:LayoutDashboard},{to:'/gis',label:'Bản đồ GIS',Icon:MapPinned},{to:'/reports',label:'Thống kê & báo cáo',Icon:BarChart3}]},
  {label:'Quản lý nuôi lươn',items:[areasLink]}
 ],
 coop:[
  {label:'Hợp tác xã',items:[{to:'/dashboard',label:'Tổng quan HTX',Icon:LayoutDashboard},areasLink,{to:'/gis',label:'Bản đồ vùng nuôi',Icon:MapPinned},{to:'/reports',label:'Báo cáo HTX',Icon:BarChart3}]},
  {label:'Hỗ trợ',items:[{to:'/review',label:'Yêu cầu hỗ trợ',Icon:ClipboardCheck}]}
 ],
 farmer:[
  {label:'Không gian của tôi',items:[{to:'/dashboard',label:'Tổng quan của tôi',Icon:LayoutDashboard},areasLink,{to:'/portal',label:'Bể nuôi của tôi',Icon:Home}]},
  {label:'Hỗ trợ',items:[{to:'/ai/image',label:'Phân tích hình ảnh',Icon:ScanEye},{to:'/review',label:'Yêu cầu hỗ trợ',Icon:ClipboardCheck}]}
 ]
};
export const sidebarWidth = 304;
export const sidebarSmallWidth = 80;
const normalize = (value:string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
const areaTitle = (name:string) => name.replace(/^Cụm nuôi lươn mô phỏng\s*/,'');
const farmTitle = (name:string) => name.replace(/^Hộ nuôi lươn mô phỏng\s*/,'Hộ nuôi ');

export function Sidebar({collapsed, mobile=false, onToggle, onNavigate}:{collapsed:boolean; mobile?:boolean; onToggle:()=>void; onNavigate?:()=>void}) {
 const {role,db} = useDemo();
 const location = useLocation();
 const [query,setQuery] = useState('');
 const [expanded,setExpanded] = useState<Set<string>>(new Set());
 const [treeOpen,setTreeOpen] = useState(location.pathname.startsWith('/areas') || location.pathname.startsWith('/ponds/'));
 const areas = scoped(db,role,'aquacultureAreas'), farmers = scoped(db,role,'farmers'), ponds = scoped(db,role,'ponds');
 const pondId = location.pathname.match(/^\/ponds\/([^/]+)/)?.[1];
 const currentPond = ponds.find(pond=>pond.id===pondId);
 const route = location.pathname.match(/^\/areas\/([^/]+)(?:\/farms\/([^/]+))?/);
 const areaId = currentPond?.areaId || (route?.[1]!=='manage' ? route?.[1] : undefined);
 const farmId = currentPond?.farmerId || route?.[2];
 useEffect(()=>{
  if(location.pathname.startsWith('/areas') || areaId) setTreeOpen(true);
  if(areaId) setExpanded(current=>new Set([...current,`area:${areaId}`,...(farmId?[`farm:${farmId}`]:[])]));
 },[location.pathname,areaId,farmId]);
 const toggle = (key:string) => setExpanded(current=>{const next=new Set(current);if(next.has(key))next.delete(key);else next.add(key);return next;});
 const searching = Boolean(query.trim());
 const matches = (text:string) => normalize(text).includes(normalize(query.trim()));
 const farmMatches = (farm:any) => matches(`${farm.name} ${farm.code}`) || ponds.some(pond=>pond.farmerId===farm.id && matches(`${pond.name} ${pond.code}`));
 const areaMatches = (area:any) => matches(`${area.name} ${area.code}`) || farmers.some(farm=>farm.areaId===area.id && farmMatches(farm));
 const sections = (nav[role]||nav.manager).map((section,index)=>({...section,items:[...section.items,...(index===0?[{to:'/public-data',label:'Dữ liệu công khai',detail:'103 xã/phường',Icon:Database}]:[])].filter(item=>{
  const module=item.to.startsWith('/admin')||item.to==='/integration'?'admin':item.to==='/public-data'?'gis':item.to.slice(1).split('/')[0];
  return permissionFor(role,module) && (!searching || matches(`${item.label} ${item.detail||''}`) || (item.to==='/areas' && areas.some(areaMatches)));
 })})).filter(section=>section.items.length);
 const navigate = () => {setQuery('');onNavigate?.();};

 const hierarchy = () => <Collapse in={treeOpen || searching} timeout="auto" unmountOnExit>
  <ul className="eel-nav-tree" id="sidebar-farming-tree" aria-label="Cụm nuôi, hộ nuôi và bể nuôi">
   {areas.filter(area=>!searching || areaMatches(area)).map(area=>{
    const ownMatch=searching && matches(`${area.name} ${area.code}`);
    const areaFarms=farmers.filter(farm=>farm.areaId===area.id && (!searching||ownMatch||farmMatches(farm)));
    const open=searching||expanded.has(`area:${area.id}`);
    return <li key={area.id}>
     <div className={`eel-tree-row${areaId===area.id?' is-branch':''}`}>
      <NavLink end to={`/areas/${area.id}`} onClick={navigate} className={({isActive})=>`eel-tree-link${isActive?' is-active':''}`} title={area.name}>
       <MapPin size={16}/><span><span className="eel-tree-title">{areaTitle(area.name)}</span><small>{farmers.filter(farm=>farm.areaId===area.id).length} hộ nuôi</small></span>
      </NavLink>
      <button type="button" className="eel-tree-toggle" aria-label={`${open?'Thu gọn':'Mở'} hộ nuôi của ${area.name}`} aria-expanded={open} aria-controls={`sidebar-${area.id}`} onClick={()=>toggle(`area:${area.id}`)}><ChevronRight size={15} className={open?'is-open':''}/></button>
     </div>
     <Collapse in={open} timeout="auto" unmountOnExit><ul className="eel-nav-tree" id={`sidebar-${area.id}`}>
      {areaFarms.map(farm=>{
       const farmOwnMatch=searching && (ownMatch||matches(`${farm.name} ${farm.code}`));
       const farmPonds=ponds.filter(pond=>pond.farmerId===farm.id && (!searching||farmOwnMatch||matches(`${pond.name} ${pond.code}`)));
       const farmOpen=searching||expanded.has(`farm:${farm.id}`);
       return <li key={farm.id}>
        <div className={`eel-tree-row${farmId===farm.id?' is-branch':''}`}>
         <NavLink end to={`/areas/${area.id}/farms/${farm.id}`} onClick={navigate} className={({isActive})=>`eel-tree-link${isActive?' is-active':''}`} title={farm.name}><Store size={15}/><span><span className="eel-tree-title">{farmTitle(farm.name)}</span><small>{ponds.filter(pond=>pond.farmerId===farm.id).length} bể nuôi</small></span></NavLink>
         <button type="button" className="eel-tree-toggle" aria-label={`${farmOpen?'Thu gọn':'Mở'} bể của ${farm.name}`} aria-expanded={farmOpen} aria-controls={`sidebar-${farm.id}`} onClick={()=>toggle(`farm:${farm.id}`)}><ChevronRight size={15} className={farmOpen?'is-open':''}/></button>
        </div>
        <Collapse in={farmOpen} timeout="auto" unmountOnExit><ul className="eel-nav-tree eel-nav-ponds" id={`sidebar-${farm.id}`}>
         {farmPonds.map(pond=><li key={pond.id}><NavLink to={`/ponds/${pond.id}`} onClick={navigate} className={({isActive})=>`eel-tree-link${isActive?' is-active':''}`} title={pond.name||pond.code}><Waves size={15}/><span className="eel-tree-title">{pond.name||pond.code}</span></NavLink></li>)}
        </ul></Collapse>
       </li>;
      })}
     </ul></Collapse>
    </li>;
   })}
   {!areas.length && <li className="eel-nav-empty">Chưa có cụm nuôi trong phạm vi quản lý.</li>}
  </ul>
 </Collapse>;

 return <aside className={`eel-sidebar${collapsed?' is-collapsed':''}${mobile?' is-mobile':''}`} aria-label="Thanh điều hướng">
  <header className="eel-sidebar-header">
   <NavLink to="/dashboard" className="eel-sidebar-brand" onClick={navigate} aria-label="SmartAqua · Trang chủ"><span className="eel-brand-mark"><Waves size={25}/></span>{!collapsed&&<span className="eel-brand-copy"><strong>Smart<span>Aqua</span></strong><small>NUÔI LƯƠN · CẦN THƠ</small></span>}</NavLink>
   <Tooltip title={mobile?'Đóng menu':collapsed?'Mở rộng menu':'Thu gọn menu'} placement="right"><button type="button" onClick={onToggle} className="eel-sidebar-control" aria-label={mobile?'Đóng menu':collapsed?'Mở rộng menu':'Thu gọn menu'}>{mobile?<X size={20}/>:collapsed?<PanelLeftOpen size={19}/>:<PanelLeftClose size={19}/>}</button></Tooltip>
  </header>
  {!collapsed ? <div className="eel-sidebar-search"><Search size={17}/><input aria-label="Tìm trong menu" placeholder="Tìm mục, cụm hoặc hộ nuôi…" value={query} onChange={event=>setQuery(event.target.value)}/>{query&&<button type="button" aria-label="Xóa tìm kiếm menu" onClick={()=>setQuery('')}><X size={16}/></button>}</div>:null}
  <div className="eel-sidebar-scroll">
   {sections.map((section,index)=><section className="eel-nav-section" key={section.label} aria-label={section.label}>
    {!collapsed?<h2>{section.label}</h2>:index>0?<div className="eel-nav-divider"/>:null}
    <ul className="eel-nav-items">{section.items.map(({to,label,Icon,detail})=><li key={to}>
     <div className="eel-nav-row">
      <Tooltip title={collapsed?`${label}${detail?' · '+detail:''}`:''} placement="right"><span className="eel-nav-tooltip-target"><NavLink to={to} onClick={navigate} aria-label={collapsed?label:undefined} className={({isActive})=>`eel-nav-link${isActive || (to==='/areas'&&currentPond)?' is-active':''}`}>
       <Icon size={19}/>{!collapsed&&<span className="eel-nav-copy"><span>{label}</span>{detail&&<small>{detail}</small>}</span>}
      </NavLink></span></Tooltip>
      {to==='/areas'&&!collapsed&&<button type="button" className="eel-tree-toggle eel-main-toggle" aria-label={treeOpen?'Thu gọn danh sách vùng nuôi':'Mở danh sách vùng nuôi'} aria-expanded={treeOpen||searching} aria-controls="sidebar-farming-tree" onClick={()=>setTreeOpen(open=>!open)}><ChevronRight size={16} className={treeOpen||searching?'is-open':''}/></button>}
     </div>
     {to==='/areas'&&!collapsed&&hierarchy()}
    </li>)}</ul>
   </section>)}
   {!sections.length&&<div className="eel-nav-empty" role="status">Không tìm thấy “{query}”.<button type="button" onClick={()=>setQuery('')}>Hiện tất cả mục</button></div>}
  </div>
  <footer className="eel-sidebar-footer"><span className="eel-sidebar-status" aria-hidden="true"/>{!collapsed?<span><strong>Dữ liệu mô phỏng</strong><small>SmartAqua Eel <span>v3.0</span></small></span>:<span className="sr-only">Dữ liệu mô phỏng</span>}</footer>
 </aside>;
}
