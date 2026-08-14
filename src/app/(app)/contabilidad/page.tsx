import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";
import ContabilidadTabs from "./contabilidad-tabs";
import DateRangeFilter from "./date-range-filter";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2 }).format(n);
}

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
        <Link
          href="/contabilidad/nuevo"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-ink hover:bg-accent/90"
        >
          + Nuevo Asiento Manual
        </Link>
      </div>
      <ContabilidadTabs />
      <DateRangeFilter />

      <div className="space-y-4">
        {(asientos ?? []).map((a) => (
          <div key={a.id} className="rounded-lg border bg-surface p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-sm">
              <p className="font-medium text-ink">
                #{a.numero} — {a.descripcion}
              </p>
              <div className="flex items-center gap-3">
                <p className="text-ink-soft">
                  {a.fecha} · {a.origen}
                  {a.anulado ? " · ANULADO" : ""}
                </p>
                {a.origen === "manual" && !a.anulado && (
                  <Link href={`/contabilidad/${a.id}`} className="text-xs font-medium text-accent hover:opacity-80">
                    Editar
                  </Link>
                )}
              </div>
            </div>
            <table className="min-w-full text-sm">
              <tbody>
                {(a.asiento_lineas ?? []).map((l) => {
                  const cuenta = l.plan_cuentas as unknown as { codigo: string; nombre: string } | null;
                  const tercero = l.terceros as unknown as { razon_social: string } | null;
                  return (
                    <tr key={l.id} className="border-t border-line">
                      <td className="py-1 pr-4 text-ink-soft">
                        {cuenta?.codigo} {cuenta?.nombre}
                      </td>
                      <td className="py-1 pr-4 text-ink-soft">{tercero?.razon_social ?? ""}</td>
                      <td className="py-1 pr-4 text-right text-ink">
                        {Number(l.debe) > 0 ? fmt(Number(l.debe)) : ""}
                      </td>
                      <td className="py-1 text-right text-ink">
                        {Number(l.haber) > 0 ? fmt(Number(l.haber)) : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
        {(asientos ?? []).length === 0 && <p className="text-center text-ink-soft">Sin asientos todavía</p>}
      </div>
    </div>
  );
}
