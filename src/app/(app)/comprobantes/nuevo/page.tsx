import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import ComprobanteForm from "./comprobante-form";

export default async function NuevoComprobantePage() {
  const supabase = await createClient();
  const empresa = await getEmpresaActual();
  const { data: terceros } = await supabase
    .from("terceros")
    .select("id, razon_social, tipo")
    .eq("activo", true)
    .order("razon_social");

  return (
    <div>
      <PageTitle className="mb-6">Nuevo Comprobante</PageTitle>
      <ComprobanteForm terceros={terceros ?? []} empresaId={empresa!.id} />
    </div>
  );
}
