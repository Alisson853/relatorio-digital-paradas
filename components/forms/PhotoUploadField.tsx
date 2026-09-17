"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { compressImageFile } from "@/lib/image-utils";
import { uploadFoto } from "@/lib/actions/paradas";
import { cn } from "@/lib/utils";

interface PhotoUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

export function PhotoUploadField({ label, value, onChange, className }: PhotoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const comprimido = await compressImageFile(file);
      const formData = new FormData();
      formData.set("file", comprimido, file.name);
      const resultado = await uploadFoto(formData);
      if (!resultado.ok || !resultado.url) {
        setError(resultado.erro || "Não foi possível enviar essa imagem.");
        return;
      }
      onChange(resultado.url);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Não foi possível enviar essa imagem.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {/* Sem "capture": deixa escolher entre tirar foto na hora ou pegar uma
          já existente na galeria. */}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

      {value ? (
        <div className="group relative aspect-[4/3] overflow-hidden rounded-xl border-2 border-white shadow-md ring-1 ring-slate-200">
          <Image src={value} alt={label} fill sizes="200px" className="object-cover" unoptimized />
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Remover foto"
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <X size={13} />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-center text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            Trocar foto
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className={cn(
            "flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-brand-400 hover:text-brand-500",
            loading && "pointer-events-none opacity-60"
          )}
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
          <span className="text-[11px] font-bold">{loading ? "Enviando..." : "Adicionar foto"}</span>
        </button>
      )}
      {error && <p className="mt-1 text-[11px] font-semibold text-danger-600">{error}</p>}
    </div>
  );
}
