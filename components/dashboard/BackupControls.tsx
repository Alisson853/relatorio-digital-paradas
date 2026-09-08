"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import type { ParadaCompleta } from "@/lib/types";
import { listParadasResumo, exportarBackupCompleto, saveParada } from "@/lib/actions/paradas";
import { triggerJsonDownload } from "@/lib/local-json";

function isValidParadaCompleta(value: unknown): value is ParadaCompleta {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const resumo = v.resumo as Record<string, unknown> | undefined;
  return !!resumo && typeof resumo.id === "string" && typeof resumo.nome === "string";
}

export function BackupControls() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function handleExportarTudo() {
    setErro("");
    const resultado = await exportarBackupCompleto();
    if (!resultado.ok || !resultado.dados) {
      setErro(resultado.erro || "Não foi possível exportar o backup.");
      return;
    }
    triggerJsonDownload(`relatorios-santher-backup-${new Date().toISOString().slice(0, 10)}.json`, resultado.dados);
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    setErro("");
    setOcupado(true);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Arquivo inválido — não foi possível ler o JSON.");
      }

      const candidatos = Array.isArray(parsed) ? parsed : [parsed];
      const validos = candidatos.filter(isValidParadaCompleta);
      const existentes = await listParadasResumo();
      const existentesIds = new Set(existentes.map((p) => p.id));
      const seraoSubstituidos = validos.filter((c) => existentesIds.has(c.resumo.id));

      if (seraoSubstituidos.length > 0) {
        const nomes = seraoSubstituidos.map((c) => `"${c.resumo.nome}"`).join(", ");
        const confirmado = window.confirm(
          `Este arquivo vai SUBSTITUIR ${seraoSubstituidos.length} relatório(s) já existente(s) (${nomes}) pelos dados do backup — os dados atuais desses relatórios serão perdidos. Continuar?`
        );
        if (!confirmado) {
          setOcupado(false);
          return;
        }
      }

      let importados = 0;
      let ignorados = 0;

      for (const candidato of candidatos) {
        if (isValidParadaCompleta(candidato)) {
          const resultado = await saveParada(candidato);
          if (resultado.ok) importados++;
          else ignorados++;
        } else {
          ignorados++;
        }
      }

      if (importados === 0) {
        setErro("Nenhum relatório válido encontrado nesse arquivo.");
        return;
      }
      window.alert(`${importados} relatório(s) importado(s) com sucesso.${ignorados ? ` ${ignorados} item(ns) ignorado(s).` : ""}`);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível importar o arquivo.");
    } finally {
      setOcupado(false);
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
      <button
        type="button"
        onClick={handleExportarTudo}
        title="Baixar backup de todos os relatórios"
        className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
      >
        <Download size={14} />
        <span className="hidden sm:inline">Exportar Tudo</span>
      </button>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={ocupado}
        title="Restaurar relatórios a partir de um backup"
        className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-60"
      >
        <Upload size={14} />
        <span className="hidden sm:inline">{ocupado ? "Importando..." : "Importar"}</span>
      </button>
      {erro && <span className="text-xs font-semibold text-danger-600">{erro}</span>}
    </div>
  );
}
