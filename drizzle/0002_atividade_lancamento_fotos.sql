CREATE TABLE IF NOT EXISTS "atividade_lancamento_fotos" (
  "id" text PRIMARY KEY NOT NULL,
  "lancamento_id" text NOT NULL REFERENCES "atividade_lancamentos"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "atividade_lancamento_fotos_lancamento_idx" ON "atividade_lancamento_fotos" USING btree ("lancamento_id");
