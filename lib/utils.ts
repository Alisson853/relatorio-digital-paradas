import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    concluida: "Concluída",
    ressalvas: "Concluída com Ressalvas",
    em_andamento: "Em Andamento",
    concluido: "Concluído",
    atrasado: "Atrasado",
    pendente: "Pendente",
  };
  return map[status] ?? status;
}

export function statusColorClasses(status: string): string {
  const map: Record<string, string> = {
    concluida: "bg-success-100 text-success-600",
    concluido: "bg-success-100 text-success-600",
    ressalvas: "bg-warning-100 text-warning-600",
    atrasado: "bg-danger-100 text-danger-600",
    em_andamento: "bg-brand-100 text-brand-700",
    pendente: "bg-slate-200 text-slate-600",
  };
  return map[status] ?? "bg-slate-200 text-slate-600";
}

export function statusDotClasses(status: string): string {
  const map: Record<string, string> = {
    concluida: "bg-success-600",
    concluido: "bg-success-600",
    ressalvas: "bg-warning-600",
    atrasado: "bg-danger-600",
    em_andamento: "bg-brand-500",
    pendente: "bg-slate-400",
  };
  return map[status] ?? "bg-slate-400";
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
