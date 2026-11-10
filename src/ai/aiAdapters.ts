import type {AIService,ChatRequest,ImageAnalysisRequest,GrowthPredictionRequest,ProductionForecastRequest} from '../types/models';
import {mockAIService} from './mockAIService';
class ApiAIService implements AIService{
 private base=(import.meta.env.VITE_API_BASE_URL||'/api').replace(/\/$/,'');
 private async call<T>(path:string,body:any):Promise<T>{const res=await fetch(`${this.base}/ai/${path}`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!res.ok)throw Error(`Dịch vụ AI HTTP ${res.status}`);return res.json()}
 chat(r:ChatRequest){return this.call<Awaited<ReturnType<AIService['chat']>>>('chat',r)}
 analyzeImage(r:ImageAnalysisRequest){return this.call<Awaited<ReturnType<AIService['analyzeImage']>>>('image-analysis',r)}
 predictGrowth(r:GrowthPredictionRequest){return this.call<Awaited<ReturnType<AIService['predictGrowth']>>>('growth',r)}
 forecastProduction(r:ProductionForecastRequest){return this.call<Awaited<ReturnType<AIService['forecastProduction']>>>('production',r)}
}
export const aiService:AIService=(import.meta.env.VITE_AI_MODE||'mock')==='api'?new ApiAIService():mockAIService;
