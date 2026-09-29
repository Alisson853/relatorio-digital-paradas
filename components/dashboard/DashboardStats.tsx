import type { ParadaResumo } from "@/lib/types";
import { cn } from "@/lib/utils";

// Leitura de instrumento, não cartão. Até o Bloco E2 esses números viviam
// numa caixa branca com borda e sombra flutuando por cima do hero escuro —
// exatamente a colisão que "pare de usar card pra tudo" pede pra eliminar:
// um componente claro pousado sobre um fundo que já tem identidade própria.
// Agora os números são tipografia pura direto sobre o gradiente/blueprint,
// separados por regra (hairline), não por caixa — como um painel real.
function Indicador({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex-1">
      <div className="flex items-center gap-1.5">
        <span className={cn("h-1.5 w-1.5 flex-none rounded-full", dot)} />
        <p className="label-tecnico text-[10px] font-bold text-brand-300">{label}</p>
      </div>
      <p className="mt-1.5 text-2xl font-bold leading-none tracking-tight text-white sm:text-3xl">{value}</p>
    </div>
  );
}

export function DashboardStats({ paradas }: { paradas: ParadaResumo[] }) {
  const total = paradas.length;
  const emAndamento = paradas.filter((p) => p.status === "em_andamento").length;
  const concluidas = paradas.filter((p) => p.status === "concluida").length;
  const ressalvas = paradas.filter((p) => p.status === "ressalvas").length;

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-6">
      {/* Número âncora: o total, isolado e no maior peso tipográfico da
          faixa — a mesma fonte de título (font-display) que assina a capa,
          não mais um número de card genérico. */}
      <div className="flex-none">
        <p className="label-tecnico text-[10px] font-bold text-brand-300">Paradas Registradas</p>
        <p className="font-display mt-1.5 text-5xl font-semibold leading-none tracking-tight text-white sm:text-6xl">{total}</p>
      </div>

      {/* Regra divisória em vez de borda de card — separa "o total" dos
          três indicadores secundários sem introduzir uma segunda forma. */}
      <div className="flex min-w-[240px] flex-1 gap-x-6 border-t border-white/10 pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
        {/* signal-400 (âmbar) em vez de brand nos pontos de "andamento" — dois
            azuis próximos (ponto + fundo do hero) quase somem um no outro;
            o âmbar é o mesmo acento de atenção já usado no resto do sistema. */}
        <Indicador label="Andamento" value={emAndamento} dot="bg-signal-400" />
        <Indicador label="Concluídas" value={concluidas} dot="bg-success-600" />
        <Indicador label="Ressalvas" value={ressalvas} dot="bg-warning-600" />
      </div>
    </div>
  );
}
