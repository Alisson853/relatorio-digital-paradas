import Link from "next/link";
import { Settings } from "lucide-react";
import { AtividadesArea } from "@/components/atividades/AtividadesArea";
import { listarProgramacaoDoUsuario, sessaoAtividade } from "@/lib/atividades";
import { ehEditor } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function semanaAtual() {
  const agora = new Date();
  const local = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const domingoZero = local.getDay();
  const deslocamento = domingoZero === 0 ? -6 : 1 - domingoZero;
  local.setDate(local.getDate() + deslocamento);
  const inicio = local.toLocaleDateString("en-CA");
  local.setDate(local.getDate() + 6);
  return { inicio, fim: local.toLocaleDateString("en-CA") };
}

export default async function AtividadesPage() {
  const [usuario, editor] = await Promise.all([sessaoAtividade(), ehEditor()]);
  const { inicio, fim } = semanaAtual();
  const itens = usuario ? await listarProgramacaoDoUsuario(usuario, inicio, fim) : [];
  return <><div className="absolute right-4 top-4 z-10"><Link href={editor ? "/atividades/admin" : "/"} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white/90 px-3 text-sm font-bold text-brand-700 shadow-sm ring-1 ring-slate-200"><Settings size={16} />{editor ? "Painel" : "Paradas"}</Link></div><AtividadesArea usuario={usuario} itens={itens} inicioSemana={inicio} fimSemana={fim} /></>;
}
