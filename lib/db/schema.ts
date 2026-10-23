import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import type { CaminhoCriticoItem, GraficosData, Kpis, Pendencia, ResultadoFinal, Servico, TimelineEvento } from "@/lib/types";

export const paradas = pgTable("paradas", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  maquina: text("maquina").notNull(),
  area: text("area").notNull(),
  data: text("data").notNull(),
  duracaoPlanejada: text("duracao_planejada").notNull(),
  duracaoRealizada: text("duracao_realizada").notNull(),
  status: text("status").notNull(),
  responsavel: text("responsavel").notNull(),
  imagem: text("imagem").notNull(),
  fotosMaquina: jsonb("fotos_maquina").$type<string[]>().notNull().default([]),
  oficial: boolean("oficial").notNull().default(false),

  kpis: jsonb("kpis").$type<Kpis>().notNull(),
  timeline: jsonb("timeline").$type<TimelineEvento[]>().notNull().default([]),
  servicos: jsonb("servicos").$type<Servico[]>().notNull().default([]),
  caminhoCritico: jsonb("caminho_critico").$type<CaminhoCriticoItem[]>().notNull().default([]),
  pendencias: jsonb("pendencias").$type<Pendencia[]>().notNull().default([]),
  graficos: jsonb("graficos").$type<GraficosData>().notNull(),
  resultadoFinal: jsonb("resultado_final").$type<ResultadoFinal>().notNull(),

  criadoEm: timestamp("criado_em").notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
});

export type ParadaRow = typeof paradas.$inferSelect;
export type NovaParadaRow = typeof paradas.$inferInsert;

// Estado operacional separado da definição do relatório. Cada OS passa a ter
// sua própria linha para foto/status em campo: atualizar a OS 54.172 não
// precisa mais regravar (nem disputar versão com) todas as demais OS da
// parada. O JSON original continua como base de compatibilidade durante a
// migração gradual dos relatórios existentes.
export const servicoOperacoes = pgTable(
  "servico_operacoes",
  {
    paradaId: text("parada_id").notNull(),
    servicoId: text("servico_id").notNull(),
    dados: jsonb("dados").$type<Partial<Servico>>().notNull().default({}),
    atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.paradaId, table.servicoId] }),
    index("servico_operacoes_parada_idx").on(table.paradaId),
  ]
);

export type ServicoOperacaoRow = typeof servicoOperacoes.$inferSelect;

// Contador de rate limit compartilhado. Estava em memória do processo antes —
// o que em serverless não segura nada: cada instância tinha o próprio contador
// e um cold start zerava tudo, então bastava insistir pra cair numa instância
// "limpa". No banco o limite vale de verdade pra todas as instâncias juntas.
export const rateLimits = pgTable("rate_limits", {
  chave: text("chave").primaryKey(),
  contagem: integer("contagem").notNull().default(0),
  janelaInicio: timestamp("janela_inicio", { withTimezone: true }).notNull().defaultNow(),
});
