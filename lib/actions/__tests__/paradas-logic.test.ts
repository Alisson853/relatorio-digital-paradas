import { describe, expect, it } from "vitest";
import { aplicarCapturaFoto, aplicarMarcarStatus, aplicarNaoFeito } from "@/lib/actions/paradas-logic";
import { NO_PHOTO_PLACEHOLDER } from "@/lib/image-utils";
import { criarParadaRow, criarServico } from "./fixtures";

describe("aplicarCapturaFoto", () => {
  it("grava a foto no campo vazio certo e não fecha a OS sozinha se só uma foto existe", () => {
    const servico = criarServico({ fotoAntes: NO_PHOTO_PLACEHOLDER, fotoDepois: NO_PHOTO_PLACEHOLDER, status: "pendente" });
    const row = criarParadaRow({ servicos: [servico] });

    const resultado = aplicarCapturaFoto(row, { servicoId: servico.id, url: "https://x.public.blob.vercel-storage.com/a.jpg" });

    if ("erro" in resultado) throw new Error("não deveria falhar");
    const servicosAtualizados = resultado.valores.servicos as typeof row.servicos;
    expect(servicosAtualizados[0].fotoAntes).toBe("https://x.public.blob.vercel-storage.com/a.jpg");
    expect(servicosAtualizados[0].status).toBe("pendente");
    expect(resultado.extra?.label).toBe("Antes");
    // Só mexeu no array de serviços — não recalculou kpis/gráficos à toa.
    expect(resultado.valores.kpis).toBeUndefined();
  });

  it("fecha a OS sozinha (status concluído) quando Antes e Depois já existem, e recalcula os KPIs", () => {
    const servico = criarServico({ fotoAntes: "https://x.public.blob.vercel-storage.com/antes.jpg", fotoDepois: NO_PHOTO_PLACEHOLDER, status: "pendente" });
    const row = criarParadaRow({ servicos: [servico] });

    const resultado = aplicarCapturaFoto(row, { servicoId: servico.id, url: "https://x.public.blob.vercel-storage.com/depois.jpg" });

    if ("erro" in resultado) throw new Error("não deveria falhar");
    const servicosAtualizados = resultado.valores.servicos as typeof row.servicos;
    expect(servicosAtualizados[0].status).toBe("concluido");
    expect(resultado.extra?.statusFechado).toBe("concluido");
    expect(resultado.valores.kpis).toBeDefined();
    expect((resultado.valores.kpis as { osConcluidas: number }).osConcluidas).toBe(1);
  });

  it("devolve erro quando o serviço não existe no relatório", () => {
    const row = criarParadaRow();
    const resultado = aplicarCapturaFoto(row, { servicoId: "não-existe", url: "https://x.public.blob.vercel-storage.com/a.jpg" });
    expect("erro" in resultado).toBe(true);
  });
});

describe("aplicarMarcarStatus", () => {
  it("muda o status do serviço certo e recalcula eficiência", () => {
    const servico = criarServico({ status: "pendente" });
    const row = criarParadaRow({ servicos: [servico] });

    const resultado = aplicarMarcarStatus(row, { servicoId: servico.id, status: "concluido" });

    if ("erro" in resultado) throw new Error("não deveria falhar");
    const servicosAtualizados = resultado.valores.servicos as typeof row.servicos;
    expect(servicosAtualizados[0].status).toBe("concluido");
    expect((resultado.valores.kpis as { eficiencia: number }).eficiencia).toBe(100);
  });

  it("não mexe nos outros serviços do mesmo relatório", () => {
    const alvo = criarServico({ id: "srv-alvo", status: "pendente" });
    const outro = criarServico({ id: "srv-outro", status: "pendente", numeroOS: "999" });
    const row = criarParadaRow({ servicos: [alvo, outro] });

    const resultado = aplicarMarcarStatus(row, { servicoId: "srv-alvo", status: "concluido" });

    if ("erro" in resultado) throw new Error("não deveria falhar");
    const servicosAtualizados = resultado.valores.servicos as typeof row.servicos;
    expect(servicosAtualizados.find((s) => s.id === "srv-outro")?.status).toBe("pendente");
  });
});

describe("aplicarNaoFeito", () => {
  it("marca a categoria, apaga as fotos do serviço e devolve as urls pra apagar do Blob", () => {
    const servico = criarServico({
      fotoAntes: "https://x.public.blob.vercel-storage.com/antes.jpg",
      fotoDepois: "https://x.public.blob.vercel-storage.com/depois.jpg",
    });
    const row = criarParadaRow({ servicos: [servico] });

    const resultado = aplicarNaoFeito(row, { servicoId: servico.id, categoria: "Falta de Material", justificativa: "Peça não chegou" });

    if ("erro" in resultado) throw new Error("não deveria falhar");
    const servicosAtualizados = resultado.valores.servicos as typeof row.servicos;
    expect(servicosAtualizados[0].naoFeitoCategoria).toBe("Falta de Material");
    expect(servicosAtualizados[0].fotoAntes).toBe(NO_PHOTO_PLACEHOLDER);
    expect(servicosAtualizados[0].fotoDepois).toBe(NO_PHOTO_PLACEHOLDER);
    expect(resultado.extra?.fotosRemovidas).toBe(true);
    expect(resultado.extra?.urlsParaApagar).toEqual([
      "https://x.public.blob.vercel-storage.com/antes.jpg",
      "https://x.public.blob.vercel-storage.com/depois.jpg",
    ]);
  });

  it("desmarcar (categoria vazia) não mexe em foto nenhuma", () => {
    const servico = criarServico({
      naoFeitoCategoria: "Falta de Tempo",
      fotoAntes: "https://x.public.blob.vercel-storage.com/antes.jpg",
      fotoDepois: "https://x.public.blob.vercel-storage.com/depois.jpg",
    });
    const row = criarParadaRow({ servicos: [servico] });

    const resultado = aplicarNaoFeito(row, { servicoId: servico.id, categoria: "", justificativa: "" });

    if ("erro" in resultado) throw new Error("não deveria falhar");
    const servicosAtualizados = resultado.valores.servicos as typeof row.servicos;
    expect(servicosAtualizados[0].naoFeitoCategoria).toBeUndefined();
    expect(servicosAtualizados[0].fotoAntes).toBe("https://x.public.blob.vercel-storage.com/antes.jpg");
    expect(resultado.extra?.urlsParaApagar).toEqual([]);
  });

  it("marcar sem foto nenhuma não gera url pra apagar", () => {
    const servico = criarServico({ fotoAntes: NO_PHOTO_PLACEHOLDER, fotoDepois: NO_PHOTO_PLACEHOLDER });
    const row = criarParadaRow({ servicos: [servico] });

    const resultado = aplicarNaoFeito(row, { servicoId: servico.id, categoria: "Falta de Tempo", justificativa: "" });

    if ("erro" in resultado) throw new Error("não deveria falhar");
    expect(resultado.extra?.fotosRemovidas).toBe(false);
    expect(resultado.extra?.urlsParaApagar).toEqual([]);
  });
});
