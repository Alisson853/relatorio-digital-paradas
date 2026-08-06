"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  icon: LucideIcon;
  accent?: "brand" | "success" | "warning" | "danger";
  index?: number;
}

const accentMap = {
  brand: "bg-brand-50 text-brand-600",
  success: "bg-success-100 text-success-600",
  warning: "bg-warning-100 text-warning-600",
  danger: "bg-danger-100 text-danger-600",
};

export function KpiCard({ label, value, suffix = "", decimals = 0, icon: Icon, accent = "brand", index = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)] transition-shadow hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)]"
    >
      <div className={cn("mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl", accentMap[accent])}>
        <Icon size={22} strokeWidth={2} />
      </div>
      <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        <AnimatedCounter value={value} suffix={suffix} decimals={decimals} />
      </p>
      <p className="mt-1.5 text-sm font-medium text-slate-500">{label}</p>
    </motion.div>
  );
}
