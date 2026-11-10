import React from 'react';
import {Box,Card,CardContent,Typography,Button,Chip,Grid,Stack} from '@mui/material';
import {useNavigate} from 'react-router-dom';
import {MapPinned,Waves,ChartNoAxesCombined,ShieldAlert,BrainCircuit,UsersRound,ArrowUpRight} from 'lucide-react';
import {useState} from 'react';
import {useDemo} from '../store/demoStore';
import {metrics,num} from '../domain/selectors';
import {useDataSummary} from '../services/repositories/useDataAccess';
import {SOURCE_FILTERS,type SourceFilterId} from '../domain/scope';
import {DATA_SOURCE_LABELS} from '../domain/sources';
const modules=[
 {title:'Quy mô nuôi trồng',sub:'Vùng nuôi · HTX · Hộ nuôi',icon:MapPinned,path:'/areas',tone:'#1F5CA9'},
 {title:'Tình hình sản xuất',sub:'Bể nuôi · Vụ đang hoạt động',icon:Waves,path:'/cycles',tone:'#008FAE'},
 {title:'Sản lượng thu hoạch',sub:'Sản lượng · Xu hướng',icon:ChartNoAxesCombined,path:'/reports',tone:'#3864BD'},
 {title:'Không gian GIS',sub:'Phân bố vùng nuôi và bể nuôi',icon:MapPinned,path:'/gis',tone:'#158B83'},
 {title:'Giám sát & cảnh báo',sub:'Nhật ký · Tình trạng cập nhật',icon:ShieldAlert,path:'/diaries',tone:'#B27A24'},
 {title:'Dự báo theo hồ sơ',sub:'Chọn vùng · Hộ · Bể nuôi',icon:BrainCircuit,path:'/areas',tone:'#7655B6'}
];
export default function IOCDashboard(){
 const {db,role}=useDemo();const go=useNavigate();const m=metrics(db,role,{});
 const [source,setSource]=useState<SourceFilterId>('all');const {summary}=useDataSummary(source);
 const values=[`${num(m.areas)} vùng`,`${num(m.active)} vụ`,`${num(m.harvestKg/1000,1)} tấn`,'Mở bản đồ',`${num(db.feedDiaries.length)} nhật ký`,'AI phân tích'];
 const unified=[['Xã / phường',num(summary?.administrativeUnits)],['Vùng nuôi',num(summary?.zones)],['Cơ sở / hộ',num(summary?.facilities)],['Bể nuôi',num(summary?.ponds)],['Vụ nuôi',num(summary?.cycles)],['Cơ sở có toạ độ',num(summary?.facilitiesWithCoordinates)]];
 return <Box sx={{maxWidth:1500,mx:'auto'}}>
 <Box sx={{background:'linear-gradient(112deg,#113961,#1F5CA9)',borderRadius:4,color:'white',p:{xs:3,md:4},mb:3}}>
 <Typography sx={{fontSize:{xs:13,md:14},fontWeight:650,letterSpacing:.4,color:'#9DE8FF'}}>SMARTAQUA / TRUNG TÂM ĐIỀU HÀNH</Typography>
 <Typography variant="h4" sx={{mt:1,color:'white'}}>Bức tranh toàn ngành thủy sản</Typography>
 <Typography sx={{mt:1,opacity:.84,fontSize:{xs:15,md:16},lineHeight:1.7}}>Dữ liệu tổng hợp theo địa bàn, vùng nuôi và hoạt động sản xuất · Bản trình diễn</Typography>
 <Stack direction="row" spacing={1} sx={{mt:2.5}}><Chip label="IOC Dashboard" sx={{bgcolor:'#FFFFFF20',color:'white'}}/><Chip label="DỮ LIỆU MÔ PHỎNG" sx={{bgcolor:'#FFFFFF20',color:'white'}}/></Stack>
 </Box>
 <Stack direction={{xs:'column',md:'row'}} justifyContent="space-between" alignItems={{xs:'flex-start',md:'center'}} sx={{mb:2.5}} spacing={1}>
 <Box><Typography variant="h5">Tổng quan theo cụm điều hành</Typography><Typography color="text.secondary" fontSize={15}>Chọn từng cụm để mở màn hình phân tích chuyên đề.</Typography></Box>
 <Button variant="outlined" startIcon={<MapPinned size={17}/>} onClick={()=>go('/gis')}>Xem bản đồ GIS</Button>
 </Stack>
 <Grid container spacing={{xs:1.7,md:2.3}}>{modules.map((mod,i)=>{const Icon=mod.icon;return <Grid item xs={12} sm={6} lg={4} key={mod.title}><Card onClick={()=>go(mod.path)} tabIndex={0} role="link" onKeyDown={e=>{if(e.key==='Enter')go(mod.path)}} sx={{height:'100%',minHeight:{xs:196,md:236},cursor:'pointer',transition:'transform .2s,box-shadow .2s,border-color .2s','&:hover':{transform:'translateY(-4px)',boxShadow:'0 14px 32px #1F5CA920',borderColor:'#AFCDEA'}}}><CardContent sx={{p:{xs:2.5,md:3},'&:last-child':{pb:3}}}>
 <Stack direction="row" justifyContent="space-between" alignItems="center"><Box sx={{p:1.25,borderRadius:2.5,bgcolor:mod.tone+'15',color:mod.tone,display:'flex'}}><Icon size={23}/></Box><ArrowUpRight size={19} color="#8799AE"/></Stack>
 <Typography sx={{mt:2,fontWeight:700,fontSize:{xs:18,md:19}}}>{mod.title}</Typography><Typography sx={{mt:.4,fontSize:14,lineHeight:1.6,color:'text.secondary'}}>{mod.sub}</Typography>
 <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{mt:2.2}}><Typography sx={{fontSize:{xs:26,md:32},fontWeight:700}}>{values[i]}</Typography><Typography fontSize={14} fontWeight={600} color="primary">Chi tiết →</Typography></Stack>
 </CardContent></Card></Grid>})}</Grid>
 <Card sx={{mt:3,borderRadius:3}}><CardContent>
 <Stack direction={{xs:'column',md:'row'}} justifyContent="space-between" alignItems={{xs:'flex-start',md:'center'}} spacing={1}>
 <Box><Typography variant="h6">Dữ liệu liên thông toàn ngành</Typography><Typography color="text.secondary" fontSize={14}>Tổng hợp đa nguồn: xã/phường → vùng nuôi → cơ sở → bể → vụ nuôi. Mỗi bản ghi giữ nhãn nguồn và tình trạng xác minh.</Typography></Box>
 <Stack direction="row" spacing={1} sx={{flexWrap:'wrap',gap:1}}>{SOURCE_FILTERS.map(f=><Chip key={f.id} label={f.label} onClick={()=>setSource(f.id)} color={source===f.id?'primary':'default'} variant={source===f.id?'filled':'outlined'}/>)}</Stack>
 </Stack>
 <Grid container spacing={2} sx={{mt:1}}>{unified.map(([label,value])=><Grid item xs={6} sm={4} md={2} key={label}><Typography fontSize={13} color="text.secondary">{label}</Typography><Typography fontSize={24} fontWeight={700}>{value}</Typography></Grid>)}</Grid>
 {summary?.sources?.length?<Typography sx={{mt:1.5}} fontSize={13} color="text.secondary">Nguồn trong tập kết quả: {summary.sources.map(s=>DATA_SOURCE_LABELS[s]).join(' · ')}</Typography>:null}
 </CardContent></Card>
 <Box sx={{mt:3,p:2.5,bgcolor:'#EAF3FE',border:'1px solid #D8E9FA',borderRadius:3,display:'flex',alignItems:'flex-start',gap:1.5}}><UsersRound color="#1F5CA9" size={21}/><Typography sx={{fontSize:14,color:'#315879'}}>Các chỉ số được tổng hợp từ dữ liệu mô phỏng hiện có. Đây là bản xem trước giao diện IOC dành cho lãnh đạo địa phương.</Typography></Box>
 </Box>;
}
