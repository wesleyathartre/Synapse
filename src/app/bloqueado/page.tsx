'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { ShieldAlert, LogOut, Clock } from 'lucide-react';

export default function BloqueadoPage() {
  const { org, user, logout } = useAuth();

  const isTrial = org?.reason === 'TRIAL_EXPIRED';
  const message =
    org?.message ||
    'O acesso da sua corretora está temporariamente indisponível. Fale com o suporte.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-card p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
          {isTrial ? <Clock size={26} /> : <ShieldAlert size={26} />}
        </div>
        <h1 className="text-xl font-bold text-slate-800 mt-4">
          {isTrial ? 'Seu período de teste terminou' : 'Acesso suspenso'}
        </h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>

        <div className="mt-6 rounded-lg bg-slate-50 border border-slate-100 p-4 text-left text-sm text-slate-600 space-y-2">
          <p className="font-semibold text-slate-700">Como reativar</p>
          <p>
            Faça o pagamento via Pix e envie o comprovante para o suporte. Assim que confirmarmos,
            reativamos o acesso na hora.
          </p>
          <p className="text-xs text-slate-400">
            Suporte: suporte@synapsecrm.com
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <a href="mailto:suporte@synapsecrm.com?subject=Reativar%20acesso%20Synapse%20CRM">
            <Button className="w-full">Falar com o suporte</Button>
          </a>
          <button
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 py-2"
          >
            <LogOut size={15} /> Sair da conta {user?.email ? `(${user.email})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
