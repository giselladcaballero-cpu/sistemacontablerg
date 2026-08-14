import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import TerceroForm from "./tercero-form";
import TerceroRow from "./tercero-row";

export default async function TercerosPage() {
  const supabase = await createClient();
  const empresa = await getEmpresaActual();
  const [{ data: terceros }, { data: cuentas }] = await Promise.all([
    supabase.from("terceros").select("*").order("numero"),
    supabase.from("plan_cuentas").select("id, codigo, nombre").eq("imputable", true).order("codigo"),
  ]);

  return (
    <div>
      <PageTitle className="mb-6">Clientes / Proveedores</PageTitle>
      <div className="space-y-6">
        <TerceroForm empresaId={empresa!.id} cuentas={cuentas ?? []} />
        <div className="overflow-x-auto rounded-lg border bg-surface shadow-sm">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-bg">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-ink-soft">N°</th>
                <th className="px-3 py-2 text-left font-medium text-ink-soft">Razón Social</th>
                <th className="px-3 py-2 text-left font-medium text-ink-soft">Tipo</th>
                <th className="px-3 py-2 text-left font-medium text-ink-soft">CUIT</th>
                <th className="px-3 py-2 text-left font-medium text-ink-soft">Cond. IVA</th>
                <th className="px-3 py-2 text-left font-medium text-ink-soft">Categoría</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(terceros ?? []).map((t) => (
                <TerceroRow key={t.id} tercero={t} cuentas={cuentas ?? []} />
              ))}
              {(terceros ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-ink-soft">
                    Sin registros todavía
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
