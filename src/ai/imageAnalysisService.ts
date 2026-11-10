import scenarioCatalog from '../data/mock/image-disease-scenarios.json';
import type { AnalysisContext, ImageAnalysisResult, ImageAnalysisService } from '../types/imageAnalysis';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const IMAGE_RESULT_NOTICE = 'Kết quả mang tính chất tham khảo - Nông dân cần liên hệ ngay Chuyên gia để được tư vấn';
export interface ImageScenario {id:string;species:string;scientificName:string;signGroup:string;conditionName:string;conditionSummary:string;observedSigns:string[];possibleCauses:string[];recommendations:string[];treatmentNotice:string;evidenceSource:string;referenceImage:string;referenceFileName:string;verificationNotice:string;references?:ImageAnalysisResult['references']}
const newAnalysisId = () => `image-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export async function validateImageFile(file: File) {
  if (file.size === 0) throw new Error('Tệp ảnh rỗng. Hãy chọn một ảnh khác.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Ảnh vượt giới hạn 8 MB. Hãy chọn ảnh nhỏ hơn.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const starts = (...signature: number[]) => signature.every((byte, i) => bytes[i] === byte);
  const isPng = starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  const isJpeg = starts(0xff, 0xd8, 0xff);
  const isGif = starts(0x47, 0x49, 0x46, 0x38);
  const isWebp = starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (!isPng && !isJpeg && !isGif && !isWebp) throw new Error('Tệp được chọn không có định dạng ảnh PNG, JPG, GIF hoặc WebP hợp lệ.');
  return { bytes, format: isPng ? 'PNG' : isJpeg ? 'JPG' : isGif ? 'GIF' : 'WebP' };
}

const sameContent = (left: Uint8Array, right: Uint8Array) => left.length === right.length && left.every((byte, index) => byte === right[index]);
const resultFromScenario = (scenario: ImageScenario, referenceImage: string): ImageAnalysisResult => ({
  id: newAnalysisId(), mode: 'demo', species: scenario.species, scientificName: scenario.scientificName,
  signGroup: scenario.signGroup, suspectedCondition: scenario.conditionName, conditionSummary: scenario.conditionSummary,
  observedSigns: [...scenario.observedSigns], possibleCauses: [...scenario.possibleCauses], recommendations: [...scenario.recommendations],
  treatmentNotice: scenario.treatmentNotice, diagnosticStatus: 'unconfirmed', sourceType: 'demo_reference',
  evidenceSource: scenario.evidenceSource, references:scenario.references, referenceImage, verificationNotice: scenario.verificationNotice,
  disclaimer: IMAGE_RESULT_NOTICE, analyzedAt: new Date().toISOString(),
});

/** Exact file-byte matching keeps demo recognition independent of filename and browser crypto APIs. */
export class DemoImageAnalysisService implements ImageAnalysisService {
  private references = new Map<string, Uint8Array>();

  async analyzeImage(file: File, _context?: AnalysisContext): Promise<ImageAnalysisResult> {
    await validateImageFile(file);
    // Read the complete bounded file for content matching. The validator only
    // reads its header, which is enough for format checks but not a fingerprint.
    const bytes = new Uint8Array(await file.arrayBuffer());
    for (const scenario of scenarioCatalog as ImageScenario[]) {
      let reference = this.references.get(scenario.id);
      if (!reference) {
        const response = await fetch(scenario.referenceImage, { cache: 'force-cache' });
        if (!response.ok) throw new Error('Không tải được ảnh mẫu ' + scenario.referenceFileName + '.');
        reference = new Uint8Array(await response.arrayBuffer());
        this.references.set(scenario.id, reference);
      }
      if (sameContent(bytes, reference)) return resultFromScenario(scenario, scenario.referenceImage);
    }
    return {
      id: newAnalysisId(), mode: 'demo', species: 'Chưa xác định', suspectedCondition: null,
      observedSigns: [], possibleCauses: [], recommendations: [], diagnosticStatus: 'unconfirmed',
      sourceType: 'demo_reference', disclaimer: IMAGE_RESULT_NOTICE, analyzedAt: new Date().toISOString(),
      verificationNotice: 'Ảnh này chưa có dữ liệu tham chiếu phù hợp. Phiên bản hiện tại chưa thể đưa ra nhận định cho ảnh này.',
    };
  }
}

/** Future backend adapter. It calls only the explicitly configured same-product endpoint. */
export class ApiImageAnalysisService implements ImageAnalysisService {
  constructor(private readonly endpoint = import.meta.env.VITE_AI_IMAGE_ENDPOINT || '') {}
  async analyzeImage(file: File, context?: AnalysisContext): Promise<ImageAnalysisResult> {
    await validateImageFile(file);
    if (!this.endpoint) throw new Error('Chưa cấu hình VITE_AI_IMAGE_ENDPOINT cho dịch vụ phân tích ảnh.');
    const body = new FormData(); body.append('image', file, file.name);
    if (context?.pondId) body.append('pondId', context.pondId);
    if (context?.cycleId) body.append('cycleId', context.cycleId);
    const response = await fetch(this.endpoint, { method: 'POST', body, credentials: 'include' });
    if (!response.ok) throw new Error('Dịch vụ phân tích ảnh trả về HTTP ' + response.status + '.');
    return await response.json() as ImageAnalysisResult;
  }
}

export const createImageAnalysisService = (): ImageAnalysisService => import.meta.env.VITE_AI_IMAGE_MODE === 'api'
  ? new ApiImageAnalysisService()
  : new DemoImageAnalysisService();

export const imageDiseaseScenarios = scenarioCatalog;
