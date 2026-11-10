import React,{useRef,useState} from 'react';
import {PageTitle,Card,Button,Badge,Confirm,toast,exportText} from '../components/UI';
import {useDemo,store} from '../store/demoStore';
import {dataMode} from '../services/datasetGateway';
export default function Integration(){
 const {db,syncStatus,syncError}=useDemo(),[reset,setReset]=useState(false),fileRef=useRef<HTMLInputElement>(null);
 const importFile=async(file?:File)=>{if(!file)return;try{store.import(JSON.parse(await file.text()));toast('Đã nhập bộ dữ liệu nuôi lươn.');}catch(error){toast(error instanceof Error?error.message:'Tệp không hợp lệ.','error');}finally{if(fileRef.current)fileRef.current.value='';}};
 const resetData=async()=>{await store.reset();setReset(false);if(store.snapshot().syncStatus==='error')toast('Chưa khôi phục được dữ liệu máy chủ.','error');else toast('Đã khôi phục hồ sơ nuôi lươn mô phỏng.');};
 return <><PageTitle kicker="DỮ LIỆU NUÔI LƯƠN" title="Dữ liệu & kết nối" description="Xuất nhập hồ sơ demo có cùng cấu trúc với hợp đồng dữ liệu backend." actions={<Badge tone="blue">Nuôi lươn · Cần Thơ</Badge>}/>
 <div className="three-col"><Card title="Xuất dữ liệu hiện tại"><p>Lưu hồ sơ bể, vụ, nhật ký và thu hoạch hiện tại thành JSON.</p><Button onClick={()=>exportText(store.export(),'SmartAqua_Eel_Export.json')}>Xuất JSON</Button></Card>
 <Card title="Nhập dữ liệu nuôi lươn"><p>Chỉ nhận đúng phiên bản dữ liệu lươn; kiểm tra khóa và các quan hệ. Tệp thay thế bộ hồ sơ hiện tại.</p><input ref={fileRef} type="file" accept=".json,application/json" aria-label="Nhập JSON nuôi lươn" onChange={e=>void importFile(e.target.files?.[0])}/></Card>
 <Card title="Khôi phục bộ mẫu"><p>Khôi phục hồ sơ lươn mô phỏng đi kèm dự án. Các thay đổi hiện tại sẽ mất.</p><Button variant="danger" onClick={()=>setReset(true)}>Khôi phục dữ liệu lươn</Button></Card></div>
 <div style={{height:20}}/><Card title="Trạng thái lưu trữ"><div className="statline"><span>Chế độ</span><b>{dataMode==='mock'?'Demo JSON tại trình duyệt':dataMode==='json-server'?'Demo JSON có máy chủ':'Kết nối API'}</b></div><div className="statline"><span>Đồng bộ</span><b>{{local:'Lưu cục bộ',loading:'Đang tải',saving:'Đang lưu',synced:'Đã đồng bộ',error:'Chưa đồng bộ'}[syncStatus]}</b></div>{syncError&&<p role="alert">{syncError} <Button onClick={()=>store.retrySync()}>Thử lại</Button></p>}<p>Thống kê công khai và đường dẫn nguồn được tra riêng ở mục Dữ liệu công khai; không chuyển số liệu báo chí thành phiếu thu hoạch.</p></Card>
 <div style={{height:20}}/><Card title="Các bảng dữ liệu">{['administrativeUnits','aquacultureAreas','cooperatives','farmers','ponds','farmingCycles','feedDiaries','harvests'].map(key=><div className="statline" key={key}><span>{key}</span><b>{db[key].length}</b></div>)}</Card>
 <Confirm open={reset} title="Khôi phục bộ dữ liệu nuôi lươn?" description="Mọi chỉnh sửa hiện tại sẽ mất. Có thể xuất JSON trước khi tiếp tục." onCancel={()=>setReset(false)} onConfirm={()=>void resetData()}/>
 </>;
}

