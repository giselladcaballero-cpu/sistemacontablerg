"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Comprobante } from "@/lib/types";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

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

  return (
    <tr>
      <td className="px-3 py-2 text-ink-soft">{comprobante.fecha}</td>
      <td className="px-3 py-2 uppercase text-ink-soft">{comprobante.tipo.replace("_", " ")}</td>
      <td className="px-3 py-2 text-ink-soft">
        {comprobante.punto_venta.toString().padStart(4, "0")}-
        {(comprobante.numero ?? 0).toString().padStart(8, "0")}
      </td>
      <td className="px-3 py-2 text-ink">{terceroNombre}</td>
      <td className="px-3 py-2 capitalize text-ink-soft">{comprobante.direccion}</td>
      <td className="px-3 py-2 text-right text-ink">{fmt(Number(comprobante.total))}</td>
      <td className="px-3 py-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            comprobante.estado === "confirmado" ||
            comprobante.estado === "cobrado" ||
            comprobante.estado === "pagado"
              ? "bg-accent-soft text-accent-soft-ink"
              : comprobante.estado === "anulado"
                ? "bg-danger-soft text-danger"
                : "bg-surface-muted text-ink-soft"
          }`}
        >
          {comprobante.estado}
        </span>
      </td>
      <td className="px-3 py-2 text-right">
        {esBorrador && (
          <button onClick={eliminar} disabled={loading} className="text-xs text-danger hover:opacity-80">
            Eliminar
          </button>
        )}
        {esAnulable && (
          <button onClick={anular} disabled={loading} className="text-xs text-danger hover:opacity-80">
            Anular
          </button>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
      </td>
    </tr>
  );
}
