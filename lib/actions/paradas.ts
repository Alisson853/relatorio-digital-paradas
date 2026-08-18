"use server";

import { del, put } from "@vercel/blob";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { paradas } from "@/lib/db/schema";
import type { CaminhoCriticoItem, Equipe, ParadaCompleta, ParadaResumo, Servico, TimelineEvento } from "@/lib/types";
import { deriveFotoCapa, deriveFotos, deriveGraficos, deriveKpis, textoExecutadoPadrao, textoResultadoPadrao } from "@/lib/derive";
import { gerarResultadoFinal } from "@/lib/mock-data";
import { NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import { verifyEditorPassword } from "./auth";

function rowParaResumo(row: typeof paradas.$inferSelect): ParadaResumo {
  const fotosMaquina = row.fotosMaquina?.length ? row.fotosMaquina : [deriveFotoCapa(row.servicos)].filter((v): v is string => !!v);
  return {
    id: row.id,
    nome: row.nome,
    maquina: row.maquina,
    area: row.area,
    data: row.data,
    duracaoPlanejada: row.duracaoPlanejada,
    duracaoRealizada: row.duracaoRealizada,
    status: row.status as ParadaResumo["status"],
    responsavel: row.responsavel,
    imagem: row.imagem,
    fotosMaquina,
  };
}

function rowParaCompleta(row: typeof paradas.$inferSelect): ParadaCompleta {
  return {
    resumo: rowParaResumo(row),
    kpis: row.kpis,
    timeline: row.timeline,
    servicos: row.servicos,
    fotos: deriveFotos(row.servicos),
    caminhoCritico: row.caminhoCritico,
    pendencias: row.pendencias,
    graficos: row.graficos,
    resultadoFinal: row.resultadoFinal,
  };
}

export async function listParadasResumo(): Promise<ParadaResumo[]> {
  const rows = await getDb().select().from(paradas).orderBy(asc(paradas.data));
  return rows.map(rowParaResumo).reverse();
}

export async function getParadaCompleta(id: string): Promise<ParadaCompleta | null> {
  const [row] = await getDb().select().from(paradas).where(eq(paradas.id, id)).limit(1);
  return row ? rowParaCompleta(row) : null;
}

export async function getParadaAtualizadaEm(id: string): Promise<number | null> {
  const [row] = await getDb().select({ atualizadoEm: paradas.atualizadoEm }).from(paradas).where(eq(paradas.id, id)).limit(1);
  return row ? row.atualizadoEm.getTime() : null;
}

export async function saveParada(data: ParadaCompleta, senha: string): Promise<{ ok: boolean; erro?: string }> {
  const autorizado = await verifyEditorPassword(senha);
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  const { resumo } = data;
  await getDb()
    .insert(paradas)
    .values({
      id: resumo.id,
      nome: resumo.nome,
      maquina: resumo.maquina,
      area: resumo.area,
      data: resumo.data,
      duracaoPlanejada: resumo.duracaoPlanejada,
      duracaoRealizada: resumo.duracaoRealizada,
      status: resumo.status,
      responsavel: resumo.responsavel,
      imagem: resumo.imagem,
      fotosMaquina: resumo.fotosMaquina ?? [],
      kpis: data.kpis,
      timeline: data.timeline,
      servicos: data.servicos,
      caminhoCritico: data.caminhoCritico,
      pendencias: data.pendencias,
      graficos: data.graficos,
      resultadoFinal: data.resultadoFinal,
      atualizadoEm: new Date(),
    })
    .onConflictDoUpdate({
      target: paradas.id,
      set: {
        nome: resumo.nome,
        maquina: resumo.maquina,
        area: resumo.area,
        data: resumo.data,
        duracaoPlanejada: resumo.duracaoPlanejada,
        duracaoRealizada: resumo.duracaoRealizada,
        status: resumo.status,
        responsavel: resumo.responsavel,
        imagem: resumo.imagem,
        fotosMaquina: resumo.fotosMaquina ?? [],
        kpis: data.kpis,
        timeline: data.timeline,
        servicos: data.servicos,
        caminhoCritico: data.caminhoCritico,
        pendencias: data.pendencias,
        graficos: data.graficos,
        resultadoFinal: data.resultadoFinal,
        atualizadoEm: new Date(),
      },
    });

  return { ok: true };
}

export async function deleteParada(id: string, senha: string): Promise<{ ok: boolean; erro?: string }> {
  const autorizado = await verifyEditorPassword(senha);
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  await getDb().delete(paradas).where(eq(paradas.id, id));
  return { ok: true };
}

// Clona um relatório existente como ponto de partida para uma nova parada no
// mesmo equipamento: mantém a estrutura (serviços, timeline, caminho crítico)
// como modelo, mas zera o progresso (fotos, status, horários, pendências) e
// recalcula kpis/gráficos/resultado do zero, já que nada foi executado ainda.
export async function clonarParada(idOrigem: string, senha: string): Promise<{ ok: boolean; erro?: string; novoId?: string }> {
  const autorizado = await verifyEditorPassword(senha);
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  const [row] = await getDb().select().from(paradas).where(eq(paradas.id, idOrigem)).limit(1);
  if (!row) return { ok: false, erro: "Relatório não encontrado." };

  const novoId = `${row.id}-copia-${Date.now().toString(36)}`;
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  const servicosClonados: Servico[] = row.servicos.map((s) => ({
    ...s,
    id: crypto.randomUUID(),
    status: "pendente",
    horaInicio: "",
    horaFim: "",
    servicoExecutado: textoExecutadoPadrao("pendente"),
    resultado: textoResultadoPadrao("pendente"),
    fotoAntes: NO_PHOTO_PLACEHOLDER,
    fotoAntesHorario: undefined,
    fotoDurante: undefined,
    fotoDuranteHorario: undefined,
    fotoDepois: NO_PHOTO_PLACEHOLDER,
    fotoDepoisHorario: undefined,
  }));

  const timelineClonada: TimelineEvento[] = row.timeline.map((t) => ({ ...t, id: crypto.randomUUID(), status: "pendente" }));

  const caminhoCriticoClonado: CaminhoCriticoItem[] = row.caminhoCritico.map((c) => ({
    ...c,
    id: crypto.randomUUID(),
    inicioReal: "",
    fimReal: "",
    diferencaMin: 0,
    status: "pendente",
    causaAtraso: undefined,
  }));

  const resumoClonado: ParadaResumo = {
    id: novoId,
    nome: `${row.nome} (Cópia)`,
    maquina: row.maquina,
    area: row.area,
    data: hoje,
    duracaoPlanejada: row.duracaoPlanejada,
    duracaoRealizada: "0h",
    status: "em_andamento",
    responsavel: row.responsavel,
    imagem: row.imagem,
    fotosMaquina: row.fotosMaquina ?? [],
  };

  const kpisClonados = deriveKpis(servicosClonados, row.kpis.seguranca, row.kpis.osPlanejadas, 0);
  const graficosClonados = deriveGraficos(servicosClonados, caminhoCriticoClonado, row.graficos.planejadoRealizado, kpisClonados.eficiencia);
  const resultadoClonado = gerarResultadoFinal(resumoClonado, kpisClonados);

  await getDb().insert(paradas).values({
    id: novoId,
    nome: resumoClonado.nome,
    maquina: resumoClonado.maquina,
    area: resumoClonado.area,
    data: resumoClonado.data,
    duracaoPlanejada: resumoClonado.duracaoPlanejada,
    duracaoRealizada: resumoClonado.duracaoRealizada,
    status: resumoClonado.status,
    responsavel: resumoClonado.responsavel,
    imagem: resumoClonado.imagem,
    fotosMaquina: resumoClonado.fotosMaquina ?? [],
    kpis: kpisClonados,
    timeline: timelineClonada,
    servicos: servicosClonados,
    caminhoCritico: caminhoCriticoClonado,
    pendencias: [],
    graficos: graficosClonados,
    resultadoFinal: resultadoClonado,
    atualizadoEm: new Date(),
  });

  return { ok: true, novoId };
}

export interface PendenciaChecklistItem {
  paradaId: string;
  paradaNome: string;
  servicoId: string;
  numeroOS: string;
  equipamento: string;
  titulo: string;
  faltando: string[];
}

// Varre todos os relatórios em busca de serviços com fotos faltando (Antes/Depois)
// ou status ainda não concluído — uma visão cruzada para saber o que falta
// documentar antes de fechar cada parada.
export async function listChecklistPendencias(): Promise<PendenciaChecklistItem[]> {
  const rows = await getDb().select().from(paradas).orderBy(asc(paradas.data));
  const itens: PendenciaChecklistItem[] = [];

  for (const row of rows) {
    for (const s of row.servicos) {
      const faltando: string[] = [];
      if (!s.fotoAntes || s.fotoAntes === NO_PHOTO_PLACEHOLDER) faltando.push("Foto Antes");
      if (!s.fotoDepois || s.fotoDepois === NO_PHOTO_PLACEHOLDER) faltando.push("Foto Depois");
      if (s.status !== "concluido") faltando.push("Status pendente");

      if (faltando.length > 0) {
        itens.push({
          paradaId: row.id,
          paradaNome: row.nome,
          servicoId: s.id,
          numeroOS: s.numeroOS,
          equipamento: s.equipamento,
          titulo: s.titulo,
          faltando,
        });
      }
    }
  }

  return itens;
}

export async function uploadFoto(formData: FormData, senha: string): Promise<{ ok: boolean; url?: string; erro?: string }> {
  const autorizado = await verifyEditorPassword(senha);
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, erro: "Arquivo inválido." };

  const nomeUnico = `fotos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
  const blob = await put(nomeUnico, file, { access: "public" });
  return { ok: true, url: blob.url };
}

function horarioAgora(): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date());
}

type Etapa = { campo: "fotoAntes" | "fotoDurante" | "fotoDepois"; horarioCampo: "fotoAntesHorario" | "fotoDuranteHorario" | "fotoDepoisHorario"; label: string };

const ETAPA_ANTES: Etapa = { campo: "fotoAntes", horarioCampo: "fotoAntesHorario", label: "Antes" };
const ETAPA_DURANTE: Etapa = { campo: "fotoDurante", horarioCampo: "fotoDuranteHorario", label: "Durante" };
const ETAPA_DEPOIS: Etapa = { campo: "fotoDepois", horarioCampo: "fotoDepoisHorario", label: "Depois" };

// A maioria das OS só usa duas fotos (antes no computador, depois em campo pelo
// celular) — "Durante" é opcional. Por isso a busca pela próxima etapa vazia
// prioriza Depois antes de Durante: senão a foto tirada em campo cai em
// "Durante" mesmo quando a intenção era fechar o registro com "Depois".
const ORDEM_CAPTURA: Etapa[] = [ETAPA_ANTES, ETAPA_DEPOIS, ETAPA_DURANTE];

function etapaEstaVazia(servico: Servico, etapa: Etapa): boolean {
  const valor = servico[etapa.campo];
  if (etapa.campo === "fotoDurante") return !valor;
  return !valor || valor === NO_PHOTO_PLACEHOLDER;
}

// Grava a foto direto na OS certa, mexendo só no array de serviços — assim uma
// captura em campo não corre o risco de sobrescrever outras edições feitas ao
// mesmo tempo em outras partes do relatório (diferente do formulário completo,
// que reenvia o relatório inteiro a cada salvamento).
export async function capturarFotoServico(
  paradaId: string,
  servicoId: string,
  url: string,
  senha: string
): Promise<{ ok: boolean; erro?: string; label?: string; horario?: string }> {
  const autorizado = await verifyEditorPassword(senha);
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  const [row] = await getDb().select({ servicos: paradas.servicos }).from(paradas).where(eq(paradas.id, paradaId)).limit(1);
  if (!row) return { ok: false, erro: "Relatório não encontrado." };

  const idx = row.servicos.findIndex((s) => s.id === servicoId);
  if (idx === -1) return { ok: false, erro: "Serviço não encontrado." };

  const servico = row.servicos[idx];
  const etapaVazia = ORDEM_CAPTURA.find((e) => etapaEstaVazia(servico, e)) ?? ETAPA_DEPOIS;

  const horario = horarioAgora();
  const servicoAtualizado: Servico = { ...servico, [etapaVazia.campo]: url, [etapaVazia.horarioCampo]: horario };
  const servicosAtualizados = [...row.servicos];
  servicosAtualizados[idx] = servicoAtualizado;

  await getDb().update(paradas).set({ servicos: servicosAtualizados, atualizadoEm: new Date() }).where(eq(paradas.id, paradaId));

  return { ok: true, label: etapaVazia.label, horario };
}

interface NovaOsInput {
  numeroOS: string;
  equipamento: string;
  area: string;
  responsavel: string;
  equipe: Equipe;
  categoria: string;
  motivo: string;
}

// Abre uma OS nova direto pelo celular (Captura Rápida), sem passar pelo
// formulário completo. Recalcula kpis/gráficos a partir do array atualizado
// de serviços, mas só grava as colunas servicos/kpis/graficos — o resto do
// relatório (capa, linha do tempo, pendências etc.) fica intocado.
export async function adicionarServicoRapido(paradaId: string, input: NovaOsInput, senha: string): Promise<{ ok: boolean; erro?: string; servico?: Servico }> {
  const autorizado = await verifyEditorPassword(senha);
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  const equipamento = input.equipamento.trim();
  if (!equipamento) return { ok: false, erro: "Informe o equipamento." };

  const [row] = await getDb().select().from(paradas).where(eq(paradas.id, paradaId)).limit(1);
  if (!row) return { ok: false, erro: "Relatório não encontrado." };

  const novoServico: Servico = {
    id: crypto.randomUUID(),
    numeroOS: input.numeroOS.trim() || "Oportunidade",
    titulo: `Manutenção em ${equipamento}`,
    equipamento,
    area: input.area.trim() || row.maquina,
    responsavel: input.responsavel.trim() || row.responsavel,
    equipe: input.equipe,
    categoria: input.categoria,
    horaInicio: "",
    horaFim: "",
    tempoGasto: "1h",
    problemaIdentificado: input.motivo.trim() || "Necessidade identificada durante a parada.",
    servicoExecutado: textoExecutadoPadrao("concluido"),
    resultado: textoResultadoPadrao("concluido"),
    status: "concluido",
    fotoAntes: NO_PHOTO_PLACEHOLDER,
    fotoDepois: NO_PHOTO_PLACEHOLDER,
  };

  const servicosAtualizados = [...row.servicos, novoServico];
  // OS Executadas é um número informado manualmente (não conta mais os serviços
  // detalhados um a um, já que só os "principais" com foto ganham entrada aqui) —
  // como essa OS nova nasce concluída, soma 1 ao total já registrado.
  const kpisAtualizados = deriveKpis(servicosAtualizados, row.kpis.seguranca, row.kpis.osPlanejadas, row.kpis.osConcluidas + 1);
  const graficosAtualizados = deriveGraficos(servicosAtualizados, row.caminhoCritico, row.graficos.planejadoRealizado, kpisAtualizados.eficiencia);
  const resultadoAtualizado = { ...row.resultadoFinal, eficiencia: kpisAtualizados.eficiencia, pendenciasAbertas: kpisAtualizados.pendencias };

  await getDb()
    .update(paradas)
    .set({ servicos: servicosAtualizados, kpis: kpisAtualizados, graficos: graficosAtualizados, resultadoFinal: resultadoAtualizado, atualizadoEm: new Date() })
    .where(eq(paradas.id, paradaId));

  return { ok: true, servico: novoServico };
}

export async function excluirFoto(url: string, senha: string): Promise<void> {
  const autorizado = await verifyEditorPassword(senha);
  if (!autorizado || !url.includes("blob.vercel-storage.com")) return;
  try {
    await del(url);
  } catch {
    // melhor esforço — não bloquear o usuário se a foto já não existir
  }
}
