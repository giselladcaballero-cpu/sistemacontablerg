import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import ContabilidadTabs from "../contabilidad-tabs";
import AsientoForm from "./asiento-form";

export default async function NuevoAsientoPage() {
  const supabase = await createClient();
  const empresa = await getEmpresaActual();
  const [{ data: cuentas }, { data: terceros }] = await Promise.all([
    supabase.from("plan_cuentas").select("id, codigo, nombre").eq("imputable", true).order("codigo"),
    supabase.from("terceros").select("id, razon_social").order("razon_social"),
  ]);

  return (
    <div>
      <PageTitle>Contabilidad</PageTitle>
      <ContabilidadTabs />
      <h2 className="mb-4 text-base font-medium text-ink">Nuevo Asiento Manual</h2>
      <AsientoForm empresaId={empresa!.id} cuentas={cuentas ?? []} terceros={terceros ?? []} />
    </div>
  );
}
