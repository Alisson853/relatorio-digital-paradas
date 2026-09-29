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
| `APP_DATABASE_URL` | Conexão com o Neon Postgres, pelo role limitado `app_paradas` (SELECT/INSERT/UPDATE/DELETE, sem DDL) — é a que o app usa em runtime |
| `DATABASE_URL` | Conexão com o role DONO do banco — só para rodar migração (`drizzle-kit`); fallback de `APP_DATABASE_URL` se ela não estiver definida |
| `BLOB_READ_WRITE_TOKEN` | Upload de fotos no Vercel Blob |
| `EDITOR_PASSWORD_HASH` | Hash scrypt da senha do modo editor (preferido — gerado com `scripts/gerar-hash-senha.mjs`) |
| `EDITOR_PASSWORD` | Senha em texto puro do modo editor — fallback de `EDITOR_PASSWORD_HASH` para deploys ainda não migrados; evite em produção |
| `SESSION_SECRET` | Segredo usado para assinar (HMAC) o token de sessão do editor — se ausente, cai para `EDITOR_PASSWORD_HASH`/`EDITOR_PASSWORD` |

Migrações de schema: `npx dotenv -e .env.local -- npx drizzle-kit push` (usa `DATABASE_URL`, a credencial de dono — nunca `APP_DATABASE_URL`).

## Escrita e concorrência

Toda mutação pontual (foto, status, "não será feito", OS/evento rápido) usa concorrência
otimista sobre a coluna `atualizado_em` (`lib/db/paradas-repo.ts`): lê o relatório, tenta
gravar só se a versão não mudou desde a leitura, e relê+reaplica automaticamente em caso de
conflito (até 5 tentativas). O formulário `/novo` (que reenvia o relatório inteiro) usa a
mesma coluna para **recusar** salvar por cima de uma mudança concorrente, em vez de tentar
de novo — quem está editando decide se recarrega. Não existe transação/lock no banco: o
driver (`neon-http`) fala por HTTP, sem conexão persistente, então cada escrita é um
`UPDATE ... WHERE atualizado_em = X` de via única.

## Offline e sincronização

A Captura Rápida (`/parada/[id]/fotos`) guarda três filas independentes no IndexedDB do
aparelho (fotos, "não será feito", mudança de status — `lib/offline-fotos.ts`,
`lib/offline-nao-feito.ts`, `lib/offline-status.ts`), processadas por um motor comum
(`lib/offline-sync.ts`) que tenta reenviar a cada 20s e no evento `online`. Um item que falha
por rede continua tentando sozinho; um item recusado pelo servidor vira "erro" e só é
tentado de novo com o botão "Tentar novamente" explícito — evita repetir uma rejeição de
negócio pra sempre. Cada fila tem uma guarda de reentrância própria para nunca processar a
si mesma duas vezes em paralelo.

## Testes

```bash
npx vitest run
```

Cobre a lógica pura de concorrência, mutações de serviço, filtros, exportação tabular e as
filas offline — deliberadamente sem jsdom/Testing Library: componentes `"use client"` são
validados por inspeção + TypeScript, não por teste automatizado (ver comentários em
`vitest.config.mts`).

## Deploy

```bash
npx vercel deploy --prod
```
