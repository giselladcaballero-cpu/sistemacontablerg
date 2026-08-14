"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Linea {
  cuentaId: string;
  terceroId: string;
  debe: number;
  haber: number;
}

export default function AsientoForm({
  empresaId,
  cuentas,
  terceros,
}: {
  empresaId: string;
  cuentas: { id: string; codigo: string; nombre: string }[];
  terceros: { id: string; razon_social: string }[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [descripcion, setDescripcion] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([
    { cuentaId: "", terceroId: "", debe: 0, haber: 0 },
    { cuentaId: "", terceroId: "", debe: 0, haber: 0 },
  ]);
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: asiento, error: asientoError } = await supabase
      .from("asientos")
      .insert({ empresa_id: empresaId, fecha, descripcion, origen: "manual", creado_por: user?.id })
      .select()
      .single();

    if (asientoError || !asiento) {
      setError(asientoError?.message ?? "Error al crear el asiento");
      setLoading(false);
      return;
    }

    const { error: lineasError } = await supabase.from("asiento_lineas").insert(
      lineas.map((l) => ({
        asiento_id: asiento.id,
        cuenta_id: l.cuentaId,
        tercero_id: l.terceroId || null,
        debe: l.debe || 0,
        haber: l.haber || 0,
      }))
    );

    setLoading(false);
    if (lineasError) {
      setError(lineasError.message);
      return;
    }

    router.push("/contabilidad");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 rounded-lg border bg-surface p-4 shadow-sm sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-ink-soft">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Descripción</label>
          <input
            required
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">Líneas</h2>
          <button type="button" onClick={addLinea} className="text-sm text-ink-soft hover:text-ink">
            + Agregar línea
          </button>
        </div>
        <div className="space-y-2">
          {lineas.map((l, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <select
                value={l.cuentaId}
                onChange={(e) => updateLinea(idx, { cuentaId: e.target.value })}
                className="col-span-4 rounded-md border border-line px-2 py-1.5 text-sm"
              >
                <option value="">Cuenta...</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.nombre}
                  </option>
                ))}
              </select>
              <select
                value={l.terceroId}
                onChange={(e) => updateLinea(idx, { terceroId: e.target.value })}
                className="col-span-3 rounded-md border border-line px-2 py-1.5 text-sm"
              >
                <option value="">Tercero (opcional)</option>
                {terceros.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.razon_social}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Debe"
                value={l.debe || ""}
                onChange={(e) => updateLinea(idx, { debe: Number(e.target.value), haber: 0 })}
                className="col-span-2 rounded-md border border-line px-2 py-1.5 text-right text-sm"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Haber"
                value={l.haber || ""}
                onChange={(e) => updateLinea(idx, { haber: Number(e.target.value), debe: 0 })}
                className="col-span-2 rounded-md border border-line px-2 py-1.5 text-right text-sm"
              />
              <button
                type="button"
                onClick={() => removeLinea(idx)}
                disabled={lineas.length <= 2}
                className="col-span-1 text-sm text-danger hover:opacity-80 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-6 border-t pt-3 text-sm">
          <p>
            Debe: <span className="font-medium">{totalDebe.toFixed(2)}</span>
          </p>
          <p>
            Haber: <span className="font-medium">{totalHaber.toFixed(2)}</span>
          </p>
          <p className={diferencia !== 0 ? "text-danger" : "text-accent"}>
            Diferencia: <span className="font-semibold">{diferencia.toFixed(2)}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading || !balanceado}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar Asiento"}
        </button>
      </div>
    </form>
  );
}
