"use client";

import type { ParadaCompleta } from "@/lib/types";

// Última versão conhecida de cada parada, guardada no IndexedDB do aparelho.
// Diferente das filas de fotos e de "não será feito" (que guardam uma AÇÃO
// pendente de enviar), isso aqui guarda o próprio RELATÓRIO — é o que deixa
// a Captura Rápida abrir e continuar funcionando mesmo se o celular já
// entrar na tela sem nenhum sinal, em vez de travar em "carregando" pra
// sempre. As duas filas continuam sendo a fonte de verdade de qualquer
// mudança feita offline; este cache é só uma foto do que a tela mostra.
const DB_NOME = "maintops-parada-cache";
const DB_VERSAO = 1;
const STORE = "paradas";

export interface ParadaCacheEntry {
  id: string;
  parada: ParadaCompleta;
  salvoEm: number;
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

export async function salvarParadaCache(id: string, parada: ParadaCompleta): Promise<void> {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ id, parada, salvoEm: Date.now() } satisfies ParadaCacheEntry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function carregarParadaCache(id: string): Promise<ParadaCacheEntry | null> {
  const db = await abrirDb();
  const entry = await new Promise<ParadaCacheEntry | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as ParadaCacheEntry | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return entry ?? null;
}
