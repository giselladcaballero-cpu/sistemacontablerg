"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MovimientoForm({ cuentas }: { cuentas: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [cuentaId, setCuentaId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [descripcion, setDescripcion] = useState("");
  const [importe, setImporte] = useState(0);
  const [tipo, setTipo] = useState<"ingreso" | "egreso">("egreso");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cuentaId) {
      setError("Elegí una cuenta");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("movimientos_bancarios").insert({
      cuenta_bancaria_id: cuentaId,
      fecha,
      descripcion,
      importe,
      tipo,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDescripcion("");
    setImporte(0);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="text-sm font-medium text-gray-900">Nuevo Movimiento</h2>
      <div>
        <label className="block text-xs font-medium text-gray-600">Cuenta</label>
        <select
          value={cuentaId}
          onChange={(e) => setCuentaId(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">Seleccionar...</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600">Fecha</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600">Descripción</label>
        <input
          required
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "ingreso" | "egreso")}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Importe</label>
          <input
            type="number"
            step="0.01"
            value={importe}
            onChange={(e) => setImporte(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
