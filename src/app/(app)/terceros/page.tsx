import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import { Card, Table, Th } from "@/components/ui";
import TerceroForm from "./tercero-form";
import TerceroRow from "./tercero-row";

export default async function TercerosPage() {
  const supabase = await createClient();
  const empresa = await getEmpresaActual();
  const [{ data: terceros }, { data: cuentas }] = await Promise.all([
    supabase.from("terceros").select("*").order("numero"),
    supabase.from("plan_cuentas").select("id, codigo, nombre").eq("imputable", true).eq("activa", true).order("codigo"),
  ]);

  return (
    <div>
      <PageTitle className="mb-6">Clientes / Proveedores</PageTitle>
      <div className="space-y-6">
        <TerceroForm empresaId={empresa!.id} cuentas={cuentas ?? []} />
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>N°</Th>
                <Th>Razón Social</Th>
                <Th>Tipo</Th>
                <Th>CUIT</Th>
                <Th>Cond. IVA</Th>
                <Th>Categoría</Th>
                <Th right>{""}</Th>
              </tr>
            </thead>
            <tbody>
              {(terceros ?? []).map((t) => (
                <TerceroRow key={t.id} tercero={t} cuentas={cuentas ?? []} />
              ))}
              {(terceros ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-[12.5px] text-ink-2">
                    Sin registros todavía
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
