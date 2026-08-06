"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  light?: boolean;
}

export function SectionHeading({ eyebrow, title, description, align = "left", light = false }: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn("mb-10", align === "center" && "text-center")}
    >
      <span
        className={cn(
          "mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]",
          light ? "bg-white/10 text-brand-200" : "bg-brand-50 text-brand-600"
        )}
      >
        {eyebrow}
      </span>
      <h2 className={cn("text-3xl font-bold tracking-tight sm:text-4xl", light ? "text-white" : "text-slate-900")}>
        {title}
      </h2>
      {description && (
        <p className={cn("mt-3 max-w-2xl text-base leading-relaxed", align === "center" && "mx-auto", light ? "text-slate-300" : "text-slate-500")}>
          {description}
        </p>
      )}
    </motion.div>
  );
}
