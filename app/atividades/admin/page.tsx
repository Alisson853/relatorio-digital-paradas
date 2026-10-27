import { redirect } from "next/navigation";
import { PainelAtividadesAdmin } from "@/components/atividades/PainelAtividadesAdmin";
import { ehEditor } from "@/lib/auth/session";
import { resumoSupervisor } from "@/lib/atividades";
import { getDb } from "@/lib/db";
import { atividadeUsuarios } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function semanaAtual() {
  const agora = new Date(); const local = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const domingoZero = local.getDay(); local.setDate(local.getDate() + (domingoZero === 0 ? -6 : 1 - domingoZero));
  const inicio = local.toLocaleDateString("en-CA"); local.setDate(local.getDate() + 6);
  return { inicio, fim: local.toLocaleDateString("en-CA") };
}

export default async function AdminAtividadesPage() {
  if (!await ehEditor()) redirect("/");
  const { inicio, fim } = semanaAtual(); const [dados, usuarios] = await Promise.all([resumoSupervisor(inicio, fim), getDb().select().from(atividadeUsuarios).orderBy(asc(atividadeUsuarios.nome))]);
  const token = process.env.ATIVIDADES_STATUS_TOKEN;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://relatorio-digital-paradas.vercel.app";
  const statusUrl = token ? `${site}/api/atividades/status?formato=csv&token=${encodeURIComponent(token)}` : null;
  return <PainelAtividadesAdmin {...dados} usuarios={usuarios} inicio={inicio} fim={fim} statusUrl={statusUrl} />;
}
