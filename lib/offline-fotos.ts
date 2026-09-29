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
  // "pendente": nunca tentado, ou falhou por falta de conexão — a
  // sincronização automática continua tentando sozinha. "erro": o servidor
  // respondeu e recusou (ex: serviço não existe mais) — só volta a ser
  // tentado com "Tentar novamente" explícito, pra não repetir a mesma
  // rejeição a cada 20s pra sempre. Sempre presente depois de
  // listarFotosPendentes — fotos gravadas antes deste campo existir ganham o
  // padrão "pendente"/0 ali, então quem consome este tipo nunca precisa
  // tratar como opcional.
  sincronizacao: "pendente" | "erro";
  tentativas: number;
  ultimoErro?: string;
}

// Chave determinística por (parada, serviço, etapa) — não um id aleatório.
// Sem isso, tirar a mesma foto de novo (ex: a primeira ficou tremida) sem
// conexão empilhava uma segunda entrada na fila em vez de substituir a
// primeira: as duas seriam enviadas depois, desperdiçando upload e deixando
// uma foto órfã no Blob. put() com esta chave faz a segunda tentativa
// substituir a primeira, igual lib/offline-nao-feito.ts já faz.
export function chaveFotoPendente(paradaId: string, servicoId: string, etapa: FotoPendente["etapa"]): string {
  return `${paradaId}:${servicoId}:${etapa}`;
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
    // Espalha primeiro, sobrescreve depois com fallback — não "default
    // depois espalhado por cima" (o TypeScript recusa essa ordem quando o
    // campo é obrigatório no tipo, porque o spread sempre venceria o
    // default, tornando o default morto). Mesmo resultado: registros
    // antigos (gravados antes destes dois campos existirem) recebem
    // "pendente"/0; registros que já têm valor mantêm o valor.
    req.onsuccess = () =>
      resolve((req.result as FotoPendente[]).map((i) => ({ ...i, sincronizacao: i.sincronizacao ?? "pendente", tentativas: i.tentativas ?? 0 })));
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
