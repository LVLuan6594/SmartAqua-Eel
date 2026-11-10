// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PondDetail from '../src/features/PondDetail';
import Harvests from '../src/features/Harvests';
import { Toaster } from '../src/components/UI';
import { store } from '../src/store/demoStore';

describe('Harvest form cycle ending flow', () => {
  beforeEach(() => { localStorage.clear(); store.reset(); store.setRole('farmer'); });
  afterEach(() => cleanup());

  it('opens harvests within a pond and offers only that pond’s cycles',()=>{
    render(<MemoryRouter initialEntries={['/ponds/P002?tab=harvests']}><Routes><Route path="/ponds/:id" element={<PondDetail/>}/></Routes></MemoryRouter>);
    expect(screen.getByRole('navigation',{name:'Đường dẫn bể nuôi'})).toBeTruthy();
    const db=store.snapshot().db;
    const rows=screen.getAllByRole('row').slice(1);
    for(const row of rows)expect(row.textContent).not.toContain('VU25-001');
    fireEvent.click(screen.getByRole('button',{name:/Ghi thu hoạch/}));
    const dialog=screen.getByRole('dialog',{name:'Ghi nhận đợt thu hoạch'});
    const cycleSelect=within(dialog).getByRole('combobox',{name:'Vụ nuôi thu hoạch'}) as HTMLSelectElement;
    expect([...cycleSelect.options].every(option=>db.farmingCycles.find(cycle=>cycle.id===option.value)?.pondId==='P002')).toBe(true);
    expect((within(dialog).getByRole('textbox',{name:'Bể nuôi'}) as HTMLInputElement).value).toContain('BE-002');
  });

  it('saves a harvest batch normally, then asks before the batch that ends its cycle', async () => {
    render(<MemoryRouter><Harvests pondId="P001"/><Toaster/></MemoryRouter>);
    const cycle = store.snapshot().db.farmingCycles.find((item: any) => item.pondId === 'P001' && ['active', 'harvesting'].includes(item.status)) as any;
    expect(cycle).toBeTruthy();
    const startingHarvests = store.snapshot().db.harvests.length;
    fireEvent.click(screen.getByRole('button', { name: /Ghi thu hoạch/ }));
    let dialog = screen.getByRole('dialog', { name: /Ghi nhận đợt thu hoạch/ });
    fireEvent.change(dialog.querySelector('input[type="date"]')!, { target: { value: cycle.stockingDate } });
    fireEvent.change(dialog.querySelector('input[type="number"]')!, { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận thu hoạch' }));
    await waitFor(() => expect(store.snapshot().db.harvests.length).toBe(startingHarvests + 1));
    expect(store.snapshot().db.farmingCycles.find((item: any) => item.id === cycle.id)?.status).toBe('harvesting');

    fireEvent.click(screen.getByRole('button', { name: /Ghi thu hoạch/ }));
    dialog = screen.getByRole('dialog', { name: /Ghi nhận đợt thu hoạch/ });
    fireEvent.change(dialog.querySelector('input[type="date"]')!, { target: { value: cycle.stockingDate } });
    fireEvent.change(dialog.querySelector('input[type="number"]')!, { target: { value: '9' } });
    fireEvent.click(screen.getByRole('checkbox'));
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận thu hoạch' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    expect(store.snapshot().db.farmingCycles.find((item: any) => item.id === cycle.id)?.status).toBe('harvesting');
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận kết thúc vụ' }));
    await waitFor(() => expect(store.snapshot().db.farmingCycles.find((item: any) => item.id === cycle.id)?.status).toBe('completed'));
    expect(store.snapshot().db.harvests.length).toBe(startingHarvests + 2);
  });
});
