// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PondDetail from '../src/features/PondDetail';
import { Toaster } from '../src/components/UI';
import { store } from '../src/store/demoStore';

describe('PondDetail diary flow', () => {
  beforeEach(() => { localStorage.clear(); store.reset(); store.setRole('farmer'); });
  afterEach(() => cleanup());

  it('adds, views, edits and deletes a diary from the pond journal tab', async () => {
    render(<MemoryRouter initialEntries={['/ponds/P001']}><Routes><Route path="/ponds/:id" element={<><PondDetail/><Toaster/></>}/></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Nhật ký bể nuôi' }));
    fireEvent.click(screen.getByRole('button', { name: /Ghi nhật ký/ }));

    let dialog = screen.getByRole('dialog', { name: 'Ghi nhật ký bể nuôi' });
    const inputs = within(dialog).getAllByRole('textbox');
    fireEvent.change(inputs[inputs.length - 1], { target: { value: 'Kiểm thử lưu nhật ký' } });
    fireEvent.change(dialog.querySelector('input[type="date"]')!, { target: { value: new Date().toISOString().slice(0, 10) } });
    const selects = within(dialog).getAllByRole('combobox');
    fireEvent.change(selects[2], { target: { value: store.snapshot().db.feedProducts[0].id } });
    const numeric = within(dialog).getAllByRole('spinbutton');
    fireEvent.change(numeric[0], { target: { value: '2.5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu nhật ký' }));
    await waitFor(() => expect(screen.getByText('Kiểm thử lưu nhật ký')).toBeTruthy());

    fireEvent.click(within(screen.getByText('Kiểm thử lưu nhật ký').closest('tr')!).getByRole('button', { name: 'Xem' }));
    expect(screen.getByRole('dialog', { name: 'Chi tiết nhật ký' })).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Chi tiết nhật ký' })).getByRole('button', { name: 'Đóng' }));

    fireEvent.click(within(screen.getByText('Kiểm thử lưu nhật ký').closest('tr')!).getByRole('button', { name: 'Sửa' }));
    dialog = screen.getByRole('dialog', { name: 'Chỉnh sửa nhật ký bể nuôi' });
    const notes = within(dialog).getAllByRole('textbox').at(-1)!;
    fireEvent.change(notes, { target: { value: 'Đã sửa nội dung' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(screen.getByText('Đã sửa nội dung')).toBeTruthy());

    fireEvent.click(within(screen.getByText('Đã sửa nội dung').closest('tr')!).getByRole('button', { name: 'Xóa' }));
    const confirm = screen.getByRole('dialog', { name: 'Xác nhận xóa nhật ký' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Xóa nhật ký' }));
    await waitFor(() => expect(screen.queryByText('Đã sửa nội dung')).toBeNull());
  });

  it('keeps the diary form open on backdrop and protects dirty input on ESC', async () => {
    render(<MemoryRouter initialEntries={['/ponds/P001']}><Routes><Route path="/ponds/:id" element={<><PondDetail/><Toaster/></>}/></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Nhật ký bể nuôi' }));
    fireEvent.click(screen.getByRole('button', { name: /Ghi nhật ký/ }));
    let dialog = screen.getByRole('dialog', { name: 'Ghi nhật ký bể nuôi' });
    fireEvent.mouseDown(dialog.parentElement!);
    expect(screen.getByRole('dialog', { name: 'Ghi nhật ký bể nuôi' })).toBeTruthy();
    const note = within(dialog).getAllByRole('textbox').at(-1)!;
    fireEvent.change(note, { target: { value: 'Unsaved note' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getAllByText(/Bạn có thay đổi chưa được lưu/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }));
    dialog = screen.getByRole('dialog', { name: 'Ghi nhật ký bể nuôi' });
    expect(within(dialog).getByDisplayValue('Unsaved note')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }));
    expect(screen.queryByRole('dialog', { name: 'Ghi nhật ký bể nuôi' })).toBeNull();
  });

  it('warns instead of opening a second cycle form when the pond still has an open cycle', () => {
    render(<MemoryRouter initialEntries={['/ponds/P001']}><Routes><Route path="/ponds/:id" element={<><PondDetail/><Toaster/></>}/></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Vụ nuôi' }));
    fireEvent.click(screen.getByRole('button', { name: /Thêm vụ/ }));
    expect(screen.getByRole('dialog', { name: 'Bể đang có vụ nuôi hoạt động' })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Khởi tạo vụ nuôi' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Đã hiểu' }));
    expect(screen.queryByRole('dialog', { name: 'Bể đang có vụ nuôi hoạt động' })).toBeNull();
  });

  it('lets the farmer start a prepared cycle and persists the active status', async () => {
    let preparedCycleId = '';
    store.transaction((db) => {
      const pondCycles = db.farmingCycles.filter((cycle: any) => cycle.pondId === 'P001');
      pondCycles.forEach((cycle: any) => { cycle.status = 'completed'; });
      preparedCycleId = pondCycles[0].id;
      pondCycles[0].status = 'preparing';
      return db;
    }, 'test-prepared-cycle');

    render(<MemoryRouter initialEntries={['/ponds/P001']}><Routes><Route path="/ponds/:id" element={<><PondDetail/><Toaster/></>}/></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Vụ nuôi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu thả giống' }));

    const confirm = screen.getByRole('dialog', { name: 'Chuyển vụ nuôi sang Đang nuôi?' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Xác nhận' }));

    await waitFor(() => expect(store.snapshot().db.farmingCycles.find((cycle: any) => cycle.id === preparedCycleId)?.status).toBe('active'));
    expect(screen.getByText('Đang nuôi')).toBeTruthy();
  });

  it('shows the no-active-cycle harvest warning without navigating or opening harvest entry', () => {
    store.transaction((db) => { db.farmingCycles = db.farmingCycles.filter((cycle: any) => cycle.pondId !== 'P001'); return db; }, 'test-pond-without-cycles');
    render(<MemoryRouter initialEntries={['/ponds/P001']}><Routes><Route path="/ponds/:id" element={<><PondDetail/><Toaster/></>}/></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Thu hoạch' }));
    fireEvent.click(screen.getByRole('button', { name: /Ghi thu hoạch/ }));
    expect(screen.getByRole('dialog', { name: 'Chưa có vụ nuôi để thu hoạch' })).toBeTruthy();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Đã hiểu' }));
  });
});

