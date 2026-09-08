"use client";

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";

interface Props {
  onUnlock: (senha: string, armadilha?: string) => Promise<boolean | { ok: boolean; erro?: string }>;
  onSuccess: () => void;
  titulo?: string;
  descricao?: string;
}

export function EditorPasswordForm({ onUnlock, onSuccess, titulo = "Área do Editor", descricao = "Digite a senha para criar e editar relatórios." }: Props) {
  const [senha, setSenha] = useState("");
  // Campo-armadilha (honeypot): fica escondido, sem rótulo visível e fora da
  // ordem de tabulação, então uma pessoa nunca chega nele. Bot que varre o
  // formulário e preenche todo <input> preenche — e o servidor recusa o login
  // sem nem consultar a senha.
  const [armadilha, setArmadilha] = useState("");
  const [erro, setErro] = useState("");
  const [verificando, setVerificando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setVerificando(true);
    const resultado = await onUnlock(senha, armadilha);
    setVerificando(false);
    const ok = typeof resultado === "boolean" ? resultado : resultado.ok;
    if (ok) {
      setErro("");
      onSuccess();
    } else {
      setErro((typeof resultado === "object" && resultado.erro) || "Senha incorreta.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Lock size={20} />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-900">{titulo}</h2>
        <p className="mt-1 text-sm text-slate-500">{descricao}</p>
      </div>
      <input
        type="text"
        name="empresa"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={armadilha}
        onChange={(e) => setArmadilha(e.target.value)}
        // Fora da tela em vez de display:none — alguns bots pulam campo
        // escondido por display, mas preenchem o que continua no layout.
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />
      <input
        type="password"
        autoFocus
        value={senha}
        onChange={(e) => {
          setSenha(e.target.value);
          setErro("");
        }}
        placeholder="Senha"
        className="w-full max-w-xs rounded-xl border border-slate-200 px-3.5 py-2.5 text-center text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
      {erro && <p className="text-xs font-semibold text-danger-600">{erro}</p>}
      <button
        type="submit"
        disabled={verificando}
        className="flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {verificando && <Loader2 size={14} className="animate-spin" />}
        Entrar
      </button>
    </form>
  );
}
