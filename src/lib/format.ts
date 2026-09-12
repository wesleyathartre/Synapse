// Utilidades de formatação (pt-BR)

export function money(v: number | null | undefined): string {
  return Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function moneyShort(v: number | null | undefined): string {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1000) {
    return `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  }
  return money(n);
}

export function formatDate(v: string | Date | null | undefined): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}

export function formatDateTime(v: string | Date | null | undefined): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

// Dias entre hoje e uma data (negativo = passado)
export function daysUntil(v: string | Date): number {
  const target = new Date(v);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
