import { createClient } from "@/lib/supabase/server";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2 }).format(n);
}

export default async function LibroDiarioPage() {
  const supabase = await createClient();
  const { data: lineas } = await supabase
    .from("v_libro_diario")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(300);

  const grouped = new Map<string, typeof lineas>();
  for (const l of lineas ?? []) {
    const key = l.asiento_id as string;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(l);
  }

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-ink">Libro Diario</h1>
      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([asientoId, filas]) => {
          const head = filas![0];
          return (
            <div key={asientoId} className="rounded-lg border bg-surface p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-sm">
                <p className="font-medium text-ink">
                  #{head.numero} — {head.descripcion}
                </p>
                <p className="text-ink-soft">
                  {head.fecha} · {head.origen}
                  {head.anulado ? " · ANULADO" : ""}
                </p>
              </div>
              <table className="min-w-full text-sm">
                <tbody>
                  {filas!.map((f) => (
                    <tr key={f.linea_id} className="border-t border-line">
                      <td className="py-1 pr-4 text-ink-soft">
                        {f.cuenta_codigo} {f.cuenta_nombre}
                      </td>
                      <td className="py-1 pr-4 text-ink-soft">{f.tercero ?? ""}</td>
                      <td className="py-1 pr-4 text-right text-ink">
                        {Number(f.debe) > 0 ? fmt(Number(f.debe)) : ""}
                      </td>
                      <td className="py-1 text-right text-ink">
                        {Number(f.haber) > 0 ? fmt(Number(f.haber)) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {grouped.size === 0 && (
          <p className="text-center text-ink-soft">Sin asientos todavía</p>
        )}
      </div>
    </div>
  );
}
