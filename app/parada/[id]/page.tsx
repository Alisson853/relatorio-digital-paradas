import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { getParadaCompleta } from "@/lib/actions/paradas";
import { PresentationView } from "@/components/presentation/PresentationView";
import { gerarQrCodeDataUrl, urlDaParada } from "@/lib/qrcode";

export const dynamic = "force-dynamic";

export default async function ParadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getParadaCompleta(id);

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning-100 text-warning-600">
          <AlertTriangle size={26} />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Relatório não encontrado</h1>
        <p className="max-w-sm text-sm text-slate-500">Este relatório não existe ou já foi excluído.</p>
        <Link href="/" className="mt-2 flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
          <ArrowLeft size={16} />
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  const qrDataUrl = await gerarQrCodeDataUrl(urlDaParada(id));

  return <PresentationView data={data} qrDataUrl={qrDataUrl} />;
}
