'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react';

type Tab = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [tab, setTab] = useState<Tab>('login');

  // login
  const [email, setEmail] = useState('admin@synapsecrm.com');
  const [password, setPassword] = useState('123456');

  // signup
  const [name, setName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const switchTab = (t: Tab) => {
    setTab(t);
    setError('');
  };

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Falha no login');
        return;
      }
      await refresh();
      router.push('/');
    } catch {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const doSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: suEmail,
          phone,
          password: suPassword,
          acceptTerms,
          marketingConsent: marketing,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Não foi possível criar a conta');
        return;
      }
      await refresh();
      router.push('/');
    } catch {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-brand-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-brand-600 items-center justify-center mb-4 shadow-lg shadow-brand-500/30">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Synapse CRM</h1>
          <p className="text-slate-400 text-sm mt-1">Gestão comercial para corretores de seguros</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Abas */}
          <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
                tab === 'login' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => switchTab('signup')}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
                tab === 'signup' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              Criar conta
            </button>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={doLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="voce@corretora.com" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Senha</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••" required />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
              <p className="text-center text-xs text-slate-400">
                Demo: <span className="font-semibold text-slate-500">admin@synapsecrm.com</span> / 123456
              </p>
            </form>
          ) : (
            <form onSubmit={doSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Nome completo</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Seu nome" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">E-mail</label>
                <input type="email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} className={inputCls} placeholder="voce@corretora.com" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Telefone (opcional)</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="(11) 90000-0000" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Senha</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={suPassword} onChange={(e) => setSuPassword(e.target.value)} className={inputCls} placeholder="Mín. 8 caracteres, com letra e número" required />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 accent-brand-600" required />
                <span>
                  Li e aceito os{' '}
                  <Link href="/privacidade" target="_blank" className="text-brand-600 font-semibold hover:underline">
                    Termos de Uso e a Política de Privacidade
                  </Link>{' '}
                  (LGPD).
                </span>
              </label>

              <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 accent-brand-600" />
                <span>Aceito receber novidades e comunicações por e-mail (opcional).</span>
              </label>

              <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Criando conta...' : 'Criar minha conta'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Seus dados são protegidos conforme a{' '}
          <Link href="/privacidade" className="text-slate-300 hover:underline">LGPD</Link>. Instale no
          celular: “Adicionar à tela inicial”.
        </p>
      </div>
    </div>
  );
}
