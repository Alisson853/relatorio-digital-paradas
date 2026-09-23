"use client";

import { AlertTriangle, CheckCircle2, ClipboardList, Gauge, HardHat, Radar, ShieldCheck, Tag, Timer, Users } from "lucide-react";
import type { Kpis } from "@/lib/types";
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
  // Quase todo indicador aqui é um resumo de algo detalhado em outra
  // seção — um único callback (em vez de um por card) leva a apresentação
  // até lá, escolhendo o destino pelo rótulo de quem foi clicado. Opcional
  // porque o PrintReport (export estático) reaproveita esse mesmo
  // componente sem ter pra onde navegar.
  onCardClick?: (label: SummaryCardLabel) => void;
}

export function SummarySection({ kpis, onCardClick }: Props) {
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
