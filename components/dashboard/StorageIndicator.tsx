"use client";

import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { getStorageUsageBytes, STORAGE_QUOTA_REFERENCIA_BYTES } from "@/lib/local-store";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StorageIndicator() {
  const [bytes, setBytes] = useState<number | null>(null);

  useEffect(() => {
    setBytes(getStorageUsageBytes());
  }, []);

  if (bytes === null || bytes === 0) return null;

  const percentual = Math.min(100, Math.round((bytes / STORAGE_QUOTA_REFERENCIA_BYTES) * 100));
  const critico = percentual >= 85;
  const atencao = percentual >= 60;

  return (
    <div
      title={`${formatBytes(bytes)} usados neste navegador (estimativa de ${formatBytes(STORAGE_QUOTA_REFERENCIA_BYTES)} disponíveis)`}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold",
        critico ? "border-danger-100 bg-danger-100/60 text-danger-600" : atencao ? "border-warning-100 bg-warning-100/60 text-warning-600" : "border-slate-200 text-slate-500"
      )}
    >
      <HardDrive size={13} />
      <span className="hidden sm:inline">{formatBytes(bytes)} usados</span>
      <span className="sm:hidden">{percentual}%</span>
    </div>
  );
}
