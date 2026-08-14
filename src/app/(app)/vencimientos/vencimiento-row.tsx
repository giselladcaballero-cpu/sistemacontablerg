"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Vencimiento {
  id: string;
  concepto: string;
  periodo: string | null;
  fecha_vencimiento: string;
  estado: "pendiente" | "pagado";
  notas: string | null;
}

export default function VencimientoRow({ vencimiento, hoy }: { vencimiento: Vencimiento; hoy: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dias = Math.round(
    (new Date(vencimiento.fecha_vencimiento).getTime() - new Date(hoy).getTime()) / 86400000
  );

  let estadoLabel = "OK";
  let estadoClase = "bg-accent-soft text-accent-soft-ink";
  if (vencimiento.estado === "pagado") {
    estadoLabel = "Pagado";
    estadoClase = "bg-surface-muted text-ink-soft";
  } else if (dias < 0) {
    estadoLabel = "Vencido";
    estadoClase = "bg-danger-soft text-danger";
  } else if (dias <= 7) {
    estadoLabel = `En ${dias} día${dias === 1 ? "" : "s"}`;
    estadoClase = "bg-danger-soft text-danger";
  }

  async function marcarPagado() {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("vencimientos_impositivos")
      .update({ estado: "pagado" })
      .eq("id", vencimiento.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar el vencimiento de ${vencimiento.concepto}?`)) return;
    setLoading(true);
    const { error } = await supabase.from("vencimientos_impositivos").delete().eq("id", vencimiento.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <tr className="group">
      <td className="px-3 py-2 text-ink-soft">{vencimiento.fecha_vencimiento}</td>
      <td className="px-3 py-2 text-ink">{vencimiento.concepto}</td>
      <td className="px-3 py-2 text-ink-soft">{vencimiento.periodo ?? "-"}</td>
      <td className="px-3 py-2 text-ink-soft">{vencimiento.notas ?? "-"}</td>
      <td className="px-3 py-2">
        <span className={`rounded-full px-2 py-0.5 text-xs ${estadoClase}`}>{estadoLabel}</span>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100">
          {vencimiento.estado === "pendiente" && (
            <button onClick={marcarPagado} disabled={loading} className="text-xs font-medium text-accent hover:opacity-80">
              Marcar pagado
            </button>
          )}
          <button onClick={eliminar} disabled={loading} className="text-xs text-danger hover:opacity-80">
            Eliminar
          </button>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </td>
    </tr>
  );
}
