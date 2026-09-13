'use client';

import { Bot, Zap, MessageCircle, Settings, Lock, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui';

export default function SdrPage() {
  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 bg-brand-100 rounded-xl">
          <Bot size={28} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Synapse SDR</h1>
          <p className="text-slate-500 text-sm">Assistente de pré-atendimento e qualificação via WhatsApp</p>
        </div>
      </div>

      {/* Banner Meta Cloud API */}
      <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white mb-8 shadow-sm">
        <div className="flex items-start gap-4">
          <Zap size={32} className="shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-lg">WhatsApp Oficial (Meta Cloud API)</p>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                100% Serverless / Vercel
              </span>
            </div>
            <p className="text-brand-100 text-sm mt-1 leading-relaxed">
              O Synapse SDR opera conectado diretamente aos servidores da Meta (WhatsApp Business Platform).
              Não requer servidores VPS adicionais nem processos contínuos — toda a mensageria e triagem de leads
              roda de forma nativa e segura na Vercel e no Supabase.
            </p>
          </div>
        </div>
      </div>

      {/* Cards de funcionalidades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[
          {
            icon: <MessageCircle size={20} className="text-emerald-600" />,
            bg: 'bg-emerald-50',
            title: 'Recepção automática',
            desc: 'Responde imediatamente ao primeiro contato no WhatsApp com mensagem de boas-vindas personalizada.',
          },
          {
            icon: <Bot size={20} className="text-brand-600" />,
            bg: 'bg-brand-50',
            title: 'Qualificação por regras',
            desc: 'Faz perguntas de qualificação, coleta intenção, prazo e necessidade. Calcula score automaticamente.',
          },
          {
            icon: <Zap size={20} className="text-amber-600" />,
            bg: 'bg-amber-50',
            title: 'Handoff inteligente',
            desc: 'Transfere para humano no momento certo com resumo completo e score do lead salvo no CRM.',
          },
          {
            icon: <Settings size={20} className="text-violet-600" />,
            bg: 'bg-violet-50',
            title: 'Configurável sem código',
            desc: 'Edite mensagens, perguntas e pesos do score diretamente no painel.',
          },
        ].map((item, i) => (
          <Card key={i} className="p-4 flex items-start gap-3">
            <div className={`p-2 rounded-lg ${item.bg} shrink-0`}>{item.icon}</div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Passos para ativar */}
      <Card className="p-6">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Lock size={18} className="text-slate-500" /> Como ativar no Meta Developer Console
        </h2>
        <ol className="space-y-3.5">
          {[
            {
              n: '1',
              title: 'Acessar o Meta Developer Console',
              desc: 'Acesse developers.facebook.com, faça login e crie ou acesse seu app do tipo "Business" com o produto WhatsApp ativado.',
            },
            {
              n: '2',
              title: 'Configurar o Webhook',
              desc: 'Em WhatsApp > Configuração, adicione o URL de retorno: https://seu-dominio.vercel.app/api/sdr/webhook e o token de verificação (padrão: synapse-sdr-token). Marque o campo "messages".',
            },
            {
              n: '3',
              title: 'Adicionar variáveis de ambiente na Vercel',
              desc: 'No painel da Vercel (Settings > Environment Variables), adicione WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID.',
            },
            {
              n: '4',
              title: 'Ativar o SDR no Synapse',
              desc: 'No banco ou painel do Synapse, certifique-se de que a tabela SdrConfig esteja com active: true para o seu corretor.',
            },
          ].map((step) => (
            <li key={step.n} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step.n}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {/* Fluxo */}
      <Card className="p-5 mt-4">
        <h2 className="font-bold text-slate-800 mb-4">Fluxo do atendimento SDR</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            'WhatsApp (Meta Cloud API)',
            'Boas-vindas',
            'Identificar intenção',
            'Capturar interesse',
            'Capturar necessidade',
            'Capturar prazo',
            'Capturar contato',
            'Calcular score',
            'Handoff → Corretor',
          ].map((step, i, arr) => (
            <div key={i} className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium whitespace-nowrap">
                {step}
              </span>
              {i < arr.length - 1 && <ChevronRight size={14} className="text-slate-400 shrink-0" />}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Em qualquer etapa: digitar &quot;atendente&quot; transfere imediatamente para humano e cria uma tarefa prioritária no CRM.
        </p>
      </Card>
    </div>
  );
}
