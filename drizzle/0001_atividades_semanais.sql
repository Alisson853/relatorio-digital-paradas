CREATE TABLE IF NOT EXISTS "atividade_usuarios" (
  "id" text PRIMARY KEY NOT NULL,
  "identificador" text NOT NULL,
  "nome" text NOT NULL,
  "oficina" text DEFAULT '' NOT NULL,
  "funcao" text DEFAULT '' NOT NULL,
  "perfil" text DEFAULT 'funcionario' NOT NULL,
  "ativo" boolean DEFAULT true NOT NULL,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "atividade_usuarios_identificador_idx" ON "atividade_usuarios" USING btree ("identificador");

CREATE TABLE IF NOT EXISTS "atividade_importacoes" (
  "id" text PRIMARY KEY NOT NULL,
  "mes" integer NOT NULL,
  "ano" integer NOT NULL,
  "arquivo" text NOT NULL,
  "linhas_lidas" integer DEFAULT 0 NOT NULL,
  "linhas_importadas" integer DEFAULT 0 NOT NULL,
  "importado_por" text NOT NULL,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "atividade_programacoes" (
  "id" text PRIMARY KEY NOT NULL,
  "chave" text NOT NULL,
  "importacao_id" text REFERENCES "atividade_importacoes"("id") ON DELETE SET NULL,
  "status_planilha" text DEFAULT 'Pendente' NOT NULL,
  "data" text NOT NULL,
  "dia" integer NOT NULL,
  "equipamento" text DEFAULT '' NOT NULL,
  "descricao" text DEFAULT '' NOT NULL,
  "os" text NOT NULL,
  "tipo_servico" text DEFAULT '' NOT NULL,
  "tempo_previsto_minutos" integer DEFAULT 0 NOT NULL,
  "oficina" text DEFAULT '' NOT NULL,
  "executante" text NOT NULL,
  "executante_normalizado" text NOT NULL,
  "prioridade" text DEFAULT '' NOT NULL,
  "justificativa_planilha" text DEFAULT '' NOT NULL,
  "cancelado" boolean DEFAULT false NOT NULL,
  "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "atividade_programacoes_chave_idx" ON "atividade_programacoes" USING btree ("chave");
CREATE INDEX IF NOT EXISTS "atividade_programacoes_data_executante_idx" ON "atividade_programacoes" USING btree ("data", "executante_normalizado");
CREATE INDEX IF NOT EXISTS "atividade_programacoes_status_idx" ON "atividade_programacoes" USING btree ("status_planilha");

CREATE TABLE IF NOT EXISTS "atividade_lancamentos" (
  "id" text PRIMARY KEY NOT NULL,
  "programacao_id" text NOT NULL REFERENCES "atividade_programacoes"("id") ON DELETE CASCADE,
  "usuario_id" text NOT NULL REFERENCES "atividade_usuarios"("id") ON DELETE RESTRICT,
  "data" text NOT NULL,
  "inicio_minutos" integer NOT NULL,
  "fim_minutos" integer NOT NULL,
  "minutos" integer NOT NULL,
  "observacao" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'Andamento' NOT NULL,
  "justificativa" text DEFAULT '' NOT NULL,
  "aprovado_por" text,
  "aprovado_em" timestamp with time zone,
  "exportado_em" timestamp with time zone,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "atividade_lancamentos_usuario_data_idx" ON "atividade_lancamentos" USING btree ("usuario_id", "data");
CREATE INDEX IF NOT EXISTS "atividade_lancamentos_programacao_idx" ON "atividade_lancamentos" USING btree ("programacao_id");
CREATE INDEX IF NOT EXISTS "atividade_lancamentos_aprovacao_idx" ON "atividade_lancamentos" USING btree ("aprovado_em", "exportado_em");

CREATE TABLE IF NOT EXISTS "atividade_auditoria" (
  "id" text PRIMARY KEY NOT NULL,
  "ator" text NOT NULL,
  "acao" text NOT NULL,
  "entidade" text NOT NULL,
  "entidade_id" text NOT NULL,
  "detalhe" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "atividade_auditoria_entidade_idx" ON "atividade_auditoria" USING btree ("entidade", "entidade_id");
