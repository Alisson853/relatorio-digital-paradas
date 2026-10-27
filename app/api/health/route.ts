// Endpoint leve para verificar se a aplicação está respondendo, sem tocar no
// banco ou expor dados de relatórios. Útil para monitoramento da Vercel.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true });
}
