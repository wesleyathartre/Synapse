'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { initials, cx } from '@/lib/format';
import { canAccessKey, moduleKeyForPath } from '@/lib/permissions';
import {
  LayoutDashboard,
  KanbanSquare,
  UserPlus,
  Users,
  FileText,
  CheckSquare,
  LogOut,
  Package,
  Receipt,
  Upload,
  Bot,
  UserCog,
  Sparkles,
  Globe,
  Wallet,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

export const NAV = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assistente', label: 'Assistente', icon: Sparkles },
  { href: '/funil',     label: 'Funil',     icon: KanbanSquare },
  { href: '/leads',     label: 'Leads',     icon: UserPlus },
  { href: '/clientes',  label: 'Clientes',  icon: Users },
  { href: '/apolices',  label: 'Apólices',  icon: FileText },
  { href: '/sinistros', label: 'Sinistros', icon: ShieldAlert },
  { href: '/boletos',   label: 'Boletos',   icon: Receipt },
  { href: '/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/tarefas',   label: 'Tarefas',   icon: CheckSquare },
];

// Itens visíveis apenas para administradores
export const ADMIN_NAV = [
  { href: '/minha-pagina', label: 'Minha Página', icon: Globe },
  { href: '/usuarios',   label: 'Usuários',   icon: UserCog },
  { href: '/produtos',   label: 'Produtos',   icon: Package },
  { href: '/seguradoras', label: 'Seguradoras', icon: ShieldCheck },
  { href: '/importacao', label: 'Importação', icon: Upload },
  { href: '/sdr',        label: 'SDR',        icon: Bot },
];

// ------- Sidebar (desktop) -------
export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visibleNav = NAV.filter((item) =>
    canAccessKey(user?.role || '', user?.permissions, moduleKeyForPath(item.href) || ''),
  );

  return (
    <aside className="hidden md:flex w-60 shrink-0 bg-slate-900 text-white flex-col h-full">
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="Synapse CRM" className="w-9 h-9 rounded-lg" />
        <div className="leading-tight">
          <p className="font-bold text-sm">Synapse CRM</p>
          <p className="text-[11px] text-slate-400">Corretor de Seguros</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white',
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}

        {user?.role === 'ADMIN' && (
          <div className="pt-3 mt-3 border-t border-white/10">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Administração</p>
            {ADMIN_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    active ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2">
          <Link href="/conta" className="flex items-center gap-3 flex-1 min-w-0 rounded-lg hover:bg-white/10 px-1 py-1 -mx-1 transition-colors" title="Minha conta">
            <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold">
              {user ? initials(user.name) : '?'}
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <p className="text-sm font-semibold truncate">{user?.name || '—'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.role === 'ADMIN' ? 'Administrador' : 'Corretor'}</p>
            </div>
          </Link>
          <button onClick={logout} title="Sair" className="p-2 text-slate-400 hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ------- Bottom nav (mobile / app) -------
export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const visibleNav = NAV.filter((item) =>
    canAccessKey(user?.role || '', user?.permissions, moduleKeyForPath(item.href) || ''),
  );
  const items = user?.role === 'ADMIN' ? [...visibleNav, ...ADMIN_NAV] : visibleNav;
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 flex justify-around safe-bottom">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cx(
              'flex flex-col items-center justify-center gap-0.5 py-2 flex-1 text-[10px] font-medium transition-colors',
              active ? 'text-brand-600' : 'text-slate-400',
            )}
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

// ------- Topbar (mobile header) -------
export function MobileHeader() {
  const { user } = useAuth();
  return (
    <header className="md:hidden sticky top-0 z-30 bg-slate-900 text-white px-4 py-3 flex items-center justify-between safe-top">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="Synapse CRM" className="w-7 h-7 rounded-md" />
        <span className="font-bold text-sm">Synapse CRM</span>
      </div>
      <Link href="/conta" title="Minha conta" className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold">
        {user ? initials(user.name) : '?'}
      </Link>
    </header>
  );
}
