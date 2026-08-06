"use server";

import { del, put } from "@vercel/blob";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { paradas } from "@/lib/db/schema";
import type { ParadaCompleta, ParadaResumo } from "@/lib/types";
import { deriveFotoCapa, deriveFotos } from "@/lib/derive";
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

export async function uploadFoto(formData: FormData, senha: string): Promise<{ ok: boolean; url?: string; erro?: string }> {
  const autorizado = await verifyEditorPassword(senha);
  if (!autorizado) return { ok: false, erro: "Não autorizado." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, erro: "Arquivo inválido." };

  const nomeUnico = `fotos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
  const blob = await put(nomeUnico, file, { access: "public" });
  return { ok: true, url: blob.url };
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
