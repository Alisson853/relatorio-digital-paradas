// Motor de sincronização genérico — sem IndexedDB, sem React, sem "use
// client". As três filas (fotos, "não será feito", status) usam este mesmo
// motor pra processar seus itens pendentes; a única coisa que muda entre
// elas é COMO uma tentativa de item específico é feita (upload de foto vs
// Server Action direta). Ser puro é o que permite testar com uma função de
// "tentar item" falsa, sem precisar simular banco nem navegador.

export interface ItemFila {
  id: string;
  sincronizacao: "pendente" | "erro";
  tentativas: number;
  ultimoErro?: string;
}

export type ResultadoTentativa =
  // Sem conexão ou a chamada em si falhou (fetch rejeitou) — não é o
  // servidor dizendo "não", é a rede que não deixou perguntar. Continua
  // tentando sozinho, sem incomodar ninguém — é o caso normal de estar
  // offline em campo.
  | { ok: true }
  | { ok: false; tipo: "rede" }
  // O servidor respondeu, e a resposta foi "não" (relatório/serviço não
  // encontrado, ou qualquer outra rejeição de negócio). Diferente de "rede":
  // tentar de novo sozinho a cada 20s só repetiria a mesma rejeição pra
  // sempre — por isso este tipo de item some da tentativa automática e só
  // volta a ser tentado com um pedido explícito (ver `incluirComErro`).
  | { ok: false; tipo: "negocio"; erro: string };

export interface ResultadoProcessamento<T extends ItemFila> {
  sincronizados: string[];
  atualizados: T[];
}

export interface OpcoesProcessamento {
  // true faz itens já marcados "erro" serem tentados de novo mesmo assim —
  // é o "Tentar novamente" manual. false (padrão) é o ciclo automático, que
  // pula esses itens de propósito (ver ResultadoTentativa acima).
  incluirComErro?: boolean;
}

// Processa uma fila de itens, um de cada vez (não em paralelo — evita
// disparar N uploads simultâneos numa conexão de campo já fraca). Nunca
// remove um item por conta própria: só devolve quem sincronizou de verdade,
// pra quem chamou decidir apagar da fila persistida.
export async function processarFila<T extends ItemFila>(
  itens: T[],
  tentar: (item: T) => Promise<ResultadoTentativa>,
  opcoes: OpcoesProcessamento = {}
): Promise<ResultadoProcessamento<T>> {
  const sincronizados: string[] = [];
  const atualizados: T[] = [];

  for (const item of itens) {
    if (item.sincronizacao === "erro" && !opcoes.incluirComErro) {
      atualizados.push(item);
      continue;
    }

    const resultado = await tentar(item);

    if (resultado.ok) {
      sincronizados.push(item.id);
      continue;
    }

    if (resultado.tipo === "rede") {
      atualizados.push({ ...item, sincronizacao: "pendente", tentativas: item.tentativas + 1, ultimoErro: undefined });
    } else {
      atualizados.push({ ...item, sincronizacao: "erro", tentativas: item.tentativas + 1, ultimoErro: resultado.erro });
    }
  }

  return { sincronizados, atualizados };
}

// Garante que `fn` nunca roda duas vezes ao mesmo tempo — uma segunda
// chamada enquanto a primeira ainda não terminou é ignorada (devolve
// undefined na hora) em vez de enfileirar ou rodar em paralelo. É o que
// impede o evento "online" e o intervalo de 20s (ou dois toques em "Tentar
// novamente") dispararem duas sincronizações da mesma fila ao mesmo tempo.
export function criarExecutorUnico<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R | undefined> {
  let emExecucao = false;
  return async (...args: A) => {
    if (emExecucao) return undefined;
    emExecucao = true;
    try {
      return await fn(...args);
    } finally {
      emExecucao = false;
    }
  };
}
