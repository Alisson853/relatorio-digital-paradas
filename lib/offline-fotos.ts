"use client";

// Fila de fotos pendentes de envio, guardada no IndexedDB do aparelho — não
// em memória do componente, que se perde ao fechar a aba/app. Isso é o que
// permite tirar foto sem internet: a foto (já comprimida) fica salva aqui
// até a conexão voltar, mesmo que a pessoa saia da tela ou feche o app.
const DB_NOME = "maintops-fotos-pendentes";
const DB_VERSAO = 1;
const STORE = "fila";

export interface FotoPendente {
  id: string;
  paradaId: string;
  servicoId: string;
  etapa: "Antes" | "Durante" | "Depois";
  nomeArquivo: string;
  blob: Blob;
  criadoEm: number;
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

export async function salvarFotoPendente(item: FotoPendente): Promise<void> {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listarFotosPendentes(paradaId?: string): Promise<FotoPendente[]> {
  const db = await abrirDb();
  const itens = await new Promise<FotoPendente[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as FotoPendente[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return paradaId ? itens.filter((i) => i.paradaId === paradaId) : itens;
}

export async function removerFotoPendente(id: string): Promise<void> {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
