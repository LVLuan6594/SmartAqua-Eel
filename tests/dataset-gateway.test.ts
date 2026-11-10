import {afterEach,describe,it,expect,vi} from 'vitest';
import {HttpDatasetGateway} from '../src/services/datasetGateway';
import seed from '../src/data/data.json';
describe('Hợp đồng HTTP của demo và backend thật',()=>{
 afterEach(()=>vi.unstubAllGlobals());
 it('json-server dùng GET load, POST save và POST reset',async()=>{const f=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(seed))).mockResolvedValueOnce(new Response(null,{status:204})).mockResolvedValueOnce(new Response(JSON.stringify({ok:true,data:seed})));vi.stubGlobal('fetch',f);const g=new HttpDatasetGateway('/api',true);await g.load();await g.save(seed);await g.reset();expect(f.mock.calls.map(([url,init])=>[url,init.method||'GET'])).toEqual([['/api/data','GET'],['/api/data','POST'],['/api/demo/reset','POST']]);expect(f.mock.calls.every(([,init])=>init.credentials==='include')).toBe(true);});
 it('api mode dùng snapshot contract và truyền nguyên quan hệ',async()=>{const f=vi.fn().mockResolvedValue(new Response(null,{status:204}));vi.stubGlobal('fetch',f);await new HttpDatasetGateway('/api/v1',false).save(seed);expect(f.mock.calls[0][0]).toBe('/api/v1/dataset');expect(f.mock.calls[0][1].method).toBe('PUT');expect(JSON.parse(f.mock.calls[0][1].body).ponds).toEqual(seed.ponds);});
 it('không tải bộ dữ liệu cũ hoặc nuốt lỗi HTTP',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({metadata:{},ponds:[]}))).mockResolvedValueOnce(new Response(null,{status:503})));const g=new HttpDatasetGateway('/api',true);await expect(g.load()).rejects.toThrow('nuôi lươn');await expect(g.load()).rejects.toThrow('503');});
});
