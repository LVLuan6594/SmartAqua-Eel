import React,{useState} from 'react';
import {Outlet,useLocation,useNavigate} from 'react-router-dom';
import {AppBar,Toolbar,Box,Typography,IconButton,Chip,MenuItem,Menu,Divider,Drawer,useMediaQuery,Avatar,Badge,BottomNavigation,BottomNavigationAction} from '@mui/material';
import {useTheme} from '@mui/material/styles';
import {Bell,Menu as MenuIcon,ChevronRight,Database,CheckCircle2,Home,Waves,Layers3} from 'lucide-react';
import {Sidebar,sidebarWidth,sidebarSmallWidth} from './Sidebar';
import {useDemo,store} from '../store/demoStore';
import {Toaster} from '../components/UI';
import FloatingChat from '../components/FloatingChat';
import {colors} from '../theme/smartAquaTheme';
import {useAuth} from '../auth/AuthContext';
const labels:Record<string,string>={'public-data':'Dữ liệu công khai nuôi lươn',dashboard:'Tổng quan',gis:'Bản đồ GIS',reports:'Thống kê & báo cáo',areas:'Vùng nuôi',cooperatives:'Hợp tác xã',farmers:'Hộ nuôi',ponds:'Bể nuôi',cycles:'Vụ nuôi',diaries:'Nhật ký',harvests:'Thu hoạch',ai:'Ứng dụng AI',chat:'Trợ lý AI',image:'Phân tích ảnh',predict:'AI dự báo',portal:'Không gian của tôi',review:'Hỗ trợ',admin:'Quản trị',integration:'Tích hợp dữ liệu'};
export default function Layout(){
 const {role,db,syncStatus,syncError}=useDemo();const {account,logout}=useAuth();const loc=useLocation(),go=useNavigate(),theme=useTheme(),mobile=useMediaQuery(theme.breakpoints.down('md'));
 const compact=useMediaQuery(theme.breakpoints.between('md','lg'));
 const [collapsedPreference,setCollapsed]=useState<boolean|null>(null),[mobileOpen,setMobileOpen]=useState(false),[notificationAnchor,setNotificationAnchor]=useState<null|HTMLElement>(null),[accountAnchor,setAccountAnchor]=useState<null|HTMLElement>(null);
 const collapsed=collapsedPreference??compact;
 const segments=loc.pathname.split('/').filter(Boolean),width=collapsed?sidebarSmallWidth:sidebarWidth;
 const hierarchyTitle=loc.pathname.startsWith('/areas')?(segments[1]==='manage'?'Quản lý vùng nuôi':segments.length>=4?db.farmers.find((item:any)=>item.id===segments[3])?.name:segments.length===2?db.aquacultureAreas.find((item:any)=>item.id===segments[1])?.name:'Vùng nuôi & trang trại'):'';
 const pondTitle=segments[0]==='ponds'&&segments[1]?db.ponds.find((item:any)=>item.id===segments[1])?.name:'';
 const gisMode=loc.pathname.startsWith('/gis');
 const imageAnalysisMode=loc.pathname==='/ai/image';
 const farmerNav=[{label:'Trang chủ',to:'/dashboard',Icon:Home},{label:'Vùng nuôi',to:'/areas',Icon:Layers3},{label:'Bể nuôi',to:'/portal',Icon:Waves}];
 const farmerActive=loc.pathname.startsWith('/areas')?'/areas':loc.pathname.startsWith('/portal')||loc.pathname.startsWith('/ponds')?'/portal':'/dashboard';
 const drawer=<Sidebar mobile={mobile} collapsed={mobile?false:collapsed} onToggle={()=>mobile?setMobileOpen(false):setCollapsed(!collapsed)} onNavigate={()=>setMobileOpen(false)}/>;
  return <Box className={`smart-hybrid-shell${gisMode?' gis-mode':''}${imageAnalysisMode?' image-analysis-shell':''}`} style={{'--sidebar-rail-width':`${mobile?0:width}px`} as React.CSSProperties} sx={{display:'flex',minHeight:gisMode?'unset':'100vh',height:gisMode?'100dvh':'auto',overflow:gisMode?'hidden':undefined,backgroundColor:colors.background}}>
  <Box component="nav" aria-label="Điều hướng chính" sx={{width:mobile?0:width,flexShrink:0,transition:'width .2s'}}>
   {mobile?<Drawer variant="temporary" open={mobileOpen} onClose={()=>setMobileOpen(false)} ModalProps={{keepMounted:true}} PaperProps={{id:'mobile-navigation',sx:{width:'min(344px, calc(100vw - 24px))',height:'100dvh',border:0,borderRadius:'0 20px 20px 0',overflow:'hidden',boxShadow:'12px 0 48px #071c3c40'}}} sx={{'& .MuiBackdrop-root':{backgroundColor:'rgba(7,24,43,.48)',backdropFilter:'blur(3px)'}}}>{drawer}</Drawer>:
    <Drawer variant="permanent" open PaperProps={{sx:{width,border:0,overflow:'hidden',transition:'width .2s',boxShadow:'1px 0 0 #dce5ee'}}}>{drawer}</Drawer>}
  </Box>
  <Box sx={{display:'flex',flex:1,minWidth:0,minHeight:0,height:gisMode?'100%':undefined,overflow:gisMode?'hidden':undefined,flexDirection:'column'}}>
   <AppBar elevation={0} position="sticky" color="inherit" sx={{background:'#FFFFFF',borderBottom:'1px solid '+colors.border,zIndex:theme.zIndex.drawer-1}}>
    <Toolbar sx={{minHeight:{xs:'64px!important',sm:'76px!important'},px:{xs:1.5,sm:3,lg:4},gap:{xs:.5,sm:1.2}}}>
     {mobile&&<IconButton aria-label="Mở điều hướng" aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={()=>setMobileOpen(true)}><MenuIcon size={22}/></IconButton>}
     <Box sx={{display:'flex',alignItems:'center',gap:1,color:colors.muted,flex:1,minWidth:0}}>
      <Typography sx={{fontSize:14,color:colors.muted,whiteSpace:'nowrap',display:{xs:'none',sm:'block'}}}>SmartAqua</Typography><Box sx={{display:{xs:'none',sm:'flex'}}}><ChevronRight size={17}/></Box>
      <Typography sx={{fontSize:{xs:15,sm:16},fontWeight:700,color:colors.ink,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{pondTitle||hierarchyTitle||labels[segments.at(-1)||'dashboard']||'Tổng quan'}</Typography>
     </Box>
     <Chip size="small" icon={<CheckCircle2 size={13} color="#158E73"/>} label="DỮ LIỆU MÔ PHỎNG" sx={{display:{xs:'none',sm:'flex'},height:29,color:'#0D7C68',fontSize:13,fontWeight:650,letterSpacing:0,backgroundColor:'#E9F8F3',px:.5,'& .MuiChip-icon':{marginLeft:1}}}/>
     <Divider orientation="vertical" flexItem sx={{display:{xs:'none',sm:'block'},mx:{xs:0,sm:.7},my:2}}/>
     <IconButton aria-label="Xem thông báo" onClick={e=>setNotificationAnchor(e.currentTarget)} sx={{width:38,height:38}}><Badge color="warning" variant="dot"><Bell size={19}/></Badge></IconButton>
     <Menu anchorEl={notificationAnchor} open={Boolean(notificationAnchor)} onClose={()=>setNotificationAnchor(null)} PaperProps={{sx:{width:320,maxWidth:'90vw',mt:1.3,borderRadius:3,p:1.5}}}>
      <Typography sx={{fontWeight:700,fontSize:16,mb:1}}>Thông báo mô phỏng</Typography>{(db.notifications as any[]).slice(0,4).map(n=><Box key={n.id} sx={{py:1.1,borderBottom:'1px solid #EAF0F6'}}><Typography sx={{fontSize:14,fontWeight:650}}>{n.title}</Typography><Typography sx={{fontSize:13,color:colors.muted}}>{n.body}</Typography></Box>)}
     </Menu>
     <IconButton aria-label="Tài khoản người dùng" aria-haspopup="true" onClick={e=>setAccountAnchor(e.currentTarget)} sx={{p:0.3}}><Avatar sx={{width:39,height:39,bgcolor:'#DEECFB',color:colors.primary,fontWeight:700,fontSize:13}}>{account?.name?.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'SA'}</Avatar></IconButton>
      <Menu anchorEl={accountAnchor} open={Boolean(accountAnchor)} onClose={()=>setAccountAnchor(null)} PaperProps={{sx:{width:260,maxWidth:'90vw',borderRadius:3,p:1}}}>
       <Box sx={{px:1.4,py:1}}><Typography sx={{fontWeight:700,fontSize:14}}>{account?.name}</Typography><Typography sx={{fontSize:12,color:colors.muted}}>{account?.username} · {role}</Typography></Box><Divider/>
       <MenuItem onClick={()=>{setAccountAnchor(null);logout();go('/login',{replace:true});}} sx={{mt:.5,borderRadius:2}}>Đăng xuất</MenuItem>
      </Menu>
    </Toolbar>
   </AppBar>
   <Box sx={{px:{xs:2,md:3,lg:4},py:1,display:'flex',alignItems:'center',gap:1.1,background:'#EAF5FF',borderBottom:'1px solid #DCECF9'}}><Database size={18} color={colors.primary}/><Typography sx={{fontSize:{xs:12.5,sm:13.5},color:'#315879',lineHeight:1.65}}>Môi trường dữ liệu mô phỏng · Số liệu nghiệp vụ và kết quả AI chưa đại diện cho kết quả thực địa.</Typography></Box>
    {syncStatus==='error'&&<Box role="alert" sx={{p:1.5,bgcolor:'#FFF1DB'}}>Thay đổi đang lưu cục bộ. {syncError} <button onClick={()=>store.retrySync()}>Thử đồng bộ lại</button></Box>}<Box component="main" sx={gisMode?{width:'100%',maxWidth:1840,mx:'auto',px:{xs:1.2,sm:1.6,lg:2},pt:{xs:1,md:1.2},pb:0,flex:1,minWidth:0,minHeight:0,display:'flex',flexDirection:'column',overflow:'hidden'}:{width:'100%',maxWidth:1840,mx:'auto',px:{xs:1.8,sm:3,lg:3.6},pt:{xs:2.4,md:3},pb:{xs:role==='farmer'?12:5,md:5},flex:1,minWidth:0}}><Outlet/></Box>
    {!gisMode&&<Box component="footer" sx={{py:2.1,px:{xs:2,lg:4},borderTop:'1px solid '+colors.border,display:'flex',justifyContent:'space-between',gap:2,flexWrap:'wrap'}}><Typography sx={{fontSize:12,color:colors.muted}}>© 2026 SmartAqua · SmartAqua Eel 3.0</Typography><Typography sx={{fontSize:12,color:colors.muted}}>Nuôi lươn Cần Thơ · Hồ sơ mô phỏng</Typography></Box>}
  </Box>
  {role==='farmer'&&<Box sx={{display:{xs:'block',md:'none'},position:'fixed',bottom:0,left:0,right:0,zIndex:theme.zIndex.drawer-2,boxShadow:'0 -3px 18px rgba(14,53,93,.09)',borderTop:'1px solid #DFE8F2',pb:'env(safe-area-inset-bottom)',backgroundColor:'#FFF'}}>
    <BottomNavigation showLabels value={farmerActive} onChange={(_e,to:string)=>go(to)} sx={{height:72,'& .MuiBottomNavigationAction-root':{minWidth:0,padding:'8px 0',color:'#566D83'},'& .Mui-selected':{color:colors.primary},'& .MuiBottomNavigationAction-label':{fontSize:'12px!important',fontWeight:600,mt:.5}}}>
      {farmerNav.map(({label,to,Icon})=><BottomNavigationAction key={to} label={label} value={to} icon={<Icon size={23}/>}/>)}
    </BottomNavigation>
  </Box>}
  <Toaster/>
  <FloatingChat/>
 </Box>
}

