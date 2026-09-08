-- Row Level Security + role de aplicação separado, no Neon.
--
-- ============================================================================
-- LEIA ANTES DE RODAR
-- ============================================================================
--
-- Hoje o app conecta no Postgres como o role OWNER do banco. Isso significa
-- que a connection string que está na Vercel pode, além de ler e gravar
-- relatórios, apagar tabelas, criar roles e ler qualquer coisa do banco. Se
-- essa string vazar (um log, um print de tela, um backup de env, um npx que
-- imprimiu o ambiente), quem pegou tem o banco inteiro.
--
-- E RLS sozinho não resolve isso: o owner de uma tabela IGNORA as policies por
-- padrão. Ativar RLS e continuar conectando como owner dá uma falsa sensação
-- de proteção — as policies simplesmente não se aplicam. Por isso este script
-- faz as duas coisas juntas, e por isso a troca da DATABASE_URL no passo 6 não
-- é opcional: sem ela, nada aqui tem efeito.
--
-- O que isto NÃO faz: separar usuários. Não existe login por pessoa neste app
-- (é uma senha só, compartilhada), então não há "cada um vê os seus dados" a
-- implementar. O ganho aqui é outro e é real: limitar o estrago de um
-- vazamento da credencial de banco.
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Role da aplicação, sem nenhum poder de estrutura
-- ----------------------------------------------------------------------------
-- Troque a senha abaixo por uma gerada na hora, por exemplo:
--   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"

create role app_paradas with login password 'TROQUE_ESTA_SENHA';

-- Pode se conectar e enxergar o schema, e nada além disso.
grant connect on database neondb to app_paradas;
grant usage on schema public to app_paradas;

-- Só as duas tabelas do app, e só DML. Sem CREATE, sem DROP, sem ALTER:
-- migração continua sendo feita com a credencial de owner, à mão.
grant select, insert, update, delete on table paradas     to app_paradas;
grant select, insert, update, delete on table rate_limits to app_paradas;

-- Tabela nova criada no futuro NÃO fica acessível automaticamente — é
-- deliberado. Prefira lembrar de conceder do que descobrir tarde que uma
-- tabela nasceu aberta. Se quiser o contrário, descomente:
-- alter default privileges in schema public
--   grant select, insert, update, delete on tables to app_paradas;

-- ----------------------------------------------------------------------------
-- 2. Ativar RLS
-- ----------------------------------------------------------------------------
-- ENABLE liga a checagem. FORCE faz ela valer inclusive pro owner da tabela —
-- sem FORCE, qualquer conexão de owner (a sua, a de uma migração, a de um
-- script esquecido) passa por cima de tudo que está escrito abaixo.

alter table paradas     enable row level security;
alter table paradas     force  row level security;
alter table rate_limits enable row level security;
alter table rate_limits force  row level security;

-- ----------------------------------------------------------------------------
-- 3. Policies
-- ----------------------------------------------------------------------------
-- Com RLS ativo e nenhuma policy, a tabela fica inacessível pra todo mundo
-- (o padrão é negar). As policies abaixo devolvem o acesso, mas SÓ pro role da
-- aplicação e SÓ nas operações que o app realmente faz.

drop policy if exists paradas_app on paradas;
create policy paradas_app on paradas
  for all
  to app_paradas
  using (true)
  with check (true);

drop policy if exists rate_limits_app on rate_limits;
create policy rate_limits_app on rate_limits
  for all
  to app_paradas
  using (true)
  with check (true);

-- "using (true)" pode parecer que não filtra nada, e de fato não filtra por
-- linha — não há por quê, já que não existe usuário por pessoa. O que a policy
-- faz é amarrar o acesso ao role: qualquer outro role que apareça no banco
-- (um criado por engano, um de integração, um de leitura pra BI) cai no padrão
-- de negar e não enxerga uma linha sequer.

-- ----------------------------------------------------------------------------
-- 4. Bloquear o role público
-- ----------------------------------------------------------------------------
-- No Postgres, PUBLIC é um role implícito do qual todos herdam. Deixar
-- privilégio nele é o erro clássico que faz RLS parecer que "não pegou".

revoke all on schema public from public;
revoke all on all tables in schema public from public;
grant usage on schema public to app_paradas;

-- ----------------------------------------------------------------------------
-- 5. Conferir
-- ----------------------------------------------------------------------------
-- Espere ver rowsecurity = true e relforcerowsecurity = true nas duas tabelas.

-- select relname, relrowsecurity, relforcerowsecurity
--   from pg_class where relname in ('paradas', 'rate_limits');
-- select tablename, policyname, roles from pg_policies where schemaname = 'public';

-- ----------------------------------------------------------------------------
-- 6. Trocar a DATABASE_URL (o passo que faz tudo isso valer)
-- ----------------------------------------------------------------------------
-- Pegue a connection string atual do Neon e troque APENAS usuário e senha pelo
-- role novo, mantendo host, banco e os parâmetros:
--
--   postgresql://app_paradas:<senha>@<host>.neon.tech/neondb?sslmode=require
--
-- O sslmode=require não é detalhe: sem ele o driver pode aceitar uma conexão
-- em texto puro, e aí a senha do banco e os dados dos relatórios trafegam
-- abertos até o Neon.
--
-- Atualize DATABASE_URL na Vercel (Production, Preview e Development) e no
-- .env.local. Guarde a string de owner em outro lugar — ela ainda é necessária
-- pra rodar migração (drizzle-kit push).
--
-- Teste antes de considerar pronto: abra um relatório, salve uma edição e
-- suba uma foto. Se der erro de permissão, falta um GRANT no passo 1 pra
-- alguma tabela — é o modo de falhar esperado, e é reversível na hora
-- voltando a DATABASE_URL anterior.
