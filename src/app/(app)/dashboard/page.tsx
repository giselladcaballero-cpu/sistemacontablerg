import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import { Card, KpiCard, Badge, Table, Th, Td, Row, Button, pesos, type Tone } from "@/components/ui";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const ESTADO_TONE: Record<string, Tone> = {
  confirmado: "good",
  cobrado: "good",
  pagado: "good",
  borrador: "gold",
  anulado: "bad",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const hoy = new Date();
  const hoyIso = hoy.toISOString().slice(0, 10);
  const en14dias = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
  const desde12meses = new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1).toISOString().slice(0, 10);

  const [
    { data: saldosBancarios },
    { data: comprobantes12m },
    { data: mayor },
    { data: vencimientos },
    { data: ivaVentasMes },
    { data: ivaComprasMes },
    { data: ultimos },
  ] = await Promise.all([
    supabase.from("v_saldos_bancarios").select("*"),
    supabase
      .from("comprobantes")
      .select("fecha, total, direccion")
      .neq("estado", "anulado")
      .neq("estado", "borrador")
      .gte("fecha", desde12meses),
    supabase.from("v_libro_mayor").select("*").in("tipo", ["ingreso", "egreso"]),
    supabase
      .from("vencimientos_impositivos")
      .select("id, concepto, periodo, fecha_vencimiento")
      .eq("estado", "pendiente")
      .lte("fecha_vencimiento", en14dias)
      .order("fecha_vencimiento", { ascending: true }),
    supabase.from("v_libro_iva_ventas").select("iva, fecha").gte("fecha", inicioMes),
    supabase.from("v_libro_iva_compras").select("iva, fecha").gte("fecha", inicioMes),
    supabase
      .from("comprobantes")
      .select("id, tipo, punto_venta, numero, total, estado, terceros(razon_social)")
      .neq("estado", "borrador")
      .order("fecha", { ascending: false })
      .limit(6),
  ]);

  const totalBancos = (saldosBancarios ?? []).reduce((s, c) => s + Number(c.saldo_actual), 0);
  const ventasMes = (comprobantes12m ?? []).filter(
    (c) => c.direccion === "venta" && c.fecha >= inicioMes
  );
  const comprasMes = (comprobantes12m ?? []).filter(
    (c) => c.direccion === "compra" && c.fecha >= inicioMes
  );
  const totalVentasMes = ventasMes.reduce((s, c) => s + Number(c.total), 0);
  const totalComprasMes = comprasMes.reduce((s, c) => s + Number(c.total), 0);
  const ingresos = (mayor ?? [])
    .filter((c) => c.tipo === "ingreso")
    .reduce((s, c) => s + Number(c.saldo), 0);
  const egresos = (mayor ?? [])
    .filter((c) => c.tipo === "egreso")
    .reduce((s, c) => s + Number(c.saldo), 0);
  const resultado = ingresos - egresos;

  const debitoFiscal = (ivaVentasMes ?? []).reduce((s, r) => s + Number(r.iva), 0);
  const creditoFiscal = (ivaComprasMes ?? []).reduce((s, r) => s + Number(r.iva), 0);
  const posicionIva = debitoFiscal - creditoFiscal;

  // Agrupar los últimos 12 meses (ventas/compras) para el gráfico de barras.
  const chart: { key: string; label: string; ventas: number; compras: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    chart.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MESES[d.getMonth()], ventas: 0, compras: 0 });
  }
  const chartByKey = new Map(chart.map((c) => [c.key, c]));
  for (const c of comprobantes12m ?? []) {
    const d = new Date(c.fecha);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = chartByKey.get(key);
    if (!bucket) continue;
    if (c.direccion === "venta") bucket.ventas += Number(c.total);
    else bucket.compras += Number(c.total);
  }
  const maxChart = Math.max(1, ...chart.flatMap((c) => [c.ventas, c.compras]));

  const kpis: { label: string; value: string; sub?: string; tone: Tone }[] = [
    { label: "Saldo en Bancos", value: pesos(totalBancos), tone: totalBancos < 0 ? "bad" : "accent" },
    { label: "Ventas del mes", value: pesos(totalVentasMes), sub: `${ventasMes.length} comprobantes`, tone: "accent" },
    { label: "Compras del mes", value: pesos(totalComprasMes), sub: `${comprasMes.length} comprobantes`, tone: "plum" },
    {
      label: "Posición IVA",
      value: pesos(Math.abs(posicionIva)),
      sub: posicionIva >= 0 ? "A pagar" : "A favor",
      tone: posicionIva >= 0 ? "bad" : "good",
    },
  ];

  return (
    <div>
      <PageTitle className="mb-6">Resumen</PageTitle>

      <div className="mb-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(215px,1fr))]">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3.5 xl:[grid-template-columns:1.55fr_1fr]">
        <Card
          title="Ventas vs. compras · últimos 12 meses"
          actions={
            <div className="flex gap-3.5 text-[11px] text-ink-2">
              <span className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-[2px] bg-accent" />
                Ventas
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-[2px] bg-plum" />
                Compras
              </span>
            </div>
          }
        >
          <div className="flex h-[210px] items-end gap-2.5 px-[1.15rem] pb-[.9rem] pt-[1.3rem]">
            {chart.map((m) => (
              <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-[7px]">
                <div className="flex h-full w-full items-end gap-[3px]" title={`Ventas ${pesos(m.ventas)} · Compras ${pesos(m.compras)}`}>
                  <div
                    className="flex-1 rounded-t-[3px] bg-accent"
                    style={{ height: `${(m.ventas / maxChart) * 100}%` }}
                  />
                  <div
                    className="flex-1 rounded-t-[3px] bg-plum"
                    style={{ height: `${(m.compras / maxChart) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-ink-3">{m.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title={`Posición IVA · ${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`} className="flex flex-col">
          <div className="flex flex-1 flex-col gap-3 p-[1.15rem]">
            <div className="flex items-baseline justify-between border-b border-line pb-[9px]">
              <span className="text-[12px] text-ink-2">IVA Débito Fiscal</span>
              <span className="font-mono text-[13px] text-ink">{pesos(debitoFiscal)}</span>
            </div>
            <div className="flex items-baseline justify-between border-b border-line pb-[9px]">
              <span className="text-[12px] text-ink-2">IVA Crédito Fiscal</span>
              <span className="font-mono text-[13px] text-ink-2">({pesos(creditoFiscal)})</span>
            </div>
            <div
              className={`mt-auto rounded-lg border px-3.5 py-3 ${
                posicionIva >= 0 ? "border-bad/20 bg-bad/[.08]" : "border-good/20 bg-good/[.08]"
              }`}
            >
              <div className={`text-[10px] uppercase tracking-[.06em] ${posicionIva >= 0 ? "text-bad" : "text-good"}`}>
                {posicionIva >= 0 ? "A pagar" : "Saldo a favor"} · mes en curso
              </div>
              <div
                className={`mt-1 font-mono text-[20px] font-semibold ${posicionIva >= 0 ? "text-bad" : "text-good"}`}
              >
                {pesos(Math.abs(posicionIva))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:[grid-template-columns:1.55fr_1fr]">
        <Card
          title="Últimos comprobantes"
          actions={
            <Link href="/comprobantes">
              <Button className="!border-0 !bg-transparent !px-0 !text-[11px] !text-accent">Ver todos →</Button>
            </Link>
          }
        >
          <Table>
            <thead>
              <tr>
                <Th>Comprobante</Th>
                <Th>Tercero</Th>
                <Th right>Total</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {(ultimos ?? []).map((c) => (
                <Row key={c.id}>
                  <Td mono>
                    {c.tipo.replace("_", " ").toUpperCase()} {c.punto_venta.toString().padStart(4, "0")}-
                    {(c.numero ?? 0).toString().padStart(8, "0")}
                  </Td>
                  <Td>{(c.terceros as unknown as { razon_social: string } | null)?.razon_social ?? "-"}</Td>
                  <Td right mono>
                    {pesos(Number(c.total))}
                  </Td>
                  <Td>
                    <Badge tone={ESTADO_TONE[c.estado] ?? "muted"}>{c.estado}</Badge>
                  </Td>
                </Row>
              ))}
              {(ultimos ?? []).length === 0 && (
                <tr>
                  <Td className="py-6 text-center text-ink-2">Sin comprobantes todavía</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>

        <Card
          title="Vencimientos próximos"
          actions={
            <Link href="/vencimientos">
              <Button className="!border-0 !bg-transparent !px-0 !text-[11px] !text-accent">Ver todos →</Button>
            </Link>
          }
        >
          <div className="py-2.5">
            {(vencimientos ?? []).map((v) => {
              const vencido = v.fecha_vencimiento < hoyIso;
              const d = new Date(v.fecha_vencimiento + "T00:00:00");
              return (
                <div key={v.id} className="flex items-center gap-3 px-[1.15rem] py-[9px]">
                  <div className="w-[38px] shrink-0 text-center">
                    <div className={`font-mono text-[15px] font-semibold ${vencido ? "text-bad" : "text-gold"}`}>
                      {d.getDate().toString().padStart(2, "0")}
                    </div>
                    <div className="text-[9px] uppercase text-ink-3">{MESES[d.getMonth()]}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] text-ink">
                      {v.concepto}
                      {v.periodo ? ` · ${v.periodo}` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
            {(vencimientos ?? []).length === 0 && (
              <div className="px-[1.15rem] py-4 text-[12px] text-ink-2">Sin vencimientos en los próximos 14 días</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
