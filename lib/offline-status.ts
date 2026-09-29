"use client";

import type { StatusItem } from "@/lib/types";

// Fila de mudança de status pendente de salvar — mesma ideia e mesmo formato
// de lib/offline-nao-feito.ts (um valor final por serviço, chave
// `${paradaId}:${servicoId}`, escrita nova substitui a anterior ainda não
// enviada). Existia uma lacuna real aqui antes: marcar Pendente/Em
// Andamento/Concluído pelo celular chamava marcarStatusServico direto, sem
// nenhum fallback — sem internet, a chamada falhava e o toque simplesmente
// não tinha efeito nenhum, sem aviso e sem guardar a intenção em lugar
// nenhum. Fotos e "não será feito" já não tinham esse problema.
const DB_NOME = "maintops-status-pendente";
const DB_VERSAO = 1;
const STORE = "fila";

export interface StatusPendente {
  id: string;
  paradaId: string;
  servicoId: string;
  // O status de OS desejado (Pendente/Em Andamento/Concluído) — não confundir
  // com `sincronizacao` abaixo, que é o estado desta ENTRADA DA FILA.
  novoStatus: StatusItem;
  criadoEm: number;
  // Sempre presente depois de listarStatusPendente (ver ali o padrão pra
  // linhas gravadas antes deste campo existir).
  sincronizacao: "pendente" | "erro";
  tentativas: number;
  ultimoErro?: string;
}

// Exportada (só visibilidade) pelo mesmo motivo de chaveNaoFeito em
// lib/offline-nao-feito.ts.
export function chaveStatus(paradaId: string, servicoId: string): string {
  return `${paradaId}:${servicoId}`;
}

function abrirDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOME, DB_VERSAO);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function atualizarItemStatus(item: StatusPendente): Promise<void> {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function salvarStatusPendente(paradaId: string, servicoId: string, novoStatus: StatusItem): Promise<void> {
  await atualizarItemStatus({
    id: chaveStatus(paradaId, servicoId),
    paradaId,
    servicoId,
    novoStatus,
    criadoEm: Date.now(),
    sincronizacao: "pendente",
    tentativas: 0,
  });
}

export async function listarStatusPendente(paradaId?: string): Promise<StatusPendente[]> {
  const db = await abrirDb();
  const itens = await new Promise<StatusPendente[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    // Espalha primeiro, sobrescreve depois com fallback — ver o mesmo
    // comentário em lib/offline-fotos.ts (listarFotosPendentes).
    req.onsuccess = () =>
      resolve((req.result as StatusPendente[]).map((i) => ({ ...i, sincronizacao: i.sincronizacao ?? "pendente", tentativas: i.tentativas ?? 0 })));
    req.onerror = () => reject(req.error);
  });
  db.close();
  return paradaId ? itens.filter((i) => i.paradaId === paradaId) : itens;
}

export async function removerStatusPendente(id: string): Promise<void> {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
