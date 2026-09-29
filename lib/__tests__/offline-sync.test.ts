import { describe, expect, it, vi } from "vitest";
import { criarExecutorUnico, processarFila, type ItemFila, type ResultadoTentativa } from "@/lib/offline-sync";

interface ItemTeste extends ItemFila {
  valor: string;
}

function criarItem(overrides: Partial<ItemTeste> = {}): ItemTeste {
  return { id: "item-1", sincronizacao: "pendente", tentativas: 0, valor: "x", ...overrides };
}

describe("processarFila — sincronização", () => {
  it("sincroniza um item com sucesso: entra em sincronizados, não sobra em atualizados", async () => {
    const item = criarItem();
    const { sincronizados, atualizados } = await processarFila([item], async () => ({ ok: true }));
    expect(sincronizados).toEqual(["item-1"]);
    expect(atualizados).toEqual([]);
  });

  it("só remove/confirma o item DEPOIS de tentar — nunca antes (contrato: sincronizados só reflete o que a tentativa confirmou)", async () => {
    const item = criarItem();
    const tentar = vi.fn(async (): Promise<ResultadoTentativa> => ({ ok: false, tipo: "rede" }));
    const { sincronizados } = await processarFila([item], tentar);
    expect(tentar).toHaveBeenCalledTimes(1);
    expect(sincronizados).toEqual([]); // não confirmado => não sai da fila
  });

  it("mantém o item quando a tentativa falha por rede — sem conexão, sem marcar erro, tentativas sobe", async () => {
    const item = criarItem({ tentativas: 2 });
    const { atualizados } = await processarFila([item], async () => ({ ok: false, tipo: "rede" }));
    expect(atualizados).toEqual([{ ...item, sincronizacao: "pendente", tentativas: 3, ultimoErro: undefined }]);
  });

  it("marca erro quando o servidor recusa (não é falta de conexão) e guarda a mensagem", async () => {
    const item = criarItem();
    const { atualizados } = await processarFila([item], async () => ({ ok: false, tipo: "negocio", erro: "Serviço não encontrado." }));
    expect(atualizados).toEqual([{ ...item, sincronizacao: "erro", tentativas: 1, ultimoErro: "Serviço não encontrado." }]);
  });

  it("conta tentativas subindo a cada rodada, tanto em falha de rede quanto de negócio", async () => {
    let item = criarItem({ tentativas: 0 });
    ({ atualizados: [item] } = await processarFila([item], async () => ({ ok: false, tipo: "rede" })));
    expect(item.tentativas).toBe(1);
    ({ atualizados: [item] } = await processarFila([item], async () => ({ ok: false, tipo: "negocio", erro: "falhou" })));
    expect(item.tentativas).toBe(2);
  });

  it("pula automaticamente itens marcados 'erro' — o ciclo automático não repete a mesma rejeição pra sempre", async () => {
    const item = criarItem({ sincronizacao: "erro", ultimoErro: "Serviço não encontrado." });
    const tentar = vi.fn(async (): Promise<ResultadoTentativa> => ({ ok: true }));
    const { sincronizados, atualizados } = await processarFila([item], tentar);
    expect(tentar).not.toHaveBeenCalled();
    expect(sincronizados).toEqual([]);
    expect(atualizados).toEqual([item]); // continua na fila, intocado
  });

  it("'Tentar novamente' (incluirComErro) reprocessa itens marcados erro", async () => {
    const item = criarItem({ sincronizacao: "erro", ultimoErro: "Serviço não encontrado." });
    const { sincronizados } = await processarFila([item], async () => ({ ok: true }), { incluirComErro: true });
    expect(sincronizados).toEqual(["item-1"]);
  });

  it("processa múltiplos itens de forma independente — um falhar não impede os outros de sincronizar", async () => {
    const itens = [criarItem({ id: "a" }), criarItem({ id: "b" }), criarItem({ id: "c" })];
    const { sincronizados, atualizados } = await processarFila(itens, async (item) =>
      item.id === "b" ? { ok: false, tipo: "negocio", erro: "falhou" } : { ok: true }
    );
    expect(sincronizados.sort()).toEqual(["a", "c"]);
    expect(atualizados.map((i) => i.id)).toEqual(["b"]);
    expect(atualizados[0].sincronizacao).toBe("erro");
  });

  it("processa um item de cada vez (sequencial) — nunca duas tentativas em paralelo dentro da mesma fila", async () => {
    const itens = [criarItem({ id: "a" }), criarItem({ id: "b" }), criarItem({ id: "c" })];
    let emAndamento = 0;
    let maximoSimultaneo = 0;
    const tentar = async (): Promise<ResultadoTentativa> => {
      emAndamento++;
      maximoSimultaneo = Math.max(maximoSimultaneo, emAndamento);
      await new Promise((r) => setTimeout(r, 5));
      emAndamento--;
      return { ok: true };
    };
    await processarFila(itens, tentar);
    expect(maximoSimultaneo).toBe(1);
  });
});

describe("criarExecutorUnico — não iniciar duas sincronizações simultâneas", () => {
  it("uma segunda chamada enquanto a primeira ainda está em andamento é ignorada (devolve undefined)", async () => {
    let chamadasIniciadas = 0;
    const original = async () => {
      chamadasIniciadas++;
      await new Promise((r) => setTimeout(r, 20));
      return "ok";
    };
    const executor = criarExecutorUnico(original);

    const p1 = executor();
    const p2 = executor(); // dispara enquanto p1 ainda está rodando

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(chamadasIniciadas).toBe(1);
    expect(r1).toBe("ok");
    expect(r2).toBeUndefined();
  });

  it("depois que a primeira termina, uma nova chamada roda normalmente (ex: conexão voltou, tenta de novo)", async () => {
    let chamadas = 0;
    const executor = criarExecutorUnico(async () => {
      chamadas++;
      return chamadas;
    });

    const r1 = await executor();
    const r2 = await executor();

    expect(r1).toBe(1);
    expect(r2).toBe(2);
    expect(chamadas).toBe(2);
  });
});

describe("fotos — vínculo parada/serviço/etapa sobrevive a uma tentativa que falha", () => {
  interface FotoTeste extends ItemFila {
    paradaId: string;
    servicoId: string;
    etapa: "Antes" | "Durante" | "Depois";
  }

  it("um upload que falha (erro de rede) mantém a foto pendente com o mesmo vínculo, não perde nem embaralha o destino", async () => {
    const foto: FotoTeste = { id: "p1:s1:Antes", sincronizacao: "pendente", tentativas: 0, paradaId: "p1", servicoId: "s1", etapa: "Antes" };
    const { atualizados } = await processarFila([foto], async (): Promise<ResultadoTentativa> => ({ ok: false, tipo: "rede" }));
    expect(atualizados).toHaveLength(1);
    expect(atualizados[0].paradaId).toBe("p1");
    expect(atualizados[0].servicoId).toBe("s1");
    expect(atualizados[0].etapa).toBe("Antes");
    expect(atualizados[0].sincronizacao).toBe("pendente"); // continua pendente, não vira erro por causa da rede
  });
});

describe("classificação rede vs. negócio — base do tratamento de conflito (Bloco A)", () => {
  it("uma rejeição do servidor (ex: proteção de concorrência do Bloco A esgotada) nunca é tratada como 'ainda sem conexão'", async () => {
    // Simula o que lib/db/paradas-repo.ts (Bloco A) devolve quando
    // escreverComVersao esgota as tentativas: {ok:false, erro:"Muitas
    // alterações simultâneas..."} — a chamada respondeu, então isso É uma
    // resposta de negócio, não uma falha de rede. Não deve sobrescrever nada
    // silenciosamente: o item fica marcado erro, com a mensagem visível.
    const item = criarItem();
    const { sincronizados, atualizados } = await processarFila([item], async () => ({
      ok: false,
      tipo: "negocio",
      erro: "Muitas alterações simultâneas neste relatório. Tente novamente em instantes.",
    }));
    expect(sincronizados).toEqual([]);
    expect(atualizados[0].sincronizacao).toBe("erro");
    expect(atualizados[0].ultimoErro).toContain("Muitas alterações simultâneas");
  });

  it("uma exceção (fetch rejeitando) é sempre 'rede', nunca vira erro de negócio silenciosamente", async () => {
    const item = criarItem();
    const tentar = async (): Promise<ResultadoTentativa> => {
      throw new Error("network error");
    };
    // A própria função `tentar` de CapturaRapida.tsx é responsável por
    // converter a exceção em {ok:false, tipo:"rede"} via try/catch — aqui
    // simulamos exatamente esse contrato.
    const tentarComCatch = async (): Promise<ResultadoTentativa> => {
      try {
        return await tentar();
      } catch {
        return { ok: false, tipo: "rede" };
      }
    };
    const { atualizados } = await processarFila([item], tentarComCatch);
    expect(atualizados[0].sincronizacao).toBe("pendente");
    expect(atualizados[0].ultimoErro).toBeUndefined();
  });
});
