import type {RecordItem} from '../types/models';
import {MockRepository} from './mock/MockRepository';
import {ApiRepository} from './api/ApiRepository';
import type {Repository} from './contracts/Repository';
const endpoints:Record<string,string>={aquacultureAreas:'areas',cooperatives:'cooperatives',farmers:'farmers',ponds:'ponds',farmingCycles:'farming-cycles',feedDiaries:'feed-diaries',harvests:'harvests',gisFeatures:'gis/features',supportRequests:'support-requests',facilities:'facilities',facilityPonds:'facility-ponds'};
export function repository<T extends RecordItem>(collection:string):Repository<T>{
 const mode=import.meta.env.VITE_DATA_MODE||'mock';
 return mode==='mock'?new MockRepository<T>(collection):new ApiRepository<T>(mode==='json-server'?`data/${collection}`:(endpoints[collection]||collection));
}
