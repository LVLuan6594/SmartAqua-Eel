// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import AreaHierarchy from '../src/features/AreaHierarchy';
import PondDetail from '../src/features/PondDetail';
import ForecastRedirect from '../src/features/ForecastRedirect';
import {store} from '../src/store/demoStore';

describe('Dự báo nằm trong hồ sơ vùng, hộ và bể',()=>{
 beforeEach(()=>{localStorage.clear();sessionStorage.clear();store.reset();store.setRole('admin');vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});});
 afterEach(()=>{cleanup();vi.unstubAllGlobals();});
 const routes=<Routes><Route path="/areas/:areaId" element={<AreaHierarchy/>}/><Route path="/areas/:areaId/farms/:farmId" element={<AreaHierarchy/>}/><Route path="/ponds/:id" element={<PondDetail/>}/><Route path="/ai/predict" element={<ForecastRedirect/>}/></Routes>;
 for(const [url,label,expectedCode,excluded]of [
  ['/areas/A01?tab=forecast','vùng nuôi','VU26-001','VU26-010'],
  ['/areas/A01/farms/F001?tab=forecast','hộ nuôi','VU26-001','VU26-004'],
  ['/ponds/P055?tab=forecast','bể nuôi','VU26-055','VU26-056'],
 ] as const)it(`${label}: chỉ hiển thị vụ của hồ sơ được chọn`,async()=>{
  render(<MemoryRouter initialEntries={[url]}>{routes}</MemoryRouter>);
  const region=screen.getByRole('region',{name:`Dự báo sản lượng của ${label}`});
  await waitFor(()=>expect(within(region).getByText(expectedCode)).toBeTruthy());
  expect(within(region).queryByText(excluded)).toBeNull();
  expect(within(region).getByText('Phần còn lại dự kiến')).toBeTruthy();
  fireEvent.change(within(region).getByRole('combobox',{name:'Kịch bản dự báo'}),{target:{value:'PRS3'}});
  await waitFor(()=>expect(within(region).getByText('Hệ số kịch bản ×0,85')).toBeTruthy());
 });
 it('đường dẫn dự báo cũ có pond chuyển vào tab của đúng bể',async()=>{
  render(<MemoryRouter initialEntries={['/ai/predict?pond=P055']}>{routes}</MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole('heading',{name:'Bể lươn 055',level:1})).toBeTruthy());
  expect(screen.getByRole('region',{name:'Dự báo sản lượng của bể nuôi'})).toBeTruthy();
 });
});
