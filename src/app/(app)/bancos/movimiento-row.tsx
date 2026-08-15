"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MovimientoBancario } from "@/lib/types";
import { Row, Td, pesos } from "@/components/ui";

export default function MovimientoRow({
  movimiento,
  cuentaNombre,
}: {
  movimiento: MovimientoBancario;
  cuentaNombre: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [fecha, setFecha] = useState(movimiento.fecha);
  const [descripcion, setDescripcion] = useState(movimiento.descripcion);
  const [importe, setImporte] = useState(movimiento.importe);
  const [tipo, setTipo] = useState<"ingreso" | "egreso">(movimiento.tipo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("movimientos_bancarios")
      .update({ fecha, descripcion, importe, tipo })
      .eq("id", movimiento.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar el movimiento "${movimiento.descripcion}"?`)) return;
    setLoading(true);
    const { error } = await supabase.from("movimientos_bancarios").delete().eq("id", movimiento.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <tr>
        <td className="px-3 py-2">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-md border border-line px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2 text-ink-soft">{cuentaNombre}</td>
        <td className="px-3 py-2">
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full rounded-md border border-line px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center justify-end gap-2">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "ingreso" | "egreso")}
              className="rounded-md border border-line px-1.5 py-1 text-sm"
            >
              <option value="ingreso">+</option>
              <option value="egreso">-</option>
            </select>
            <input
              type="number"
              step="0.01"
              value={importe}
              onChange={(e) => setImporte(Number(e.target.value))}
              className="w-24 rounded-md border border-line px-2 py-1 text-right text-sm"
            />
          </div>
          <div className="mt-1 flex justify-end gap-3">
            <button onClick={guardar} disabled={loading} className="text-xs font-medium text-accent hover:opacity-80">
              Guardar
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-ink-soft hover:text-ink">
              Cancelar
            </button>
          </div>
          {error && <p className="text-right text-xs text-danger">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <Row>
      <Td mono className="text-ink-2">
        {movimiento.fecha}
      </Td>
      <Td className="text-ink-2">{cuentaNombre}</Td>
      <Td>{movimiento.descripcion}</Td>
      <Td right>
        <div className="flex items-center justify-end gap-2">
          <span className="flex gap-2 opacity-0 group-hover:opacity-100">
            <button onClick={() => setEditing(true)} className="text-[11px] font-medium text-accent hover:opacity-80">
              Editar
            </button>
            <button onClick={eliminar} disabled={loading} className="text-[11px] text-bad hover:opacity-80">
              Eliminar
            </button>
          </span>
          <span className={`font-mono font-medium ${movimiento.tipo === "ingreso" ? "text-good" : "text-bad"}`}>
            {movimiento.tipo === "ingreso" ? "+" : "-"}
            {pesos(Number(movimiento.importe))}
          </span>
        </div>
      </Td>
    </Row>
  );
}
