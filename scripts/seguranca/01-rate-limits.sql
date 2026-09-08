-- Tabela do rate limit compartilhado (lib/rate-limit.ts).
--
-- Rode isto ANTES de subir o código novo: sem a tabela, consumirLimite() cai
-- no catch e libera toda requisição — o app funciona, mas sem limite nenhum.
--
--   npx dotenv -e .env.local -- npx drizzle-kit push
--
-- ou, direto no SQL Editor do Neon, o conteúdo abaixo.

create table if not exists rate_limits (
  chave         text primary key,
  contagem      integer not null default 0,
  janela_inicio timestamptz not null default now()
);

-- Linha velha não serve pra nada: a janela já expirou e o contador é
-- recomeçado do zero na primeira tentativa seguinte. Sem uma limpeza, a tabela
-- só cresce, com uma linha por IP que já passou por aqui.
create index if not exists rate_limits_janela_idx on rate_limits (janela_inicio);

-- Limpeza manual (ou por cron do Neon, se quiser automatizar):
--   delete from rate_limits where janela_inicio < now() - interval '1 day';
