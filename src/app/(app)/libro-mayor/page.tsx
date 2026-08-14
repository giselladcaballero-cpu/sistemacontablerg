import { createClient } from "@/lib/supabase/server";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

export default async function LibroMayorPage() {
  const supabase = await createClient();
  const { data: cuentas } = await supabase.from("v_libro_mayor").select("*").order("codigo");

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-gray-900">Libro Mayor</h1>
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Código</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Cuenta</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Debe</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Haber</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(cuentas ?? []).map((c) => (
              <tr key={c.cuenta_id}>
                <td className="px-3 py-2 text-gray-600">{c.codigo}</td>
                <td className="px-3 py-2 text-gray-900">{c.nombre}</td>
                <td className="px-3 py-2 text-right text-gray-600">{fmt(Number(c.total_debe))}</td>
                <td className="px-3 py-2 text-right text-gray-600">{fmt(Number(c.total_haber))}</td>
                <td
                  className={`px-3 py-2 text-right font-medium ${
                    Number(c.saldo) < 0 ? "text-red-600" : "text-gray-900"
                  }`}
                >
                  {fmt(Number(c.saldo))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
