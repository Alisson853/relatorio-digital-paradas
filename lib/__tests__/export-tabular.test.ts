import { describe, expect, it } from "vitest";
import { neutralizarFormula } from "@/lib/export-tabular";

// Bloco H: protege a correção de CSV/XLSX Injection (OWASP) — um valor de
// texto livre (nome da parada, responsável) que comece com um gatilho de
// fórmula não pode mais chegar intacto ao arquivo exportado.
describe("neutralizarFormula", () => {
  it("prefixa valor começando com =", () => {
    expect(neutralizarFormula("=HYPERLINK(\"http://evil.example\")")).toBe("'=HYPERLINK(\"http://evil.example\")");
  });

  it("prefixa valor começando com +, -, @", () => {
    expect(neutralizarFormula("+1+1")).toBe("'+1+1");
    expect(neutralizarFormula("-1+1")).toBe("'-1+1");
    expect(neutralizarFormula("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("prefixa valor começando com tab ou carriage return", () => {
    expect(neutralizarFormula("\t=1+1")).toBe("'\t=1+1");
    expect(neutralizarFormula("\r=1+1")).toBe("'\r=1+1");
  });

  it("não mexe em texto comum, mesmo com esses caracteres no meio", () => {
    expect(neutralizarFormula("Parada MP09 - Turno A")).toBe("Parada MP09 - Turno A");
    expect(neutralizarFormula("ana@example.com")).toBe("ana@example.com");
  });

  it("não mexe em string vazia", () => {
    expect(neutralizarFormula("")).toBe("");
  });
});
