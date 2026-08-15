"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Field, Input, Select, Button, money } from "@/components/ui";

interface Linea {
  cuentaId: string;
  terceroId: string;
  debe: number;
  haber: number;
}

interface AsientoLineaDb {
  cuenta_id: string;
  tercero_id: string | null;
  debe: number;
  haber: number;
}

export default function AsientoEditForm({
  asiento,
  lineasIniciales,
  cuentas,
  terceros,
}: {
  asiento: { id: string; fecha: string; descripcion: string };
  lineasIniciales: AsientoLineaDb[];
  cuentas: { id: string; codigo: string; nombre: string }[];
  terceros: { id: string; razon_social: string }[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [fecha, setFecha] = useState(asiento.fecha);
  const [descripcion, setDescripcion] = useState(asiento.descripcion);
  const [lineas, setLineas] = useState<Linea[]>(
    lineasIniciales.map((l) => ({
      cuentaId: l.cuenta_id,
      terceroId: l.tercero_id ?? "",
      debe: Number(l.debe),
      haber: Number(l.haber),
    }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalDebe = lineas.reduce((s, l) => s + Number(l.debe || 0), 0);
  const totalHaber = lineas.reduce((s, l) => s + Number(l.haber || 0), 0);
  const diferencia = Math.round((totalDebe - totalHaber) * 100) / 100;
  const balanceado = diferencia === 0 && totalDebe > 0;

  function updateLinea(idx: number, patch: Partial<Linea>) {
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function addLinea() {
    setLineas((prev) => [...prev, { cuentaId: "", terceroId: "", debe: 0, haber: 0 }]);
  }

  function removeLinea(idx: number) {
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!descripcion.trim()) {
      setError("Ingresá una descripción");
      return;
    }
    if (lineas.some((l) => !l.cuentaId)) {
      setError("Elegí la cuenta en todas las líneas");
      return;
    }
    if (!balanceado) {
      setError(`El asiento no está balanceado (diferencia: ${diferencia.toFixed(2)})`);
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase
      .from("asientos")
      .update({ fecha, descripcion })
      .eq("id", asiento.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    const { error: deleteError } = await supabase.from("asiento_lineas").delete().eq("asiento_id", asiento.id);
    if (deleteError) {
      setError(deleteError.message);
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("asiento_lineas").insert(
      lineas.map((l) => ({
        asiento_id: asiento.id,
        cuenta_id: l.cuentaId,
        tercero_id: l.terceroId || null,
        debe: l.debe || 0,
        haber: l.haber || 0,
      }))
    );

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/contabilidad");
    router.refresh();
  }

  async function eliminarAsiento() {
    if (!confirm("¿Eliminar este asiento manual? No se puede deshacer.")) return;
    setLoading(true);
    await supabase.from("asiento_lineas").delete().eq("asiento_id", asiento.id);
    const { error } = await supabase.from("asientos").delete().eq("id", asiento.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/contabilidad");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <div className="grid grid-cols-1 gap-4 p-[1.15rem] sm:grid-cols-2">
          <Field label="Fecha">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full normal-case" />
          </Field>
          <Field label="Descripción">
            <Input required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full normal-case" />
          </Field>
        </div>
      </Card>

      <Card
        title="Líneas"
        actions={
          <button type="button" onClick={addLinea} className="text-[11px] font-medium text-accent hover:opacity-80">
            + Agregar línea
          </button>
        }
      >
        <div className="space-y-2 p-[1.15rem]">
          {lineas.map((l, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <Select
                value={l.cuentaId}
                onChange={(e) => updateLinea(idx, { cuentaId: e.target.value })}
                className="col-span-4 normal-case"
              >
                <option value="">Cuenta...</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.nombre}
                  </option>
                ))}
              </Select>
              <Select
                value={l.terceroId}
                onChange={(e) => updateLinea(idx, { terceroId: e.target.value })}
                className="col-span-3 normal-case"
              >
                <option value="">Tercero (opcional)</option>
                {terceros.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.razon_social}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                step="0.01"
                placeholder="Debe"
                value={l.debe || ""}
                onChange={(e) => updateLinea(idx, { debe: Number(e.target.value), haber: 0 })}
                className="col-span-2 text-right normal-case"
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Haber"
                value={l.haber || ""}
                onChange={(e) => updateLinea(idx, { haber: Number(e.target.value), debe: 0 })}
                className="col-span-2 text-right normal-case"
              />
              <button
                type="button"
                onClick={() => removeLinea(idx)}
                disabled={lineas.length <= 2}
                className="col-span-1 text-[13px] text-bad hover:opacity-80 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-6 border-t border-line px-[1.15rem] py-3 text-[12.5px]">
          <p className="text-ink-2">
            Debe: <span className="font-mono font-medium text-ink">{money(totalDebe)}</span>
          </p>
          <p className="text-ink-2">
            Haber: <span className="font-mono font-medium text-ink">{money(totalHaber)}</span>
          </p>
          <p className={diferencia !== 0 ? "text-bad" : "text-good"}>
            Diferencia: <span className="font-mono font-semibold">{money(diferencia)}</span>
          </p>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={eliminarAsiento}
          disabled={loading}
          className="text-[12px] text-bad hover:opacity-80"
        >
          Eliminar asiento
        </button>
        <div className="flex items-center gap-3">
          {error && <p className="text-[12px] text-bad">{error}</p>}
          <Button type="submit" variant="primary" disabled={loading || !balanceado}>
            {loading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>
    </form>
  );
}
