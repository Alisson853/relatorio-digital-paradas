import { describe, expect, it } from "vitest";
import { escreverComVersao, upsertComVersao, type ParadaStore } from "@/lib/db/paradas-repo";
import type { ParadaRow, NovaParadaRow } from "@/lib/db/schema";
import { NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import { criarParadaRow, criarServico } from "@/lib/actions/__tests__/fixtures";

// Fake em memória das três operações que o mecanismo de concorrência
// depende — sem isso, testar a corrida exigiria um Postgres de verdade. As
// implementações espelham a semântica das reais (ver paradaStorePostgres em
// lib/db/paradas-repo.ts): "atualizarSeVersaoBater" só grava se a versão bate,
// e cada gravação bem-sucedida sempre anda a versão pra frente.
function criarFakeStore(rowInicial: ParadaRow): ParadaStore & { obterEstadoAtual: () => ParadaRow } {
  let estado = rowInicial;
  return {
    async buscarPorId(id) {
      return estado.id === id ? { ...estado } : null;
    },
    async atualizarSeVersaoBater(id, versaoEsperada, valores) {
      if (estado.id !== id) return false;
      if (estado.atualizadoEm.getTime() !== versaoEsperada.getTime()) return false;
      estado = { ...estado, ...valores, atualizadoEm: new Date(estado.atualizadoEm.getTime() + 1) } as ParadaRow;
      return true;
    },
    async upsert(valores, versaoEsperada) {
      if (versaoEsperada) {
        if (estado.id !== valores.id || estado.atualizadoEm.getTime() !== versaoEsperada.getTime()) return false;
      }
      estado = { ...estado, ...valores, atualizadoEm: new Date(estado.atualizadoEm.getTime() + 1) } as ParadaRow;
      return true;
    },
    obterEstadoAtual: () => estado,
  };
}

describe("escreverComVersao — concorrência", () => {
  it("duas gravações concorrentes na mesma parada não se apagam: a que perde a corrida relê e tenta de novo", async () => {
    const servicoA = criarServico({ id: "a", fotoAntes: NO_PHOTO_PLACEHOLDER });
    const servicoB = criarServico({ id: "b", numeroOS: "999", fotoAntes: NO_PHOTO_PLACEHOLDER });
    const store = criarFakeStore(criarParadaRow({ servicos: [servicoA, servicoB] }));

    const patch = (idAlvo: string, url: string) => (row: ParadaRow) => {
      const idx = row.servicos.findIndex((s) => s.id === idAlvo);
      const atualizados = [...row.servicos];
      atualizados[idx] = { ...atualizados[idx], fotoAntes: url };
      return { valores: { servicos: atualizados } };
    };

    // B lê o estado ANTES de A escrever (a leitura de B não é bloqueada), mas
    // a primeira tentativa de ESCRITA de B só acontece depois que A já
    // terminou — reproduzindo a corrida real: as duas leram o mesmo estado,
    // uma grava primeiro, a outra tem que perceber e reaplicar em cima do
    // que já mudou.
    let liberarPrimeiraEscritaB: () => void = () => {};
    const bloqueioPrimeiraEscritaB = new Promise<void>((resolve) => {
      liberarPrimeiraEscritaB = resolve;
    });
    let tentativasEscritaB = 0;
    const storeParaB: ParadaStore = {
      buscarPorId: store.buscarPorId,
      upsert: store.upsert,
      async atualizarSeVersaoBater(id, versaoEsperada, valores) {
        tentativasEscritaB++;
        if (tentativasEscritaB === 1) await bloqueioPrimeiraEscritaB;
        return store.atualizarSeVersaoBater(id, versaoEsperada, valores);
      },
    };

    const promessaB = escreverComVersao("parada-1", patch("b", "https://x/B.jpg"), storeParaB);
    const resultadoA = await escreverComVersao("parada-1", patch("a", "https://x/A.jpg"), store);
    expect(resultadoA.ok).toBe(true);

    liberarPrimeiraEscritaB();
    const resultadoB = await promessaB;

    expect(resultadoB.ok).toBe(true);
    expect(tentativasEscritaB).toBe(2); // a 1ª tentativa perdeu a corrida, a 2ª (com dado fresco) venceu

    const final = store.obterEstadoAtual();
    expect(final.servicos.find((s) => s.id === "a")?.fotoAntes).toBe("https://x/A.jpg");
    expect(final.servicos.find((s) => s.id === "b")?.fotoAntes).toBe("https://x/B.jpg");
  });

  it("desiste depois de várias tentativas se a parada nunca para de mudar por baixo", async () => {
    const store = criarFakeStore(criarParadaRow());
    const storeSempreEmConflito: ParadaStore = {
      buscarPorId: store.buscarPorId,
      upsert: store.upsert,
      async atualizarSeVersaoBater() {
        return false; // simula contenção perpétua
      },
    };

    const resultado = await escreverComVersao("parada-1", (row) => ({ valores: { servicos: row.servicos } }), storeSempreEmConflito);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro).toMatch(/alterações simultâneas/i);
  });

  it("devolve erro sem tentar escrever quando o relatório não existe", async () => {
    const store = criarFakeStore(criarParadaRow());
    const resultado = await escreverComVersao("id-que-não-existe", (row) => ({ valores: { servicos: row.servicos } }), store);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro).toMatch(/não encontrado/i);
  });

  it("propaga o erro de negócio devolvido por `aplicar` sem tentar gravar", async () => {
    const store = criarFakeStore(criarParadaRow());
    const resultado = await escreverComVersao("parada-1", () => ({ erro: "Serviço não encontrado." }), store);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro).toBe("Serviço não encontrado.");
  });
});

describe("upsertComVersao — proteção do /novo contra salvar dado antigo", () => {
  it("permite salvar uma parada nova (sem versão esperada, id ainda não existe)", async () => {
    const store = criarFakeStore(criarParadaRow({ id: "outra-parada" }));
    const novaParada = criarParadaRow({ id: "parada-2" }) as unknown as NovaParadaRow;

    const sucesso = await upsertComVersao(novaParada, null, store);
    expect(sucesso).toBe(true);
  });

  it("recusa salvar quando a versão carregada pelo formulário está desatualizada", async () => {
    const original = criarParadaRow({ id: "parada-1", atualizadoEm: new Date("2026-01-10T08:00:00Z") });
    const store = criarFakeStore(original);

    // Simula a Captura Rápida gravando uma mudança enquanto o formulário
    // /novo estava aberto: a versão do banco anda pra frente...
    await store.atualizarSeVersaoBater("parada-1", original.atualizadoEm, { servicos: [criarServico({ id: "novo-em-campo" })] });

    // ...e o formulário tenta salvar com base na versão ANTIGA que carregou.
    const dadosDoFormulario = { ...original, nome: "Nome editado no formulário" } as unknown as NovaParadaRow;
    const sucesso = await upsertComVersao(dadosDoFormulario, original.atualizadoEm, store);

    expect(sucesso).toBe(false);
    // E o que a Captura Rápida gravou continua intacto — não foi sobrescrito.
    expect(store.obterEstadoAtual().servicos.some((s) => s.id === "novo-em-campo")).toBe(true);
  });

  it("permite salvar quando a versão carregada ainda é a atual", async () => {
    const original = criarParadaRow({ id: "parada-1" });
    const store = criarFakeStore(original);

    const dadosDoFormulario = { ...original, nome: "Nome editado" } as unknown as NovaParadaRow;
    const sucesso = await upsertComVersao(dadosDoFormulario, original.atualizadoEm, store);

    expect(sucesso).toBe(true);
    expect(store.obterEstadoAtual().nome).toBe("Nome editado");
  });
});
