export type Role = 'admin'|'manager'|'coop'|'farmer';
export interface RecordItem { id:string; [key:string]:any }
export interface DemoDB { metadata: { title:string; version:string; asOf:string; isSynthetic:boolean; note:string; datasetId?:string; speciesScope?:string; schemaVersion?:number }; [key:string]:any }
export type Collection = 'aquacultureAreas'|'cooperatives'|'farmers'|'ponds'|'farmingCycles'|'feedDiaries'|'medicationDiaries'|'environmentObservations'|'growthObservations'|'healthEvents'|'harvests'|'supportRequests'|'reviewRequests'|'gisFeatures'|'users'|'notifications';
export type ItemMap = Record<string,any>;
export interface FormField {name:string;label:string;type?:'text'|'number'|'date'|'select'|'textarea';required?:boolean;options?:{value:string;label:string}[];placeholder?:string;min?:number}
export interface ChatRequest {question:string;speciesId?:string;cycleId?:string}
export interface ChatResponse {answer:string;reference?:string;matched:boolean;isMock:true;action?:{label:string;to:string}}
export interface ImageAnalysisRequest {scenarioId?:string;filename?:string}
export interface ImageAnalysisResponse {summary:string;details:string;scenario:boolean;isMock:true}
export interface ForecastScope {kind:'area'|'farmer'|'pond';id:string}
export interface GrowthPredictionRequest {cycleId:string;scenarioId:string;scope?:ForecastScope}
export interface GrowthPredictionResponse {points:{day:number;estimate:number;lower:number;upper:number}[];harvestDate:string;notice:string;isMock:true}
export interface ProductionForecastRequest {scope:ForecastScope;scenarioId:string;asOf?:string;survivalRatePercent?:number;targetWeightGrams?:number}
export interface ForecastCycleRow {cycleId:string;cycleCode:string;pondId:string;pondName:string;farmerName:string;expectedHarvestDate:string|null;scheduledMonth:string|null;recordedKg:number;remainingKg:number|null;lowerKg:number|null;upperKg:number|null;overdue:boolean;note:string}
export interface ProductionForecastResponse {
 scope:ForecastScope;scopeName:string;asOf:string;isMock:boolean;
 points:{period:string;actual?:number;forecast?:number;low?:number;high?:number}[];
 counts:{farmerCount:number;pondCount:number;activeCycleCount:number;forecastableCycleCount:number};
 totals:{recordedKg:number;remainingKg:number|null;lowerKg:number|null;upperKg:number|null};
 assumptions:{survivalRatePercent:number;targetWeightGrams:number;multiplier:number;uncertainty:number};
 cycles:ForecastCycleRow[];
}
export interface AIService {
 chat(request:ChatRequest):Promise<ChatResponse>;
 analyzeImage(request:ImageAnalysisRequest):Promise<ImageAnalysisResponse>;
 predictGrowth(request:GrowthPredictionRequest):Promise<GrowthPredictionResponse>;
 forecastProduction(request:ProductionForecastRequest):Promise<ProductionForecastResponse>;
}
