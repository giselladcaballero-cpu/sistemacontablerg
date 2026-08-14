import { createClient } from "@/lib/supabase/server";

export default async function PlanCuentasPage() {
  const supabase = await createClient();
  const { data: cuentas } = await supabase
    .from("plan_cuentas")
    .select("*")
    .order("codigo");

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-ink">Plan de Cuentas</h1>
      <div className="overflow-x-auto rounded-lg border bg-surface shadow-sm">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-bg">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Código</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Nombre</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Tipo</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Naturaleza</th>
              <th className="px-3 py-2 text-left font-medium text-ink-soft">Imputable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(cuentas ?? []).map((c) => (
              <tr key={c.id} className={c.imputable ? "" : "bg-bg font-medium"}>
                <td className="px-3 py-2 text-ink-soft">{c.codigo}</td>
                <td className="px-3 py-2 text-ink">{c.nombre}</td>
                <td className="px-3 py-2 capitalize text-ink-soft">{c.tipo.replace("_", " ")}</td>
                <td className="px-3 py-2 capitalize text-ink-soft">{c.naturaleza}</td>
                <td className="px-3 py-2 text-ink-soft">{c.imputable ? "Sí" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
