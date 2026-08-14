"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CondicionIva, Tercero, TipoTercero } from "@/lib/types";

export default function TerceroRow({ tercero }: { tercero: Tercero }) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [razonSocial, setRazonSocial] = useState(tercero.razon_social);
  const [tipo, setTipo] = useState<TipoTercero>(tercero.tipo);
  const [cuit, setCuit] = useState(tercero.cuit ?? "");
  const [condicionIva, setCondicionIva] = useState<CondicionIva>(tercero.condicion_iva);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("terceros")
      .update({ razon_social: razonSocial, tipo, cuit: cuit || null, condicion_iva: condicionIva })
      .eq("id", tercero.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar a "${tercero.razon_social}"?`)) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("terceros").delete().eq("id", tercero.id);
    setLoading(false);
    if (error) {
      setError(
        error.code === "23503"
          ? "No se puede eliminar: tiene comprobantes asociados."
          : error.message
      );
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <tr>
        <td className="px-3 py-2">
          <input
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
            className="w-full rounded-md border border-line px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoTercero)}
            className="w-full rounded-md border border-line px-2 py-1 text-sm"
          >
            <option value="cliente">Cliente</option>
            <option value="proveedor">Proveedor</option>
            <option value="ambos">Ambos</option>
          </select>
        </td>
        <td className="px-3 py-2">
          <input
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            className="w-full rounded-md border border-line px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <select
              value={condicionIva}
              onChange={(e) => setCondicionIva(e.target.value as CondicionIva)}
              className="w-full rounded-md border border-line px-2 py-1 text-sm"
            >
              <option value="responsable_inscripto">Responsable Inscripto</option>
              <option value="monotributo">Monotributo</option>
              <option value="exento">Exento</option>
              <option value="consumidor_final">Consumidor Final</option>
              <option value="no_categorizado">No Categorizado</option>
            </select>
            <button
              onClick={guardar}
              disabled={loading}
              className="whitespace-nowrap text-xs font-medium text-accent hover:opacity-80"
            >
              Guardar
            </button>
            <button
              onClick={() => setEditing(false)}
              className="whitespace-nowrap text-xs text-ink-soft hover:text-ink"
            >
              Cancelar
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr className="group">
      <td className="px-3 py-2 text-ink">{tercero.razon_social}</td>
      <td className="px-3 py-2 capitalize text-ink-soft">{tercero.tipo}</td>
      <td className="px-3 py-2 text-ink-soft">{tercero.cuit ?? "-"}</td>
      <td className="px-3 py-2 text-ink-soft">
        <div className="flex items-center justify-between gap-2">
          <span>{tercero.condicion_iva}</span>
          <span className="flex shrink-0 gap-2 opacity-0 group-hover:opacity-100">
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-medium text-accent hover:opacity-80"
            >
              Editar
            </button>
            <button onClick={eliminar} disabled={loading} className="text-xs text-danger hover:opacity-80">
              Eliminar
            </button>
          </span>
        </div>
      </td>
    </tr>
  );
}
