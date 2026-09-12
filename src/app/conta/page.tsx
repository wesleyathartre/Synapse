'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Field, Input, Button, Modal } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import {
  UserCog, ShieldCheck, Download, Trash2, KeyRound, Mail, ArrowLeft, Loader2, CheckCircle2,
} from 'lucide-react';

interface Account {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  acceptedTermsAt: string | null;
  termsVersion: string | null;
  marketingConsent: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function ContaPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [acc, setAcc] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // perfil
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [marketing, setMarketing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState('');

  // exclusão
  const [showDelete, setShowDelete] = useState(false);
  const [delPassword, setDelPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [delErr, setDelErr] = useState('');

  const load = async () => {
    const res = await fetch('/api/account');
    const data = await res.json();
    if (data.user) {
      setAcc(data.user);
      setName(data.user.name);
      setPhone(data.user.phone || '');
      setMarketing(data.user.marketingConsent);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, marketingConsent: marketing }),
      });
      if (res.ok) flash('Perfil atualizado com sucesso.');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPass(true);
    setPassMsg('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPassword('');
        setNewPassword('');
        flash('Senha alterada com sucesso.');
      } else {
        setPassMsg(data.error || 'Erro ao alterar senha');
      }
    } finally {
      setSavingPass(false);
    }
  };

  const exportData = () => {
    window.location.href = '/api/account/export';
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDelErr('');
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: delPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        await logout();
        router.push('/login');
      } else {
        setDelErr(data.error || 'Erro ao excluir conta');
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-pop">
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="md:hidden text-slate-400"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Minha Conta</h1>
          <p className="text-slate-500 text-sm mt-1">Dados pessoais, segurança e privacidade (LGPD).</p>
        </div>
      </div>

      {/* Perfil */}
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <UserCog size={18} className="text-brand-600" />
          <h2 className="font-bold text-slate-800">Dados do perfil</h2>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Telefone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            <Field label="E-mail"><Input value={acc?.email || ''} disabled className="bg-slate-50 text-slate-500" /></Field>
            <Field label="Perfil"><Input value={acc?.role === 'ADMIN' ? 'Administrador' : 'Corretor'} disabled className="bg-slate-50 text-slate-500" /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="accent-brand-600" />
            <Mail size={14} className="text-slate-400" />
            Aceito receber comunicações de marketing por e-mail
          </label>
          <div className="flex justify-end">
            <Button type="submit" disabled={savingProfile}>{savingProfile ? 'Salvando...' : 'Salvar alterações'}</Button>
          </div>
        </form>
      </Card>

      {/* Senha */}
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={18} className="text-brand-600" />
          <h2 className="font-bold text-slate-800">Alterar senha</h2>
        </div>
        <form onSubmit={changePassword} className="space-y-4">
          {passMsg && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{passMsg}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Senha atual"><Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></Field>
            <Field label="Nova senha (mín. 8, letra + número)"><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" disabled={savingPass}>{savingPass ? 'Alterando...' : 'Alterar senha'}</Button>
          </div>
        </form>
      </Card>

      {/* Privacidade / LGPD */}
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={18} className="text-emerald-600" />
          <h2 className="font-bold text-slate-800">Privacidade e seus dados (LGPD)</h2>
        </div>
        <div className="text-sm text-slate-500 space-y-1 mb-4">
          <p>Consentimento aceito em: <strong className="text-slate-700">{formatDateTime(acc?.acceptedTermsAt)}</strong> (v{acc?.termsVersion || '—'})</p>
          <p>Último acesso: <strong className="text-slate-700">{formatDateTime(acc?.lastLoginAt)}</strong></p>
          <p>Conta criada em: <strong className="text-slate-700">{formatDateTime(acc?.createdAt)}</strong></p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="secondary" onClick={exportData}>
            <Download size={16} /> Exportar meus dados
          </Button>
          <Link href="/privacidade" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
            <ShieldCheck size={16} /> Ler Política de Privacidade
          </Link>
        </div>
      </Card>

      {/* Zona de perigo */}
      <Card className="p-5 border-red-200">
        <div className="flex items-center gap-2 mb-2">
          <Trash2 size={18} className="text-red-600" />
          <h2 className="font-bold text-red-700">Excluir minha conta</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Ao excluir, todos os seus dados (leads, clientes, oportunidades, apólices e tarefas) são apagados
          permanentemente. Esta ação é irreversível.
        </p>
        <Button variant="danger" onClick={() => setShowDelete(true)}>
          <Trash2 size={16} /> Excluir conta e dados
        </Button>
      </Card>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Excluir conta" icon={<Trash2 size={18} className="text-red-600" />} maxWidth="max-w-md">
        <p className="text-sm text-slate-600 mb-4">
          Confirme sua senha para excluir definitivamente sua conta e todos os dados associados.
        </p>
        {delErr && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{delErr}</div>}
        <Field label="Senha">
          <Input type="password" value={delPassword} onChange={(e) => setDelPassword(e.target.value)} placeholder="Sua senha" />
        </Field>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancelar</Button>
          <Button variant="danger" onClick={deleteAccount} disabled={deleting || !delPassword}>
            {deleting ? 'Excluindo...' : 'Excluir definitivamente'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
