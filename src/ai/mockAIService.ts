import {store} from '../store/demoStore';
import {daysSince} from '../domain/selectors';
import {scoped} from '../domain/selectors';
import {forecastScopeContext,scopedProductionForecast} from './scopedForecast';
import type {AIService,ChatRequest,ChatResponse,ImageAnalysisRequest,ImageAnalysisResponse,GrowthPredictionRequest,GrowthPredictionResponse,ProductionForecastRequest,ProductionForecastResponse} from '../types/models';
const db=()=>store.snapshot().db;
const normalize=(text:string)=>text.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
export const mockAIService:AIService={
 async chat(request:ChatRequest):Promise<ChatResponse>{
  const q=normalize(request.question),items=db().aiKnowledgeBase as any[];
  const matches=items.map(k=>({k,score:(k.keywords as string[]).reduce((score,w)=>score+(q.includes(normalize(w))?2:0),0)+(request.speciesId&&db().species.find((s:any)=>s.id===request.speciesId)?.name===k.species?1:0)})).sort((a,b)=>b.score-a.score);
  const top=matches[0];if(!top||top.score<=0)return {answer:'Tôi chưa tìm thấy nội dung phù hợp trong kho tri thức SmartAqua. Vui lòng mô tả cụ thể hơn hoặc gửi yêu cầu tới chuyên gia thủy sản.',matched:false,isMock:true};
  return {answer:top.k.answer,reference:`${top.k.topic} · ${top.k.source}`,matched:true,isMock:true};
 },
 async analyzeImage(request:ImageAnalysisRequest):Promise<ImageAnalysisResponse>{
  const item=db().aiImageScenarios.find((x:any)=>x.id===request.scenarioId);
  if(!item)return {summary:'Đã tiếp nhận hình ảnh',details:'Chưa kết nối mô hình thị giác máy tính. Hệ thống không phân tích nội dung ảnh tải lên. Vui lòng nhờ chuyên gia kiểm tra.',scenario:false,isMock:true};
  return {summary:item.observation,details:item.assessment,scenario:true,isMock:true};
 },
 async predictGrowth(request:GrowthPredictionRequest):Promise<GrowthPredictionResponse>{
  const allowed=request.scope?forecastScopeContext(db(),store.snapshot().role,request.scope)?.cycles||[]:scoped(db(),store.snapshot().role,'farmingCycles');
  const c=allowed.find((x:any)=>x.id===request.cycleId),s=db().species.find((x:any)=>x.id===c?.speciesId),scenario=db().aiPredictionScenarios.find((x:any)=>x.id===request.scenarioId)||db().aiPredictionScenarios[0];
  if(!c||!s)throw Error('Chưa chọn vụ nuôi hợp lệ');
  const observed=db().growthObservations.filter((o:any)=>o.cycleId===c.id), age=daysSince(c.stockingDate);const feed=db().feedDiaries.filter((f:any)=>f.cycleId===c.id);
  const base=(Number(s.targetWeightGrams||200)/Number(s.typicalDays||300))*scenario.multiplier;
  const pts=Array.from({length:12},(_,i)=>{const day=Math.round(i*(s.typicalDays/11)),estimate=+(Math.max(1,day*base)).toFixed(1);return {day,estimate,lower:+(estimate*(1-scenario.uncertainty)).toFixed(1),upper:+(estimate*(1+scenario.uncertainty)).toFixed(1)}});
  return {points:pts,harvestDate:c.expectedHarvestDate,notice:`Kịch bản mô phỏng dựa trên ${feed.length} ngày ghi thức ăn và ${observed.length} quan sát mẫu; tuổi vụ ${age} ngày. Không phải mô hình tăng trưởng đã huấn luyện.`,isMock:true};
 },
 async forecastProduction(request:ProductionForecastRequest):Promise<ProductionForecastResponse>{
  return scopedProductionForecast(db(),store.snapshot().role,request);
 }
};
