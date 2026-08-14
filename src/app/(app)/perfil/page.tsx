import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import PerfilForm from "./perfil-form";

export default async function PerfilPage() {
  const supabase = await createClient();
  const empresaActual = await getEmpresaActual();
  const { data: empresa } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", empresaActual!.id)
    .single();

  return (
    <div>
      <PageTitle className="mb-6">Perfil del Cliente</PageTitle>
      <PerfilForm empresa={empresa} esAdmin={empresaActual!.rol === "admin"} />
    </div>
  );
}
