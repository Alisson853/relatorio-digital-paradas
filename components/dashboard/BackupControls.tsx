"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { downloadAllParadasJson, importParadasFromFile } from "@/lib/local-store";
import { StorageIndicator } from "./StorageIndicator";

export function BackupControls() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState("");

  async function handleImport(file: File | undefined) {
    if (!file) return;
    setErro("");
    try {
      const { importados, ignorados } = await importParadasFromFile(file);
      if (importados === 0) {
        setErro("Nenhum relatório válido encontrado nesse arquivo.");
        return;
      }
      window.alert(`${importados} relatório(s) importado(s) com sucesso.${ignorados ? ` ${ignorados} item(ns) ignorado(s).` : ""}`);
      window.location.reload();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível importar o arquivo.");
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => handleImport(e.target.files?.[0])}
      />
      <StorageIndicator />
      <button
        type="button"
        onClick={downloadAllParadasJson}
        title="Baixar backup de todos os relatórios criados neste navegador"
        className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
      >
        <Download size={14} />
        <span className="hidden sm:inline">Exportar Tudo</span>
      </button>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Restaurar relatórios a partir de um backup"
        className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
      >
        <Upload size={14} />
        <span className="hidden sm:inline">Importar</span>
      </button>
      {erro && <span className="text-xs font-semibold text-danger-600">{erro}</span>}
    </div>
  );
}
