// @vitest-environment jsdom
import React from 'react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import seed from '../src/data/data.json';
import {areaMapPoints} from '../src/features/gis/services/areaMapRepository';
import AreaMapPopup from '../src/features/gis/components/AreaMapPopup';

describe('Thông tin nhanh vùng nuôi trên bản đồ',()=>{
 afterEach(cleanup);
 it('hiện đủ số liệu, tọa độ và chuyển đúng hành động xem hộ hoặc hồ sơ',()=>{
  const point=areaMapPoints(seed,'admin')[0],details=vi.fn(),profile=vi.fn();
  render(<AreaMapPopup point={point} onDetails={details} onProfile={profile}/>);
  expect(screen.getByRole('article',{name:`Thông tin ${point.name}`})).toBeTruthy();
  expect(screen.getByText('Tổng diện tích bể')).toBeTruthy();
  expect(screen.getByText('Diện tích vùng')).toBeTruthy();
  expect(screen.getByText(/188/)).toBeTruthy();
  fireEvent.click(screen.getByText('HTX, vụ nuôi và tọa độ'));
  expect(screen.getByText(/Tọa độ mô phỏng/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Xem hộ & bể nuôi'}));
  fireEvent.click(screen.getByRole('button',{name:'Mở hồ sơ'}));
  expect(details).toHaveBeenCalledOnce();expect(profile).toHaveBeenCalledOnce();
 });
});
