'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UserCog, LogOut } from 'lucide-react';
import { Sidebar, MobileNav, MobileHeader } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';

// Faixa fixa mostrada quando o OWNER está acessando como uma corretora
function ImpersonationBanner() {
  const { user, refresh } = useAuth();
  const router = useRouter();

  const stop = async () => {
    await fetch('/api/platform/impersonate/stop', { method: 'POST' });
    await refresh();
    router.push('/plataforma');
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-amber-500 text-white px-4 py-2 text-sm font-semibold">
      <span className="flex items-center gap-2 min-w-0">
        <UserCog size={16} />
        <span className="truncate">
          Acessando como {user?.name} ({user?.email})
        </span>
      </span>
      <button
        onClick={stop}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1 transition-colors shrink-0"
      >
        <LogOut size={14} /> Voltar para a plataforma
      </button>
    </div>
  );
}

// Decide o layout: tela cheia no /login, app com navegação no resto
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { org, impersonating } = useAuth();

  // Páginas em tela cheia (sem sidebar/nav): login e a política pública
  const isStandalone = pathname === '/login' || pathname === '/privacidade' || pathname === '/bloqueado';

  // Corretora bloqueada (trial vencido/suspensa) → tela de regularização.
  useEffect(() => {
    if (org?.blocked && pathname !== '/bloqueado') {
      router.replace('/bloqueado');
    }
  }, [org?.blocked, pathname, router]);

  const banner = impersonating ? <ImpersonationBanner /> : null;

  if (isStandalone) {
    return (
      <div className="flex flex-col min-h-screen">
        {banner}
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {banner}
      <div className="flex flex-1 overflow-hidden bg-slate-50 min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
        </div>
        <MobileNav />
      </div>
    </div>
  );
}
