import {describe,it,expect} from 'vitest';
import {mockAIService} from '../src/ai/mockAIService';
describe('AI mock boundaries',()=>{
 it('chỉ trả tri thức khi khớp từ khóa',async()=>{const r=await mockAIService.chat({question:'Nhật ký thức ăn cần ghi gì?'});expect(r.isMock).toBe(true);expect(r.matched).toBe(true);expect(r.reference).toBeTruthy()});
 it('không giả mạo xử lý ảnh người dùng',async()=>{const r=await mockAIService.analyzeImage({filename:'random.png'});expect(r.scenario).toBe(false);expect(r.details).toContain('không phân tích')});
 it('mô phỏng dự báo không phải mô hình huấn luyện',async()=>{const g=await mockAIService.predictGrowth({cycleId:'C001',scenarioId:'PRS1'});expect(g.isMock).toBe(true);expect(g.points.length).toBeGreaterThan(6);expect(g.notice).toContain('mô phỏng')});
});
