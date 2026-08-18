import { CapturaRapida } from "@/components/presentation/CapturaRapida";

export const dynamic = "force-dynamic";

export default async function CapturaRapidaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CapturaRapida id={id} />;
}
