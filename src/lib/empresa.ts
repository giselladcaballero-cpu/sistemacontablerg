import { createClient } from "@/lib/supabase/server";

export interface EmpresaActual {
  id: string;
  nombre: string;
  rol: string;
}

export async function getEmpresaActual(): Promise<EmpresaActual | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("empresa_usuarios")
    .select("rol, empresas(id, nombre)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const empresa = data.empresas as unknown as { id: string; nombre: string } | null;
  if (!empresa) return null;

  return { id: empresa.id, nombre: empresa.nombre, rol: data.rol };
}
