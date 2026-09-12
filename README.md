# Synapse CRM — CRM para Corretores de Seguros

CRM comercial (estilo Salesforce / RD Station) voltado para **corretores de seguros** — compatível com **qualquer seguradora** (Porto Seguro, Bradesco, SulAmérica, Allianz, etc.).
Projeto **híbrido web + app**: uma única base de código roda no navegador e pode ser **instalado como aplicativo** (PWA) no celular e no desktop.

## ✨ Funcionalidades

- **Dashboard** com KPIs (pipeline, comissão do mês, leads, apólices) e gráficos.
- **Funil de vendas Kanban** com arrastar-e-soltar entre etapas (Novo → Contato → Proposta → Negociação → Ganho).
- **Leads** com origem, temperatura (frio/morno/quente) e **conversão em cliente + oportunidade** com um clique.
- **Clientes** (carteira de segurados) com contagem de negócios e apólices.
- **Apólices** com alerta automático de **renovação** (a vencer / vencida).
- **Tarefas & Agenda** (ligações, WhatsApp, e-mail, reuniões) com check rápido.
- **Login/JWT**, escopo por corretor (ADMIN vê tudo).
- **PWA**: instalável, com ícone e funcionamento offline básico.

## 🧱 Stack

- **Next.js 14** (App Router) — front + API numa base só
- **Prisma + SQLite** — banco em arquivo, sem servidor externo
- **Tailwind CSS**, **lucide-react**, **recharts**
- **JWT** (`jose`) + **bcryptjs**

## 🚀 Como rodar

```bash
cd porto-crm
npm install
npm run setup      # gera o Prisma Client, cria o banco e popula com dados de exemplo
npm run dev        # http://localhost:3000
```

### Acesso de demonstração
- **Admin:** `admin@synapsecrm.com` / `123456`
- **Corretor:** `ana@synapsecrm.com` / `123456`

## 📱 Instalar como app

1. Rode em produção: `npm run build && npm start`.
2. Abra no navegador do celular e toque em **“Adicionar à tela inicial”** (Android/Chrome) ou **Compartilhar → Adicionar à Tela de Início** (iOS/Safari).
3. O app abre em tela cheia, com navegação inferior estilo aplicativo.

## 🔧 Scripts úteis

| Script            | O que faz                                       |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Ambiente de desenvolvimento                     |
| `npm run setup`   | Prisma generate + db push + seed                |
| `npm run db:seed` | Repopula dados de exemplo                        |
| `npm run db:reset`| Zera o banco e semeia novamente                 |
| `npm run build`   | Build de produção                               |

> Banco local em `prisma/dev.db` (SQLite). Para produção, troque para PostgreSQL alterando o `datasource` no `schema.prisma` e a `DATABASE_URL`.
