// @vitest-environment jsdom
import React from 'react';
import {afterEach,describe,it,expect} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import FacilityDrilldown from '../src/features/gis/components/FacilityDrilldown';
describe('Adapter hồ sơ nhập khi không còn PDF cá tra',()=>{
 afterEach(cleanup);
 it('không dựng hồ sơ cũ khi tìm mã cá tra',()=>{render(<FacilityDrilldown facilityId="92-01-000001" pondId={null} onNavigate={()=>{}} onClear={()=>{}}/>);expect(screen.queryByText('92-01-000001')).toBeNull();});
});

