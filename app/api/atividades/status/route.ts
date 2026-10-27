import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { atividadeProgramacoes } from "@/lib/db/schema";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferente = 0; for (let i = 0; i < a.length; i++) diferente |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferente === 0;
}

export async function GET(request: NextRequest) {
  const segredo = process.env.ATIVIDADES_STATUS_TOKEN;
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!segredo || !iguais(token, segredo)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const formato = request.nextUrl.searchParams.get("formato") ?? "json";
  const itens = await getDb().select({ os: atividadeProgramacoes.os, executante: atividadeProgramacoes.executante, dia: atividadeProgramacoes.dia, data: atividadeProgramacoes.data, status: atividadeProgramacoes.statusPlanilha, justificativa: atividadeProgramacoes.justificativaPlanilha }).from(atividadeProgramacoes).orderBy(asc(atividadeProgramacoes.data), asc(atividadeProgramacoes.os));
  if (formato === "csv") {
    const esc = (valor: string | number) => `"${String(valor).replaceAll('"', '""')}"`;
    const csv = ["OS,Executante,Dia,Data,Status,Justificativa", ...itens.map((i) => [i.os, i.executante, i.dia, i.data, i.status, i.justificativa].map(esc).join(","))].join("\r\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store", "Content-Disposition": "inline; filename=status-atividades.csv" } });
  }
  return NextResponse.json({ atualizadoEm: new Date().toISOString(), itens }, { headers: { "Cache-Control": "no-store" } });
}
