import type { Role } from '../types/models';
import seed from '../data/data.json';

export type DemoAccount = {
  id: string; username: string; password: string; name: string; role: Role;
  status: 'active' | 'locked'; coopId?: string; farmerId?: string; unitIds?: string[]; pondIds?: string[];
  permissions?: string[]; lastLogin?: string; createdAt: string;
};

export const demoMode = import.meta.env.VITE_AUTH_MODE === 'mock' || (!import.meta.env.VITE_AUTH_MODE && (import.meta.env.VITE_DATA_MODE||'mock')!=='api');
const ACCOUNTS_KEY = 'smartaqua-eel-accounts-v1';
const SESSION_KEY = 'smartaqua-eel-session-v1';
const now = () => new Date().toISOString();
export const demoCredentials = [
  { role: 'Admin', username: 'admin', password: 'AquaAdmin#2026' },
  { role: 'Nông dân', username: 'farmer', password: 'AquaFarmer#2026' },
  { role: 'CEO hợp tác xã', username: 'cooperative', password: 'AquaCoop#2026' },
  { role: 'Lãnh đạo địa phương', username: 'leader', password: 'AquaLeader#2026' },
] as const;
const legacyNames: Record<string,string> = { 'admin.demo':'admin', 'farmer.demo':'farmer', 'cooperative.demo':'cooperative', 'leader.demo':'leader' };

const seeds = (): DemoAccount[] => {
  const createdAt = now();
  return [
    { id: 'demo-admin', username: 'admin', password: 'AquaAdmin#2026', name: 'Quản trị SmartAqua', role: 'admin', status: 'active', createdAt },
    { id: 'demo-farmer', username: 'farmer', password: 'AquaFarmer#2026', name: 'Nông dân trình diễn', role: 'farmer', status: 'active', farmerId: 'F001', createdAt },
    { id: 'demo-coop', username: 'cooperative', password: 'AquaCoop#2026', name: 'Quản lý HTX trình diễn', role: 'coop', status: 'active', coopId: 'HTX01', createdAt },
    { id: 'demo-leader', username: 'leader', password: 'AquaLeader#2026', name: 'Lãnh đạo địa phương', role: 'manager', status: 'active', unitIds: seed.administrativeUnits.map(u=>u.id), createdAt },
  ];
};
const readAccounts = (): DemoAccount[] => {
  if (!demoMode || typeof localStorage === 'undefined') return [];
  try {
    const saved = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || 'null');
    if (Array.isArray(saved)) {
      let changed=false;
      const migrated=saved.map((account:DemoAccount)=>{const username=legacyNames[account.username]||account.username;if(username!==account.username)changed=true;return username===account.username?account:{...account,username};});
      if(changed){localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(migrated));const remembered=localStorage.getItem('smartaqua-last-username');if(remembered&&legacyNames[remembered])localStorage.setItem('smartaqua-last-username',legacyNames[remembered]);}
      return migrated;
    }
  } catch { /* use demo defaults */ }
  const initial = seeds(); localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(initial)); return initial;
};
let accounts = typeof window === 'undefined' ? [] : readAccounts();
let active: DemoAccount | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const persist = () => { if (!demoMode) throw new Error('Quản lý tài khoản cần được thực hiện qua Auth API của máy chủ.'); localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); emit(); };

export const authService = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getAccount: () => active,
  listAccounts: () => [...accounts],
  async restore() {
    if (!demoMode) {
      const base = import.meta.env.VITE_API_BASE_URL;
      if (!base) return null;
      try { const response=await fetch(`${base}/auth/session`,{credentials:'include'}); if(!response.ok)return null; const data=await response.json(); active=data.user as DemoAccount; emit(); return active; } catch { return null; }
    }
    if (typeof sessionStorage === 'undefined') return null;
    const id = sessionStorage.getItem(SESSION_KEY); active = accounts.find(a => a.id === id && a.status === 'active') || null; emit(); return active;
  },
  async login(username: string, password: string) {
    if (!demoMode) {
      const base=import.meta.env.VITE_API_BASE_URL;
      if(!base)throw new Error('Chưa cấu hình VITE_API_BASE_URL cho Auth API.');
      const response=await fetch(`${base}/auth/login`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
      if(!response.ok)throw new Error(response.status===401?'Tên đăng nhập hoặc mật khẩu không chính xác.':'Dịch vụ xác thực hiện không khả dụng.');
      const data=await response.json();active=data.user as DemoAccount;emit();return active;
    }
    accounts = readAccounts(); const account = accounts.find(a => a.username.toLowerCase() === username.trim().toLowerCase() && a.password === password);
    if (!account) throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
    if (account.status !== 'active') throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
    active = { ...account, lastLogin: now() }; accounts = accounts.map(a => a.id === account.id ? active! : a); persist(); sessionStorage.setItem(SESSION_KEY, account.id); return active;
  },
  logout() { if(!demoMode&&import.meta.env.VITE_API_BASE_URL)void fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/logout`,{method:'POST',credentials:'include'});active = null; if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_KEY); emit(); },
  saveAccount(account: DemoAccount) { accounts = accounts.some(a => a.id === account.id) ? accounts.map(a => a.id === account.id ? account : a) : [account, ...accounts]; persist(); },
  deleteAccount(id: string) { accounts = accounts.filter(a => a.id !== id); persist(); },
};

export const getActiveAccount = () => active;
export const roleHome = (role: Role) => role === 'farmer' ? '/portal' : '/dashboard';
export const permissionFor = (role: Role, module: string, action = 'view') => {
  if (role === 'admin') return true;
  if (module === 'admin') return false;
  const base = role === 'manager' ? action === 'view' && ['dashboard','gis','reports','areas','farmers','ponds','cycles','diaries','harvests','ai'].includes(module)
    : role === 'coop' ? ['dashboard','gis','reports','areas','cooperatives','farmers','ponds','cycles','diaries','harvests','ai','review'].includes(module) && action !== 'delete'
    : ['dashboard','gis','areas','ponds','cycles','diaries','harvests','portal','ai','review'].includes(module) && action !== 'delete';
  const custom = active?.role === role ? active.permissions : undefined;
  return base && (!custom?.length || custom.includes(`${module}:${action}`) || (action !== 'view' && custom.includes(`${module}:view`)));
};
