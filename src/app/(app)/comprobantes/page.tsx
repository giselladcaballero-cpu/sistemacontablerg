import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

export default async function ComprobantesPage() {
  const supabase = await createClient();
  const { data: comprobantes } = await supabase
    .from("comprobantes")
    .select("*, terceros(razon_social)")
    .order("fecha", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Comprobantes</h1>
        <Link
          href="/comprobantes/nuevo"
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Nuevo Comprobante
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Fecha</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Tipo</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">N°</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Tercero</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Dirección</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Total</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(comprobantes ?? []).map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2 text-gray-600">{c.fecha}</td>
                <td className="px-3 py-2 uppercase text-gray-600">{c.tipo.replace("_", " ")}</td>
                <td className="px-3 py-2 text-gray-600">
                  {c.punto_venta.toString().padStart(4, "0")}-
                  {(c.numero ?? 0).toString().padStart(8, "0")}
                </td>
                <td className="px-3 py-2 text-gray-900">
                  {(c.terceros as { razon_social: string } | null)?.razon_social ?? "-"}
                </td>
                <td className="px-3 py-2 capitalize text-gray-600">{c.direccion}</td>
                <td className="px-3 py-2 text-right text-gray-900">{fmt(Number(c.total))}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.estado === "confirmado" || c.estado === "cobrado" || c.estado === "pagado"
                        ? "bg-green-100 text-green-700"
                        : c.estado === "anulado"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.estado}
                  </span>
                </td>
              </tr>
            ))}
            {(comprobantes ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
                  Sin comprobantes todavía
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
