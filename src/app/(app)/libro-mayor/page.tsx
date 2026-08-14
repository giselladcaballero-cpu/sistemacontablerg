import { createClient } from "@/lib/supabase/server";
import PageTitle from "@/components/page-title";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

export default async function LibroMayorPage() {
  const supabase = await createClient();
  const { data: cuentas } = await supabase.from("v_libro_mayor").select("*").order("codigo");

  return (
    <div>
      <PageTitle className="mb-6">Libro Mayor</PageTitle>
      <div className="overflow-x-auto rounded-lg border bg-surface shadow-sm">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-bg">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Código</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Cuenta</th>
              <th className="px-3 py-2 text-right font-medium text-ink-soft">Debe</th>
              <th className="px-3 py-2 text-right font-medium text-ink-soft">Haber</th>
              <th className="px-3 py-2 text-right font-medium text-ink-soft">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(cuentas ?? []).map((c) => (
              <tr key={c.cuenta_id}>
                <td className="px-3 py-2 text-ink-soft">{c.codigo}</td>
                <td className="px-3 py-2 text-ink">{c.nombre}</td>
                <td className="px-3 py-2 text-right text-ink-soft">{fmt(Number(c.total_debe))}</td>
                <td className="px-3 py-2 text-right text-ink-soft">{fmt(Number(c.total_haber))}</td>
                <td
                  className={`px-3 py-2 text-right font-medium ${
                    Number(c.saldo) < 0 ? "text-danger" : "text-ink"
                  }`}
                >
                  {fmt(Number(c.saldo))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
