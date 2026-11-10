// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { store } from '../src/store/demoStore';
import FloatingChat from '../src/components/FloatingChat';

afterEach(cleanup);

describe('FloatingChat (render)', () => {
  it('luôn hiển thị nút chat nổi và mở bảng khi bấm', () => {
    store.setRole('manager');
    const { container } = render(<MemoryRouter><FloatingChat /></MemoryRouter>);
    const fab = screen.getByLabelText('Mở trợ lý AI SmartAqua');
    expect(fab).toBeTruthy();
    fireEvent.click(fab);
    expect(container.textContent).toContain('Trợ lý AI SmartAqua');
    expect(container.textContent).toContain('Gợi ý câu hỏi');
  });

  it('gửi câu hỏi và nhận câu trả lời từ dữ liệu', async () => {
    store.setRole('manager');
    const { container } = render(<MemoryRouter><FloatingChat /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText('Mở trợ lý AI SmartAqua'));
    const input = screen.getByLabelText('Câu hỏi cho trợ lý AI') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Tổng quan dữ liệu hệ thống' } });
    fireEvent.submit(input.closest('form')!);
    expect(container.textContent).toContain('Đang truy vấn dữ liệu trong phạm vi của bạn…');
    expect(await screen.findByText(/Tổng quan dữ liệu hệ thống \(vai trò/)).toBeTruthy();
  });

  it('lưu và khôi phục lịch sử hội thoại theo vai trò demo', async () => {
    store.setRole('manager');
    render(<MemoryRouter><FloatingChat /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText('Mở trợ lý AI SmartAqua'));
    fireEvent.click(screen.getByRole('button', { name: 'Có bao nhiêu vụ nuôi đang hoạt động?' }));
    await screen.findByText(/Vụ nuôi:/);
    fireEvent.click(screen.getByLabelText('Lịch sử hội thoại'));
    expect(screen.getByText('Có bao nhiêu vụ nuôi đang hoạt động?')).toBeTruthy();
  });
});
