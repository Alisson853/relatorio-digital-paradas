import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { gerarBackupSistema } from "@/lib/actions/paradas";
import { registrarEventoOperacional } from "@/lib/operacao-monitoramento";
import { getDb } from "@/lib/db";
import { atividadeAuditoria, atividadeImportacoes, atividadeLancamentos, atividadeProgramacoes, atividadeUsuarios } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// O Vercel Cron envia Authorization: Bearer <CRON_SECRET>. A rota nunca deve
// responder o conteúdo do backup: ele vai direto para o Blob, com a mesma
// proteção de credenciais que já guarda as fotos.
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  const autorizado = !!segredo && request.headers.get("authorization") === `Bearer ${segredo}`;
  if (!autorizado) return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 });

  try {
    const [dados, usuarios, importacoes, programacoes, lancamentos, auditoria] = await Promise.all([
      gerarBackupSistema(),
      getDb().select().from(atividadeUsuarios),
      getDb().select().from(atividadeImportacoes),
      getDb().select().from(atividadeProgramacoes),
      getDb().select().from(atividadeLancamentos),
      getDb().select().from(atividadeAuditoria),
    ]);
    const agora = new Date().toISOString().replace(/[:.]/g, "-");
    const blob = await put(`backups/automaticos/relatorios-${agora}.json`, JSON.stringify({ versao: 2, geradoEm: new Date().toISOString(), relatorios: dados, atividades: { usuarios, importacoes, programacoes, lancamentos, auditoria } }), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
    });
    await registrarEventoOperacional({ tipo: "backup_automatico", severidade: "info", mensagem: `Backup automático concluído com ${dados.length} relatório(s) e ${lancamentos.length} lançamento(s).`, detalhe: { url: blob.url, totalRelatorios: dados.length, totalLancamentos: lancamentos.length } });
    return NextResponse.json({ ok: true, totalRelatorios: dados.length, totalLancamentos: lancamentos.length });
  } catch (erro) {
    await registrarEventoOperacional({ tipo: "falha_backup", severidade: "erro", mensagem: "O backup automático não foi concluído.", detalhe: { erro: erro instanceof Error ? erro.message : "erro desconhecido" } });
    return NextResponse.json({ ok: false, erro: "Falha ao gerar backup." }, { status: 500 });
  }
}
