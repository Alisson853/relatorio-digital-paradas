import { describe, expect, it } from "vitest";
import { chaveFotoPendente } from "@/lib/offline-fotos";
import { chaveNaoFeito } from "@/lib/offline-nao-feito";
import { chaveStatus } from "@/lib/offline-status";

// As três filas evitam duplicação da mesma forma: a chave de cada item é
// determinística (mesmos parâmetros → mesma chave), então uma segunda
// gravação pro mesmo alvo SUBSTITUI a pendência anterior (via IDBObjectStore
// keyPath) em vez de empilhar uma segunda entrada. Isso testa exatamente essa
// determinicidade, sem precisar simular IndexedDB — o resto (put/getAll é
// substituição, não duplicação, com a mesma chave) é comportamento nativo do
// IndexedDB, não lógica deste projeto.

describe("chaveFotoPendente — dedup de fotos", () => {
  it("a mesma parada/serviço/etapa sempre produz a mesma chave (retake substitui, não duplica)", () => {
    const a = chaveFotoPendente("parada-1", "servico-1", "Antes");
    const b = chaveFotoPendente("parada-1", "servico-1", "Antes");
    expect(a).toBe(b);
  });

  it("etapas diferentes do mesmo serviço têm chaves diferentes (Antes/Durante/Depois não se substituem)", () => {
    const antes = chaveFotoPendente("parada-1", "servico-1", "Antes");
    const durante = chaveFotoPendente("parada-1", "servico-1", "Durante");
    const depois = chaveFotoPendente("parada-1", "servico-1", "Depois");
    expect(new Set([antes, durante, depois]).size).toBe(3);
  });

  it("serviços diferentes nunca colidem, mesmo com a mesma etapa", () => {
    const a = chaveFotoPendente("parada-1", "servico-1", "Antes");
    const b = chaveFotoPendente("parada-1", "servico-2", "Antes");
    expect(a).not.toBe(b);
  });

  it("a mesma foto em paradas diferentes nunca colide", () => {
    const a = chaveFotoPendente("parada-1", "servico-1", "Antes");
    const b = chaveFotoPendente("parada-2", "servico-1", "Antes");
    expect(a).not.toBe(b);
  });
});

describe("chaveNaoFeito / chaveStatus — dedup de uma pendência por serviço", () => {
  it("chaveNaoFeito é determinística por parada+serviço", () => {
    expect(chaveNaoFeito("parada-1", "servico-1")).toBe(chaveNaoFeito("parada-1", "servico-1"));
    expect(chaveNaoFeito("parada-1", "servico-1")).not.toBe(chaveNaoFeito("parada-1", "servico-2"));
  });

  it("chaveStatus é determinística por parada+serviço", () => {
    expect(chaveStatus("parada-1", "servico-1")).toBe(chaveStatus("parada-1", "servico-1"));
    expect(chaveStatus("parada-1", "servico-1")).not.toBe(chaveStatus("parada-1", "servico-2"));
  });

  it("chaveNaoFeito e chaveStatus nunca colidem entre si (bancos IndexedDB diferentes, mas por clareza)", () => {
    // Mesmo formato de string (`${paradaId}:${servicoId}`) — o que as separa
    // de verdade é cada uma viver num banco IndexedDB próprio (ver DB_NOME em
    // cada arquivo), não a chave em si. Aqui só confirma que o formato é
    // idêntico entre as duas, como documentado.
    expect(chaveNaoFeito("parada-1", "servico-1")).toBe(chaveStatus("parada-1", "servico-1"));
  });
});
