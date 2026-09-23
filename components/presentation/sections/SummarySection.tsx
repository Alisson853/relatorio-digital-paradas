"use client";

import { AlertTriangle, CheckCircle2, ClipboardList, Gauge, HardHat, Radar, ShieldCheck, Tag, Timer, Users } from "lucide-react";
import type { Kpis } from "@/lib/types";
import { KpiCard } from "@/components/ui/KpiCard";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface Props {
  kpis: Kpis;
  // Some indicadores são um resumo de algo detalhado em outra seção — os
  // callbacks levam a apresentação até lá quando o card é clicado. Opcionais
  // porque o PrintReport (export estático) reaproveita esse mesmo componente
  // sem ter pra onde navegar.
  onVerPendencias?: () => void;
  onVerEtiqueta?: (categoria: "Etiqueta Vermelha" | "Etiqueta Amarela") => void;
}

export function SummarySection({ kpis, onVerPendencias, onVerEtiqueta }: Props) {
  const cards = [
    { label: "OS Planejadas", value: kpis.osPlanejadas, icon: ClipboardList, accent: "brand" as const },
    { label: "OS Concluídas", value: kpis.osConcluidas, icon: CheckCircle2, accent: "success" as const },
    { label: "Eficiência", value: kpis.eficiencia, suffix: "%", decimals: 1, icon: Gauge, accent: "brand" as const },
    { label: "Horas Trabalhadas", value: kpis.horasTrabalhadas, icon: Timer, accent: "brand" as const },
    { label: "OS Elétrica", value: kpis.equipeEletrica, icon: Users, accent: "brand" as const },
    { label: "OS Mecânica", value: kpis.equipeMecanica, icon: HardHat, accent: "brand" as const },
    { label: "OS Instrumentação", value: kpis.equipeInstrumentacao, icon: Radar, accent: "brand" as const },
    { label: "Segurança", value: kpis.seguranca, suffix: "%", icon: ShieldCheck, accent: "success" as const },
    {
      label: "Pendências",
      value: kpis.pendencias,
      icon: AlertTriangle,
      accent: kpis.pendencias > 0 ? ("warning" as const) : ("success" as const),
      onClick: onVerPendencias,
    },
    { label: "Etiqueta Vermelha", value: kpis.etiquetaVermelha, icon: Tag, accent: "danger" as const, onClick: onVerEtiqueta && (() => onVerEtiqueta("Etiqueta Vermelha")) },
    { label: "Etiqueta Amarela", value: kpis.etiquetaAmarela, icon: Tag, accent: "warning" as const, onClick: onVerEtiqueta && (() => onVerEtiqueta("Etiqueta Amarela")) },
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
          {cards.map((card, i) => (
            <KpiCard key={card.label} index={i} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}
