"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Input, Button } from "@/components/ui";

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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-[10px] border border-line bg-surface p-[1.15rem]">
      <h2 className="text-[12px] font-medium uppercase tracking-[.07em] text-ink-2">Nueva Cuenta / Caja</h2>
      <Field label="Nombre">
        <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} className="normal-case" />
      </Field>
      <Field label="Banco">
        <Input value={banco} onChange={(e) => setBanco(e.target.value)} className="normal-case" />
      </Field>
      <Field label="Saldo Inicial">
        <Input
          type="number"
          step="0.01"
          value={saldoInicial}
          onChange={(e) => setSaldoInicial(Number(e.target.value))}
          className="normal-case"
        />
      </Field>
      {error && <p className="text-[11px] text-bad">{error}</p>}
      <Button type="submit" variant="primary" disabled={loading} className="w-full">
        {loading ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
