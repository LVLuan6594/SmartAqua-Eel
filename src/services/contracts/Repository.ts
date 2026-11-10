import type {RecordItem} from '../../types/models';
export interface Repository<T extends RecordItem>{
 getAll():Promise<T[]>;
 getById(id:string):Promise<T|null>;
 create(input:T):Promise<T>;
 update(id:string,input:Partial<T>):Promise<T>;
 delete(id:string):Promise<void>;
}
export type ServiceMode='mock'|'api';
