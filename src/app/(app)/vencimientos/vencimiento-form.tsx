"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CONCEPTOS = [
  "IVA",
  "Ganancias",
  "Ingresos Brutos",
  "Monotributo",
  "Cargas Sociales",
  "SICORE",
  "Otro",
];

export default function VencimientoForm({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [concepto, setConcepto] = useState("IVA");
  const [conceptoOtro, setConceptoOtro] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fecha) {
      setError("Ingresá la fecha de vencimiento");
      return;
    }
    setLoading(true);
    setError(null);

    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase.from("vencimientos_impositivos").insert({
      empresa_id: empresaId,
      concepto: concepto === "Otro" ? conceptoOtro || "Otro" : concepto,
      periodo: periodo || null,
      fecha_vencimiento: fecha,
      notas: notas || null,
      creado_por: user.user?.id,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setPeriodo("");
    setFecha("");
    setNotas("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-surface p-4 shadow-sm">
      <h2 className="text-sm font-medium text-ink">Nuevo Vencimiento</h2>
      <div>
        <label className="block text-xs font-medium text-ink-soft">Concepto</label>
        <select
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
        >
          {CONCEPTOS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {concepto === "Otro" && (
        <div>
          <label className="block text-xs font-medium text-ink-soft">Especificar</label>
          <input
            value={conceptoOtro}
            onChange={(e) => setConceptoOtro(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-ink-soft">Período (ej. 07/2026)</label>
        <input
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-soft">Fecha de Vencimiento</label>
        <input
          type="date"
          required
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-soft">Notas</label>
        <input
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent/90 disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
