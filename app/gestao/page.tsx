import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listParadasGestao } from "@/lib/actions/paradas";
import { ehEditor } from "@/lib/auth/session";
import { GestaoParada } from "@/components/dashboard/GestaoParada";
import { PortaoEditor } from "@/components/shared/PortaoEditor";
import { StatusConexao } from "@/components/shared/StatusConexao";

export const dynamic = "force-dynamic";

export default async function GestaoPage() {
  const autorizado = await ehEditor();
  const paradas = autorizado ? await listParadasGestao() : [];
  return <div className="min-h-screen bg-slate-50"><header className="no-print border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-5 sm:px-10"><Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"><ArrowLeft size={16} /></Link><Image src="/santher-logo-azul.png" alt="Santher" width={120} height={32} className="h-6 w-auto" /><div className="h-8 w-px bg-slate-200" /><div><p className="text-sm font-bold text-slate-900">Gestão de Paradas</p><p className="text-xs font-medium text-slate-400">Acesso administrativo</p></div></div></header><StatusConexao /><main className="mx-auto max-w-7xl px-6 py-10 sm:px-10">{autorizado ? <GestaoParada paradas={paradas} /> : <PortaoEditor titulo="Acesso Restrito" descricao="Digite a senha para acessar a gestão administrativa." />}</main></div>;
}
