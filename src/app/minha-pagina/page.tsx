'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Field, Input, Button } from '@/components/ui';
import { Globe, Loader2, CheckCircle2, Megaphone, ExternalLink } from 'lucide-react';

interface LandingConfig {
  campaignEnabled: boolean;
  campaignText: string;
  campaignLink: string;
}

// Link público do site do cliente (para o botão "Ver meu site")
const SITE_URL = 'https://synapse-athar.vercel.app';

export default function MinhaPaginaPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [campaignEnabled, setCampaignEnabled] = useState(false);
  const [campaignText, setCampaignText] = useState('');
  const [campaignLink, setCampaignLink] = useState('#simulador');

  useEffect(() => {
    if (!authLoading && user && user.role !== 'ADMIN') router.replace('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/landing');
        if (res.ok) {
          const { config } = await res.json();
          setCampaignEnabled(config.campaignEnabled);
          setCampaignText(config.campaignText);
          setCampaignLink(config.campaignLink || '#simulador');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/landing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignEnabled, campaignText, campaignLink }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Não foi possível salvar.');
        return;
      }
      setToast('Alterações salvas! Seu site já está atualizado.');
      setTimeout(() => setToast(''), 3500);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading || (user && user.role !== 'ADMIN')) {
    return <div className="p-8 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Globe className="text-brand-600" /> Minha Página
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Controle a campanha do seu site sem depender de ninguém.
          </p>
        </div>
        <a href={SITE_URL} target="_blank" rel="noreferrer">
          <Button variant="secondary">
            <ExternalLink size={16} /> Ver meu site
          </Button>
        </a>
      </div>

      <Card className="p-5 md:p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
            <Megaphone size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Faixa de campanha</h2>
            <p className="text-slate-500 text-sm">
              Uma faixa de destaque no topo do seu site para anunciar promoções.
            </p>
          </div>
        </div>

        {/* Liga/desliga */}
        <button
          type="button"
          onClick={() => setCampaignEnabled((v) => !v)}
          className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors mb-5"
        >
          <span className="text-sm font-semibold text-slate-700">
            {campaignEnabled ? 'Campanha ativada' : 'Campanha desativada'}
          </span>
          <span
            className={`relative w-11 h-6 rounded-full transition-colors ${
              campaignEnabled ? 'bg-brand-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                campaignEnabled ? 'translate-x-5' : ''
              }`}
            />
          </span>
        </button>

        <div className="space-y-4">
          <Field label="Texto da campanha">
            <Input
              value={campaignText}
              onChange={(e) => setCampaignText(e.target.value)}
              placeholder="Ex.: Faça uma simulação e ganhe uma condição especial 🚗"
              maxLength={160}
            />
          </Field>

          <Field label="Para onde a campanha leva (link)">
            <Input
              value={campaignLink}
              onChange={(e) => setCampaignLink(e.target.value)}
              placeholder="#simulador"
            />
            <p className="text-xs text-slate-400 mt-1">
              Deixe <b>#simulador</b> para levar ao simulador do site, ou cole um link (https://...).
            </p>
          </Field>
        </div>

        {/* Prévia */}
        {campaignEnabled && campaignText && (
          <div className="mt-5">
            <p className="text-xs font-bold text-slate-500 mb-2">Prévia</p>
            <div className="rounded-xl bg-sky-500/15 border border-sky-400/30 px-5 py-3 flex items-center justify-center gap-3 text-slate-700 text-sm">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-500 text-white text-xs font-bold">
                Campanha
              </span>
              <span className="font-medium">{campaignText}</span>
              <span>→</span>
            </div>
          </div>
        )}

        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

        <div className="flex justify-end mt-6">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Salvar alterações
          </Button>
        </div>
      </Card>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  );
}
