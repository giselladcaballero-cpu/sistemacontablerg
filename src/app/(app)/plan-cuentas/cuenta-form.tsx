"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { NaturalezaCuenta, TipoCuenta } from "@/lib/types";

interface CuentaOption {
  id: string;
  codigo: string;
  nombre: string;
}

export default function PlanCuentaForm({
  empresaId,
  cuentas,
}: {
  empresaId: string;
  cuentas: CuentaOption[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoCuenta>("egreso");
  const [naturaleza, setNaturaleza] = useState<NaturalezaCuenta>("deudora");
  const [padreId, setPadreId] = useState("");
  const [imputable, setImputable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("plan_cuentas").insert({
      empresa_id: empresaId,
      codigo,
      nombre,
      tipo,
      naturaleza,
      cuenta_padre_id: padreId || null,
      imputable,
    });
    setLoading(false);
    if (error) {
      setError(error.code === "23505" ? "Ya existe una cuenta con ese código." : error.message);
      return;
    }
    setCodigo("");
    setNombre("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-surface p-4 shadow-sm">
      <h2 className="text-sm font-medium text-ink">Agregar cuenta</h2>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-ink-soft">Código</label>
          <input
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="5.2.05"
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Nombre</label>
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-ink-soft">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoCuenta)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          >
            <option value="activo">Activo</option>
            <option value="pasivo">Pasivo</option>
            <option value="patrimonio_neto">Patrimonio Neto</option>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Naturaleza</label>
          <select
            value={naturaleza}
            onChange={(e) => setNaturaleza(e.target.value as NaturalezaCuenta)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          >
            <option value="deudora">Deudora</option>
            <option value="acreedora">Acreedora</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-soft">Cuenta padre (opcional)</label>
        <select
          value={padreId}
          onChange={(e) => setPadreId(e.target.value)}
          className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
        >
          <option value="">Sin cuenta padre</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} — {c.nombre}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={imputable} onChange={(e) => setImputable(e.target.checked)} />
        Imputable (se pueden cargar movimientos directamente)
      </label>
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent/90 disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Agregar cuenta"}
      </button>
    </form>
  );
}
