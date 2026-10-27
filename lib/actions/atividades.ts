"use server";

import * as XLSX from "xlsx";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { atividadeImportacoes, atividadeLancamentos, atividadeProgramacoes, atividadeUsuarios } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { abrirSessaoAtividade, chaveProgramacao, existeSobreposicao, fecharSessaoAtividade, horaParaMinutos, identificadorTerceiro, listarProgramacaoDoUsuario, minutosParaHora, normalizarPessoa, osNumerica, registrarAuditoria, sessaoAtividade, textoLimpo, atualizarStatusProgramacao } from "@/lib/atividades";
import { ehEditor } from "@/lib/auth/session";
import { consumirLimite, identificarRequisitante, limiteExcedidoMsg } from "@/lib/rate-limit";

type Resultado = { ok: boolean; erro?: string };

function id(): string { return crypto.randomUUID(); }
function nomeColuna(linha: unknown[], titulo: string): number { return linha.findIndex((c) => normalizarPessoa(c) === normalizarPessoa(titulo)); }
function lerMinutos(valor: unknown): number {
  if (typeof valor === "number" && Number.isFinite(valor)) return Math.max(0, Math.round(valor * 24 * 60));
  const texto = textoLimpo(valor);
  const match = /^(\d{1,3}):(\d{2})(?::\d{2})?$/.exec(texto);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}
function lerDia(valor: unknown): number | null {
  const dia = typeof valor === "number" ? valor : Number(textoLimpo(valor));
  return Number.isInteger(dia) && dia >= 1 && dia <= 31 ? dia : null;
}
function isoData(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
function valorVerdadeiro(valor: unknown): boolean { return ["SIM", "S", "TRUE", "1", "CANCELADO"].includes(normalizarPessoa(valor)); }

export async function entrarAtividades(identificadorBruto: string): Promise<Resultado> {
  const identificador = textoLimpo(identificadorBruto);
  if (!identificador || identificador.length > 80) return { ok: false, erro: "Informe seu RE ou usuário." };
  const limite = await consumirLimite(`atividades-login:${await identificarRequisitante()}`, 8, 5 * 60);
  if (!limite.permitido) return { ok: false, erro: limiteExcedidoMsg() };
  const usuarios = await getDb().select().from(atividadeUsuarios).where(and(eq(atividadeUsuarios.identificador, identificador), eq(atividadeUsuarios.ativo, true))).limit(1);
  const usuario = usuarios[0];
  if (!usuario) return { ok: false, erro: "RE ou usuário não encontrado na programação." };
  await abrirSessaoAtividade({ id: usuario.id, nome: usuario.nome, perfil: usuario.perfil as "funcionario" | "terceiro" | "supervisor", identificador: usuario.identificador, oficina: usuario.oficina, funcao: usuario.funcao });
  await registrarAuditoria(usuario.id, "login", "usuario", usuario.id);
  return { ok: true };
}

export async function sairAtividades(): Promise<void> { await fecharSessaoAtividade(); }

export async function importarProgramacao(formData: FormData): Promise<Resultado & { lidas?: number; importadas?: number }> {
  if (!await ehEditor()) return { ok: false, erro: "Apenas o supervisor pode importar a programação." };
  const arquivo = formData.get("arquivo");
  const mes = Number(formData.get("mes"));
  const ano = Number(formData.get("ano"));
  if (!(arquivo instanceof File) || !arquivo.name.toLocaleLowerCase().endsWith(".xlsx")) return { ok: false, erro: "Envie um arquivo .xlsx." };
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(ano) || ano < 2020 || ano > 2100) return { ok: false, erro: "Informe mês e ano válidos." };
  if (arquivo.size > 25 * 1024 * 1024) return { ok: false, erro: "A planilha ultrapassa o limite de 25 MB." };
  const workbook = XLSX.read(await arquivo.arrayBuffer(), { type: "array", cellDates: false });
  const wsProgramacao = workbook.Sheets["Programação"];
  const wsEscala = workbook.Sheets.Escala;
  if (!wsProgramacao || !wsEscala) return { ok: false, erro: "A planilha precisa ter as abas Programação e Escala." };
  const programacao = XLSX.utils.sheet_to_json<unknown[]>(wsProgramacao, { header: 1, defval: null, raw: true });
  const escala = XLSX.utils.sheet_to_json<unknown[]>(wsEscala, { header: 1, defval: null, raw: true });
  const cabecalho = programacao.findIndex((linha) => nomeColuna(linha, "Data") >= 0 && nomeColuna(linha, "Executante") >= 0 && nomeColuna(linha, "OS") >= 0);
  const cabEscala = escala.findIndex((linha) => nomeColuna(linha, "Crachá") >= 0 && nomeColuna(linha, "Nome") >= 0);
  if (cabecalho < 0 || cabEscala < 0) return { ok: false, erro: "Não encontrei os cabeçalhos esperados em Programação ou Escala." };
  const col = (titulo: string) => nomeColuna(programacao[cabecalho], titulo);
  const status = 0, data = col("Data"), equipamento = col("Equipamento"), descricao = col("Descrição serviço"), os = col("OS"), tipo = col("Tipo de serviço"), tempo = col("Tempo"), oficina = col("Oficina responsável"), executante = col("Executante"), prioridade = col("Prioridade"), justificativa = col("Justificativa"), cancelado = col("Cancelado");
  if ([data, equipamento, descricao, os, tipo, tempo, oficina, executante].some((i) => i < 0)) return { ok: false, erro: "Faltam colunas obrigatórias na aba Programação." };
  const importacaoId = id();
  const db = getDb();
  const eCab = escala[cabEscala];
  const cCracha = nomeColuna(eCab, "Crachá"), cNome = nomeColuna(eCab, "Nome"), cFuncao = nomeColuna(eCab, "Função");
  const nomesEscala = new Set<string>();
  for (const linha of escala.slice(cabEscala + 1)) {
    const nome = textoLimpo(linha[cNome]); const cracha = textoLimpo(linha[cCracha]);
    if (!nome || !cracha) continue;
    nomesEscala.add(normalizarPessoa(nome));
    const existente = await db.select({ id: atividadeUsuarios.id }).from(atividadeUsuarios).where(eq(atividadeUsuarios.identificador, cracha)).limit(1);
    const valores = { identificador: cracha, nome, oficina: "", funcao: textoLimpo(linha[cFuncao]), perfil: "funcionario", ativo: true, atualizadoEm: new Date() };
    if (existente[0]) await db.update(atividadeUsuarios).set(valores).where(eq(atividadeUsuarios.id, existente[0].id));
    else await db.insert(atividadeUsuarios).values({ id: id(), ...valores });
  }
  let lidas = 0, importadas = 0;
  for (const linha of programacao.slice(cabecalho + 1)) {
    const dia = lerDia(linha[data]); const nome = textoLimpo(linha[executante]); const numeroOs = textoLimpo(linha[os]);
    if (!dia || !nome || !numeroOs) continue;
    lidas++;
    const dataIso = isoData(ano, mes, dia);
    const normalizado = normalizarPessoa(nome);
    if (!nomesEscala.has(normalizado)) {
      const login = identificadorTerceiro(nome);
      const existe = await db.select({ id: atividadeUsuarios.id }).from(atividadeUsuarios).where(eq(atividadeUsuarios.identificador, login)).limit(1);
      if (!existe[0]) await db.insert(atividadeUsuarios).values({ id: id(), identificador: login, nome, oficina: textoLimpo(linha[oficina]), funcao: "Terceiro", perfil: "terceiro", ativo: true });
    }
    const valores = {
      chave: chaveProgramacao(numeroOs, nome, dataIso), importacaoId, statusPlanilha: textoLimpo(linha[status]) || "Pendente", data: dataIso, dia,
      equipamento: textoLimpo(linha[equipamento]), descricao: textoLimpo(linha[descricao]), os: numeroOs, tipoServico: textoLimpo(linha[tipo]), tempoPrevistoMinutos: lerMinutos(linha[tempo]),
      oficina: textoLimpo(linha[oficina]), executante: nome, executanteNormalizado: normalizado, prioridade: textoLimpo(linha[prioridade]), justificativaPlanilha: textoLimpo(linha[justificativa]), cancelado: valorVerdadeiro(linha[cancelado]), atualizadoEm: new Date(),
    };
    const existente = await db.select({ id: atividadeProgramacoes.id }).from(atividadeProgramacoes).where(eq(atividadeProgramacoes.chave, valores.chave)).limit(1);
    if (existente[0]) await db.update(atividadeProgramacoes).set(valores).where(eq(atividadeProgramacoes.id, existente[0].id));
    else await db.insert(atividadeProgramacoes).values({ id: id(), ...valores });
    importadas++;
  }
  await db.insert(atividadeImportacoes).values({ id: importacaoId, mes, ano, arquivo: textoLimpo(arquivo.name), linhasLidas: lidas, linhasImportadas: importadas, importadoPor: "supervisor" });
  await registrarAuditoria("supervisor", "importar_programacao", "importacao", importacaoId, { arquivo: arquivo.name, mes, ano, lidas, importadas });
  revalidatePath("/atividades"); revalidatePath("/atividades/admin");
  return { ok: true, lidas, importadas };
}

export async function salvarLancamento(input: { programacaoId: string; data: string; inicio: string; fim: string; observacao?: string; status: "Andamento" | "Executado" | "Não executado"; justificativa?: string }): Promise<Resultado> {
  const usuario = await sessaoAtividade();
  if (!usuario) return { ok: false, erro: "Sua sessão expirou. Entre novamente." };
  const inicio = horaParaMinutos(input.inicio), fim = horaParaMinutos(input.fim);
  if (inicio === null || fim === null || fim <= inicio) return { ok: false, erro: "O horário final precisa ser posterior ao inicial." };
  if (input.status === "Não executado" && !textoLimpo(input.justificativa)) return { ok: false, erro: "Informe a justificativa de não execução." };
  const programacoes = await getDb().select().from(atividadeProgramacoes).where(eq(atividadeProgramacoes.id, input.programacaoId)).limit(1);
  const programacao = programacoes[0];
  if (!programacao || normalizarPessoa(programacao.executante) !== normalizarPessoa(usuario.nome)) return { ok: false, erro: "Esta OS não pertence ao seu usuário." };
  if (programacao.cancelado) return { ok: false, erro: "Não é permitido lançar horas em uma OS cancelada." };
  const existentes = await getDb().select().from(atividadeLancamentos).where(eq(atividadeLancamentos.programacaoId, programacao.id));
  const atual = existentes[0];
  if (await existeSobreposicao(usuario.id, input.data, inicio, fim, atual?.id)) return { ok: false, erro: "Este horário sobrepõe outro lançamento seu." };
  const valores = { usuarioId: usuario.id, data: input.data, inicioMinutos: inicio, fimMinutos: fim, minutos: fim - inicio, observacao: textoLimpo(input.observacao), status: input.status, justificativa: textoLimpo(input.justificativa), atualizadoEm: new Date() };
  if (atual) await getDb().update(atividadeLancamentos).set(valores).where(eq(atividadeLancamentos.id, atual.id));
  else await getDb().insert(atividadeLancamentos).values({ id: id(), programacaoId: programacao.id, ...valores });
  await atualizarStatusProgramacao(programacao.id, input.status, textoLimpo(input.justificativa));
  await registrarAuditoria(usuario.id, "salvar_lancamento", "programacao", programacao.id, { status: input.status, horas: minutosParaHora(fim - inicio) });
  revalidatePath("/atividades"); revalidatePath("/atividades/admin");
  return { ok: true };
}

export async function aprovarLancamentos(ids: string[]): Promise<Resultado> {
  if (!await ehEditor()) return { ok: false, erro: "Apenas o supervisor pode aprovar lançamentos." };
  const seguros = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!seguros.length) return { ok: false, erro: "Selecione ao menos um lançamento." };
  await getDb().update(atividadeLancamentos).set({ aprovadoPor: "supervisor", aprovadoEm: new Date(), atualizadoEm: new Date() }).where(inArray(atividadeLancamentos.id, seguros));
  await registrarAuditoria("supervisor", "aprovar_lancamentos", "lancamento", seguros.join(","), { quantidade: seguros.length });
  revalidatePath("/atividades/admin");
  return { ok: true };
}

export async function salvarUsuarioAtividade(input: { id?: string; identificador: string; nome: string; oficina?: string; funcao?: string; perfil: "funcionario" | "terceiro" | "supervisor"; ativo?: boolean }): Promise<Resultado> {
  if (!await ehEditor()) return { ok: false, erro: "Apenas o supervisor pode editar usuários." };
  const identificador = textoLimpo(input.identificador); const nome = textoLimpo(input.nome);
  if (!identificador || !nome || identificador.length > 80 || nome.length > 160) return { ok: false, erro: "Preencha identificador e nome." };
  const db = getDb();
  const duplicado = await db.select({ id: atividadeUsuarios.id }).from(atividadeUsuarios).where(eq(atividadeUsuarios.identificador, identificador)).limit(1);
  if (duplicado[0] && duplicado[0].id !== input.id) return { ok: false, erro: "Este RE ou usuário já está cadastrado." };
  const valores = { identificador, nome, oficina: textoLimpo(input.oficina), funcao: textoLimpo(input.funcao), perfil: input.perfil, ativo: input.ativo !== false, atualizadoEm: new Date() };
  const usuarioId = input.id && /^[0-9a-f-]{36}$/i.test(input.id) ? input.id : id();
  if (input.id) await db.update(atividadeUsuarios).set(valores).where(eq(atividadeUsuarios.id, usuarioId));
  else await db.insert(atividadeUsuarios).values({ id: usuarioId, ...valores });
  await registrarAuditoria("supervisor", input.id ? "editar_usuario" : "criar_usuario", "usuario", usuarioId, { identificador, perfil: input.perfil });
  revalidatePath("/atividades/admin");
  return { ok: true };
}

export async function exportarMantec(ids: string[]): Promise<{ ok: boolean; erro?: string; linhas?: string[][] }> {
  if (!await ehEditor()) return { ok: false, erro: "Apenas o supervisor pode exportar." };
  const seguros = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const lancamentos = seguros.length ? await getDb().select().from(atividadeLancamentos).where(inArray(atividadeLancamentos.id, seguros)) : [];
  const aprovados = lancamentos.filter((l) => l.aprovadoEm && !l.exportadoEm);
  const programacoes = aprovados.length ? await getDb().select().from(atividadeProgramacoes).where(inArray(atividadeProgramacoes.id, aprovados.map((l) => l.programacaoId))) : [];
  const usuarios = aprovados.length ? await getDb().select().from(atividadeUsuarios).where(inArray(atividadeUsuarios.id, aprovados.map((l) => l.usuarioId))) : [];
  const p = new Map(programacoes.map((item) => [item.id, item])); const u = new Map(usuarios.map((item) => [item.id, item]));
  const validos = aprovados.filter((l) => osNumerica(p.get(l.programacaoId)?.os ?? "") && u.has(l.usuarioId));
  if (!validos.length) return { ok: false, erro: "Não há lançamentos aprovados e ainda não exportados para OS numéricas." };
  const linhas = validos.map((l) => { const pr = p.get(l.programacaoId)!; const us = u.get(l.usuarioId)!; return [pr.os, us.identificador, us.nome, pr.oficina || us.oficina, "", `${l.data.slice(8, 10)}/${l.data.slice(5, 7)}/${l.data.slice(0, 4)}`, minutosParaHora(l.inicioMinutos), minutosParaHora(l.fimMinutos), minutosParaHora(l.minutos), ""]; });
  await getDb().update(atividadeLancamentos).set({ exportadoEm: new Date(), atualizadoEm: new Date() }).where(inArray(atividadeLancamentos.id, validos.map((l) => l.id)));
  await registrarAuditoria("supervisor", "exportar_mantec", "lancamento", validos.map((l) => l.id).join(","), { quantidade: validos.length });
  revalidatePath("/atividades/admin");
  return { ok: true, linhas };
}
