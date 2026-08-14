import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import VencimientoForm from "./vencimiento-form";
import VencimientoRow from "./vencimiento-row";
import CronogramaArca from "./cronograma-arca";

export default async function VencimientosPage() {
  const supabase = await createClient();
  const empresaActual = await getEmpresaActual();
  const [{ data: vencimientos }, { data: empresa }] = await Promise.all([
    supabase.from("vencimientos_impositivos").select("*").order("fecha_vencimiento", { ascending: true }),
    supabase.from("empresas").select("cuit").eq("id", empresaActual!.id).single(),
  ]);

  const hoy = new Date().toISOString().slice(0, 10);
  const pendientes = (vencimientos ?? []).filter((v) => v.estado === "pendiente");
  const vencidos = pendientes.filter((v) => v.fecha_vencimiento < hoy);
  const proximos = pendientes.filter((v) => {
    const dias = (new Date(v.fecha_vencimiento).getTime() - new Date(hoy).getTime()) / 86400000;
    return dias >= 0 && dias <= 7;
  });

  const cuitDigits = (empresa?.cuit ?? "").replace(/\D/g, "");
  const terminacion = cuitDigits.length > 0 ? Number(cuitDigits[cuitDigits.length - 1]) : null;

  let cronograma: { id: string; concepto: string; fecha: string; cuit_terminaciones: number[] }[] = [];
  if (terminacion !== null) {
    const { data } = await supabase
      .from("cronograma_vencimientos_arca")
      .select("id, concepto, fecha, cuit_terminaciones")
      .or(`cuit_terminaciones.eq.{},cuit_terminaciones.cs.{${terminacion}}`)
      .gte("fecha", hoy)
      .order("fecha", { ascending: true });
    cronograma = data ?? [];
  }

  const yaAgregados = (vencimientos ?? []).map((v) => `${v.concepto}|${v.fecha_vencimiento}`);

  return (
    <div>
      <PageTitle className="mb-6">Vencimientos Impositivos</PageTitle>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-surface p-4 shadow-sm">
          <p className="text-xs text-ink-soft">Vencidos</p>
          <p className={`mt-1 text-xl font-semibold ${vencidos.length > 0 ? "text-danger" : "text-ink"}`}>
            {vencidos.length}
          </p>
        </div>
        <div className="rounded-lg border bg-surface p-4 shadow-sm">
          <p className="text-xs text-ink-soft">Próximos 7 días</p>
          <p className="mt-1 text-xl font-semibold text-ink">{proximos.length}</p>
        </div>
        <div className="rounded-lg border bg-surface p-4 shadow-sm">
          <p className="text-xs text-ink-soft">Pendientes totales</p>
          <p className="mt-1 text-xl font-semibold text-ink">{pendientes.length}</p>
        </div>
      </div>

      {terminacion === null ? (
        <p className="mb-6 rounded-md bg-surface-muted px-3 py-2 text-sm text-ink-soft">
          Completá el CUIT en{" "}
          <a href="/perfil" className="text-accent hover:opacity-80">
            Perfil del Cliente
          </a>{" "}
          para que el sistema te muestre los vencimientos oficiales de ARCA que te corresponden según
          la terminación de tu CUIT.
        </p>
      ) : (
        <div className="mb-6">
          <CronogramaArca cronograma={cronograma} yaAgregados={yaAgregados} empresaId={empresaActual!.id} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <VencimientoForm empresaId={empresaActual!.id} />
        </div>
        <div className="lg:col-span-2">
          <div className="overflow-x-auto rounded-lg border bg-surface shadow-sm">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-bg">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Vencimiento</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Concepto</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Período</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Notas</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Estado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(vencimientos ?? []).map((v) => (
                  <VencimientoRow key={v.id} vencimiento={v} hoy={hoy} />
                ))}
                {(vencimientos ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-ink-soft">
                      Sin vencimientos cargados todavía
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
