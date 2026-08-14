import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import TerceroForm from "./tercero-form";

export default async function TercerosPage() {
  const supabase = await createClient();
  const empresa = await getEmpresaActual();
  const { data: terceros } = await supabase
    .from("terceros")
    .select("*")
    .order("razon_social");

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-gray-900">Clientes / Proveedores</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TerceroForm empresaId={empresa!.id} />
        </div>
        <div className="lg:col-span-2">
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Razón Social</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">CUIT</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Cond. IVA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(terceros ?? []).map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 text-gray-900">{t.razon_social}</td>
                    <td className="px-3 py-2 capitalize text-gray-600">{t.tipo}</td>
                    <td className="px-3 py-2 text-gray-600">{t.cuit ?? "-"}</td>
                    <td className="px-3 py-2 text-gray-600">{t.condicion_iva}</td>
                  </tr>
                ))}
                {(terceros ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
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
