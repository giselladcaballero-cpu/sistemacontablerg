import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import ComprobanteForm from "./comprobante-form";

export default async function NuevoComprobantePage() {
  const supabase = await createClient();
  const empresa = await getEmpresaActual();
  const [{ data: terceros }, { data: cuentas }] = await Promise.all([
    supabase
      .from("terceros")
      .select("id, razon_social, tipo, cuenta_gasto_id")
      .eq("activo", true)
      .order("razon_social"),
    supabase.from("plan_cuentas").select("id, codigo, nombre").eq("imputable", true).order("codigo"),
  ]);

  return (
    <div>
      <PageTitle className="mb-6">Nuevo Comprobante</PageTitle>
      <ComprobanteForm terceros={terceros ?? []} cuentas={cuentas ?? []} empresaId={empresa!.id} />
    </div>
  );
}
