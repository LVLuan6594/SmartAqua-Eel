import React,{useEffect,useMemo,useState} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {Plus,Filter,Eye,Pencil,Trash2,MapPin,ShieldAlert} from 'lucide-react';
import {PageTitle,Card,Button,SearchBox,Table,Modal,Confirm,Badge,Empty,toast,Status,Select,NextLink} from '../components/UI';
import {useDemo,store,getLabel} from '../store/demoStore';
import {scoped,canCreate,canWrite,num} from '../domain/selectors';
import {pondImageFor} from '../domain/aquacultureImages';
import {getActiveAccount} from '../auth/authService';
import {createId} from '../utils/createId';
import type {FormField,RecordItem} from '../types/models';
type Cfg={collection:string;title:string;description:string;code:string;fields:(db:any)=>FormField[];headers:string[];render:(db:any,x:RecordItem,go:(s:string)=>void)=>React.ReactNode[]};
const opt=(items:RecordItem[],name='name')=>items.map(x=>({value:x.id,label:x[name]}));
export const configs:Record<string,Cfg>={
 areas:{collection:'aquacultureAreas',title:'Cụm / vùng nuôi lươn',description:'Quản lý vùng nuôi, diện tích, hợp tác xã phụ trách và hồ sơ GIS.',code:'VNU',headers:['Mã vùng','Tên vùng','Địa bàn','Hợp tác xã quản lý','Diện tích (ha)','Trạng thái'],fields:db=>[
 {name:'code',label:'Mã vùng',required:true},{name:'name',label:'Tên vùng nuôi',required:true},
 {name:'unitId',label:'Địa bàn',type:'select',required:true,options:opt(db.administrativeUnits)},
 {name:'coopId',label:'Hợp tác xã',type:'select',required:true,options:opt(db.cooperatives)},
 {name:'areaHa',label:'Diện tích vùng (ha)',type:'number',required:true,min:0.01},
 {name:'lat',label:'Vĩ độ (minh họa)',type:'number',required:true},{name:'lng',label:'Kinh độ (minh họa)',type:'number',required:true}],render:(db,x,go)=>[x.code,<NextLink onClick={()=>go('/gis?entity='+x.id)}>{x.name}</NextLink>,getLabel(db,'administrativeUnits',x.unitId),getLabel(db,'cooperatives',x.coopId),num(x.areaHa,2),<Status status={x.status||'active'}/>]},
 cooperatives:{collection:'cooperatives',title:'Hợp tác xã',description:'Danh sách hợp tác xã và tổ chức quản lý các vùng nuôi.',code:'HTX',headers:['Mã HTX','Tên đơn vị','Địa bàn','Số vùng','Số hộ','Trạng thái'],fields:db=>[
 {name:'code',label:'Mã HTX',required:true},{name:'name',label:'Tên hợp tác xã',required:true},{name:'unitId',label:'Địa bàn',type:'select',required:true,options:opt(db.administrativeUnits)},
 {name:'contact',label:'Thông tin liên hệ'}],render:(db,x,go)=>[x.code,<NextLink onClick={()=>go('/areas')}>{x.name}</NextLink>,getLabel(db,'administrativeUnits',x.unitId),db.aquacultureAreas.filter((a:any)=>a.coopId===x.id).length,db.farmers.filter((a:any)=>a.coopId===x.id).length,<Status status={x.status||'active'}/>]},
 farmers:{collection:'farmers',title:'Hộ nuôi',description:'Hồ sơ hộ nuôi, quan hệ vùng nuôi và các bể đang quản lý.',code:'HO',headers:['Mã hộ','Hộ nuôi','Vùng nuôi','Hợp tác xã','Số bể','Trạng thái'],fields:db=>[
 {name:'code',label:'Mã hộ nuôi',required:true},{name:'name',label:'Tên hộ (dữ liệu mẫu)',required:true},{name:'areaId',label:'Vùng nuôi',type:'select',required:true,options:opt(db.aquacultureAreas)},
 {name:'phone',label:'Thông tin liên hệ (tùy chọn)'}],render:(db,x,go)=>[x.code,<NextLink onClick={()=>go('/ponds?farmer='+x.id)}>{x.name}</NextLink>,getLabel(db,'aquacultureAreas',x.areaId),getLabel(db,'cooperatives',x.coopId),db.ponds.filter((p:any)=>p.farmerId===x.id).length,<Status status={x.status||'active'}/>]},
 ponds:{collection:'ponds',title:'Quản lý bể nuôi',description:'Thông tin bể nuôi, diện tích, vị trí và lịch sử các vụ nuôi.',code:'BE',headers:['Ảnh tham khảo','Mã bể','Tên bể','Hộ nuôi','Vùng nuôi','Diện tích (m²)','Vụ hoạt động'],fields:db=>[
 {name:'code',label:'Mã bể',required:true},{name:'name',label:'Tên bể',required:true},
 {name:'areaId',label:'Vùng nuôi',type:'select',required:true,options:opt(db.aquacultureAreas)},
 {name:'farmerId',label:'Hộ nuôi',type:'select',required:true,options:opt(db.farmers)},
 {name:'areaM2',label:'Diện tích bể (m²)',type:'number',required:true,min:1},
 {name:'lat',label:'Vĩ độ (minh họa)',type:'number',required:true},{name:'lng',label:'Kinh độ (minh họa)',type:'number',required:true}],render:(db,x,go)=>[<img className="pond-table-thumb" src={pondImageFor(x.id)} alt={`Ảnh tham khảo bể ${x.code}`}/>,x.code,<NextLink onClick={()=>go('/ponds/'+x.id)}>{x.name}</NextLink>,getLabel(db,'farmers',x.farmerId),getLabel(db,'aquacultureAreas',x.areaId),num(x.areaM2??x.areaHa*10000,1),db.farmingCycles.filter((c:any)=>c.pondId===x.id&&c.status!=='completed').length]}
};
function GeoRect(lat:number,lng:number,r:number){return {type:'Polygon',coordinates:[[[lng-r,lat-r*.7],[lng+r,lat-r*.7],[lng+r,lat+r*.7],[lng-r,lat+r*.7],[lng-r,lat-r*.7]]]};}
function checkRelations(db:any,collection:string,record:RecordItem):string{
 if(collection==='ponds'&&db.farmers.find((f:any)=>f.id===record.farmerId)?.areaId!==record.areaId)return 'Hộ nuôi phải thuộc vùng nuôi đã chọn.';
 if(collection==='aquacultureAreas'&&db.cooperatives.find((coop:any)=>coop.id===record.coopId)?.unitId!==record.unitId)return 'Hợp tác xã phải thuộc địa bàn đã chọn.';
 if(collection==='aquacultureAreas'&&Number(record.areaHa)<=0)return 'Diện tích vùng phải lớn hơn 0.';
 if(collection==='ponds'&&Number(record.areaHa)<=0)return 'Diện tích bể phải lớn hơn 0.';
 return '';
}
export default function EntityManager({type}:{type:string}){
 const cfg=configs[type],{db,role}=useDemo(),go=useNavigate(),[searchParams,setSearchParams]=useSearchParams();
 const [query,setQuery]=useState(''),[filter,setFilter]=useState(searchParams.get('farmer')||searchParams.get('area')||searchParams.get('unit')||''),[editing,setEditing]=useState<RecordItem|null>(null),[form,setForm]=useState<RecordItem>({id:''}),[deleteTarget,setDeleteTarget]=useState<RecordItem|null>(null);
 const allowed=scoped(db,role,cfg.collection),can=canWrite(role,cfg.collection),canAdd=canCreate(role,cfg.collection);
 const account=getActiveAccount(),allowedAreas=scoped(db,role,'aquacultureAreas'),allowedFarmers=scoped(db,role,'farmers');
 const ownFarmer=role==='farmer'?db.farmers.find((farmer:any)=>farmer.id===account?.farmerId):undefined;
 const managerUnitIds=role==='manager'?account?.unitIds||[]:[];
 const formFields=cfg.fields(db).map(field=>{
  if(role==='manager'&&type==='areas'&&field.name==='unitId')return {...field,options:field.options?.filter(option=>managerUnitIds.includes(option.value))};
  if(role==='manager'&&type==='areas'&&field.name==='coopId')return {...field,options:field.options?.filter(option=>db.cooperatives.find((coop:any)=>coop.id===option.value&&managerUnitIds.includes(coop.unitId)))};
  if(role==='manager'&&type==='farmers'&&field.name==='areaId')return {...field,options:field.options?.filter(option=>allowedAreas.some(area=>area.id===option.value))};
  if(role==='manager'&&type==='ponds'&&field.name==='areaId')return {...field,options:field.options?.filter(option=>allowedAreas.some(area=>area.id===option.value))};
  if(role==='manager'&&type==='ponds'&&field.name==='farmerId')return {...field,options:field.options?.filter(option=>allowedFarmers.some(farmer=>farmer.id===option.value))};
  if(role==='farmer'&&type==='ponds'&&field.name==='farmerId')return {...field,options:ownFarmer?[{value:ownFarmer.id,label:ownFarmer.name}]:[]};
  if(role==='farmer'&&type==='ponds'&&field.name==='areaId')return {...field,options:ownFarmer?field.options?.filter(option=>option.value===ownFarmer.areaId):[]};
  return field;
 });
 const rows=useMemo(()=>allowed.filter(x=>(Object.values(x).join(' ')).toLowerCase().includes(query.toLowerCase())&&(!filter||(type==='ponds'?x.farmerId===filter:type==='farmers'?x.areaId===filter:x.unitId===filter))),[allowed,query,filter,type]);
 const open=(item?:RecordItem)=>{if(item?!can:!canAdd)return;const selectedArea=type==='farmers'?db.aquacultureAreas.find((a:any)=>a.id===searchParams.get('area')):type==='ponds'?db.farmers.find((f:any)=>f.id===(role==='farmer'?account?.farmerId:searchParams.get('farmer')))&&db.aquacultureAreas.find((a:any)=>a.id===db.farmers.find((f:any)=>f.id===(role==='farmer'?account?.farmerId:searchParams.get('farmer')))?.areaId):null;const initial={id:createId('record'),status:'active',lat:10.04,lng:105.77,areaHa:.1,areaM2:20,code:`${cfg.code}-${String(1+(db[cfg.collection] as any[]).length).padStart(3,'0')}`,...(type==='farmers'&&selectedArea?{areaId:selectedArea.id,coopId:selectedArea.coopId,unitId:selectedArea.unitId}:{}),...(type==='ponds'&&role==='farmer'&&ownFarmer?{farmerId:ownFarmer.id,areaId:ownFarmer.areaId}:{}),...(type==='ponds'&&role!=='farmer'&&searchParams.get('farmer')?{farmerId:searchParams.get('farmer'),areaId:selectedArea?.id}:{})};setEditing(item||initial);setForm(item?{...item}:initial)};
 useEffect(()=>{const editId=searchParams.get('edit'),adding=searchParams.get('add')==='1';if(!editId&&!adding)return;if((editId&&!can)||(adding&&!canAdd)){const next=new URLSearchParams(searchParams);next.delete('edit');next.delete('add');setSearchParams(next,{replace:true});return}if(editId){const item=(db[cfg.collection] as RecordItem[]).find(row=>row.id===editId);if(item)open(item)}else open();const next=new URLSearchParams(searchParams);next.delete('edit');next.delete('add');setSearchParams(next,{replace:true})},[searchParams,type,db,cfg,can,canAdd,setSearchParams]);
 const save=()=>{
  const isExisting=(db[cfg.collection] as RecordItem[]).some(x=>x.id===form.id);
  if(isExisting?!can:!canAdd)return toast('Bạn không có quyền thực hiện thao tác này.','error');
  const record={...form};if(type==='ponds'){record.areaM2=Number(record.areaM2);record.areaHa=record.areaM2/10000;record.areaUnit='m2';record.speciesId='SP1';record.source='MOCK_DATA';record.isSynthetic=true;const area=db.aquacultureAreas.find((a:any)=>a.id===record.areaId);record.unitId=area?.unitId;record.communeCode=area?.unitId;}
  if(role==='farmer'&&type==='ponds'){
   if(!ownFarmer)return toast('Tài khoản chưa được liên kết với hồ sơ hộ nuôi. Vui lòng liên hệ quản trị viên.','error');
   record.farmerId=ownFarmer.id;record.areaId=ownFarmer.areaId;
  }
  if(role==='manager'){
   if(type==='areas'&&(!managerUnitIds.includes(String(record.unitId))||!db.cooperatives.some((coop:any)=>coop.id===record.coopId&&coop.unitId===record.unitId)))return toast('Chỉ được tạo vùng nuôi trong địa bàn được phân công và chọn HTX thuộc địa bàn đó.','error');
   if(type==='farmers'&&!allowedAreas.some(area=>area.id===record.areaId))return toast('Chỉ được thêm hộ nuôi trong vùng thuộc địa bàn được phân công.','error');
   if(type==='ponds'&&(!allowedAreas.some(area=>area.id===record.areaId)||!allowedFarmers.some(farmer=>farmer.id===record.farmerId)))return toast('Chỉ được thêm bể trong vùng nuôi và hộ thuộc địa bàn được phân công.','error');
  }
  const fields=cfg.fields(db);for(const f of fields){if(f.required&&(record[f.name]===undefined||record[f.name]===''))return toast(`Vui lòng nhập ${f.label.toLowerCase()}`,'error')}
  const dupe=(db[cfg.collection] as RecordItem[]).some(x=>x.code===record.code&&x.id!==record.id);if(dupe)return toast('Mã hồ sơ đã tồn tại','error');
  const check=checkRelations(db,cfg.collection,record);if(check)return toast(check,'error');
  if(type==='farmers'){const a=db.aquacultureAreas.find((x:any)=>x.id===record.areaId);record.coopId=a?.coopId;record.unitId=a?.unitId}
  if(type==='ponds'||type==='areas'){
   const geoId='gis-'+record.id,feature={id:geoId,entityId:record.id,entityType:type==='areas'?'area':'pond',geometry:GeoRect(Number(record.lat),Number(record.lng),type==='areas'?.0035:.00028),properties:{label:record.name}};
   store.transaction(d=>{const items=d[cfg.collection] as RecordItem[];const i=items.findIndex(x=>x.id===record.id);if(i>=0)items[i]={...record};else items.unshift({...record});const j=d.gisFeatures.findIndex((g:any)=>g.id===geoId);if(j>=0)d.gisFeatures[j]=feature;else d.gisFeatures.push(feature);return d},`Lưu hồ sơ và GIS ${record.code}`);
  }else store.upsert(cfg.collection,{...record});setEditing(null);toast('Đã lưu hồ sơ');
 };
 const doDelete=()=>{
  if(!deleteTarget)return;
  const dependencies=type==='areas'?db.ponds.some((p:any)=>p.areaId===deleteTarget.id)||db.farmers.some((p:any)=>p.areaId===deleteTarget.id):type==='cooperatives'?db.aquacultureAreas.some((a:any)=>a.coopId===deleteTarget.id):type==='farmers'?db.ponds.some((p:any)=>p.farmerId===deleteTarget.id):db.farmingCycles.some((c:any)=>c.pondId===deleteTarget.id);
  if(dependencies){toast('Không thể xóa hồ sơ vì còn dữ liệu liên quan','error');setDeleteTarget(null);return}
  store.transaction(d=>{d[cfg.collection]=d[cfg.collection].filter((x:any)=>x.id!==deleteTarget.id);if(type==='ponds'||type==='areas')d.gisFeatures=d.gisFeatures.filter((g:any)=>g.entityId!==deleteTarget.id);return d},`Xóa ${deleteTarget.code}`);setDeleteTarget(null);toast('Đã xóa hồ sơ');
 };
 if(!cfg)return null;
 return <><PageTitle kicker="DỮ LIỆU CHUYÊN NGÀNH" title={cfg.title} description={cfg.description} actions={canAdd?<Button onClick={()=>open()}><Plus size={17}/> Thêm mới</Button>:<Badge tone="amber">Chỉ xem</Badge>}/>
 <Card><div className="filters"><SearchBox value={query} onChange={setQuery} placeholder="Tìm theo mã, tên, địa bàn..."/><Filter size={15} color="#72919d"/>{type==='ponds'?<Select value={filter} onChange={setFilter} options={opt(allowedFarmers)} allLabel="Tất cả hộ nuôi"/>:type==='farmers'?<Select value={filter} onChange={setFilter} options={opt(allowedAreas)} allLabel="Tất cả vùng nuôi"/>:<Select value={filter} onChange={setFilter} options={opt(scoped(db,role,'administrativeUnits'))} allLabel="Tất cả địa bàn"/>}<Badge tone="blue">{rows.length} hồ sơ</Badge></div>
 {rows.length?<Table headers={[...cfg.headers,'Thao tác']}>{rows.map(x=><tr key={x.id}>{cfg.render(db,x,go).map((cell,i)=><td key={i}>{cell}</td>)}<td><div className="table-actions"><button title="Xem trên GIS" className="icon-button" onClick={()=>go('/gis?entity='+x.id)}><MapPin size={16}/></button>{can&&<><button title="Sửa" className="icon-button" onClick={()=>open(x)}><Pencil size={16}/></button><button title="Xóa" className="icon-button" onClick={()=>setDeleteTarget(x)}><Trash2 size={16}/></button></>}</div></td></tr>)}</Table>:<Empty/>}</Card>
 <Modal title={editing?.code?`Chỉnh sửa ${editing.code}`:`Thêm ${cfg.title.toLowerCase()}`} open={editing!==null} onClose={()=>setEditing(null)} wide><div className="form-grid">{formFields.map(field=><div className="field" key={field.name}><label htmlFor={field.name}>{field.label}{field.required?' *':''}</label>{field.type==='select'?<select id={field.name} value={form[field.name]||''} onChange={e=>setForm(v=>({...v,[field.name]:e.target.value}))} disabled={role==='farmer'&&type==='ponds'&&['areaId','farmerId'].includes(field.name)}><option value="">-- Chọn --</option>{field.options?.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input id={field.name} type={field.type==='number'?'number':'text'} step={field.type==='number'?'any':undefined} value={form[field.name]??''} onChange={e=>setForm(v=>({...v,[field.name]:field.type==='number'&&e.target.value!==''?Number(e.target.value):e.target.value}))}/>}</div>)}</div><div className="infobar" style={{marginTop:15}}><ShieldAlert size={17}/> Số liệu và vị trí là dữ liệu minh họa. Thay đổi chỉ được lưu trong trình duyệt.</div><div className="modal-footer"><Button variant="secondary" onClick={()=>setEditing(null)}>Hủy</Button><Button onClick={save}>Lưu hồ sơ</Button></div></Modal>
 <Confirm open={deleteTarget!==null} title="Xác nhận xóa hồ sơ" description={`Xóa ${deleteTarget?.name||''}? Không thể xóa nếu hồ sơ còn dữ liệu liên quan.`} onCancel={()=>setDeleteTarget(null)} onConfirm={doDelete}/>
 </>
}
