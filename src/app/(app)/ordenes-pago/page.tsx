import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

export default async function OrdenesPagoPage() {
  const supabase = await createClient();
  const [{ data: pendientes }, { data: ordenes }] = await Promise.all([
    supabase
      .from("v_cuenta_corriente_terceros")
      .select("*")
      .in("tipo", ["proveedor", "ambos"])
      .gt("saldo_pendiente", 0)
      .order("saldo_pendiente", { ascending: false }),
    supabase.from("v_ordenes_pago").select("*").limit(50),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle>Órdenes de Pago</PageTitle>
        <Link
          href="/ordenes-pago/nueva"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-ink hover:bg-accent/90"
        >
          + Nueva Orden de Pago
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-medium text-ink">Proveedores con saldo pendiente</h2>
          <div className="overflow-x-auto rounded-lg border bg-surface shadow-sm">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-bg">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Proveedor</th>
                  <th className="px-3 py-2 text-right font-medium text-ink-soft">Saldo pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(pendientes ?? []).map((p) => (
                  <tr key={p.tercero_id}>
                    <td className="px-3 py-2 text-ink">{p.razon_social}</td>
                    <td className="px-3 py-2 text-right text-ink">{fmt(Number(p.saldo_pendiente))}</td>
                  </tr>
                ))}
                {(pendientes ?? []).length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-3 py-6 text-center text-ink-soft">
                      No hay facturas pendientes de pago
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium text-ink">Historial</h2>
          <div className="overflow-x-auto rounded-lg border bg-surface shadow-sm">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-bg">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Proveedor</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Cuenta</th>
                  <th className="px-3 py-2 text-right font-medium text-ink-soft">Neto pagado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(ordenes ?? []).map((o) => (
                  <tr key={o.id}>
                    <td className="px-3 py-2 text-ink-soft">{o.fecha}</td>
                    <td className="px-3 py-2 text-ink">{o.proveedor}</td>
                    <td className="px-3 py-2 text-ink-soft">{o.cuenta_bancaria}</td>
                    <td className="px-3 py-2 text-right text-ink">{fmt(Number(o.importe_neto))}</td>
                  </tr>
                ))}
                {(ordenes ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-ink-soft">
                      Sin órdenes de pago todavía
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
