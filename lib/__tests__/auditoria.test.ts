import { describe, expect, it, vi } from "vitest";
import { registrarAuditoria } from "@/lib/auditoria";

describe("registrarAuditoria", () => {
  it("grava uma linha JSON com tipo, timestamp, ação e o que foi afetado", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    registrarAuditoria({ acao: "mudanca_status", paradaId: "p1", servicoId: "s1", origem: "203.0.113.5", detalhe: { status: "concluido" } });

    expect(spy).toHaveBeenCalledOnce();
    const linha = JSON.parse(spy.mock.calls[0][0] as string);
    expect(linha.tipo).toBe("auditoria");
    expect(linha.acao).toBe("mudanca_status");
    expect(linha.paradaId).toBe("p1");
    expect(linha.servicoId).toBe("s1");
    expect(linha.origem).toBe("203.0.113.5");
    expect(linha.detalhe).toEqual({ status: "concluido" });
    expect(typeof linha.em).toBe("string");
    expect(Number.isNaN(Date.parse(linha.em))).toBe(false);

    spy.mockRestore();
  });

  it("não exige servicoId nem detalhe (ações no nível do relatório inteiro)", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    registrarAuditoria({ acao: "excluir_relatorio", paradaId: "p2", origem: "203.0.113.5" });
    const linha = JSON.parse(spy.mock.calls[0][0] as string);
    expect(linha.servicoId).toBeUndefined();
    spy.mockRestore();
  });
});
