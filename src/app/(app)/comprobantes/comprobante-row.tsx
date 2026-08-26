"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Comprobante } from "@/lib/types";
import { Row, Td, Badge, pesos, type Tone } from "@/components/ui";
import { descargarPdfComprobante } from "@/lib/comprobante-pdf";

const ESTADO_TONE: Record<string, Tone> = {
  confirmado: "good",
  cobrado: "good",
  pagado: "good",
  borrador: "gold",
  anulado: "bad",
};

export default function ComprobanteRow({
  comprobante,
  terceroNombre,
}: {
  comprobante: Comprobante;
  terceroNombre: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function anular() {
    if (!confirm("¿Anular este comprobante? Se anula también el asiento contable que generó.")) return;
    setLoading(true);
    setError(null);
    const { error: compError } = await supabase
      .from("comprobantes")
      .update({ estado: "anulado" })
      .eq("id", comprobante.id);
    if (compError) {
      setLoading(false);
      setError(compError.message);
      return;
    }
    if (comprobante.asiento_id) {
      const { error: asientoError } = await supabase
        .from("asientos")
        .update({ anulado: true })
        .eq("id", comprobante.asiento_id);
      if (asientoError) {
        setLoading(false);
        setError(asientoError.message);
        return;
      }
    }
    setLoading(false);
    router.refresh();
  }

  async function eliminar() {
    if (!confirm("¿Eliminar este borrador? No se puede deshacer.")) return;
    setLoading(true);
    setError(null);
    await supabase.from("comprobante_items").delete().eq("comprobante_id", comprobante.id);
    const { error } = await supabase.from("comprobantes").delete().eq("id", comprobante.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  const esBorrador = comprobante.estado === "borrador";
  const esAnulable = ["confirmado", "cobrado", "pagado"].includes(comprobante.estado);
  const TIPOS_CON_CAE = ["factura_a", "factura_b", "factura_c", "nota_credito_a", "nota_credito_b", "nota_credito_c", "nota_debito_a", "nota_debito_b", "nota_debito_c"];
  const puedeEmitirCae =
    comprobante.direccion === "venta" &&
    !comprobante.cae &&
    comprobante.estado !== "borrador" &&
    comprobante.estado !== "anulado" &&
    TIPOS_CON_CAE.includes(comprobante.tipo);

  async function emitirCae() {
    if (!confirm("¿Solicitar el CAE de este comprobante a ARCA? Esta acción no se puede deshacer.")) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/comprobantes/${comprobante.id}/emitir-cae`, { method: "POST" });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "No se pudo emitir el CAE");
      return;
    }
    router.refresh();
  }

  async function descargarPdf() {
    setLoading(true);
    setError(null);
    try {
      await descargarPdfComprobante(supabase, comprobante.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el PDF");
    }
    setLoading(false);
  }

  return (
    <Row>
      <Td mono className="text-ink-2">
        {comprobante.fecha}
      </Td>
      <Td mono className="text-ink-2">
        {comprobante.mes_imputacion?.slice(0, 7) ?? "-"}
      </Td>
      <Td mono className="uppercase text-ink-2">
        {comprobante.tipo.replace("_", " ")}
      </Td>
      <Td mono className="text-ink-2">
        {comprobante.punto_venta.toString().padStart(4, "0")}-
        {(comprobante.numero ?? 0).toString().padStart(8, "0")}
      </Td>
      <Td>{terceroNombre}</Td>
      <Td className="capitalize text-ink-2">{comprobante.direccion}</Td>
      <Td right mono>
        {pesos(Number(comprobante.total))}
      </Td>
      <Td>
        <Badge tone={ESTADO_TONE[comprobante.estado] ?? "muted"}>{comprobante.estado}</Badge>
      </Td>
      <Td right>
        {comprobante.cae && (
          <>
            <span className="mr-2 text-[10px] text-ink-2" title={`Vence ${comprobante.cae_vencimiento ?? ""}`}>
              CAE {comprobante.cae}
            </span>
            <button onClick={descargarPdf} disabled={loading} className="mr-2 text-[11px] font-medium text-accent hover:opacity-80">
              Descargar PDF
            </button>
          </>
        )}
        {puedeEmitirCae && (
          <button onClick={emitirCae} disabled={loading} className="mr-2 text-[11px] font-medium text-accent hover:opacity-80">
            {loading ? "Emitiendo..." : "Emitir con CAE"}
          </button>
        )}
        {esBorrador && (
          <button onClick={eliminar} disabled={loading} className="text-[11px] text-bad hover:opacity-80">
            Eliminar
          </button>
        )}
        {esAnulable && (
          <button onClick={anular} disabled={loading} className="text-[11px] text-bad hover:opacity-80">
            Anular
          </button>
        )}
        {error && <p className="text-[11px] text-bad">{error}</p>}
      </Td>
    </Row>
  );
}
