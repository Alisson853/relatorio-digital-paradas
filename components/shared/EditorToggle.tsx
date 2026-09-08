"use client";

import { useState } from "react";
import { LockKeyholeOpen, LockKeyhole, X } from "lucide-react";
import { useEditorMode } from "@/lib/useEditorMode";
import { EditorPasswordForm } from "./EditorPasswordForm";

export function EditorToggle() {
  const { ready, isEditor, unlock, lock } = useEditorMode();
  const [open, setOpen] = useState(false);

  if (!ready) return null;

  if (isEditor) {
    return (
      <button
        type="button"
        onClick={lock}
        // O botao tinha a altura do proprio texto: 16px de alvo, num app
        // que se usa de celular. O padding leva a area clicavel a 36px; as
        // margens negativas devolvem o espaco, entao nada em volta se mexe.
        className="-mx-2 -my-2.5 flex items-center gap-1.5 px-2 py-2.5 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-700"
      >
        <LockKeyholeOpen size={13} />
        Sair do Modo Editor
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-mx-2 -my-2.5 flex items-center gap-1.5 px-2 py-2.5 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-700"
      >
        <LockKeyhole size={13} />
        Área do Editor
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-6" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            >
              <X size={14} />
            </button>
            <EditorPasswordForm onUnlock={unlock} onSuccess={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
