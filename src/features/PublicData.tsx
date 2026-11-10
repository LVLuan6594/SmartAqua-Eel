import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {Alert,Box,Chip,CircularProgress,Stack,Typography} from '@mui/material';
import {Card,PageTitle,SearchBox,Select,Table} from '../components/UI';
import {coverageLabels,metricLabels,qualifierLabels,usePublicEelData} from '../services/repositories/publicEelRepository';

export default function PublicData(){
 const {data,error}=usePublicEelData();const [query,setQuery]=useState(''),[status,setStatus]=useState(''),[commune,setCommune]=useState('');
 if(error)return <Alert severity="error">{error}</Alert>;
 if(!data)return <CircularProgress aria-label="Đang tải nguồn công khai"/>;
 const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
 const rows=data.coverage.filter(c=>(!status||c.status===status)&&normalize(c.communeName+' '+c.communeCode).includes(normalize(query)));
 const observations=data.observations.filter(o=>!commune||o.communeCodes.includes(commune));
 return <>
  <PageTitle kicker="NGUỒN CÔNG KHAI · NUÔI LƯƠN" title="Dữ liệu nuôi lươn — 103 xã/phường Cần Thơ" description={`Tra cứu nguồn, thời điểm và độ phủ. Ngày thu thập: ${data.metadata.retrievedAt}.`}/>
  <Alert severity="info" sx={{mb:2}}>Số liệu báo chí/nghiên cứu giữ nguyên cấp địa bàn và kỳ báo cáo. Hồ sơ hộ, bể và giao dịch ở các phân hệ nghiệp vụ là mô phỏng riêng.</Alert>
  <div className="cards-grid">
   {[['XÃ / PHƯỜNG','103','Danh mục địa bàn hiện tại'],['NGUỒN CÔNG KHAI',String(data.sources.length),'Có đường dẫn truy xuất'],['CÓ BẰNG CHỨNG',String(data.coverage.filter(c=>c.evidence.length).length),'Gồm nguồn hiện tại, lịch sử và cần rà soát'],['CHƯA THẤY TRONG TẬP NGUỒN',String(data.coverage.filter(c=>!c.evidence.length).length),'Không đồng nghĩa không nuôi lươn']].map(([title,value,note])=><Card className="metric" key={title}><div><h4>{title}</h4><strong>{value}</strong><small>{note}</small></div></Card>)}
  </div>
  <Card title="Số liệu công bố và trường hợp được ghi nhận" subtitle="Tồn đọng là lượng chưa bán; không cộng vào sản lượng đã thu hoạch.">
   <div className="filters"><Select value={commune} onChange={setCommune} allLabel="Toàn bộ số liệu (gồm thành phố / vùng cũ)" options={data.coverage.filter(c=>c.observationIds.length).map(c=>({value:c.communeCode,label:c.communeName}))}/></div>
   <div className="two-col">{observations.map(o=>{const source=data.sources.find(s=>s.id===o.sourceId)!;return <Box key={o.id} sx={{border:'1px solid #DFE8F2',borderRadius:2,p:2,mb:1}}><Stack direction="row" gap={1} flexWrap="wrap"><Chip size="small" label={({city:'Toàn thành phố',commune:'Xã/phường',group:'Tổ hợp tác',household_case:'Trường hợp hộ',historical_group:'Tổ hợp tác · địa bàn cũ',historical_household_case:'Hộ · địa bàn cũ',historical_province:'Tỉnh cũ',research_sample:'Mẫu nghiên cứu'} as Record<string,string>)[o.scope]||o.scope}/><Typography fontWeight={700}>{o.period}</Typography></Stack><p>{o.metrics.map((m,i)=><React.Fragment key={i}>{i>0?' · ':''}{metricLabels[m.name]||m.name}: <b>{qualifierLabels[m.qualifier]||''}{m.value.toLocaleString('vi-VN')} {m.unit}</b></React.Fragment>)}</p><Typography variant="body2" color="text.secondary">{o.note}</Typography><a href={source.url} target="_blank" rel="noreferrer">{source.publisher} · {source.publishedAt||'Chưa xác định ngày xuất bản'}</a></Box>;})}</div>
   {!observations.length&&<p>Chưa có số liệu định lượng trong tập nguồn cho địa bàn này.</p>}
  </Card>
  <Box my={2}><Alert severity="warning">Chưa tìm thấy bảng dữ liệu mở đồng nhất về số hộ, diện tích và thu hoạch cho đủ 103 đơn vị. Các ô chưa biết để trống; không chia đều số tổng thành phố xuống xã/phường.</Alert></Box>
  <Card title="Độ phủ theo 103 xã/phường" subtitle="Bằng chứng có hoạt động nuôi lươn không phải danh sách đầy đủ cơ sở đăng ký.">
   <div className="filters"><SearchBox value={query} onChange={setQuery} placeholder="Tên hoặc mã xã/phường"/><Select value={status} onChange={setStatus} allLabel="Tất cả trạng thái" options={Object.entries(coverageLabels).map(([value,label])=>({value,label}))}/><span>{rows.length} / 103 đơn vị</span></div>
   <Table headers={['Mã','Xã/phường','Độ phủ','Số hộ toàn xã','Diện tích toàn xã','Thu hoạch toàn xã','Nguồn / bản đồ']}>{rows.map(c=><tr key={c.communeCode}><td>{c.communeCode}</td><td>{c.communeName}</td><td style={{whiteSpace:'normal'}}>{coverageLabels[c.status]}{c.evidence.map((e,i)=>e.note&&<small key={i} style={{display:'block'}}>{e.note}</small>)}</td><td>Chưa có bảng chuẩn</td><td>Chưa có bảng chuẩn</td><td>Chưa có bảng chuẩn</td><td>{[...new Set(c.evidence.map(e=>e.sourceId))].map(id=>{const s=data.sources.find(s=>s.id===id)!;return <a key={id} href={s.url} target="_blank" rel="noreferrer" style={{display:'block'}}>{s.publisher}</a>;})}<Link to={`/gis?commune=${c.communeCode}`}>Xem ranh giới</Link>{c.observationIds.length>0&&<button className="table-link" onClick={()=>{setCommune(c.communeCode);window.scrollTo({top:0,behavior:'smooth'});}}>Xem số liệu nguồn</button>}</td></tr>)}</Table>
  </Card>
  <Box mt={2}><Card title="Giới hạn dữ liệu">{data.metadata.limitations.map(note=><p key={note}>{note}</p>)}<p>{data.metadata.method}</p></Card></Box>
 </>;
}

