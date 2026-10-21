import { describe, expect, it } from "vitest";
import { candidatasCriticas, detectarConflitosProgramacao, horarioParaMinutos, servicosProgramados } from "@/lib/programacao";
import type { Servico } from "@/lib/types";

function servico(id: string, inicio: string, fim: string, responsavel = "Madson", equipe: Servico["equipe"] = "Mecânica"): Servico {
  return { id, numeroOS: id, titulo: id, equipamento: id, area: "MP09", responsavel, equipe, horaInicio: inicio, horaFim: fim, tempoGasto: "1h", problemaIdentificado: "", servicoExecutado: "", resultado: "", status: "pendente", fotoAntes: "", fotoDepois: "" };
}

describe("programação", () => {
  it("aceita horário e reconhece atividade que cruza a meia-noite", () => {
    expect(horarioParaMinutos("08:30")).toBe(510);
    expect(horarioParaMinutos("25:00")).toBeNull();
    expect(servicosProgramados([servico("1", "22:00", "01:00")])[0].fimMinutos).toBe(1500);
  });

  it("alerta somente quando o mesmo responsável está sobreposto", () => {
    const itens = [servico("1", "08:00", "10:00"), servico("2", "09:00", "11:00"), servico("3", "09:00", "11:00", "Outro")];
    expect(detectarConflitosProgramacao(itens)).toHaveLength(1);
  });

  it("marca a última atividade de cada equipe como candidata crítica", () => {
    const criticas = candidatasCriticas([servico("1", "08:00", "09:00"), servico("2", "09:00", "11:00"), servico("3", "08:00", "10:00", "Ana", "Elétrica")]);
    expect(criticas.map((item) => item.id).sort()).toEqual(["2", "3"]);
  });
});
