import {describe,it,expect} from 'vitest';
import raw from '../src/data/pdf-facilities.json';
import {getFacilities,getPonds,getFacilityById,getPondsByFacility} from '../src/features/gis/services/facilityRepository';
describe('Gỡ nguồn cá tra khỏi demo lươn',()=>{
 it('bản nhập và repository PDF đều rỗng',()=>{expect(raw.facilities).toEqual([]);expect(raw.ponds).toEqual([]);expect(getFacilities()).toEqual([]);expect(getPonds()).toEqual([]);});
 it('tra bản ghi cũ không trả lại hồ sơ cá tra',()=>{expect(getFacilityById('92-01-000001')).toBeNull();expect(getPondsByFacility('92-01-000001')).toEqual([]);});
});

