import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import ExportButtons from "@/components/export-buttons";
import { Card, Table, Th } from "@/components/ui";
import ContabilidadTabs from "../contabilidad-tabs";
import MayorFiltros from "./mayor-filtros";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

interface LineaJoin {
  id: string;
  debe: number;
  haber: number;
  cuenta_id: string;
  asientos: { fecha: string; numero: number; descripcion: string; anulado: boolean } | null;
  plan_cuentas: { codigo: string; nombre: string; naturaleza: string } | null;
  terceros: { razon_social: string } | null;
}

export default async function LibroMayorPage({
  searchParams,
}: {
  searchParams: Promise<{ cuenta?: string; desde?: string; hasta?: string }>;
}) {
  const { cuenta: cuentaId, desde, hasta } = await searchParams;
  const supabase = await createClient();

  const { data: cuentasList } = await supabase
    .from("plan_cuentas")
    .select("id, codigo, nombre")
    .eq("imputable", true)
    .order("codigo");

  if (cuentaId) {
    // Mayor individual: saldo anterior + movimientos del período con saldo corrido
    const cuenta = (cuentasList ?? []).find((c) => c.id === cuentaId);

    let anteriorQuery = supabase
      .from("asiento_lineas")
      .select("debe, haber, asientos!inner(fecha, anulado)")
      .eq("cuenta_id", cuentaId)
      .eq("asientos.anulado", false);
    if (desde) anteriorQuery = anteriorQuery.lt("asientos.fecha", desde);
    const { data: anteriores } = desde ? await anteriorQuery : { data: [] };

    const { data: naturalezaRow } = await supabase
      .from("plan_cuentas")
      .select("naturaleza")
      .eq("id", cuentaId)
      .single();
    const naturaleza = naturalezaRow?.naturaleza ?? "deudora";

    const sumaAnterior = (anteriores ?? []).reduce(
      (s, l) => s + (naturaleza === "deudora" ? Number(l.debe) - Number(l.haber) : Number(l.haber) - Number(l.debe)),
      0
    );

    let movQuery = supabase
      .from("asiento_lineas")
      .select("id, debe, haber, cuenta_id, asientos!inner(fecha, numero, descripcion, anulado), terceros(razon_social)")
      .eq("cuenta_id", cuentaId)
      .eq("asientos.anulado", false)
      .order("fecha", { referencedTable: "asientos", ascending: true })
      .order("numero", { referencedTable: "asientos", ascending: true });
    if (desde) movQuery = movQuery.gte("asientos.fecha", desde);
    if (hasta) movQuery = movQuery.lte("asientos.fecha", hasta);
    const { data: movimientos } = await movQuery;

    let saldo = sumaAnterior;
    const filas = (movimientos ?? []).map((m) => {
      const a = m.asientos as unknown as { fecha: string; numero: number; descripcion: string };
      const t = m.terceros as unknown as { razon_social: string } | null;
      saldo += naturaleza === "deudora" ? Number(m.debe) - Number(m.haber) : Number(m.haber) - Number(m.debe);
      return {
        fecha: a.fecha,
        numero: a.numero,
        descripcion: a.descripcion,
        tercero: t?.razon_social ?? "",
        debe: Number(m.debe),
        haber: Number(m.haber),
        saldo,
      };
    });

    const exportRows = [
      ...(desde ? [["", "", "Saldo anterior", "", "", "", fmt(sumaAnterior)]] : []),
      ...filas.map((f) => [f.fecha, `#${f.numero}`, f.descripcion, f.tercero, fmt(f.debe), fmt(f.haber), fmt(f.saldo)]),
    ];

    return (
      <div>
        <PageTitle>Contabilidad</PageTitle>
        <ContabilidadTabs />
        <MayorFiltros cuentas={cuentasList ?? []} />

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">
            {cuenta ? `${cuenta.codigo} — ${cuenta.nombre}` : "Cuenta"}
          </h2>
          <ExportButtons
            filename={`mayor-${cuenta?.codigo ?? "cuenta"}`}
            title={`Libro Mayor — ${cuenta?.codigo ?? ""} ${cuenta?.nombre ?? ""}`}
            headers={["Fecha", "N°", "Descripción", "Tercero", "Debe", "Haber", "Saldo"]}
            rows={exportRows}
          />
        </div>

        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>N°</Th>
                <Th>Descripción</Th>
                <Th>Tercero</Th>
                <Th right>Debe</Th>
                <Th right>Haber</Th>
                <Th right>Saldo</Th>
              </tr>
            </thead>
            <tbody>
              {desde && (
                <tr className="border-b border-line bg-surface-2 font-medium">
                  <td colSpan={6} className="px-3 py-2 text-[12.5px] text-ink-2">
                    Saldo anterior
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink">{fmt(sumaAnterior)}</td>
                </tr>
              )}
              {filas.map((f, idx) => (
                <tr key={idx} className="border-b border-line hover:bg-accent/5">
                  <td className="px-3 py-2 font-mono text-[11px] text-ink-2">{f.fecha}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-ink-2">#{f.numero}</td>
                  <td className="px-3 py-2 text-[12.5px] text-ink">{f.descripcion}</td>
                  <td className="px-3 py-2 text-[12.5px] text-ink-2">{f.tercero}</td>
                  <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink-2">{f.debe > 0 ? fmt(f.debe) : ""}</td>
                  <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink-2">{f.haber > 0 ? fmt(f.haber) : ""}</td>
                  <td className="px-3 py-2 text-right font-mono text-[11.5px] font-medium text-ink">{fmt(f.saldo)}</td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-[12.5px] text-ink-2">
                    Sin movimientos en el período
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      </div>
    );
  }

  // Mayor global: resumen por cuenta, filtrado por fecha
  let query = supabase
    .from("asiento_lineas")
    .select("debe, haber, cuenta_id, asientos!inner(fecha, anulado), plan_cuentas(codigo, nombre, naturaleza)")
    .eq("asientos.anulado", false);
  if (desde) query = query.gte("asientos.fecha", desde);
  if (hasta) query = query.lte("asientos.fecha", hasta);
  const { data: lineas } = await query;

  const porCuenta = new Map<
    string,
    { codigo: string; nombre: string; naturaleza: string; debe: number; haber: number }
  >();
  for (const c of cuentasList ?? []) {
    porCuenta.set(c.id, { codigo: c.codigo, nombre: c.nombre, naturaleza: "", debe: 0, haber: 0 });
  }
  for (const l of (lineas ?? []) as unknown as LineaJoin[]) {
    const pc = l.plan_cuentas;
    if (!pc) continue;
    const acc = porCuenta.get(l.cuenta_id) ?? { codigo: pc.codigo, nombre: pc.nombre, naturaleza: pc.naturaleza, debe: 0, haber: 0 };
    acc.naturaleza = pc.naturaleza;
    acc.debe += Number(l.debe);
    acc.haber += Number(l.haber);
    porCuenta.set(l.cuenta_id, acc);
  }

  const filasGlobal = Array.from(porCuenta.values())
    .sort((a, b) => a.codigo.localeCompare(b.codigo))
    .map((c) => ({
      ...c,
      saldo: c.naturaleza === "acreedora" ? c.haber - c.debe : c.debe - c.haber,
    }));

  const exportRowsGlobal = filasGlobal.map((c) => [c.codigo, c.nombre, fmt(c.debe), fmt(c.haber), fmt(c.saldo)]);

  return (
    <div>
      <PageTitle>Contabilidad</PageTitle>
      <ContabilidadTabs />
      <MayorFiltros cuentas={cuentasList ?? []} />

      <div className="mb-3 flex items-center justify-end">
        <ExportButtons
          filename="libro-mayor"
          title="Libro Mayor"
          headers={["Código", "Cuenta", "Debe", "Haber", "Saldo"]}
          rows={exportRowsGlobal}
        />
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Código</Th>
              <Th>Cuenta</Th>
              <Th right>Debe</Th>
              <Th right>Haber</Th>
              <Th right>Saldo</Th>
            </tr>
          </thead>
          <tbody>
            {filasGlobal.map((c) => (
              <tr key={c.codigo} className="border-b border-line hover:bg-accent/5">
                <td className="px-3 py-2 font-mono text-[11px] text-ink-2">{c.codigo}</td>
                <td className="px-3 py-2 text-[12.5px] text-ink">{c.nombre}</td>
                <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink-2">{fmt(c.debe)}</td>
                <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink-2">{fmt(c.haber)}</td>
                <td className={`px-3 py-2 text-right font-mono text-[11.5px] font-medium ${c.saldo < 0 ? "text-bad" : "text-ink"}`}>
                  {fmt(c.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
