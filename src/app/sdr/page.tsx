'use client';

import { Bot, Zap, MessageCircle, Settings, QrCode, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
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

      {/* Banner Evolution API */}
      <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-600 text-white mb-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
            <QrCode size={28} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-lg">Integração nativa com Evolution API</p>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                WhatsApp Web / QR Code
              </span>
            </div>
            <p className="text-brand-100 text-sm mt-1 leading-relaxed">
              O Synapse SDR opera conectado diretamente ao WhatsApp da sua corretora via Evolution API.
              Você continua utilizando o WhatsApp normalmente no seu celular enquanto o robô faz a triagem
              e qualificação automática dos leads com presença humanizada (delay de digitação).
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
            title: 'Recepção e PushName',
            desc: 'Responde ao primeiro contato no WhatsApp e já identifica o nome do cliente registrado no perfil.',
          },
          {
            icon: <ShieldCheck size={20} className="text-brand-600" />,
            bg: 'bg-brand-50',
            title: 'Humanização Anti-Bloqueio',
            desc: 'Simula digitação ("digitando...") por 1.5s antes de enviar a resposta, mantendo comportamento natural.',
          },
          {
            icon: <Zap size={20} className="text-amber-600" />,
            bg: 'bg-amber-50',
            title: 'Handoff com Alerta no CRM',
            desc: 'Ao qualificar o lead (ou a pedido do cliente), transfere para o corretor com resumo e tarefa imediata.',
          },
          {
            icon: <Settings size={20} className="text-violet-600" />,
            bg: 'bg-violet-50',
            title: 'Filtro Anti-Loop e Grupos',
            desc: 'Ignora automaticamente mensagens de grupos (@g.us) e mensagens enviadas pelo próprio corretor.',
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

      {/* Passos para conectar */}
      <Card className="p-6">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-brand-600" /> Como ativar o WhatsApp com a Evolution API
        </h2>
        <ol className="space-y-4">
          {[
            {
              n: '1',
              title: 'Subir ou acessar sua Evolution API',
              desc: 'Tenha sua instância da Evolution API rodando (ex: Docker na VPS, Hetzner, DigitalOcean ou Railway).',
            },
            {
              n: '2',
              title: 'Criar a instância e escanear o QR Code',
              desc: 'Crie uma instância (ex: "synapse") e escaneie o QR Code no seu WhatsApp (Aparelhos conectados > Conectar aparelho).',
            },
            {
              n: '3',
              title: 'Configurar o Webhook na Evolution API',
              desc: 'No painel da Evolution, aponte a URL do Webhook para: https://seu-crm.com/api/sdr/webhook marcando o evento MESSAGES_UPSERT.',
            },
            {
              n: '4',
              title: 'Definir as variáveis no ambiente (.env)',
              desc: 'Preencha EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME.',
            },
            {
              n: '5',
              title: 'Ativar a configuração do SDR no banco',
              desc: 'Certifique-se de que a tabela SdrConfig esteja com active: true para o seu usuário corretor.',
            },
          ].map((step) => (
            <li key={step.n} className="flex items-start gap-3.5">
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
            'WhatsApp (Evolution API)',
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
