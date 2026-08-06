import { getDb } from "../lib/db";
import { paradas } from "../lib/db/schema";
import { gerarParadaCompleta, PARADAS_RESUMO } from "../lib/mock-data";

async function main() {
  const db = getDb();

  for (const resumo of PARADAS_RESUMO) {
    const completa = gerarParadaCompleta(resumo.id);
    if (!completa) continue;

    await db
      .insert(paradas)
      .values({
        id: completa.resumo.id,
        nome: completa.resumo.nome,
        maquina: completa.resumo.maquina,
        area: completa.resumo.area,
        data: completa.resumo.data,
        duracaoPlanejada: completa.resumo.duracaoPlanejada,
        duracaoRealizada: completa.resumo.duracaoRealizada,
        status: completa.resumo.status,
        responsavel: completa.resumo.responsavel,
        imagem: completa.resumo.imagem,
        fotosMaquina: completa.resumo.fotosMaquina ?? [],
        oficial: true,
        kpis: completa.kpis,
        timeline: completa.timeline,
        servicos: completa.servicos,
        caminhoCritico: completa.caminhoCritico,
        pendencias: completa.pendencias,
        graficos: completa.graficos,
        resultadoFinal: completa.resultadoFinal,
      })
      .onConflictDoNothing({ target: paradas.id });

    console.log(`Seed OK: ${completa.resumo.id}`);
  }

  console.log("Seed concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
