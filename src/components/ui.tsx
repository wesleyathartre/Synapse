'use client';

import { cx } from '@/lib/format';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

// ---------- Card ----------
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx('bg-white rounded-xl border border-slate-200 shadow-card', className)}>
      {children}
    </div>
  );
}

// ---------- Badge ----------
const badgeColors: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-100 text-blue-700',
  brand: 'bg-brand-100 text-brand-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  sky: 'bg-sky-100 text-sky-700',
  orange: 'bg-orange-100 text-orange-700',
  violet: 'bg-violet-100 text-violet-700',
};

export function Badge({
  color = 'slate',
  children,
  className,
}: {
  color?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
        badgeColors[color] || badgeColors.slate,
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------- Button ----------
export function Button({
  children,
  variant = 'primary',
  className,
  ...props
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants: Record<string, string> = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-500/30',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------- Inputs ----------
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none transition-all',
        'focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500',
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white transition-all',
        'focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500',
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none transition-all resize-none',
        'focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500',
        props.className,
      )}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

// ---------- Modal ----------
export function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  maxWidth = 'max-w-2xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-slate-900/50 z-50 flex items-start md:items-center justify-center p-3 md:p-4 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={cx('w-full bg-white shadow-2xl rounded-2xl my-4 animate-pop', maxWidth)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {icon}
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ---------- StatCard ----------
export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = 'brand',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: string;
}) {
  const accents: Record<string, string> = {
    brand: 'text-brand-600 bg-brand-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
    violet: 'text-violet-600 bg-violet-50',
    sky: 'text-sky-600 bg-sky-50',
  };
  return (
    <Card className="p-5">
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-2 truncate">{value}</p>
          {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
        </div>
        {icon && (
          <div className={cx('p-2.5 rounded-lg', accents[accent] || accents.brand)}>{icon}</div>
        )}
      </div>
    </Card>
  );
}

// ---------- Empty ----------
export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-12 text-center text-slate-400 text-sm">{children}</div>;
}
