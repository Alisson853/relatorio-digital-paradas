import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, backHref = "/", wide = false }: { title: string; subtitle: string; backHref?: string; wide?: boolean }) {
  return <header className="border-b border-slate-200 bg-white sm:sticky sm:top-0 sm:z-30 sm:bg-white/90 sm:backdrop-blur"><div className={cn("mx-auto flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-10 sm:py-5", wide ? "max-w-7xl" : "max-w-5xl")}><Link href={backHref} aria-label="Voltar ao painel" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"><ArrowLeft size={18} aria-hidden="true" /></Link><Image src="/santher-logo-azul.png" alt="Santher" width={120} height={32} className="hidden h-6 w-auto shrink-0 sm:block" /><div className="hidden h-8 w-px bg-slate-200 sm:block" /><div className="min-w-0"><h1 className="truncate text-sm font-bold leading-none text-slate-900">{title}</h1><p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500 sm:line-clamp-1">{subtitle}</p></div></div></header>;
}
