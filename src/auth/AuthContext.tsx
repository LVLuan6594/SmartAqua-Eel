import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { DemoAccount } from './authService';
import { authService } from './authService';
import { store } from '../store/demoStore';

type AuthState = { account: DemoAccount | null; ready: boolean; login: (username: string, password: string) => Promise<DemoAccount>; logout: () => void };
const Context = createContext<AuthState | null>(null);
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [account, setAccount] = useState<DemoAccount | null>(null); const [ready, setReady] = useState(false);
  useEffect(() => { let live=true;void authService.restore().then(value=>{if(live){if(value)store.setRole(value.role);setAccount(value);}}).finally(()=>{if(live)setReady(true);});return()=>{live=false;}; }, []);
  const value = useMemo<AuthState>(() => ({ account, ready, login: async (u, p) => { const next = await authService.login(u,p); store.setRole(next.role); setAccount(next); return next; }, logout: () => { authService.logout(); setAccount(null); } }), [account, ready]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useAuth = () => { const value = useContext(Context); if (!value) throw new Error('useAuth cần AuthProvider'); return value; };
