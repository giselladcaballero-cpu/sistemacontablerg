"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CuentaBancariaForm({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [nombre, setNombre] = useState("");
  const [banco, setBanco] = useState("");
  const [saldoInicial, setSaldoInicial] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("cuentas_bancarias").insert({
      empresa_id: empresaId,
      nombre,
      banco: banco || null,
      saldo_inicial: saldoInicial,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNombre("");
    setBanco("");
    setSaldoInicial(0);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-surface p-4 shadow-sm">
      <h2 className="text-sm font-medium text-ink">Nueva Cuenta / Caja</h2>
      <div>
        <label className="block text-xs font-medium text-ink-soft">Nombre</label>
        <input
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-soft">Banco</label>
        <input
          value={banco}
          onChange={(e) => setBanco(e.target.value)}
          className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-soft">Saldo Inicial</label>
        <input
          type="number"
          step="0.01"
          value={saldoInicial}
          onChange={(e) => setSaldoInicial(Number(e.target.value))}
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
