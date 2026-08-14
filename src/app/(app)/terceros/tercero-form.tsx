"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CondicionIva, TipoTercero } from "@/lib/types";

export default function TerceroForm({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [razonSocial, setRazonSocial] = useState("");
  const [tipo, setTipo] = useState<TipoTercero>("cliente");
  const [cuit, setCuit] = useState("");
  const [condicionIva, setCondicionIva] = useState<CondicionIva>("consumidor_final");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("terceros").insert({
      empresa_id: empresaId,
      razon_social: razonSocial,
      tipo,
      cuit: cuit || null,
      condicion_iva: condicionIva,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setRazonSocial("");
    setCuit("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-surface p-4 shadow-sm">
      <h2 className="text-sm font-medium text-ink">Nuevo</h2>
      <div>
        <label className="block text-xs font-medium text-ink-soft">Razón Social</label>
        <input
          required
          value={razonSocial}
          onChange={(e) => setRazonSocial(e.target.value)}
          className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-soft">Tipo</label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoTercero)}
          className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
        >
          <option value="cliente">Cliente</option>
          <option value="proveedor">Proveedor</option>
          <option value="ambos">Ambos</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-soft">CUIT</label>
        <input
          value={cuit}
          onChange={(e) => setCuit(e.target.value)}
          className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-soft">Condición IVA</label>
        <select
          value={condicionIva}
          onChange={(e) => setCondicionIva(e.target.value as CondicionIva)}
          className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
        >
          <option value="responsable_inscripto">Responsable Inscripto</option>
          <option value="monotributo">Monotributo</option>
          <option value="exento">Exento</option>
          <option value="consumidor_final">Consumidor Final</option>
          <option value="no_categorizado">No Categorizado</option>
        </select>
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
