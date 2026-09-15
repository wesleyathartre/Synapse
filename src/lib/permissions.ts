// Controle de acesso por tela (permissões por corretor).
// O admin escolhe, na tela de Usuários, quais telas cada corretor pode ver.
// Regras:
//  - ADMIN sempre acessa tudo.
//  - CORRETOR sem permissões definidas (legado) = tudo liberado (evita lockout).
//  - CORRETOR com lista definida = só as telas marcadas.

export interface ModuleDef {
  key: string;
  label: string;
  href: string;
}

// Telas que o admin pode liberar/bloquear por corretor
export const OPTIONAL_MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/' },
  { key: 'assistente', label: 'Assistente', href: '/assistente' },
  { key: 'funil', label: 'Funil', href: '/funil' },
  { key: 'leads', label: 'Leads', href: '/leads' },
  { key: 'clientes', label: 'Clientes', href: '/clientes' },
  { key: 'apolices', label: 'Apólices', href: '/apolices' },
  { key: 'sinistros', label: 'Sinistros', href: '/sinistros' },
  { key: 'boletos', label: 'Boletos', href: '/boletos' },
  { key: 'financeiro', label: 'Financeiro', href: '/financeiro' },
  { key: 'tarefas', label: 'Tarefas', href: '/tarefas' },
];

export const ALL_MODULE_KEYS = OPTIONAL_MODULES.map((m) => m.key);

// Telas exclusivas de administrador (nunca liberadas a corretor)
export const ADMIN_ONLY_PATHS = [
  '/minha-pagina',
  '/usuarios',
  '/produtos',
  '/seguradoras',
  '/importacao',
  '/sdr',
];

// Mantém apenas chaves de módulo válidas
export function sanitizePermissions(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  return keys.filter((k): k is string => typeof k === 'string' && ALL_MODULE_KEYS.includes(k));
}

// Telas que o usuário pode acessar
export function allowedKeys(role: string, permissions?: string[] | null): string[] {
  if (role === 'ADMIN') return ALL_MODULE_KEYS;
  if (!permissions || permissions.length === 0) return ALL_MODULE_KEYS; // legado
  return permissions;
}

export function canAccessKey(
  role: string,
  permissions: string[] | null | undefined,
  key: string,
): boolean {
  if (role === 'ADMIN') return true;
  if (!permissions || permissions.length === 0) return true; // legado
  return permissions.includes(key);
}

// Descobre a qual módulo um caminho pertence (ou null se não for tela controlada)
export function moduleKeyForPath(pathname: string): string | null {
  const sorted = [...OPTIONAL_MODULES].sort((a, b) => b.href.length - a.href.length);
  for (const m of sorted) {
    if (m.href === '/') {
      if (pathname === '/') return m.key;
    } else if (pathname === m.href || pathname.startsWith(m.href + '/')) {
      return m.key;
    }
  }
  return null;
}

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// Primeira tela permitida (para onde redirecionar quem cair numa tela bloqueada)
export function firstAllowedHref(role: string, permissions?: string[] | null): string {
  const keys = allowedKeys(role, permissions);
  const first = OPTIONAL_MODULES.find((m) => keys.includes(m.key));
  return first ? first.href : '/';
}
