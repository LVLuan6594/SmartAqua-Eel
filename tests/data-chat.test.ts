import {describe,it,expect} from 'vitest';
import seedJson from '../src/data/data.json';
import type {DemoDB,Role} from '../src/types/models';
import {computeDataAnswer,answerDataQuestion} from '../src/ai/dataChatService';
import {metrics,pondScope,scoped,sum} from '../src/domain/selectors';

const seed=seedJson as unknown as DemoDB;
const rows=(list:unknown[])=>list as any[];

describe('Trợ lý dữ liệu cục bộ',()=>{
 it('đếm số ao theo đúng dữ liệu hệ thống (manager)',()=>{
  const r=computeDataAnswer({question:'Có bao nhiêu ao nuôi?',db:seed,role:'manager'});
  expect(r).not.toBeNull();
  expect(r!.answer).toContain(seed.ponds.length.toLocaleString('vi-VN'));
  expect(r!.reference).toContain('vai trò');
 });

 it('tôn trọng phân quyền vai trò nông dân',()=>{
  const expected=pondScope(seed,'farmer').length;
  const r=computeDataAnswer({question:'Có bao nhiêu ao nuôi?',db:seed,role:'farmer'});
  expect(r!.answer).toContain(expected.toLocaleString('vi-VN'));
  expect(expected).toBeLessThan(seed.ponds.length);
 });

 it('sản lượng thu hoạch khớp tổng đã tính theo vai trò',()=>{
  const expectedK=metrics(seed,'manager').harvestKg;
  const r=computeDataAnswer({question:'Tổng sản lượng thu hoạch toàn hệ thống?',db:seed,role:'manager'});
  expect(r!.answer).toContain(expectedK.toLocaleString('vi-VN',{maximumFractionDigits:1}));
 });

 it('tra cứu đối tượng theo mã',()=>{
  const r=computeDataAnswer({question:'Thông tin ao BE-001',db:seed,role:'manager'});
  expect(r!.answer).toContain('BE-001');
  expect(r!.reference).toContain('ponds');
 });

 it('không truy xuất ao ngoài phạm vi vai trò (không bịa dữ liệu)',()=>{
  const outside=rows(seed.ponds).find(p=>p.farmerId!=='F001');
  expect(outside).toBeTruthy();
  const r=computeDataAnswer({question:`Thông tin ao ${outside.code}`,db:seed,role:'farmer'});
  expect(r).toBeNull();
 });

 it('tra cứu theo xã/phường từ liên kết vùng',()=>{
  const link=rows(seed.zoneCommuneLinks).find(l=>String(l.communeName||'').length>=8);
  expect(link).toBeTruthy();
  const r=computeDataAnswer({question:`Vùng nuôi ở ${link!.communeName}`,db:seed,role:'manager'});
  expect(r).not.toBeNull();
  expect(r!.reference).toContain('zoneCommuneLinks');
 });

  it('tạo liên kết GIS theo mã địa bàn được tra cứu',()=>{
    const r=computeDataAnswer({question:'Hiển thị vùng nuôi ở Phường Bình Thuỷ trên bản đồ',db:seed,role:'manager'});
    expect(r?.action?.to).toBe('/gis?commune=31168');
  });

  it('xếp hạng HTX từ số hộ thuộc phạm vi hiện tại',()=>{
    const r=computeDataAnswer({question:'Hợp tác xã nào quản lý nhiều hộ nuôi nhất?',db:seed,role:'manager'});
    expect(r?.answer).toContain('| Hạng | Hợp tác xã | Hộ nuôi | Ao |');
    expect(r?.answer).toContain('| 1 |');
  });

  it('tổng hợp đối tượng theo từng xã từ metadata vùng hiện có',()=>{
    const r=computeDataAnswer({question:'Thống kê số ao nuôi theo từng xã',db:seed,role:'manager'});
    expect(r?.answer).toContain('| Xã/phường |');
    expect(r?.answer).toContain('không đồng nghĩa danh sách ao hộ nuôi đã xác minh');
  });

  it('lọc sản lượng thu hoạch theo năm trong câu hỏi',()=>{
    const yearHarvests=rows(seed.harvests).filter(h=>String(h.date).startsWith('2026'));
    const expected=yearHarvests.reduce((n,h)=>n+Number(h.quantityKg||0),0);
    const r=computeDataAnswer({question:'Tổng sản lượng thu hoạch năm 2026?',db:seed,role:'manager'});
    expect(r?.answer).toContain(expected.toLocaleString('vi-VN',{maximumFractionDigits:1}));
  });

  it('không cho vai trò nông dân tra cứu vùng ngoài phạm vi ao được giao',()=>{
    const r=computeDataAnswer({question:'Thông tin vùng VNU-OSM-01',db:seed,role:'farmer'});
    expect(r?.answer).not.toContain('VNU-OSM-01');
    expect(r?.answer).not.toContain('Vùng nuôi (suy ra): 26');
  });

 it('trả null khi câu hỏi không khớp dữ liệu',()=>{
  expect(computeDataAnswer({question:'Thời tiết ngày mai thế nào?',db:seed,role:'manager'})).toBeNull();
  expect(computeDataAnswer({question:'',db:seed,role:'manager'})).toBeNull();
 });

 it('fallback kho tri thức cho câu hỏi ngoài dữ liệu, luôn gắn nhãn mô phỏng',async()=>{
  const r=await answerDataQuestion({question:'Nhật ký thức ăn cần ghi gì?',db:seed,role:'farmer',delayMs:0});
  expect(r.isMock).toBe(true);
  expect(r.answer.length).toBeGreaterThan(0);
 });

 it('tổng quan bám theo số liệu đã chọn lọc',()=>{
  const m=metrics(seed,'coop');
  const r=computeDataAnswer({question:'Tổng quan dữ liệu hệ thống',db:seed,role:'coop'});
  expect(r!.answer).toContain(m.pondCount.toLocaleString('vi-VN'));
  expect(scoped(seed,'coop','feedDiaries').length).toBeGreaterThanOrEqual(0);
  expect(sum(scoped(seed,'coop','harvests'),'quantityKg')).toBeGreaterThanOrEqual(0);
 });
});
