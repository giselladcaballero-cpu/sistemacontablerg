import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import TerceroForm from "./tercero-form";
import TerceroRow from "./tercero-row";

export default async function TercerosPage() {
  const supabase = await createClient();
  const empresa = await getEmpresaActual();
  const { data: terceros } = await supabase
    .from("terceros")
    .select("*")
    .order("razon_social");

  return (
    <div>
      <PageTitle className="mb-6">Clientes / Proveedores</PageTitle>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TerceroForm empresaId={empresa!.id} />
        </div>
        <div className="lg:col-span-2">
          <div className="overflow-x-auto rounded-lg border bg-surface shadow-sm">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-bg">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Razón Social</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">CUIT</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Cond. IVA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(terceros ?? []).map((t) => (
                  <TerceroRow key={t.id} tercero={t} />
                ))}
                {(terceros ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-ink-soft">
                      Sin registros todavía
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
