export interface AnalysisContext {
  pondId?: string;
  cycleId?: string;
}

export interface ImageAnalysisResult {
  id: string;
  mode: 'demo' | 'ai';
  species: string;
  scientificName?: string;
  signGroup?: string;
  suspectedCondition: string | null;
  conditionSummary?: string;
  observedSigns: string[];
  possibleCauses: string[];
  recommendations: string[];
  treatmentNotice?: string;
  diagnosticStatus: 'suspected' | 'unconfirmed' | 'confirmed';
  sourceType: 'demo_reference' | 'model_inference';
  evidenceSource?: string;
  references?: {title:string;url:string;description?:string}[];
  referenceImage?: string;
  verificationNotice?: string;
  disclaimer: string;
  analyzedAt: string;
  modelVersion?: string;
}

export interface ImageAnalysisService {
  analyzeImage(file: File, context?: AnalysisContext): Promise<ImageAnalysisResult>;
}
