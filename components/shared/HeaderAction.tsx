import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type HeaderActionProps = { href: string; icon: LucideIcon; children: ReactNode; variant?: "ghost" | "primary"; className?: string };

export function HeaderAction({ href, icon: Icon, children, variant = "ghost", className }: HeaderActionProps) {
  return <Link href={href} className={cn("inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600", variant === "primary" ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900", className)}><Icon size={15} aria-hidden="true" />{children}</Link>;
}
