'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface OrgState {
  status: string;
  blocked: boolean;
  reason: string | null;
  message: string | null;
}

interface AuthCtx {
  user: User | null;
  org: OrgState | null;
  impersonating: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<OrgState | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setOrg(data.org ?? null);
        setImpersonating(!!data.impersonating);
      } else {
        setUser(null);
        setOrg(null);
        setImpersonating(false);
      }
    } catch {
      setUser(null);
      setOrg(null);
      setImpersonating(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setOrg(null);
    setImpersonating(false);
    router.push('/login');
  };

  return <Ctx.Provider value={{ user, org, impersonating, loading, logout, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
