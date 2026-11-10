import type { DemoDB } from '../types/models';
import { assertEelDataset } from '../domain/eelDataset';
export interface DatasetGateway {load():Promise<DemoDB>;save(db:DemoDB):Promise<void>;reset():Promise<DemoDB>}
export const dataMode=import.meta.env.VITE_DATA_MODE||'mock';
export const apiBase=(import.meta.env.VITE_API_BASE_URL||'/api').replace(/\/$/,'');
/** Full dataset contract for existing screens. The server owns the durable transaction. */
export class HttpDatasetGateway implements DatasetGateway {
 constructor(private base=apiBase,private jsonServer=dataMode==='json-server'){}
 private async request(path:string,init?:RequestInit){const res=await fetch(this.base+path,{credentials:'include',...init,headers:{'Content-Type':'application/json',...init?.headers}});if(!res.ok)throw new Error(`Không đồng bộ được dữ liệu (HTTP ${res.status}).`);return res.status===204?null:res.json();}
 async load(){const db=await this.request(this.jsonServer?'/data':'/dataset');assertEelDataset(db);return db;}
 async save(db:DemoDB){assertEelDataset(db);await this.request(this.jsonServer?'/data':'/dataset',{method:this.jsonServer?'POST':'PUT',body:JSON.stringify(db)});}
 async reset(){const response=await this.request(this.jsonServer?'/demo/reset':'/dataset/reset',{method:'POST'});const db=response.data??response;assertEelDataset(db);return db;}
}
export const datasetGateway:DatasetGateway|null=dataMode==='mock'?null:new HttpDatasetGateway();
