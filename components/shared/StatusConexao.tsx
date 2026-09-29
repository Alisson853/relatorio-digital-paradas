"use client";

import { WifiOff } from "lucide-react";
import { useConectividade } from "@/lib/useConectividade";

// Só aparece quando falta conexão — não existe "está tudo bem" pra anunciar
// o tempo todo, isso seria ruído. Onde a tela já tem uma fila offline própria
// (Captura Rápida), essa fila continua sendo a fonte da verdade sobre o que
// está pendente; este aviso é só para as telas que não têm fila nenhuma hoje
// e que, sem isso, falhariam sem explicação nenhuma quando a rede cai.
export function StatusConexao() {
  const online = useConectividade();
  if (online) return null;

  return (
    <div className="flex items-center gap-2 border-b border-warning-200 bg-warning-50 px-4 py-2 text-xs font-bold text-warning-700 sm:px-6">
      <WifiOff size={14} className="flex-none" />
      Sem conexão — algumas informações podem estar desatualizadas e novas alterações podem não salvar.
    </div>
  );
}
