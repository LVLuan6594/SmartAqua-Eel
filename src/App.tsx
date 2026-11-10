import React,{useEffect} from 'react';
import {Navigate,Route,Routes,Outlet,useLocation,useParams} from 'react-router-dom';
import {Alert,Box,CircularProgress,Button} from '@mui/material';
import Layout from './app/Layout';
import Dashboard from './features/Dashboard';
import IOCDashboard from './features/IOCDashboard';
import {useDemo} from './store/demoStore';
import EntityManager from './features/EntityManager';
import AreaHierarchy from './features/AreaHierarchy';
import GisWorkspace from './features/gis/GisWorkspace';
import PondDetail from './features/PondDetail';
import Cycles from './features/Cycles';
import Diaries from './features/Diaries';
import Reports from './features/Reports';
import Portal from './features/Portal';
import Admin from './features/Admin';
import Review from './features/Review';
import Integration from './features/Integration';
import {AIChat,AIImage} from './features/AI';
import ForecastRedirect from './features/ForecastRedirect';
import PublicData from './features/PublicData';
import Login from './auth/Login';
import {AuthProvider,useAuth} from './auth/AuthContext';
import {permissionFor,roleHome} from './auth/authService';
import UserManagement from './features/UserManagement';
import {store} from './store/demoStore';
import {pondScope} from './domain/selectors';
function RoleDashboard(){const {role}=useDemo();return role==='manager'?<IOCDashboard/>:role==='farmer'?<Portal/>:<Dashboard/>}
function HarvestRedirect(){const {db,role}=useDemo();const location=useLocation();const params=new URLSearchParams(location.search);const pond=params.get('pond');return <Navigate replace to={pond&&pondScope(db,role).some(item=>item.id===pond)?`/ponds/${pond}?tab=harvests${params.get('add')==='1'?'&add=1':''}`:'/areas'}/>;}
function Protected(){const {account,ready}=useAuth();const location=useLocation();useEffect(()=>{if(account)store.setRole(account.role);},[account]);if(!ready)return <Box sx={{height:'100dvh',display:'grid',placeItems:'center'}}><CircularProgress/></Box>;return account?<Outlet/>:<Navigate to="/login" replace state={{from:location.pathname+location.search}}/>;}
function Access({module,children}:{module:string;children:React.ReactNode}){const {account}=useAuth();if(!account||!permissionFor(account.role,module))return <Box sx={{maxWidth:700,mx:'auto',mt:5}}><Alert severity="error" sx={{mb:2}}>403 · Tài khoản hiện tại không có quyền truy cập chức năng này.</Alert><Button href={roleHome(account?.role||'manager')} variant="contained">Quay về trang làm việc</Button></Box>;return <>{children}</>;}
function PondAccess({children}:{children:React.ReactNode}){const {role,db}=useDemo();const {account}=useAuth();const {id}=useParams();const allowed=pondScope(db,role).some(pond=>pond.id===id);return allowed?<>{children}</>:<Box sx={{maxWidth:700,mx:'auto',mt:5}}><Alert severity="error" sx={{mb:2}}>403 · Bể nuôi này nằm ngoài phạm vi được giao.</Alert><Button href={roleHome(account?.role||'manager')} variant="contained">Quay về trang làm việc</Button></Box>;}
export default function App(){return <AuthProvider><Routes><Route path="/login" element={<Login/>}/><Route element={<Protected/>}><Route path="/" element={<Layout/>}><Route index element={<Navigate to="/dashboard" replace/>}/><Route path="dashboard" element={<Access module="dashboard"><RoleDashboard/></Access>}/><Route path="public-data" element={<Access module="gis"><PublicData/></Access>}/><Route path="gis" element={<Access module="gis"><GisWorkspace/></Access>}/><Route path="areas" element={<Access module="areas"><AreaHierarchy/></Access>}/><Route path="areas/manage" element={<Access module="areas"><EntityManager type="areas"/></Access>}/><Route path="areas/:areaId" element={<Access module="areas"><AreaHierarchy/></Access>}/><Route path="areas/:areaId/farms/:farmId" element={<Access module="areas"><AreaHierarchy/></Access>}/><Route path="cooperatives" element={<Access module="cooperatives"><EntityManager type="cooperatives"/></Access>}/><Route path="farmers" element={<Access module="farmers"><EntityManager type="farmers"/></Access>}/><Route path="ponds" element={<Access module="ponds"><EntityManager type="ponds"/></Access>}/><Route path="ponds/:id" element={<Access module="ponds"><PondAccess><PondDetail/></PondAccess></Access>}/><Route path="cycles" element={<Access module="cycles"><Cycles/></Access>}/><Route path="diaries" element={<Access module="diaries"><Diaries/></Access>}/><Route path="harvests" element={<Access module="harvests"><HarvestRedirect/></Access>}/><Route path="reports" element={<Access module="reports"><Reports/></Access>}/><Route path="portal" element={<Access module="portal"><Portal/></Access>}/><Route path="review" element={<Access module="review"><Review/></Access>}/><Route path="admin" element={<Access module="admin"><Admin/></Access>}/><Route path="admin/users" element={<Navigate to="/admin" replace/>}/><Route path="integration" element={<Access module="admin"><Integration/></Access>}/><Route path="ai/chat" element={<Access module="ai"><AIChat/></Access>}/><Route path="ai/image" element={<Access module="ai"><AIImage/></Access>}/><Route path="ai/predict" element={<Access module="ai"><ForecastRedirect/></Access>}/><Route path="*" element={<Navigate to="/dashboard" replace/>}/></Route></Route></Routes></AuthProvider>}

