import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import { Card, Table, Th } from "@/components/ui";
import { SortableTh } from "@/components/sortable-th";
import TerceroForm from "./tercero-form";
import TerceroRow from "./tercero-row";
import TercerosFiltros from "./terceros-filtros";

const SORT_COLUMN: Record<string, string> = {
  numero: "numero",
  razon_social: "razon_social",
  cuit: "cuit",
};

export default async function TercerosPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; tipo?: string }>;
}) {
  const { sort, dir, tipo } = await searchParams;
  const supabase = await createClient();
  const empresa = await getEmpresaActual();

  let terceroQuery = supabase.from("terceros").select("*");
  if (tipo) terceroQuery = terceroQuery.eq("tipo", tipo);
  const column = (sort && SORT_COLUMN[sort]) || "numero";
  const ascending = sort ? dir === "asc" : true;
  terceroQuery = terceroQuery.order(column, { ascending });

  const [{ data: terceros }, { data: cuentas }] = await Promise.all([
    terceroQuery,
    supabase.from("plan_cuentas").select("id, codigo, nombre").eq("imputable", true).eq("activa", true).order("codigo"),
  ]);

  return (
    <div>
      <PageTitle className="mb-6">Clientes / Proveedores</PageTitle>
      <div className="space-y-6">
        <TerceroForm empresaId={empresa!.id} cuentas={cuentas ?? []} />
        <TercerosFiltros />
        <Card>
          <Table>
            <thead>
              <tr>
                <SortableTh field="numero">N°</SortableTh>
                <SortableTh field="razon_social">Razón Social</SortableTh>
                <Th>Tipo</Th>
                <SortableTh field="cuit">CUIT</SortableTh>
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
                    Sin registros que coincidan
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
