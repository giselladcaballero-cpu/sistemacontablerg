import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const hoy = new Date().toISOString().slice(0, 10);
  const en14dias = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  const [{ data: saldosBancarios }, { data: ventas }, { data: compras }, { data: mayor }, { data: vencimientos }] =
    await Promise.all([
      supabase.from("v_saldos_bancarios").select("*"),
      supabase
        .from("comprobantes")
        .select("total")
        .eq("direccion", "venta")
        .neq("estado", "anulado")
        .neq("estado", "borrador")
        .gte("fecha", new Date(new Date().setDate(1)).toISOString().slice(0, 10)),
      supabase
        .from("comprobantes")
        .select("total")
        .eq("direccion", "compra")
        .neq("estado", "anulado")
        .neq("estado", "borrador")
        .gte("fecha", new Date(new Date().setDate(1)).toISOString().slice(0, 10)),
      supabase.from("v_libro_mayor").select("*").in("tipo", ["ingreso", "egreso"]),
      supabase
        .from("vencimientos_impositivos")
        .select("id, concepto, periodo, fecha_vencimiento")
        .eq("estado", "pendiente")
        .lte("fecha_vencimiento", en14dias)
        .order("fecha_vencimiento", { ascending: true }),
    ]);

  const totalBancos = (saldosBancarios ?? []).reduce((s, c) => s + Number(c.saldo_actual), 0);
  const totalVentasMes = (ventas ?? []).reduce((s, c) => s + Number(c.total), 0);
  const totalComprasMes = (compras ?? []).reduce((s, c) => s + Number(c.total), 0);
  const ingresos = (mayor ?? [])
    .filter((c) => c.tipo === "ingreso")
    .reduce((s, c) => s + Number(c.saldo), 0);
  const egresos = (mayor ?? [])
    .filter((c) => c.tipo === "egreso")
    .reduce((s, c) => s + Number(c.saldo), 0);
  const resultado = ingresos - egresos;

  const cards = [
    { label: "Saldo en Bancos", value: totalBancos },
    { label: "Ventas del mes", value: totalVentasMes },
    { label: "Compras del mes", value: totalComprasMes },
    { label: "Resultado acumulado", value: resultado },
  ];

  return (
    <div>
      <PageTitle className="mb-6">Resumen</PageTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-surface p-4 shadow-sm">
            <p className="text-xs text-ink-soft">{c.label}</p>
            <p
              className={`mt-1 text-xl font-semibold ${
                c.value < 0 ? "text-danger" : "text-ink"
              }`}
            >
              {fmt(c.value)}
            </p>
          </div>
        ))}
      </div>

      {(vencimientos ?? []).length > 0 && (
        <div className="mt-6 rounded-lg border bg-surface p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-ink">Vencimientos próximos</h2>
            <Link href="/vencimientos" className="text-xs font-medium text-accent hover:opacity-80">
              Ver todos
            </Link>
          </div>
          <ul className="space-y-1.5 text-sm">
            {(vencimientos ?? []).map((v) => (
              <li key={v.id} className="flex items-center justify-between">
                <span className="text-ink">
                  {v.concepto} {v.periodo ? `· ${v.periodo}` : ""}
                </span>
                <span className={v.fecha_vencimiento < hoy ? "font-medium text-danger" : "text-ink-soft"}>
                  {v.fecha_vencimiento}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
