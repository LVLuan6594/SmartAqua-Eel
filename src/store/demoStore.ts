import {useSyncExternalStore} from 'react';
import seed from '../data/data.json';
import {normalizeDisplayDB} from '../domain/normalizeDisplayData';
import {assertEelDataset} from '../domain/eelDataset';
import {datasetGateway} from '../services/datasetGateway';
import {createId} from '../utils/createId';
import type {DemoDB,Role,RecordItem} from '../types/models';
const KEY='smart-aqua-eel-demo-v1', ROLE='smart-aqua-eel-role-v1';
// Retire storage from the multi-species demo on this origin.
if(typeof window!=='undefined'){
 try{for(const key of ['smart-aqua-demo-v2','smart-aqua-demo-role','smartaqua-demo-accounts-v1'])localStorage.removeItem(key);sessionStorage.removeItem('smartaqua-demo-session-v1');for(const role of ['admin','manager','coop','farmer'])localStorage.removeItem('smart-aqua-chat-history-v1:'+role);}catch{}
}
const fresh=()=>normalizeDisplayDB(structuredClone(seed) as DemoDB);
const readDB=()=>{try{const db=JSON.parse(localStorage.getItem(KEY)||'null');assertEelDataset(db);return normalizeDisplayDB(db);}catch{return fresh();}};
export const roles:{id:Role;label:string;subtitle:string}[]=[
 {id:'admin',label:'Cán bộ quản trị',subtitle:'Quản trị nuôi lươn'},
 {id:'farmer',label:'Hộ nuôi lươn',subtitle:'Các bể lươn của tôi'},
 {id:'coop',label:'Quản lý HTX / tổ hợp tác',subtitle:'Hộ và bể lươn được giao'},
 {id:'manager',label:'Lãnh đạo địa phương',subtitle:'Trung tâm điều hành nuôi lươn'}
];
type State={db:DemoDB;role:Role;version:number;syncStatus:'local'|'loading'|'saving'|'synced'|'error';syncError:string|null};
const savedRole=typeof localStorage==='undefined'?null:localStorage.getItem(ROLE);
let current:State={db:typeof window==='undefined'?fresh():readDB(),role:roles.some(r=>r.id===savedRole)?savedRole as Role:'manager',version:0,syncStatus:datasetGateway?'loading':'local',syncError:null};
const listeners=new Set<()=>void>();
const emit=()=>{current={...current,version:current.version+1};listeners.forEach(f=>f());};
const status=(syncStatus:State['syncStatus'],syncError:string|null=null)=>{current={...current,syncStatus,syncError};emit();};
let saving:Promise<void>=Promise.resolve();
let revision=0;
const saveRemote=(db:DemoDB)=>{
 if(!datasetGateway)return;
 const snapshot=structuredClone(db),ticket=revision;
 status('saving');
 const gateway=datasetGateway;
 saving=saving.catch(()=>{}).then(()=>gateway.save(snapshot)).then(()=>{if(ticket===revision)status('synced');}).catch(error=>{if(ticket===revision)status('error',error instanceof Error?error.message:'Không đồng bộ được dữ liệu.');});
};
const commit=(db:DemoDB,description:string)=>{
 db.auditLogs=[{id:createId('audit'),date:new Date().toISOString(),role:current.role,description},...db.auditLogs].slice(0,90);
 try{localStorage.setItem(KEY,JSON.stringify(db));}catch{throw new Error('Không đủ dung lượng lưu dữ liệu. Hãy xuất JSON.');}
 current={...current,db};revision++;emit();saveRemote(db);
};
const hydrate=async()=>{
 if(!datasetGateway)return;
 const ticket=revision;
 try{const db=await datasetGateway.load();if(ticket!==revision)return;localStorage.setItem(KEY,JSON.stringify(db));current={...current,db:normalizeDisplayDB(db)};status('synced');}
 catch(error){if(ticket===revision)status('error',error instanceof Error?error.message:'Không tải được dữ liệu máy chủ.');}
};
if(typeof window!=='undefined')void hydrate();
export const store={
 subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
 snapshot:()=>current,
 setRole:(role:Role)=>{current={...current,role};localStorage.setItem(ROLE,role);emit();},
 upsert:(collection:string,record:RecordItem)=>{const rows=current.db[collection] as RecordItem[];if(!Array.isArray(rows))throw Error('Danh mục không hợp lệ');const next=structuredClone(current.db);const i=rows.findIndex(r=>r.id===record.id);if(i<0)next[collection].unshift(record);else next[collection][i]={...rows[i],...record};commit(next,'Lưu '+collection+': '+record.id);},
 remove:(collection:string,id:string)=>{commit({...current.db,[collection]:current.db[collection].filter((r:RecordItem)=>r.id!==id)},'Xóa '+collection+': '+id);},
 transaction:(mutate:(db:DemoDB)=>DemoDB,description:string)=>commit(mutate(structuredClone(current.db)),description),
 reset:async()=>{
  if(!datasetGateway){revision++;current={...current,db:fresh(),syncStatus:'local',syncError:null};localStorage.removeItem(KEY);emit();return;}
  status('saving');
  try{await saving;const db=await datasetGateway.reset();revision++;localStorage.setItem(KEY,JSON.stringify(db));current={...current,db};status('synced');}
  catch(error){status('error',error instanceof Error?error.message:'Không khôi phục được dữ liệu máy chủ.');}
 },
 retrySync:()=>saveRemote(current.db),
 import:(value:unknown)=>{assertEelDataset(value);commit(normalizeDisplayDB(structuredClone(value)),'Nhập dữ liệu nuôi lươn');},
 export:()=>JSON.stringify(current.db,null,2)
};
export const useDemo=()=>useSyncExternalStore(store.subscribe,store.snapshot,store.snapshot);
export const find=(db:DemoDB,collection:string,id:string)=>(db[collection] as RecordItem[]).find(x=>x.id===id);
export const getLabel=(db:DemoDB,collection:string,id:string,field='name')=>find(db,collection,id)?.[field]||id||'—';

