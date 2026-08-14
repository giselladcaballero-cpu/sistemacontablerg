import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import CuentaBancariaForm from "./cuenta-form";
import MovimientoForm from "./movimiento-form";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

export default async function BancosPage() {
  const supabase = await createClient();
  const empresa = await getEmpresaActual();
  const [{ data: saldos }, { data: cuentas }, { data: movimientos }] = await Promise.all([
    supabase.from("v_saldos_bancarios").select("*"),
    supabase.from("cuentas_bancarias").select("id, nombre").eq("activa", true),
    supabase
      .from("movimientos_bancarios")
      .select("*, cuentas_bancarias(nombre)")
      .order("fecha", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle>Bancos y Caja</PageTitle>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(saldos ?? []).map((c) => (
          <div key={c.id} className="rounded-lg border bg-surface p-4 shadow-sm">
            <p className="text-xs text-ink-soft">
              {c.nombre} {c.banco ? `· ${c.banco}` : ""}
            </p>
            <p className="mt-1 text-xl font-semibold text-ink">
              {fmt(Number(c.saldo_actual))}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <CuentaBancariaForm empresaId={empresa!.id} />
          <MovimientoForm cuentas={cuentas ?? []} />
        </div>
        <div className="lg:col-span-2">
          <div className="overflow-x-auto rounded-lg border bg-surface shadow-sm">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-bg">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Cuenta</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Descripción</th>
                  <th className="px-3 py-2 text-right font-medium text-ink-soft">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(movimientos ?? []).map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 text-ink-soft">{m.fecha}</td>
                    <td className="px-3 py-2 text-ink-soft">
                      {(m.cuentas_bancarias as { nombre: string } | null)?.nombre ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-ink">{m.descripcion}</td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${
                        m.tipo === "ingreso" ? "text-accent" : "text-danger"
                      }`}
                    >
                      {m.tipo === "ingreso" ? "+" : "-"}
                      {fmt(Number(m.importe))}
                    </td>
                  </tr>
                ))}
                {(movimientos ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-ink-soft">
                      Sin movimientos todavía
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
