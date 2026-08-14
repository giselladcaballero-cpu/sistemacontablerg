import { createClient } from "@/lib/supabase/server";

export default async function PlanCuentasPage() {
  const supabase = await createClient();
  const { data: cuentas } = await supabase
    .from("plan_cuentas")
    .select("*")
    .order("codigo");

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-gray-900">Plan de Cuentas</h1>
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Código</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Nombre</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Tipo</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Naturaleza</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Imputable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(cuentas ?? []).map((c) => (
              <tr key={c.id} className={c.imputable ? "" : "bg-gray-50 font-medium"}>
                <td className="px-3 py-2 text-gray-600">{c.codigo}</td>
                <td className="px-3 py-2 text-gray-900">{c.nombre}</td>
                <td className="px-3 py-2 capitalize text-gray-600">{c.tipo.replace("_", " ")}</td>
                <td className="px-3 py-2 capitalize text-gray-600">{c.naturaleza}</td>
                <td className="px-3 py-2 text-gray-600">{c.imputable ? "Sí" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
