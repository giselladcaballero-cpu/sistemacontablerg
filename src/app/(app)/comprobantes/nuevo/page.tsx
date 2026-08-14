import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
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
      <h1 className="mb-6 text-lg font-semibold text-ink">Nuevo Comprobante</h1>
      <ComprobanteForm terceros={terceros ?? []} empresaId={empresa!.id} />
    </div>
  );
}
