import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import { Card, Badge, Button, money, type Tone } from "@/components/ui";
import ContabilidadTabs from "./contabilidad-tabs";
import DateRangeFilter from "./date-range-filter";

const ORIGEN_LABEL: Record<string, string> = {
  automatico: "Automático",
  manual: "Manual",
};
const ORIGEN_TONE: Record<string, Tone> = {
  automatico: "accent",
  manual: "muted",
};

export default async function ContabilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const { desde, hasta } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("asientos")
    .select("id, numero, fecha, descripcion, origen, anulado, asiento_lineas(id, debe, haber, plan_cuentas(codigo, nombre), terceros(razon_social))")
    .order("fecha", { ascending: false })
    .order("numero", { ascending: false })
    .limit(200);

  if (desde) query = query.gte("fecha", desde);
  if (hasta) query = query.lte("fecha", hasta);

  const { data: asientos } = await query;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <PageTitle>Contabilidad</PageTitle>
        <Link href="/contabilidad/nuevo">
          <Button variant="primary">+ Nuevo Asiento Manual</Button>
        </Link>
      </div>
      <ContabilidadTabs />
      <DateRangeFilter />

      <div className="space-y-3.5">
        {(asientos ?? []).map((a) => {
          const totalDebe = (a.asiento_lineas ?? []).reduce((s, l) => s + Number(l.debe), 0);
          const totalHaber = (a.asiento_lineas ?? []).reduce((s, l) => s + Number(l.haber), 0);
          return (
            <Card key={a.id}>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-[1.15rem] py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[13px] text-accent">#{a.numero}</span>
                  <span className="text-[12.5px] text-ink">{a.descripcion}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-ink-2">{a.fecha}</span>
                  <Badge tone={ORIGEN_TONE[a.origen] ?? "muted"}>{ORIGEN_LABEL[a.origen] ?? a.origen}</Badge>
                  {a.anulado && <Badge tone="bad">Anulado</Badge>}
                  {a.origen === "manual" && !a.anulado && (
                    <Link href={`/contabilidad/${a.id}`} className="text-[11px] font-medium text-accent hover:opacity-80">
                      Editar
                    </Link>
                  )}
                </div>
              </header>
              <table className="w-full border-collapse text-[12.5px]">
                <tbody>
                  {(a.asiento_lineas ?? []).map((l) => {
                    const cuenta = l.plan_cuentas as unknown as { codigo: string; nombre: string } | null;
                    const tercero = l.terceros as unknown as { razon_social: string } | null;
                    const esHaber = Number(l.haber) > 0;
                    return (
                      <tr key={l.id} className="border-b border-line last:border-b-0">
                        <td className={`px-[1.15rem] py-1.5 text-ink-2 ${esHaber ? "pl-8" : ""}`}>
                          <span className="font-mono text-[11px] text-ink-3">{cuenta?.codigo}</span> {cuenta?.nombre}
                        </td>
                        <td className="py-1.5 pr-4 text-ink-2">{tercero?.razon_social ?? ""}</td>
                        <td className="py-1.5 pr-4 text-right font-mono text-[11.5px] text-ink">
                          {Number(l.debe) > 0 ? money(Number(l.debe)) : ""}
                        </td>
                        <td className="py-1.5 pr-[1.15rem] text-right font-mono text-[11.5px] text-ink">
                          {esHaber ? money(Number(l.haber)) : ""}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={2} className="px-[1.15rem] py-1.5 text-right text-[11px] uppercase tracking-[.05em] text-ink-3">
                      Totales
                    </td>
                    <td className="py-1.5 pr-4 text-right font-mono text-[11.5px] font-semibold text-ink">
                      {money(totalDebe)}
                    </td>
                    <td className="py-1.5 pr-[1.15rem] text-right font-mono text-[11.5px] font-semibold text-ink">
                      {money(totalHaber)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>
          );
        })}
        {(asientos ?? []).length === 0 && <p className="text-center text-[12.5px] text-ink-2">Sin asientos todavía</p>}
      </div>
    </div>
  );
}
