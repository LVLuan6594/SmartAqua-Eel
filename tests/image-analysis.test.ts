import {afterEach,describe,it,expect,vi} from 'vitest';
import {DemoImageAnalysisService,validateImageFile} from '../src/ai/imageAnalysisService';
import {readFileSync} from 'node:fs';
const asFile=(bytes:Uint8Array,name:string)=>Object.assign(new Blob([bytes]),{name}) as File;
const png=new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]);
describe('Ảnh lươn mô phỏng theo nội dung ảnh mẫu',()=>{
 afterEach(()=>vi.unstubAllGlobals());
 const reference=new Uint8Array(readFileSync(new URL('../public/images/AI_PhuDau_DoDau.jpg',import.meta.url)));
 const mockReference=()=>{const fetcher=vi.fn().mockResolvedValue(new Response(reference));vi.stubGlobal('fetch',fetcher);return fetcher;};
 it('không gán bệnh cho ảnh không có mẫu dù tên tệp giống ảnh bệnh',async()=>{const fetcher=mockReference();const result=await new DemoImageAnalysisService().analyzeImage(asFile(png,'AI_PhuDau_DoDau.jpg'));expect(result.suspectedCondition).toBeNull();expect(fetcher).toHaveBeenCalledWith('/images/AI_PhuDau_DoDau.jpg',expect.anything());});
 it('trả kịch bản phù đầu đỏ đầu cho ảnh mẫu kể cả khi đổi tên',async()=>{mockReference();const result=await new DemoImageAnalysisService().analyzeImage(asFile(reference,'renamed.jpg'));expect(result.species).toBe('Lươn đồng');expect(result.suspectedCondition).toContain('Phù đầu, đỏ đầu');expect(result.diagnosticStatus).toBe('unconfirmed');expect(result.mode).toBe('demo');expect(result.references).toHaveLength(4);expect(result.referenceImage).toBe('/images/AI_PhuDau_DoDau.jpg');});
 it('không dùng mẫu đã chỉnh sửa để trả bệnh và tái sử dụng bộ nhớ đệm mẫu',async()=>{const fetcher=mockReference();const service=new DemoImageAnalysisService();const edited=reference.slice();edited[edited.length-1]^=1;expect((await service.analyzeImage(asFile(edited,'AI_PhuDau_DoDau.jpg'))).suspectedCondition).toBeNull();expect((await service.analyzeImage(asFile(reference,'original.jpg'))).suspectedCondition).toBeTruthy();expect(fetcher).toHaveBeenCalledTimes(1);});
 it('kiểm tra nội dung tệp thay vì đuôi ảnh',async()=>{await expect(validateImageFile(asFile(new Uint8Array([1,2,3]),'luon.png'))).rejects.toThrow('không có định dạng ảnh');});
 it('giữ giới hạn dung lượng',async()=>{await expect(validateImageFile(asFile(new Uint8Array(8*1024*1024+1),'large.png'))).rejects.toThrow('vượt giới hạn 8 MB');});
});

