import { gerarParadaCompleta, PARADAS_RESUMO } from "@/lib/mock-data";
import { PresentationView } from "@/components/presentation/PresentationView";
import { CustomParadaLoader } from "@/components/presentation/CustomParadaLoader";

export function generateStaticParams() {
  return PARADAS_RESUMO.map((p) => ({ id: p.id }));
}

export default async function ParadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = gerarParadaCompleta(id);

  if (data) return <PresentationView data={data} />;
  return <CustomParadaLoader id={id} />;
}
