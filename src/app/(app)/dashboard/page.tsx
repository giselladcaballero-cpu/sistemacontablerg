import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: saldosBancarios }, { data: ventas }, { data: compras }, { data: mayor }] =
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
      <PageTitle className="mb-6">Dashboard</PageTitle>
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
    </div>
  );
}
