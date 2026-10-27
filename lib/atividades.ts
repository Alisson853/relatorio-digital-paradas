import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { atividadeAuditoria, atividadeLancamentos, atividadeProgramacoes, atividadeUsuarios } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { assinar } from "@/lib/auth/token";

export type PerfilAtividade = "funcionario" | "terceiro" | "supervisor";
export interface SessaoAtividade {
  id: string;
  nome: string;
  perfil: PerfilAtividade;
  identificador: string;
  oficina: string;
  funcao: string;
}

export const COOKIE_ATIVIDADES = "maintops_atividades";
const VALIDADE_SESSAO_MS = 12 * 60 * 60 * 1000;

export function textoLimpo(valor: unknown): string {
  return String(valor ?? "").trim().replace(/\s+/g, " ");
}

export function normalizarPessoa(valor: unknown): string {
  return textoLimpo(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

export function identificadorTerceiro(nome: string): string {
  return normalizarPessoa(nome).toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
}

export function chaveProgramacao(os: string, executante: string, data: string): string {
  return `${textoLimpo(os)}|${normalizarPessoa(executante)}|${data}`;
}

export function minutosParaHora(minutos: number): string {
  const seguro = Math.max(0, Math.round(minutos));
  return `${String(Math.floor(seguro / 60)).padStart(2, "0")}:${String(seguro % 60).padStart(2, "0")}`;
}

export function horaParaMinutos(valor: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(valor.trim());
  if (!match) return null;
  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
}

function codificar(payload: string): string {
  return Buffer.from(payload, "utf8").toString("base64url");
}

function decodificar(payload: string): string | null {
  try { return Buffer.from(payload, "base64url").toString("utf8"); } catch { return null; }
}

export async function abrirSessaoAtividade(usuario: SessaoAtividade): Promise<void> {
  const expiraEm = Date.now() + VALIDADE_SESSAO_MS;
  const dados = codificar(JSON.stringify({ id: usuario.id, expiraEm }));
  const assinatura = await assinar(dados);
  const store = await cookies();
  store.set(COOKIE_ATIVIDADES, `${dados}.${assinatura}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: new Date(expiraEm),
  });
}

export async function fecharSessaoAtividade(): Promise<void> {
  (await cookies()).delete(COOKIE_ATIVIDADES);
}

export const sessaoAtividade = cache(async (): Promise<SessaoAtividade | null> => {
  const token = (await cookies()).get(COOKIE_ATIVIDADES)?.value;
  if (!token) return null;
  const [dados, assinatura] = token.split(".");
  if (!dados || !assinatura || assinatura !== await assinar(dados)) return null;
  const bruto = decodificar(dados);
  if (!bruto) return null;
  try {
    const payload = JSON.parse(bruto) as { id?: string; expiraEm?: number };
    if (!payload.id || !Number.isFinite(payload.expiraEm) || Date.now() > payload.expiraEm) return null;
    const usuario = await getDb().select().from(atividadeUsuarios).where(and(eq(atividadeUsuarios.id, payload.id), eq(atividadeUsuarios.ativo, true))).limit(1);
    const u = usuario[0];
    if (!u) return null;
    return { id: u.id, nome: u.nome, perfil: u.perfil as PerfilAtividade, identificador: u.identificador, oficina: u.oficina, funcao: u.funcao };
  } catch { return null; }
});

export async function registrarAuditoria(ator: string, acao: string, entidade: string, entidadeId: string, detalhe: Record<string, unknown> = {}): Promise<void> {
  await getDb().insert(atividadeAuditoria).values({ id: crypto.randomUUID(), ator, acao, entidade, entidadeId, detalhe });
}

export async function listarProgramacaoDoUsuario(usuario: SessaoAtividade, inicio: string, fim: string, incluirReprogramados = false) {
  const condicoes = [eq(atividadeProgramacoes.executanteNormalizado, normalizarPessoa(usuario.nome)), gte(atividadeProgramacoes.data, inicio), lte(atividadeProgramacoes.data, fim)];
  const linhas = await getDb().select().from(atividadeProgramacoes).where(and(...condicoes)).orderBy(asc(atividadeProgramacoes.data), asc(atividadeProgramacoes.os));
  const permitidas = linhas.filter((item) => !item.cancelado && (incluirReprogramados || normalizarPessoa(item.statusPlanilha) !== "REPROGRAMADO"));
  if (!permitidas.length) return [];
  const ids = permitidas.map((item) => item.id);
  const lancamentos = await getDb().select().from(atividadeLancamentos).where(inArray(atividadeLancamentos.programacaoId, ids));
  const porProgramacao = new Map(lancamentos.map((item) => [item.programacaoId, item]));
  return permitidas.map((item) => ({ ...item, lancamento: porProgramacao.get(item.id) ?? null }));
}

export async function existeSobreposicao(usuarioId: string, data: string, inicio: number, fim: number, ignorarId?: string): Promise<boolean> {
  const linhas = await getDb().select().from(atividadeLancamentos).where(and(eq(atividadeLancamentos.usuarioId, usuarioId), eq(atividadeLancamentos.data, data)));
  return linhas.some((linha) => linha.id !== ignorarId && inicio < linha.fimMinutos && fim > linha.inicioMinutos);
}

export async function resumoSupervisor(inicio: string, fim: string) {
  const programadas = await getDb().select().from(atividadeProgramacoes).where(and(gte(atividadeProgramacoes.data, inicio), lte(atividadeProgramacoes.data, fim)));
  const lancamentos = programadas.length ? await getDb().select().from(atividadeLancamentos).where(inArray(atividadeLancamentos.programacaoId, programadas.map((item) => item.id))) : [];
  const porProgramacao = new Map(lancamentos.map((l) => [l.programacaoId, l]));
  return {
    programadas,
    lancamentos,
    pendentes: programadas.filter((p) => !p.cancelado && !porProgramacao.has(p.id)),
    naoExecutadas: lancamentos.filter((l) => normalizarPessoa(l.status) === "NÃO EXECUTADO" || normalizarPessoa(l.status) === "NAO EXECUTADO"),
  };
}

export async function atualizarStatusProgramacao(programacaoId: string, status: string, justificativa = ""): Promise<void> {
  await getDb().update(atividadeProgramacoes).set({ statusPlanilha: status, justificativaPlanilha: justificativa, atualizadoEm: new Date() }).where(eq(atividadeProgramacoes.id, programacaoId));
}

export function osNumerica(os: string): boolean { return /^\d+$/.test(textoLimpo(os)); }

export const CONTAGEM_ATIVIDADES_SQL = sql<number>`count(*)`;
