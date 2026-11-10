import {store} from '../../store/demoStore';
import type {RecordItem} from '../../types/models';
import type {Repository} from '../contracts/Repository';
export class MockRepository<T extends RecordItem> implements Repository<T>{
 constructor(private collection:string){}
 async getAll():Promise<T[]>{return structuredClone(store.snapshot().db[this.collection] as T[])}
 async getById(id:string):Promise<T|null>{return (await this.getAll()).find(x=>x.id===id)||null}
 async create(input:T):Promise<T>{store.upsert(this.collection,input);return input}
 async update(id:string,input:Partial<T>):Promise<T>{const current=await this.getById(id);if(!current)throw Error('Không tìm thấy hồ sơ');const changed={...current,...input};store.upsert(this.collection,changed);return changed}
 async delete(id:string){store.remove(this.collection,id)}
}
