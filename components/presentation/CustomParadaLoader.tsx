"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import type { ParadaCompleta } from "@/lib/types";
import { getCustomParadaById } from "@/lib/local-store";
import { PresentationView } from "./PresentationView";

export function CustomParadaLoader({ id }: { id: string }) {
  const [status, setStatus] = useState<"loading" | "found" | "not-found">("loading");
  const [data, setData] = useState<ParadaCompleta | null>(null);

  useEffect(() => {
    const found = getCustomParadaById(id);
    if (found) {
      setData(found);
      setStatus("found");
    } else {
      setStatus("not-found");
    }
  }, [id]);

  if (status === "loading") {
    return <div className="min-h-screen bg-white" />;
  }

  if (status === "not-found" || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning-100 text-warning-600">
          <AlertTriangle size={26} />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Relatório não encontrado</h1>
        <p className="max-w-sm text-sm text-slate-500">
          Esta parada não existe ou foi criada em outro navegador — relatórios criados por você ficam salvos apenas neste dispositivo.
        </p>
        <Link href="/" className="mt-2 flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
          <ArrowLeft size={16} />
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  return <PresentationView data={data} />;
}
