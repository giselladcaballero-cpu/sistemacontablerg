import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import ConciliacionForm from "./conciliacion-form";

export default async function ConciliacionesPage() {
  const supabase = await createClient();
  const { data: cuentas } = await supabase
    .from("cuentas_bancarias")
    .select("id, nombre, banco")
    .eq("activa", true)
    .order("nombre");

  return (
    <div>
      <PageTitle className="mb-6">Conciliaciones Bancarias</PageTitle>
      <ConciliacionForm cuentas={cuentas ?? []} />
    </div>
  );
}
