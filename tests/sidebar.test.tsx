// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {Sidebar} from '../src/app/Sidebar';
import {store} from '../src/store/demoStore';

describe('Điều hướng theo cụm, hộ và bể nuôi',()=>{
 beforeEach(()=>{localStorage.clear();store.reset();});
 afterEach(cleanup);
 for(const role of ['admin','manager','coop','farmer'] as const)it(`${role}: không có phân hệ thu hoạch riêng trong sidebar`,()=>{
  store.setRole(role);
  render(<MemoryRouter><Sidebar collapsed={false} onToggle={()=>{}}/></MemoryRouter>);
  expect(screen.queryByRole('link',{name:/thu hoạch/i})).toBeNull();
  expect(screen.queryByRole('link',{name:/dự báo/i})).toBeNull();
  expect(screen.getByRole('link',{name:'Vùng nuôi & hộ nuôi'}).getAttribute('href')).toBe('/areas');
 });
 it('tìm theo mã bể, mở đúng tổ tiên và giữ các nhánh khác ngoài kết quả',()=>{
  store.setRole('admin');
  render(<MemoryRouter><Sidebar collapsed={false} onToggle={()=>{}}/></MemoryRouter>);
  fireEvent.change(screen.getByRole('textbox',{name:'Tìm trong menu'}),{target:{value:'BE-001'}});
  expect(screen.getByRole('link',{name:'Bể lươn 001'}).getAttribute('href')).toBe('/ponds/P001');
  expect(screen.queryByRole('link',{name:'Bể lươn 002'})).toBeNull();
  expect(screen.queryByRole('link',{name:/Xã Tân Hoà/})).toBeNull();
 });
 it('đường dẫn chi tiết bể mở sẵn đúng cụm và hộ',()=>{
  store.setRole('admin');
  render(<MemoryRouter initialEntries={['/ponds/P001?tab=harvests']}><Sidebar collapsed={false} onToggle={()=>{}}/></MemoryRouter>);
  expect(screen.getByRole('link',{name:'Bể lươn 001'}).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('button',{name:/Thu gọn bể của Hộ nuôi lươn mô phỏng 001/}).getAttribute('aria-expanded')).toBe('true');
 });
});
