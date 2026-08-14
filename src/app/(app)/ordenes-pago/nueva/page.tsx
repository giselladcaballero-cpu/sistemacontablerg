import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import OrdenPagoForm from "./orden-pago-form";

export default async function NuevaOrdenPagoPage() {
  const supabase = await createClient();
  const empresa = await getEmpresaActual();
  const [{ data: facturas }, { data: cuentas }, { data: user }, { data: empresaData }] = await Promise.all([
    supabase.from("v_facturas_pendientes_pago").select("*"),
    supabase.from("cuentas_bancarias").select("id, nombre").eq("activa", true).order("nombre"),
    supabase.auth.getUser(),
    supabase
      .from("empresas")
      .select("agente_retencion_iva, agente_retencion_ganancias, agente_retencion_iibb, retenciones_suss")
      .eq("id", empresa!.id)
      .single(),
  ]);

  return (
    <div>
      <PageTitle className="mb-6">Nueva Orden de Pago</PageTitle>
      <OrdenPagoForm
        empresaId={empresa!.id}
        facturas={facturas ?? []}
        cuentas={cuentas ?? []}
        userId={user.user?.id ?? null}
        agente={{
          iva: empresaData?.agente_retencion_iva ?? false,
          ganancias: empresaData?.agente_retencion_ganancias ?? false,
          iibb: empresaData?.agente_retencion_iibb ?? false,
          suss: empresaData?.retenciones_suss ?? false,
        }}
      />
    </div>
  );
}
