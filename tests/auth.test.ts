// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { authService, permissionFor } from '../src/auth/authService';
import { canCreate, canWrite, pondScope } from '../src/domain/selectors';
import seed from '../src/data/data.json';

describe('SmartAqua demo authentication',()=>{
 afterEach(()=>authService.logout());
 it('đăng nhập đủ bốn tài khoản mẫu với role tương ứng',async()=>{
  const users=[['admin','AquaAdmin#2026','admin'],['farmer','AquaFarmer#2026','farmer'],['cooperative','AquaCoop#2026','coop'],['leader','AquaLeader#2026','manager']] as const;
  for(const [username,password,role] of users){const account=await authService.login(username,password);expect(account.role).toBe(role);authService.logout();}
 });
 it('từ chối mật khẩu sai và tài khoản đã khóa',async()=>{
  await expect(authService.login('admin','wrong')).rejects.toThrow('không chính xác');
  const farmer=authService.listAccounts().find(x=>x.username==='farmer')!;authService.saveAccount({...farmer,status:'locked'});
  await expect(authService.login('farmer','AquaFarmer#2026')).rejects.toThrow('đã bị khóa');
  authService.saveAccount({...farmer,status:'active'});
 });
 it('áp dụng quyền role và giới hạn ao nông dân đang đăng nhập',async()=>{
  await authService.login('farmer','AquaFarmer#2026');
  expect(permissionFor('farmer','admin')).toBe(false);
  expect(pondScope(seed,'farmer').every(pond=>pond.farmerId==='F001')).toBe(true);
  await authService.login('admin','AquaAdmin#2026');
  expect(permissionFor('admin','admin')).toBe(true);
 });
 it('cho phép Admin và quản lý tạo hồ sơ, hộ nuôi chỉ tạo ao',async()=>{
  for(const collection of ['aquacultureAreas','farmers','ponds']){
   expect(canCreate('admin',collection)).toBe(true);
   expect(canCreate('manager',collection)).toBe(true);
   expect(canWrite('manager',collection)).toBe(false);
  }
  expect(permissionFor('manager','farmers')).toBe(true);
  expect(permissionFor('manager','ponds')).toBe(true);
  expect(canCreate('farmer','ponds')).toBe(true);
  expect(canCreate('farmer','aquacultureAreas')).toBe(false);
  expect(canCreate('farmer','farmers')).toBe(false);
  expect(canWrite('farmer','ponds')).toBe(false);
  expect(canCreate('coop','ponds')).toBe(false);
 });
});
