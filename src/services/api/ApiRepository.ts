import type {Repository} from '../contracts/Repository';
import type {RecordItem} from '../../types/models';
export class ApiRepository<T extends RecordItem> implements Repository<T>{
 constructor(private endpoint:string,private base=import.meta.env.VITE_API_BASE_URL||'/api'){}
 private async request(path:string,init?:RequestInit):Promise<any>{
  const res=await fetch(`${this.base.replace(/\/$/,'')}/${this.endpoint}${path}`,{credentials:'include',...init,headers:{'Content-Type':'application/json',...(init?.headers||{})}});
  if(!res.ok)throw new Error(`API HTTP ${res.status}`);return res.status===204?null:res.json();
 }
 async getAll():Promise<T[]>{const data=await this.request('');return data.items??data;}
 getById(id:string):Promise<T|null>{return this.request(`/${encodeURIComponent(id)}`)}
 async create(input:T):Promise<T>{const data=await this.request('',{method:'POST',body:JSON.stringify(input)});return data.item??data;}
 async update(id:string,input:Partial<T>):Promise<T>{const data=await this.request(`/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify(input)});return data.item??data;}
 async delete(id:string):Promise<void>{await this.request(`/${encodeURIComponent(id)}`,{method:'DELETE'})}
}
