import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';
import { TERMS_VERSION } from '@/lib/legal';

export const metadata = {
  title: 'Política de Privacidade — Synapse CRM',
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Shield size={18} />
            </div>
            <span className="font-bold">Synapse CRM</span>
          </div>
          <Link href="/login" className="text-sm text-slate-300 hover:text-white flex items-center gap-1">
            <ArrowLeft size={16} /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Política de Privacidade e Termos de Uso</h1>
        <p className="text-sm text-slate-400 mt-1">Versão {TERMS_VERSION} · em conformidade com a Lei nº 13.709/2018 (LGPD)</p>

        <div className="prose prose-sm max-w-none mt-6 space-y-6 text-slate-700">
          <section>
            <h2 className="text-lg font-bold text-slate-800">1. Quem somos (Controlador)</h2>
            <p>
              O Synapse CRM é uma plataforma de gestão comercial destinada a corretores de seguros. Para fins da LGPD,
              o corretor/empresa usuária atua como <strong>controlador</strong> dos dados de seus clientes, e o
              Synapse CRM como <strong>operador</strong>, tratando dados conforme as instruções do usuário.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800">2. Dados que coletamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Cadastro:</strong> nome, e-mail, telefone e senha (armazenada de forma criptografada).</li>
              <li><strong>Uso do CRM:</strong> leads, clientes, oportunidades, apólices e tarefas que você registra.</li>
              <li><strong>Registros técnicos:</strong> data/hora de acesso, endereço IP e navegador, para segurança e auditoria.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800">3. Finalidade e base legal</h2>
            <p>
              Tratamos seus dados para prestar o serviço contratado (execução de contrato), cumprir obrigações legais e,
              mediante seu <strong>consentimento</strong>, enviar comunicações de marketing. O consentimento pode ser
              retirado a qualquer momento na página <strong>Minha Conta</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800">4. Compartilhamento</h2>
            <p>
              Não vendemos seus dados. O compartilhamento ocorre apenas com prestadores essenciais (ex.: hospedagem)
              e quando exigido por lei ou autoridade competente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800">5. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais: senhas com hash (bcrypt), autenticação por token,
              controle de acesso por usuário, limitação de tentativas de login e trilha de auditoria de eventos sensíveis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800">6. Seus direitos (art. 18 da LGPD)</h2>
            <p>Você pode, a qualquer momento:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Acessar e exportar</strong> seus dados (portabilidade) — em <em>Minha Conta → Exportar meus dados</em>.</li>
              <li><strong>Corrigir</strong> dados incompletos ou desatualizados.</li>
              <li><strong>Revogar consentimento</strong> de marketing.</li>
              <li><strong>Eliminar</strong> sua conta e dados (direito ao esquecimento) — em <em>Minha Conta → Excluir conta</em>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800">7. Retenção</h2>
            <p>
              Mantemos os dados enquanto sua conta estiver ativa. Após a exclusão, os dados pessoais são eliminados,
              ressalvadas as informações que a lei exigir preservar.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800">8. Contato do Encarregado (DPO)</h2>
            <p>
              Dúvidas ou solicitações relativas aos seus dados podem ser enviadas ao Encarregado de Proteção de Dados
              pelo e-mail <strong>dpo@synapsecrm.com</strong>.
            </p>
          </section>
        </div>

        <div className="mt-10">
          <Link href="/login" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-lg">
            <ArrowLeft size={16} /> Voltar ao login
          </Link>
        </div>
      </main>
    </div>
  );
}
