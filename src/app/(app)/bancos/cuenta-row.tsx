"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CuentaBancaria } from "@/lib/types";

export default function CuentaBancariaRow({ cuenta }: { cuenta: CuentaBancaria }) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(cuenta.nombre);
  const [banco, setBanco] = useState(cuenta.banco ?? "");
  const [saldoInicial, setSaldoInicial] = useState(cuenta.saldo_inicial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("cuentas_bancarias")
      .update({ nombre, banco: banco || null, saldo_inicial: saldoInicial })
      .eq("id", cuenta.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar la cuenta "${cuenta.nombre}"?`)) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("cuentas_bancarias").delete().eq("id", cuenta.id);
    setLoading(false);
    if (error) {
      setError(
        error.code === "23503"
          ? "No se puede eliminar: tiene movimientos cargados."
          : error.message
      );
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-md border border-line p-2.5">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full rounded-md border border-line px-2 py-1 text-sm"
          placeholder="Nombre"
        />
        <input
          value={banco}
          onChange={(e) => setBanco(e.target.value)}
          className="w-full rounded-md border border-line px-2 py-1 text-sm"
          placeholder="Banco"
        />
        <input
          type="number"
          step="0.01"
          value={saldoInicial}
          onChange={(e) => setSaldoInicial(Number(e.target.value))}
          className="w-full rounded-md border border-line px-2 py-1 text-sm"
          placeholder="Saldo inicial"
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-3">
          <button onClick={guardar} disabled={loading} className="text-xs font-medium text-accent hover:opacity-80">
            Guardar
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-ink-soft hover:text-ink">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center justify-between rounded-md border border-line px-2.5 py-2 text-sm">
      <div>
        <p className="text-ink">{cuenta.nombre}</p>
        <p className="text-xs text-ink-soft">{cuenta.banco ?? "—"}</p>
      </div>
      <div className="flex shrink-0 gap-2 opacity-0 group-hover:opacity-100">
        <button onClick={() => setEditing(true)} className="text-xs font-medium text-accent hover:opacity-80">
          Editar
        </button>
        <button onClick={eliminar} disabled={loading} className="text-xs text-danger hover:opacity-80">
          Eliminar
        </button>
      </div>
    </div>
  );
}
