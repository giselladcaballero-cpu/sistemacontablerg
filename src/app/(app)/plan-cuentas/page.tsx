import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import { Card, Table, Th } from "@/components/ui";
import PlanCuentaForm from "./cuenta-form";
import PlanCuentaRow from "./cuenta-row";

export default async function PlanCuentasPage() {
  const supabase = await createClient();
  const empresa = await getEmpresaActual();
  const { data: cuentas } = await supabase
    .from("plan_cuentas")
    .select("*")
    .order("codigo");

  return (
    <div>
      <PageTitle className="mb-6">Plan de Cuentas</PageTitle>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PlanCuentaForm empresaId={empresa!.id} cuentas={cuentas ?? []} />
        </div>
        <div className="lg:col-span-2">
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Código</Th>
                  <Th>Nombre</Th>
                  <Th>Tipo</Th>
                  <Th>Naturaleza</Th>
                  <Th>Imputable</Th>
                </tr>
              </thead>
              <tbody>
                {(cuentas ?? []).map((c) => (
                  <PlanCuentaRow key={c.id} cuenta={c} />
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
