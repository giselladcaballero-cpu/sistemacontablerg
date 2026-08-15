import { createClient } from "@/lib/supabase/server";
import { getEmpresaActual } from "@/lib/empresa";
import PageTitle from "@/components/page-title";
import { Card, KpiCard, Table, Th } from "@/components/ui";
import VencimientoForm from "./vencimiento-form";
import VencimientoRow from "./vencimiento-row";
import CronogramaArca from "./cronograma-arca";

export default async function VencimientosPage() {
  const supabase = await createClient();
  const empresaActual = await getEmpresaActual();
  const [{ data: vencimientos }, { data: empresa }] = await Promise.all([
    supabase.from("vencimientos_impositivos").select("*").order("fecha_vencimiento", { ascending: true }),
    supabase
      .from("empresas")
      .select(
        "cuit, es_empleador, agente_retencion_iva, agente_retencion_ganancias, agente_retencion_iibb, agente_percepcion_iva, agente_percepcion_iibb"
      )
      .eq("id", empresaActual!.id)
      .single(),
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

  const esAgente =
    !!empresa?.agente_retencion_iva ||
    !!empresa?.agente_retencion_ganancias ||
    !!empresa?.agente_retencion_iibb ||
    !!empresa?.agente_percepcion_iva ||
    !!empresa?.agente_percepcion_iibb;

  let cronograma: { id: string; concepto: string; fecha: string; cuit_terminaciones: number[]; requiere_agente: boolean }[] = [];
  if (terminacion !== null) {
    const { data } = await supabase
      .from("cronograma_vencimientos_arca")
      .select("id, concepto, fecha, cuit_terminaciones, requiere_agente")
      .or(`cuit_terminaciones.eq.{},cuit_terminaciones.cs.{${terminacion}}`)
      .gte("fecha", hoy)
      .order("fecha", { ascending: true });
    cronograma = (data ?? []).filter(
      (item) =>
        (empresa?.es_empleador || item.concepto !== "Empleadores (SUSS)") &&
        (!item.requiere_agente || esAgente)
    );
  }

  const yaAgregados = (vencimientos ?? []).map((v) => `${v.concepto}|${v.fecha_vencimiento}`);

  return (
    <div>
      <PageTitle className="mb-6">Vencimientos Impositivos</PageTitle>

      <div className="mb-6 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(215px,1fr))]">
        <KpiCard label="Vencidos" value={String(vencidos.length)} tone={vencidos.length > 0 ? "bad" : "accent"} />
        <KpiCard label="Próximos 7 días" value={String(proximos.length)} tone="gold" />
        <KpiCard label="Pendientes totales" value={String(pendientes.length)} tone="accent" />
      </div>

      {terminacion === null ? (
        <p className="mb-6 rounded-[6px] bg-surface-2 px-3 py-2 text-[12.5px] text-ink-2">
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
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Vencimiento</Th>
                  <Th>Concepto</Th>
                  <Th>Período</Th>
                  <Th>Notas</Th>
                  <Th>Estado</Th>
                  <Th right>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {(vencimientos ?? []).map((v) => (
                  <VencimientoRow key={v.id} vencimiento={v} hoy={hoy} />
                ))}
                {(vencimientos ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-[12.5px] text-ink-2">
                      Sin vencimientos cargados todavía
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
