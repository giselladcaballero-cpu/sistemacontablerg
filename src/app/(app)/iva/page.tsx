import { createClient } from "@/lib/supabase/server";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

function Tabla({
  titulo,
  filas,
}: {
  titulo: string;
  filas: { fecha: string; tipo: string; punto_venta: number; numero: number | null; razon_social: string; cuit: string | null; subtotal: number; iva: number; total: number }[];
}) {
  const totalIva = filas.reduce((s, f) => s + Number(f.iva), 0);
  return (
    <div>
      <h2 className="mb-2 text-sm font-medium text-gray-900">{titulo}</h2>
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Fecha</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Tipo</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">N°</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Razón Social</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">CUIT</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Neto</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">IVA</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map((f, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2 text-gray-600">{f.fecha}</td>
                <td className="px-3 py-2 uppercase text-gray-600">{f.tipo.replace("_", " ")}</td>
                <td className="px-3 py-2 text-gray-600">
                  {f.punto_venta.toString().padStart(4, "0")}-{(f.numero ?? 0).toString().padStart(8, "0")}
                </td>
                <td className="px-3 py-2 text-gray-900">{f.razon_social}</td>
                <td className="px-3 py-2 text-gray-600">{f.cuit ?? "-"}</td>
                <td className="px-3 py-2 text-right text-gray-600">{fmt(Number(f.subtotal))}</td>
                <td className="px-3 py-2 text-right text-gray-600">{fmt(Number(f.iva))}</td>
                <td className="px-3 py-2 text-right text-gray-900">{fmt(Number(f.total))}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                  Sin comprobantes
                </td>
              </tr>
            )}
          </tbody>
          {filas.length > 0 && (
            <tfoot className="bg-gray-50 font-medium">
              <tr>
                <td colSpan={6} className="px-3 py-2 text-right text-gray-600">
                  Total IVA
                </td>
                <td className="px-3 py-2 text-right text-gray-900">{fmt(totalIva)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

export default async function LibroIvaPage() {
  const supabase = await createClient();
  const [{ data: ventas }, { data: compras }] = await Promise.all([
    supabase.from("v_libro_iva_ventas").select("*"),
    supabase.from("v_libro_iva_compras").select("*"),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold text-gray-900">Libro IVA</h1>
      <Tabla titulo="IVA Ventas" filas={ventas ?? []} />
      <Tabla titulo="IVA Compras" filas={compras ?? []} />
    </div>
  );
}
