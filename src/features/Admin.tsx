import React,{useEffect,useState} from 'react';
import {ClipboardCheck,History,ShieldCheck,UsersRound} from 'lucide-react';
import {PageTitle,Card,Badge,Table,Empty} from '../components/UI';
import {useDemo,roles} from '../store/demoStore';
import {authService,demoMode} from '../auth/authService';
import UserManagement from './UserManagement';

const catalogues=[['administrativeUnits','Địa bàn'],['species','Loài thủy sản'],['seedSuppliers','Cơ sở giống'],['seedBatches','Lô con giống'],['feedProducts','Thức ăn'],['medicationProducts','Chế phẩm']];
export default function Admin(){
 const {db}=useDemo();const [tab,setTab]=useState('users'),[accounts,setAccounts]=useState(authService.listAccounts());
 useEffect(()=>authService.subscribe(()=>setAccounts(authService.listAccounts())),[]);
 const activeCount=accounts.filter(account=>account.status==='active').length;
 return <>
  <PageTitle kicker="QUẢN TRỊ HỆ THỐNG" title="Quản trị tài khoản & hệ thống" description="Quản lý tài khoản, theo dõi hoạt động và cấu hình dữ liệu trên cùng một màn hình." actions={<Badge tone="amber">{demoMode?'Chế độ DEMO':'Auth API'}</Badge>}/>
  <div className="cards-grid">
   <Card className="metric"><div><h4>TÀI KHOẢN</h4><strong>{accounts.length}</strong><small>{activeCount} đang hoạt động</small></div><div className="metric-icon"><UsersRound size={22}/></div></Card>
   <Card className="metric"><div><h4>VAI TRÒ</h4><strong>{roles.length}</strong><small>Phân quyền theo workspace</small></div><div className="metric-icon blue"><ShieldCheck size={22}/></div></Card>
   <Card className="metric"><div><h4>NHẬT KÝ THAO TÁC</h4><strong>{db.auditLogs.length}</strong><small>Lưu trên thiết bị DEMO</small></div><div className="metric-icon amber"><History size={22}/></div></Card>
   <Card className="metric"><div><h4>YÊU CẦU HỖ TRỢ</h4><strong>{db.supportRequests.length}</strong><small>Đang theo dõi trong hệ thống</small></div><div className="metric-icon purple"><ClipboardCheck size={22}/></div></Card>
  </div>
  <div className="tabline">{[['users','Tài khoản & phân quyền'],['logs','Nhật ký thao tác'],['catalogs','Danh mục dùng chung']].map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>
  {tab==='users'?<UserManagement embedded/>:tab==='logs'?<Card>{db.auditLogs.length?<Table headers={['Thời điểm','Vai trò','Thay đổi dữ liệu']}>{db.auditLogs.map((log:any)=><tr key={log.id}><td>{new Date(log.date).toLocaleString('vi-VN')}</td><td>{log.role}</td><td>{log.description}</td></tr>)}</Table>:<Empty title="Chưa có thao tác được ghi nhận" text="Các hoạt động sẽ xuất hiện tại đây."/>}</Card>:<Card><div className="three-col">{catalogues.map(([key,name])=><div key={key} className="detail-list"><div><small>{name}</small><strong>{Array.isArray(db[key])?db[key].length:0} bản ghi</strong></div></div>)}</div></Card>}
  <div style={{height:14}}/><div className="infobar"><ShieldCheck size={18}/> {demoMode?'Thông tin tài khoản và quyền đang lưu cục bộ để trình diễn; cần Auth API phía máy chủ trước khi dùng với dữ liệu thật.':'Quyền truy cập dữ liệu cần được kiểm tra và thực thi tại máy chủ.'}</div>
 </>;
}
