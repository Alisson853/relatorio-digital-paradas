"use client";

import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Botão único do sistema — antes cada tela reinventava a própria combinação
// de rounded-xl/bg-brand-600/px-4/py-3, cada uma com um valor levemente
// diferente das outras. Um só lugar define primary/secondary/danger/ghost,
// os dois tamanhos, e os estados (hover/active/focus/disabled/loading) —
// mudar aqui muda em todo canto que usa o componente, em vez de caçar cada
// botão espalhado pelo projeto.

export type BotaoVariante = "primary" | "secondary" | "danger" | "ghost";
export type BotaoTamanho = "md" | "sm";

const VARIANTES: Record<BotaoVariante, string> = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-300",
  secondary: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:ring-slate-300",
  danger: "bg-danger-600 text-white shadow-sm hover:bg-danger-700 focus-visible:ring-danger-300",
  ghost: "text-slate-500 hover:bg-slate-100 focus-visible:ring-slate-300",
};

const TAMANHOS: Record<BotaoTamanho, string> = {
  md: "min-h-11 gap-2 px-4 py-2.5 text-sm",
  sm: "min-h-9 gap-1.5 px-3 py-1.5 text-xs",
};

// active:scale é o feedback de clique (seção 8) — sutil (2%) e só na
// transição de transform, então não briga com prefers-reduced-motion (é
// deslocamento mínimo de escala, não uma animação contínua ou de entrada).
const BASE =
  "inline-flex flex-none items-center justify-center rounded-xl font-bold transition-[background-color,color,transform] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-60";

interface BotaoConteudoProps {
  icon?: LucideIcon;
  loading?: boolean;
  children: ReactNode;
}

function ConteudoBotao({ icon: Icon, loading, children }: BotaoConteudoProps) {
  return (
    <>
      {loading ? <Loader2 size={16} className="flex-none animate-spin" /> : Icon ? <Icon size={16} className="flex-none" /> : null}
      {children}
    </>
  );
}

interface BotaoProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">, BotaoConteudoProps {
  variant?: BotaoVariante;
  size?: BotaoTamanho;
}

export function Button({ variant = "primary", size = "md", icon, loading, disabled, className, children, ...rest }: BotaoProps) {
  return (
    <button type="button" disabled={disabled || loading} className={cn(BASE, VARIANTES[variant], TAMANHOS[size], className)} {...rest}>
      <ConteudoBotao icon={icon} loading={loading}>
        {children}
      </ConteudoBotao>
    </button>
  );
}

interface LinkButtonProps extends Omit<ComponentPropsWithoutRef<typeof Link>, "children">, BotaoConteudoProps {
  variant?: BotaoVariante;
  size?: BotaoTamanho;
}

// Mesma aparência do Button, pra navegação (Link do Next) em vez de ação —
// ex: "Visualizar Relatório", "Voltar ao Dashboard".
export function LinkButton({ variant = "primary", size = "md", icon, loading, className, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={cn(BASE, VARIANTES[variant], TAMANHOS[size], className)} {...rest}>
      <ConteudoBotao icon={icon} loading={loading}>
        {children}
      </ConteudoBotao>
    </Link>
  );
}
