import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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
    // A operação não pode existir sem o relatório pai. Além de proteger dados
    // inválidos, o cascade evita sobras quando um relatório é removido.
    paradaId: text("parada_id").notNull().references(() => paradas.id, { onDelete: "cascade" }),
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

// Eventos que merecem atenção da operação: falhas de gravação, backups e
// recuperações. Diferente do log efêmero da plataforma, ficam consultáveis no
// próprio sistema para que a equipe consiga agir antes de perder informação.
export const eventosOperacionais = pgTable(
  "eventos_operacionais",
  {
    id: text("id").primaryKey(),
    tipo: text("tipo").notNull(),
    severidade: text("severidade").notNull(),
    mensagem: text("mensagem").notNull(),
    paradaId: text("parada_id").references(() => paradas.id, { onDelete: "set null" }),
    servicoId: text("servico_id"),
    detalhe: jsonb("detalhe").$type<Record<string, unknown>>().notNull().default({}),
    resolvidoEm: timestamp("resolvido_em"),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (table) => [
    index("eventos_operacionais_criado_idx").on(table.criadoEm),
    index("eventos_operacionais_abertos_idx").on(table.resolvidoEm),
  ]
);

export type EventoOperacionalRow = typeof eventosOperacionais.$inferSelect;

// Contador de rate limit compartilhado. Estava em memória do processo antes —
// o que em serverless não segura nada: cada instância tinha o próprio contador
// e um cold start zerava tudo, então bastava insistir pra cair numa instância
// "limpa". No banco o limite vale de verdade pra todas as instâncias juntas.
export const rateLimits = pgTable("rate_limits", {
  chave: text("chave").primaryKey(),
  contagem: integer("contagem").notNull().default(0),
  janelaInicio: timestamp("janela_inicio", { withTimezone: true }).notNull().defaultNow(),
});

// Módulo Atividades Semanais -------------------------------------------------
// Estas tabelas não compartilham dados com o relatório de Paradas. Assim uma
// importação de programação ou lançamento de horas jamais altera o relatório
// digital já em operação.
export const atividadeUsuarios = pgTable(
  "atividade_usuarios",
  {
    id: text("id").primaryKey(),
    identificador: text("identificador").notNull(), // RE ou usuário do terceiro
    nome: text("nome").notNull(),
    oficina: text("oficina").notNull().default(""),
    funcao: text("funcao").notNull().default(""),
    perfil: text("perfil").notNull().default("funcionario"),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("atividade_usuarios_identificador_idx").on(table.identificador)]
);

export const atividadeImportacoes = pgTable("atividade_importacoes", {
  id: text("id").primaryKey(),
  mes: integer("mes").notNull(),
  ano: integer("ano").notNull(),
  arquivo: text("arquivo").notNull(),
  linhasLidas: integer("linhas_lidas").notNull().default(0),
  linhasImportadas: integer("linhas_importadas").notNull().default(0),
  importadoPor: text("importado_por").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const atividadeProgramacoes = pgTable(
  "atividade_programacoes",
  {
    id: text("id").primaryKey(),
    chave: text("chave").notNull(), // OS + executante normalizado + data
    importacaoId: text("importacao_id").references(() => atividadeImportacoes.id, { onDelete: "set null" }),
    statusPlanilha: text("status_planilha").notNull().default("Pendente"),
    data: text("data").notNull(), // yyyy-mm-dd, sempre America/Sao_Paulo
    dia: integer("dia").notNull(),
    equipamento: text("equipamento").notNull().default(""),
    descricao: text("descricao").notNull().default(""),
    os: text("os").notNull(),
    tipoServico: text("tipo_servico").notNull().default(""),
    tempoPrevistoMinutos: integer("tempo_previsto_minutos").notNull().default(0),
    oficina: text("oficina").notNull().default(""),
    executante: text("executante").notNull(),
    executanteNormalizado: text("executante_normalizado").notNull(),
    prioridade: text("prioridade").notNull().default(""),
    justificativaPlanilha: text("justificativa_planilha").notNull().default(""),
    cancelado: boolean("cancelado").notNull().default(false),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("atividade_programacoes_chave_idx").on(table.chave),
    index("atividade_programacoes_data_executante_idx").on(table.data, table.executanteNormalizado),
    index("atividade_programacoes_status_idx").on(table.statusPlanilha),
  ]
);

export const atividadeLancamentos = pgTable(
  "atividade_lancamentos",
  {
    id: text("id").primaryKey(),
    programacaoId: text("programacao_id").notNull().references(() => atividadeProgramacoes.id, { onDelete: "cascade" }),
    usuarioId: text("usuario_id").notNull().references(() => atividadeUsuarios.id, { onDelete: "restrict" }),
    data: text("data").notNull(),
    inicioMinutos: integer("inicio_minutos").notNull(),
    fimMinutos: integer("fim_minutos").notNull(),
    minutos: integer("minutos").notNull(),
    observacao: text("observacao").notNull().default(""),
    status: text("status").notNull().default("Andamento"),
    justificativa: text("justificativa").notNull().default(""),
    aprovadoPor: text("aprovado_por"),
    aprovadoEm: timestamp("aprovado_em", { withTimezone: true }),
    exportadoEm: timestamp("exportado_em", { withTimezone: true }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("atividade_lancamentos_usuario_data_idx").on(table.usuarioId, table.data),
    index("atividade_lancamentos_programacao_idx").on(table.programacaoId),
    index("atividade_lancamentos_aprovacao_idx").on(table.aprovadoEm, table.exportadoEm),
  ]
);

export const atividadeAuditoria = pgTable(
  "atividade_auditoria",
  {
    id: text("id").primaryKey(),
    ator: text("ator").notNull(),
    acao: text("acao").notNull(),
    entidade: text("entidade").notNull(),
    entidadeId: text("entidade_id").notNull(),
    detalhe: jsonb("detalhe").$type<Record<string, unknown>>().notNull().default({}),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("atividade_auditoria_entidade_idx").on(table.entidade, table.entidadeId)]
);
