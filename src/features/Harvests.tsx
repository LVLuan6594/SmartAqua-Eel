import React,{useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Plus,PackageCheck,CheckCircle,Waves} from 'lucide-react';
import {Card,Button,Badge,Modal,Select,SearchBox,Table,toast,Empty} from '../components/UI';
import {useDemo} from '../store/demoStore';
import {scoped,canWrite,dateVi,kg,num} from '../domain/selectors';
import {recordHarvest} from '../services/farmingOperationsService';
import {createId} from '../utils/createId';

/** Harvests are always shown inside one authorized pond's profile. */
export default function Harvests({pondId}:{pondId:string}) {
 const {db,role}=useDemo();
 const [params,setParams]=useSearchParams();
 const [cycleFilter,setCycleFilter]=useState(''),[query,setQuery]=useState('');
 const [modal,setModal]=useState(false),[form,setForm]=useState<any>({});
 const [finishConfirm,setFinishConfirm]=useState(false),[discardOpen,setDiscardOpen]=useState(false);
 const [noCycle,setNoCycle]=useState(false);
 const initialForm=useRef(''),autoOpened=useRef(false);
 const pond=scoped(db,role,'ponds').find(item=>item.id===pondId);
 const cycles=scoped(db,role,'farmingCycles').filter(cycle=>pond && cycle.pondId===pond.id);
 const available=cycles.filter(cycle=>['active','harvesting'].includes(cycle.status));
 const can=Boolean(pond) && canWrite(role,'harvests');
 const cycleIds=new Set(cycles.map(cycle=>cycle.id));
 const harvests=scoped(db,role,'harvests').filter(harvest=>cycleIds.has(harvest.cycleId));
 const list=harvests.filter(harvest=>(!cycleFilter||harvest.cycleId===cycleFilter)&&`${harvest.id} ${harvest.date} ${harvest.notes} ${cycles.find(c=>c.id===harvest.cycleId)?.code}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))).sort((a,b)=>b.date.localeCompare(a.date));
 const open=()=>{
  if(!can)return;
  if(!available.length){setNoCycle(true);return;}
  const cycle=available.find(item=>item.id===cycleFilter)||available[0];
  const next={id:createId('harvest'),cycleId:cycle.id,date:new Date().toISOString().slice(0,10),quantityKg:'',notes:'',finishCycle:false};
  initialForm.current=JSON.stringify(next);setForm(next);setModal(true);
 };
 useEffect(()=>{
  if(params.get('add')==='1'&&!autoOpened.current){autoOpened.current=true;open();const next=new URLSearchParams(params);next.delete('add');setParams(next,{replace:true});}
 },[]);
 const requestClose=()=>{if(JSON.stringify(form)!==initialForm.current)setDiscardOpen(true);else setModal(false);};
 const persist=(finish=false)=>{
  if(!can||!available.some(cycle=>cycle.id===form.cycleId)){toast('Vụ thu hoạch phải thuộc bể đang xem và trong phạm vi được giao.','error');return;}
  if(!form.date||!Number.isFinite(Number(form.quantityKg))||Number(form.quantityKg)<=0){toast('Cần nhập ngày và sản lượng thu hoạch hợp lệ.','error');return;}
  try{recordHarvest({...form,quantityKg:Number(form.quantityKg)},finish);setFinishConfirm(false);setModal(false);initialForm.current='';toast('Đã lưu phiếu thu hoạch cho bể nuôi.');}
  catch(error){toast(error instanceof Error?error.message:'Không thể lưu phiếu thu hoạch.','error');}
 };
 const save=()=>{if(form.finishCycle)setFinishConfirm(true);else persist();};
 if(!pond)return <Empty title="Không có quyền xem thu hoạch của bể này" text="Vui lòng chọn một bể trong phạm vi được giao."/>;

 return <div className="pond-harvests">
  <div className="pond-harvest-summary">
   <div><PackageCheck size={20}/><span><small>Đợt thu hoạch</small><strong>{num(harvests.length)}</strong></span></div>
   <div><Waves size={20}/><span><small>Tổng sản lượng bể</small><strong>{kg(harvests.reduce((sum,item)=>sum+item.quantityKg,0))}</strong></span></div>
   <div><CheckCircle size={20}/><span><small>Vụ đã hoàn tất</small><strong>{num(cycles.filter(cycle=>cycle.status==='completed').length)}</strong></span></div>
  </div>
  <Card title="Các đợt thu hoạch của bể" subtitle={`${pond.code} · ${pond.name} · Phiếu thu hoạch gắn với từng vụ của bể này`} action={can?<Button onClick={open}><Plus size={16}/> Ghi thu hoạch</Button>:<Badge>Chỉ xem</Badge>}>
   <div className="filters"><SearchBox value={query} onChange={setQuery} placeholder="Tìm phiếu, vụ hoặc ghi chú…"/><Select value={cycleFilter} onChange={setCycleFilter} ariaLabel="Lọc vụ thu hoạch của bể" options={cycles.map(cycle=>({value:cycle.id,label:cycle.code}))} allLabel="Tất cả vụ của bể"/></div>
   {list.length?<Table headers={['Mã phiếu','Ngày thu','Vụ nuôi','Sản lượng','Ghi chú']}>{list.map(harvest=><tr key={harvest.id}><td><b>{harvest.id.slice(0,16)}</b></td><td>{dateVi(harvest.date)}</td><td>{cycles.find(cycle=>cycle.id===harvest.cycleId)?.code}</td><td><strong>{kg(harvest.quantityKg)}</strong></td><td>{harvest.notes||'—'}</td></tr>)}</Table>:<Empty title="Chưa có phiếu thu hoạch phù hợp" text="Phiếu thu hoạch của bể này sẽ hiển thị tại đây."/>}
  </Card>
  <Modal title="Ghi nhận đợt thu hoạch" open={modal} onClose={requestClose} className="pond-detail-dialog" closeOnBackdrop={false}>
   <div className="form-grid">
    <div className="field full"><label htmlFor="harvest-pond">Bể nuôi</label><input id="harvest-pond" value={`${pond.code} · ${pond.name}`} readOnly/></div>
    <div className="field full"><label>Vụ nuôi đang hoạt động *</label><Select value={form.cycleId||''} onChange={value=>setForm((current:any)=>({...current,cycleId:value}))} ariaLabel="Vụ nuôi thu hoạch" options={available.map(cycle=>({value:cycle.id,label:cycle.code}))}/></div>
    <div className="field"><label htmlFor="harvest-date">Ngày thu hoạch *</label><input id="harvest-date" type="date" value={form.date||''} onChange={event=>setForm((current:any)=>({...current,date:event.target.value}))}/></div>
    <div className="field"><label htmlFor="harvest-quantity">Sản lượng (kg) *</label><input id="harvest-quantity" min="0.1" type="number" step="0.1" value={form.quantityKg||''} onChange={event=>setForm((current:any)=>({...current,quantityKg:event.target.value}))}/></div>
    <div className="field full"><label htmlFor="harvest-notes">Ghi chú</label><textarea id="harvest-notes" value={form.notes||''} onChange={event=>setForm((current:any)=>({...current,notes:event.target.value}))}/></div>
   </div>
   <label className="field full harvest-finish-choice"><span><input type="checkbox" checked={Boolean(form.finishCycle)} onChange={event=>setForm((current:any)=>({...current,finishCycle:event.target.checked}))}/> Kết thúc vụ sau đợt thu hoạch này</span></label>
   <div className="infobar" style={{marginTop:17}}><PackageCheck size={17}/> Có thể ghi nhiều đợt cho một vụ. Chỉ chọn kết thúc vụ khi đã thu hoạch xong.</div>
   <div className="modal-footer"><Button variant="secondary" onClick={requestClose}>Hủy</Button><Button onClick={save}>Xác nhận thu hoạch</Button></div>
  </Modal>
  <Modal title="Bạn có thay đổi chưa được lưu" open={discardOpen} onClose={()=>setDiscardOpen(false)} className="pond-detail-dialog" closeOnBackdrop={false}><p>Bạn có chắc muốn đóng biểu mẫu và bỏ các thay đổi?</p><div className="modal-footer"><Button variant="secondary" onClick={()=>setDiscardOpen(false)}>Tiếp tục chỉnh sửa</Button><Button variant="danger" onClick={()=>{setDiscardOpen(false);setModal(false);}}>Bỏ thay đổi</Button></div></Modal>
  <Modal title="Xác nhận kết thúc vụ nuôi" open={finishConfirm} onClose={()=>setFinishConfirm(false)} className="pond-detail-dialog" closeOnBackdrop={false}><p>Lưu đợt thu hoạch này và kết thúc vụ nuôi của {pond.name}?</p><div className="modal-footer"><Button variant="secondary" onClick={()=>setFinishConfirm(false)}>Hủy</Button><Button onClick={()=>persist(true)}>Xác nhận kết thúc vụ</Button></div></Modal>
  <Modal title="Chưa có vụ nuôi để thu hoạch" open={noCycle} onClose={()=>setNoCycle(false)} className="pond-detail-dialog"><p>Bể nuôi này chưa có vụ đang nuôi hoặc đang thu hoạch. Vui lòng bắt đầu vụ nuôi trước khi ghi nhận sản lượng.</p><div className="modal-footer"><Button onClick={()=>setNoCycle(false)}>Đã hiểu</Button></div></Modal>
 </div>;
}

