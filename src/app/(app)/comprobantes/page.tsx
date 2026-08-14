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
        <h1 className="text-lg font-semibold text-ink">Comprobantes</h1>
        <Link
          href="/comprobantes/nuevo"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-ink hover:bg-accent/90"
        >
          + Nuevo Comprobante
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-surface shadow-sm">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-bg">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Fecha</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Tipo</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">N°</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Tercero</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Dirección</th>
              <th className="px-3 py-2 text-right font-medium text-ink-soft">Total</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(comprobantes ?? []).map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2 text-ink-soft">{c.fecha}</td>
                <td className="px-3 py-2 uppercase text-ink-soft">{c.tipo.replace("_", " ")}</td>
                <td className="px-3 py-2 text-ink-soft">
                  {c.punto_venta.toString().padStart(4, "0")}-
                  {(c.numero ?? 0).toString().padStart(8, "0")}
                </td>
                <td className="px-3 py-2 text-ink">
                  {(c.terceros as { razon_social: string } | null)?.razon_social ?? "-"}
                </td>
                <td className="px-3 py-2 capitalize text-ink-soft">{c.direccion}</td>
                <td className="px-3 py-2 text-right text-ink">{fmt(Number(c.total))}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.estado === "confirmado" || c.estado === "cobrado" || c.estado === "pagado"
                        ? "bg-accent-soft text-accent-soft-ink"
                        : c.estado === "anulado"
                          ? "bg-danger-soft text-danger"
                          : "bg-surface-muted text-ink-soft"
                    }`}
                  >
                    {c.estado}
                  </span>
                </td>
              </tr>
            ))}
            {(comprobantes ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-ink-soft">
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
