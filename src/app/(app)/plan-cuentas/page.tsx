import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
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
          <div className="overflow-x-auto rounded-lg border bg-surface shadow-sm">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-bg">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Código</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Nombre</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Naturaleza</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Imputable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(cuentas ?? []).map((c) => (
                  <PlanCuentaRow key={c.id} cuenta={c} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
