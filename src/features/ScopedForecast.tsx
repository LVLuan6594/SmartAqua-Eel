import React,{useEffect,useMemo,useState} from 'react';
import {Bar,CartesianGrid,ComposedChart,Legend,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {BrainCircuit,RefreshCw,TrendingUp} from 'lucide-react';
import {Badge,Button,Card,Empty,Select,Table} from '../components/UI';
import {useDemo} from '../store/demoStore';
import {dateVi,kg,num} from '../domain/selectors';
import {aiService} from '../ai/aiAdapters';
import {forecastScopeContext} from '../ai/scopedForecast';
import type {ForecastScope,GrowthPredictionResponse,ProductionForecastResponse,RecordItem} from '../types/models';
import './scoped-forecast.css';

export default function ScopedForecast({scope}:{scope:ForecastScope}){
 const {db,role}=useDemo();
 const [scenario,setScenario]=useState(()=>db.aiPredictionScenarios[0]?.id||'');
 const [result,setResult]=useState<ProductionForecastResponse|null>(null),[growth,setGrowth]=useState<GrowthPredictionResponse|null>(null);
 const [cycleId,setCycleId]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 const context=useMemo(()=>forecastScopeContext(db,role,scope),[db,role,scope.kind,scope.id]);
 const label={area:'vùng nuôi',farmer:'hộ nuôi',pond:'bể nuôi'}[scope.kind];
 const openCycles=context?.cycles.filter(cycle=>['active','harvesting'].includes(cycle.status))||[];
 const growthCycle=openCycles.find(cycle=>cycle.id===cycleId)||openCycles[0];
 useEffect(()=>{
  let live=true;setResult(null);setError('');setPending(true);
  if(!context||!scenario){setPending(false);return()=>{live=false;};}
  aiService.forecastProduction({scope:{...scope},scenarioId:scenario}).then(response=>{
   if(response.scope?.id!==scope.id||response.scope?.kind!==scope.kind)throw new Error('Dịch vụ trả dự báo không đúng hồ sơ đang xem.');
   if(live)setResult(response);
  }).catch(issue=>{if(live)setError(issue instanceof Error?issue.message:'Không tạo được dự báo.');}).finally(()=>{if(live)setPending(false);});
  return()=>{live=false;};
 },[db,role,scope.kind,scope.id,scenario,refresh]);
 useEffect(()=>{
  let live=true;setGrowth(null);
  if(scope.kind==='pond'&&growthCycle?.id&&scenario)aiService.predictGrowth({cycleId:growthCycle.id,scenarioId:scenario,scope:{...scope}}).then(response=>{if(live)setGrowth(response);}).catch(()=>{});
  return()=>{live=false;};
 },[db,role,scope.kind,scope.id,growthCycle?.id,scenario,refresh]);
 if(!context)return <Card><Empty title="Không có hồ sơ dự báo trong phạm vi được giao" text="Chọn một vùng, hộ hoặc bể mà bạn có quyền xem."/></Card>;

 return <section className="scoped-forecast" aria-label={`Dự báo sản lượng của ${label}`}>
  <Card className="forecast-intro" title={`Dự báo sản lượng của ${label}`} subtitle={context.entity.name} action={<Badge tone="purple"><BrainCircuit size={14}/> Mô phỏng</Badge>}>
   <div className="forecast-toolbar"><label>Kịch bản <Select value={scenario} onChange={setScenario} ariaLabel="Kịch bản dự báo" options={db.aiPredictionScenarios.map((item:RecordItem)=>({value:item.id,label:item.name}))}/></label><Button variant="secondary" disabled={pending||!scenario} onClick={()=>setRefresh(value=>value+1)}><RefreshCw size={15}/> {pending?'Đang tính…':'Cập nhật dự báo'}</Button></div>
   <p className="forecast-scope-note">Phạm vi cố định: <strong>{context.entity.code}</strong> · {context.farmers.length} hộ · {context.ponds.length} bể. Chỉ dùng các vụ và phiếu thu hoạch thuộc hồ sơ này.</p>
  </Card>
  {!scenario&&<Card><Empty title="Chưa cấu hình kịch bản dự báo" text="Bổ sung kịch bản mô phỏng để sử dụng chức năng này."/></Card>}
  {pending&&<div className="forecast-loading" role="status"><TrendingUp size={20}/> Đang tổng hợp dữ liệu của {label}…</div>}
  {error&&<div className="infobar amber" role="alert">{error}</div>}
  {result&&<>
   <div className="forecast-metrics">
    <div className="is-emphasis"><span>Phần còn lại dự kiến</span><strong>{result.totals.remainingKg===null?'Chưa đủ dữ liệu':kg(result.totals.remainingKg)}</strong><small>{result.counts.forecastableCycleCount}/{result.counts.activeCycleCount} vụ đang hoạt động đủ đầu vào</small></div>
    <div><span>Khoảng theo kịch bản</span><strong>{result.totals.lowerKg===null?'—':`${num(result.totals.lowerKg,1)}–${num(result.totals.upperKg??0,1)} kg`}</strong><small>Dải giả định, chưa phải độ tin cậy thống kê</small></div>
    <div><span>Đã thu được ghi nhận</span><strong>{kg(result.totals.recordedKg)}</strong><small>Lũy kế trong phạm vi, đến {dateVi(result.asOf)}</small></div>
   </div>
   <div className="forecast-assumptions"><strong>Giả định mô phỏng</strong><span>Tỷ lệ sống {num(result.assumptions.survivalRatePercent)}%</span><span>Cỡ thu {num(result.assumptions.targetWeightGrams)} g/con</span><span>Hệ số kịch bản ×{num(result.assumptions.multiplier,2)}</span><p>Phần còn lại = số lượng thả × tỷ lệ sống giả định × cỡ thu giả định × hệ số kịch bản − lượng đã thu của vụ; tối thiểu bằng 0. Đây là kịch bản trình diễn, chưa phải mô hình đã huấn luyện.</p></div>
   {!result.counts.activeCycleCount?<Card><Empty title="Chưa có vụ đang nuôi để dự báo" text="Vụ hoàn tất hoặc đang chuẩn bị không tạo thêm sản lượng dự kiến."/></Card>:<>
    {result.counts.forecastableCycleCount<result.counts.activeCycleCount&&<div className="infobar amber">Có {result.counts.activeCycleCount-result.counts.forecastableCycleCount} vụ thiếu số lượng thả hoặc mốc thu hoạch. Tổng dự kiến chỉ cộng các vụ đủ dữ liệu.</div>}
    <Card title="Đã thu và phần còn lại theo tháng" subtitle="Các tháng gồm cả năm để phân biệt lịch thu hoạch giữa các vụ">
     <div className="chart-box"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={result.points}><CartesianGrid vertical={false} stroke="#e9eff3"/><XAxis dataKey="period" tick={{fontSize:10}} tickFormatter={value=>`${value.slice(5)}/${value.slice(0,4)}`}/><YAxis width={65} tick={{fontSize:10}}/><Tooltip formatter={(value:number)=>`${num(value,1)} kg`}/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="actual" name="Đã thu ghi nhận" fill="#4d92bf" radius={[4,4,0,0]}/><Bar dataKey="forecast" name="Còn lại dự kiến" fill="#27a196" radius={[4,4,0,0]}/><Line dataKey="low" name="Kịch bản thấp" stroke="#a5c9c5" strokeDasharray="4 4" dot={{r:2}}/><Line dataKey="high" name="Kịch bản cao" stroke="#d5a251" strokeDasharray="4 4" dot={{r:2}}/></ComposedChart></ResponsiveContainer></div>
    </Card>
    <Card title="Chi tiết dự báo theo bể và vụ" subtitle="Các đợt đã thu được trừ đúng một lần; vụ quá mốc dự kiến được đánh dấu để rà soát">
     <Table headers={['Bể / vụ','Hộ nuôi','Mốc thu dự kiến','Đã thu của vụ','Còn lại dự kiến','Ghi chú']}>{result.cycles.map(row=><tr key={row.cycleId}><td><strong>{row.pondName}</strong><br/><small>{row.cycleCode}</small></td><td>{row.farmerName}</td><td>{dateVi(row.expectedHarvestDate||undefined)}{row.overdue&&<><br/><Badge tone="amber">Quá mốc dự kiến</Badge></>}</td><td>{kg(row.recordedKg)}</td><td><strong>{row.remainingKg===null?'Thiếu đầu vào':kg(row.remainingKg)}</strong></td><td>{row.note||'Theo kịch bản đang chọn'}</td></tr>)}</Table>
    </Card>
   </>}
  </>}
  {scope.kind==='pond'&&growthCycle&&<Card title="Tăng trưởng minh họa của vụ" subtitle="Khối lượng theo ngày nuôi, dùng cùng kịch bản đang chọn" action={<Select value={growthCycle.id} onChange={setCycleId} ariaLabel="Vụ dự báo tăng trưởng" options={openCycles.map(cycle=>({value:cycle.id,label:cycle.code}))}/>}>
   {growth?<><div className="chart-box short"><ResponsiveContainer width="100%" height="100%"><LineChart data={growth.points}><CartesianGrid vertical={false} stroke="#edf2f4"/><XAxis dataKey="day" tick={{fontSize:10}}/><YAxis width={55} tick={{fontSize:10}}/><Tooltip formatter={(value:number)=>`${num(value,1)} g/con`}/><Legend wrapperStyle={{fontSize:11}}/><Line dataKey="estimate" name="Khối lượng mô phỏng" stroke="#208f97" strokeWidth={2} dot={false}/><Line dataKey="lower" name="Kịch bản thấp" stroke="#b6d4d1" strokeDasharray="4 4" dot={false}/><Line dataKey="upper" name="Kịch bản cao" stroke="#d8b16b" strokeDasharray="4 4" dot={false}/></LineChart></ResponsiveContainer></div><p className="help-text">{growth.notice}</p></>:<p className="help-text">Chưa có kết quả tăng trưởng cho vụ này.</p>}
  </Card>}
 </section>;
}
