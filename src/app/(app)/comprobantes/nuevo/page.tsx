import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import { fechaAMes } from "@/lib/periodos-iva";
import ComprobanteForm from "./comprobante-form";

export default async function NuevoComprobantePage() {
  const supabase = await createClient();
  const empresa = await getEmpresaActual();
  const [{ data: terceros }, { data: cuentas }, { data: presentados }] = await Promise.all([
    supabase
      .from("terceros")
      .select("id, razon_social, tipo, cuenta_gasto_id")
      .eq("activo", true)
      .order("razon_social"),
    supabase.from("plan_cuentas").select("id, codigo, nombre").eq("imputable", true).eq("activa", true).order("codigo"),
    supabase
      .from("vencimientos_impositivos")
      .select("periodo_fiscal")
      .eq("estado", "presentado")
      .not("periodo_fiscal", "is", null),
  ]);

  const periodosCerrados = Array.from(
    new Set((presentados ?? []).map((p) => fechaAMes(p.periodo_fiscal as string)))
  );

  return (
    <div>
      <PageTitle className="mb-6">Nuevo Comprobante</PageTitle>
      <ComprobanteForm
        terceros={terceros ?? []}
        cuentas={cuentas ?? []}
        empresaId={empresa!.id}
        periodosCerrados={periodosCerrados}
      />
    </div>
  );
}
