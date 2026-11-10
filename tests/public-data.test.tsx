// @vitest-environment jsdom
import React from 'react';
import {afterEach,describe,it,expect} from 'vitest';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import PublicData from '../src/features/PublicData';
describe('Tra cứu nguồn công khai theo 103 xã/phường',()=>{
 afterEach(cleanup);
 it('hiển thị đủ địa bàn và lọc tên, không biến số liệu thiếu thành 0',async()=>{render(<MemoryRouter><PublicData/></MemoryRouter>);await screen.findByText('103 / 103 đơn vị');expect(screen.getAllByRole('row')).toHaveLength(104);fireEvent.change(screen.getByRole('textbox',{name:'Tên hoặc mã xã/phường'}),{target:{value:'Vĩnh Châu'}});expect(screen.getByText('1 / 103 đơn vị')).toBeTruthy();expect(screen.getByText('Phường Vĩnh Châu')).toBeTruthy();expect(screen.getAllByText('Chưa có bảng chuẩn')).toHaveLength(3);});
});
