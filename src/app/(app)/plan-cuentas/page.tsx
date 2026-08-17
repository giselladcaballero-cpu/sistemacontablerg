import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import { Card, Table, Th } from "@/components/ui";
import { SortableTh } from "@/components/sortable-th";
import PlanCuentaForm from "./cuenta-form";
import PlanCuentaRow from "./cuenta-row";
import PlanCuentasImport from "./plan-cuentas-import";
import PlanCuentasFiltros from "./plan-cuentas-filtros";

const SORT_COLUMN: Record<string, string> = {
  codigo: "codigo",
  nombre: "nombre",
};

export default async function PlanCuentasPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; tipo?: string; inactivas?: string }>;
}) {
  const { sort, dir, tipo, inactivas } = await searchParams;
  const supabase = await createClient();
  const empresa = await getEmpresaActual();

  let query = supabase.from("plan_cuentas").select("*");
  if (tipo) query = query.eq("tipo", tipo);
  if (inactivas !== "1") query = query.eq("activa", true);
  const column = (sort && SORT_COLUMN[sort]) || "codigo";
  const ascending = sort ? dir === "asc" : true;
  query = query.order(column, { ascending });

  const { data: cuentas } = await query;
  const { data: cuentasTodas } = await supabase.from("plan_cuentas").select("id, codigo, nombre").order("codigo");

  return (
    <div>
      <PageTitle className="mb-6">Plan de Cuentas</PageTitle>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <PlanCuentaForm empresaId={empresa!.id} cuentas={cuentasTodas ?? []} />
          <PlanCuentasImport empresaId={empresa!.id} />
        </div>
        <div className="lg:col-span-2">
          <PlanCuentasFiltros />
          <Card>
            <Table>
              <thead>
                <tr>
                  <SortableTh field="codigo">Código</SortableTh>
                  <SortableTh field="nombre">Nombre</SortableTh>
                  <Th>Tipo</Th>
                  <Th>Naturaleza</Th>
                  <Th>Imputable</Th>
                </tr>
              </thead>
              <tbody>
                {(cuentas ?? []).map((c) => (
                  <PlanCuentaRow key={c.id} cuenta={c} />
                ))}
                {(cuentas ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-[12.5px] text-ink-2">
                      Sin cuentas que coincidan
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
