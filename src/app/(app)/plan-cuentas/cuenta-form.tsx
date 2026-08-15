"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { NaturalezaCuenta, TipoCuenta } from "@/lib/types";
import { Field, Input, Select, Button } from "@/components/ui";

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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-[10px] border border-line bg-surface p-[1.15rem]">
      <h2 className="text-[12px] font-medium uppercase tracking-[.07em] text-ink-2">Agregar cuenta</h2>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Código">
          <Input required value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="5.2.05" className="w-full normal-case" />
        </Field>
        <Field label="Nombre">
          <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full normal-case" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCuenta)} className="w-full normal-case">
            <option value="activo">Activo</option>
            <option value="pasivo">Pasivo</option>
            <option value="patrimonio_neto">Patrimonio Neto</option>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </Select>
        </Field>
        <Field label="Naturaleza">
          <Select value={naturaleza} onChange={(e) => setNaturaleza(e.target.value as NaturalezaCuenta)} className="w-full normal-case">
            <option value="deudora">Deudora</option>
            <option value="acreedora">Acreedora</option>
          </Select>
        </Field>
      </div>
      <Field label="Cuenta padre (opcional)">
        <Select value={padreId} onChange={(e) => setPadreId(e.target.value)} className="w-full normal-case">
          <option value="">Sin cuenta padre</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} — {c.nombre}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-[12px] text-ink-2">
        <input type="checkbox" checked={imputable} onChange={(e) => setImputable(e.target.checked)} />
        Imputable (se pueden cargar movimientos directamente)
      </label>
      {error && <p className="text-[11px] text-bad">{error}</p>}
      <Button type="submit" variant="primary" disabled={loading} className="w-full">
        {loading ? "Guardando..." : "Agregar cuenta"}
      </Button>
    </form>
  );
}
