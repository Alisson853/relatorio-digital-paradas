"use client";

// Fila de "não será feito" pendente de salvar, guardada no IndexedDB do
// aparelho — mesma ideia da fila de fotos (lib/offline-fotos.ts): sobrevive a
// fechar a aba/app, e é o que permite marcar em campo sem internet. Diferença
// pro caso das fotos: aqui cada serviço tem no máximo UMA pendência (a chave
// é `${paradaId}:${servicoId}`) — é sempre o estado final que importa, não
// uma lista de eventos, então uma escrita nova substitui a anterior ainda não
// enviada em vez de empilhar.
const DB_NOME = "maintops-naofeito-pendente";
const DB_VERSAO = 1;
const STORE = "fila";

export interface NaoFeitoPendente {
  id: string;
  paradaId: string;
  servicoId: string;
  // "" = desmarcado (limpa categoria e justificativa no servidor)
  categoria: string;
  justificativa: string;
  criadoEm: number;
  // Mesmo significado de FotoPendente.sincronizacao (lib/offline-fotos.ts):
  // "pendente" tenta de novo sozinho, "erro" só com "Tentar novamente".
  // Sempre presente depois de listarNaoFeitoPendente (ver ali o padrão pra
  // linhas gravadas antes deste campo existir).
  sincronizacao: "pendente" | "erro";
  tentativas: number;
  ultimoErro?: string;
}

// Exportada (só visibilidade, mesmo comportamento de sempre) pra poder testar
// a determinicidade da chave sem precisar simular IndexedDB — é ela que
// garante que uma segunda decisão pro mesmo serviço SUBSTITUI a pendência
// anterior em vez de duplicar.
export function chaveNaoFeito(paradaId: string, servicoId: string): string {
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

// Grava a linha exatamente como recebida — usado tanto para uma decisão NOVA
// do usuário (via salvarNaoFeitoPendente abaixo) quanto para o motor de
// sincronização regravar sincronizacao/tentativas/ultimoErro depois de uma
// tentativa, sem mexer em categoria/justificativa/criadoEm.
export async function atualizarItemNaoFeito(item: NaoFeitoPendente): Promise<void> {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// Uma decisão NOVA do usuário — sempre reseta sincronizacao/tentativas,
// porque uma escolha diferente (nova categoria, ou desmarcar) é uma intenção
// nova, não uma retentativa da anterior.
export async function salvarNaoFeitoPendente(paradaId: string, servicoId: string, categoria: string, justificativa: string): Promise<void> {
  const item: NaoFeitoPendente = {
    id: chaveNaoFeito(paradaId, servicoId),
    paradaId,
    servicoId,
    categoria,
    justificativa,
    criadoEm: Date.now(),
    sincronizacao: "pendente",
    tentativas: 0,
  };
  await atualizarItemNaoFeito(item);
}

export async function listarNaoFeitoPendente(paradaId?: string): Promise<NaoFeitoPendente[]> {
  const db = await abrirDb();
  const itens = await new Promise<NaoFeitoPendente[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    // Espalha primeiro, sobrescreve depois com fallback — ver o mesmo
    // comentário em lib/offline-fotos.ts (listarFotosPendentes).
    req.onsuccess = () =>
      resolve((req.result as NaoFeitoPendente[]).map((i) => ({ ...i, sincronizacao: i.sincronizacao ?? "pendente", tentativas: i.tentativas ?? 0 })));
    req.onerror = () => reject(req.error);
  });
  db.close();
  return paradaId ? itens.filter((i) => i.paradaId === paradaId) : itens;
}

export async function removerNaoFeitoPendente(id: string): Promise<void> {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
