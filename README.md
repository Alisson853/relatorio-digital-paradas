# Relatório Digital de Parada de Máquina

Sistema interno da Santher (unidade Guaíba) para documentar, acompanhar e apresentar
paradas de manutenção industrial — da abertura das ordens de serviço até o relatório
final, com captura de fotos em campo pelo celular e apresentação em tela cheia para
reunião de fechamento.

## O que o sistema faz

- **Criação e edição de relatórios** (`/novo`) — dados gerais da parada, serviços
  (OS) com equipe/responsável/tempo gasto, timeline de eventos, caminho crítico,
  pendências e planejado x realizado. Suporta importar a programação semanal
  direto de uma planilha Excel, sincronizando OS, etiquetas de segurança e horas
  por etapa automaticamente a cada reimportação.
- **Captura Rápida** (`/parada/[id]/fotos`) — tela otimizada para celular, usada em
  campo durante a parada: tirar foto de Antes/Durante/Depois de cada OS, marcar
  serviço como concluído, abrir uma OS nova na hora, marcar eventos da timeline.
  Ordena por pendência de foto e tem chips pra filtrar por responsável.
- **Apresentação** (`/parada/[id]`) — o relatório em si: capa, resumo, timeline,
  serviços executados, galeria de fotos, gráficos (horas por setor/serviço, Pareto
  de atrasos, planejado x realizado) e resultado final. Tem um modo apresentação em
  tela cheia (pra passar em reunião) e exporta pra PDF, PPTX, DOCX e RTF. A capa
  traz um QR code que leva direto pra essa página ao vivo.
- **Dashboard** (`/`) — lista de relatórios, com backup/restauração completa em JSON.
- **Histórico** (`/historico`) — comparação de indicadores (eficiência, horas,
  pendências) entre paradas ao longo do tempo.
- **Checklist de Pendências** (`/pendencias`) — visão cruzada de todos os
  relatórios com foto ou status ainda faltando.

## Modo editor

Não há login por usuário — é uma senha única (`EDITOR_PASSWORD`) que libera criar,
editar, excluir relatórios e enviar fotos. Ao entrar com a senha, o navegador guarda
um **token assinado pelo servidor** (válido por 24h), não a senha em si — toda ação
de escrita revalida esse token no servidor antes de tocar no banco. Visualizar um
relatório publicado (inclusive via QR code) não exige senha — é o comportamento
esperado, pra qualquer um na fábrica poder abrir o link e ver o relatório.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **Framer Motion** (animações) + **Recharts** (gráficos)
- **Drizzle ORM** sobre **Neon Postgres** (serverless) — todo o estado do app é uma
  única tabela (`paradas`), com os blocos maiores (serviços, gráficos, timeline
  etc.) guardados como `jsonb`
- **Vercel Blob** para as fotos (upload direto do celular, servidas como imagem
  pública)
- Geração de export **PPTX** (`pptxgenjs`), **DOCX** (`docx`) e **RTF** (escrito à
  mão, sem biblioteca — é o formato que a Mantec aceita colar direto)
- **Server Actions** (`lib/actions/`) como única porta de leitura/escrita no banco
  — não existe uma API REST separada por trás das telas

## Estrutura

```
app/                    rotas (App Router) — cada pasta é uma URL
  novo/                 formulário de criar/editar relatório
  parada/[id]/          apresentação do relatório + fotos (Captura Rápida)
  historico/            comparação entre paradas
  pendencias/           checklist cruzado de pendências
  api/export/           rotas que geram PPTX/DOCX/RTF sob demanda

components/
  presentation/         telas do relatório (seções, apresentação, export PDF)
  forms/                campos e editores de linha do formulário /novo
  dashboard/            cards, gráficos e controles do dashboard
  shared/                gate de senha do modo editor

lib/
  actions/               Server Actions — única porta de entrada pro banco
  db/                    schema Drizzle + client Neon
  derive.ts              cálculo de KPIs e gráficos a partir dos serviços
  import-planilha.ts     leitor da planilha de programação semanal
  types.ts                tipos compartilhados entre client e server
```

## Rodando localmente

```bash
npm install
npx vercel env pull .env.local   # puxa as variáveis do projeto na Vercel
npm run dev
```

Variáveis de ambiente necessárias (veja `.env.local` — nunca committado):

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Conexão com o Neon Postgres |
| `BLOB_READ_WRITE_TOKEN` | Upload de fotos no Vercel Blob |
| `EDITOR_PASSWORD` | Senha do modo editor (também usada pra assinar o token de sessão) |

Migrações de schema: `npx dotenv -e .env.local -- npx drizzle-kit push`.

## Deploy

```bash
npx vercel deploy --prod
```
