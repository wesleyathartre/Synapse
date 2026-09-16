'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar, MobileNav, MobileHeader } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';

// Decide o layout: tela cheia no /login, app com navegação no resto
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { org } = useAuth();

  // Páginas em tela cheia (sem sidebar/nav): login e a política pública
  const isStandalone = pathname === '/login' || pathname === '/privacidade' || pathname === '/bloqueado';

  // Corretora bloqueada (trial vencido/suspensa) → tela de regularização.
  useEffect(() => {
    if (org?.blocked && pathname !== '/bloqueado') {
      router.replace('/bloqueado');
    }
  }, [org?.blocked, pathname, router]);

  if (isStandalone) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
