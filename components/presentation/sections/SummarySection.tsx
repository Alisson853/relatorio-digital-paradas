"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Gauge, HardHat, Radar, ShieldCheck, Tag, Timer, Users } from "lucide-react";
import type { Kpis, Servico } from "@/lib/types";
import { KpiCard } from "@/components/ui/KpiCard";
import { SectionHeading } from "@/components/ui/SectionHeading";

// "Segurança" fica de fora de propósito: é só um índice, não tem uma lista
// de itens pra mostrar em outra seção — os outros dez todos levam a algum
// lugar (Serviços filtrado, Gráficos ou o Resultado).
export type SummaryCardLabel =
  | "OS Planejadas"
  | "OS Concluídas"
  | "Eficiência"
  | "Horas Trabalhadas"
  | "OS Elétrica"
  | "OS Mecânica"
  | "OS Instrumentação"
  | "Pendências"
  | "Etiqueta Vermelha"
  | "Etiqueta Amarela";

interface Props {
  kpis: Kpis;
  servicos?: Servico[];
  // Quase todo indicador aqui é um resumo de algo detalhado em outra
  // seção — um único callback (em vez de um por card) leva a apresentação
  // até lá, escolhendo o destino pelo rótulo de quem foi clicado. Opcional
  // porque o PrintReport (export estático) reaproveita esse mesmo
  // componente sem ter pra onde navegar.
  onCardClick?: (label: SummaryCardLabel) => void;
}

export function SummarySection({ kpis, servicos = [], onCardClick }: Props) {
  // Serviços de "Oportunidade" (sem nº de OS, abertos na hora) entram na %
  // por padrão; marcar a caixinha recalcula só em cima do que foi programado.
  const [soProgramadas, setSoProgramadas] = useState(false);
  const oportunidades = servicos.filter((s) => s.numeroOS === "Oportunidade").length;
  const programadas = servicos.filter((s) => s.numeroOS !== "Oportunidade");
  const progConcluidas = programadas.filter((s) => s.status === "concluido").length;
  if (soProgramadas && oportunidades > 0) {
    kpis = {
      ...kpis,
      osPlanejadas: programadas.length,
      osConcluidas: progConcluidas,
      eficiencia: programadas.length > 0 ? Math.round((progConcluidas / programadas.length) * 1000) / 10 : 0,
      pendencias: programadas.length - progConcluidas,
    };
  }
  const cards = [
    { label: "OS Planejadas" as const, value: kpis.osPlanejadas, icon: ClipboardList, accent: "brand" as const },
    { label: "OS Concluídas" as const, value: kpis.osConcluidas, icon: CheckCircle2, accent: "success" as const },
    { label: "Eficiência" as const, value: kpis.eficiencia, suffix: "%", decimals: 1, icon: Gauge, accent: "brand" as const },
    { label: "Horas Trabalhadas" as const, value: kpis.horasTrabalhadas, icon: Timer, accent: "brand" as const },
    { label: "OS Elétrica" as const, value: kpis.equipeEletrica, icon: Users, accent: "brand" as const },
    { label: "OS Mecânica" as const, value: kpis.equipeMecanica, icon: HardHat, accent: "brand" as const },
    { label: "OS Instrumentação" as const, value: kpis.equipeInstrumentacao, icon: Radar, accent: "brand" as const },
    { label: "Segurança" as const, value: kpis.seguranca, suffix: "%", icon: ShieldCheck, accent: "success" as const, semLink: true },
    {
      label: "Pendências" as const,
      value: kpis.pendencias,
      icon: AlertTriangle,
      accent: kpis.pendencias > 0 ? ("warning" as const) : ("success" as const),
    },
    { label: "Etiqueta Vermelha" as const, value: kpis.etiquetaVermelha, icon: Tag, accent: "danger" as const },
    { label: "Etiqueta Amarela" as const, value: kpis.etiquetaAmarela, icon: Tag, accent: "warning" as const },
  ];

  return (
    <section id="resumo" className="section-screen flex items-center bg-slate-50 px-6 py-24 sm:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="Resumo Executivo"
          title="Indicadores Gerais da Parada"
          description="Panorama consolidado do desempenho da parada, pronto para apresentação em reuniões de gestão."
        />
        {oportunidades > 0 && (
          <label className="mb-5 flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600">
            <input type="checkbox" checked={soProgramadas} onChange={(e) => setSoProgramadas(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
            Só OS programadas (sem as {oportunidades} de oportunidade)
          </label>
        )}
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {cards.map(({ semLink, ...card }, i) => (
            <KpiCard
              key={card.label}
              index={i}
              {...card}
              onClick={onCardClick && !semLink ? () => onCardClick(card.label as SummaryCardLabel) : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
