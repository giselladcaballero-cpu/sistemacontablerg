"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Input, Select, Button } from "@/components/ui";

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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-[10px] border border-line bg-surface p-[1.15rem]">
      <h2 className="text-[12px] font-medium uppercase tracking-[.07em] text-ink-2">Nuevo Movimiento</h2>
      <Field label="Cuenta">
        <Select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className="w-full normal-case">
          <option value="">Seleccionar...</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Fecha">
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full normal-case" />
      </Field>
      <Field label="Descripción">
        <Input required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full normal-case" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as "ingreso" | "egreso")} className="w-full normal-case">
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </Select>
        </Field>
        <Field label="Importe">
          <Input
            type="number"
            step="0.01"
            value={importe}
            onChange={(e) => setImporte(Number(e.target.value))}
            className="w-full normal-case"
          />
        </Field>
      </div>
      {error && <p className="text-[11px] text-bad">{error}</p>}
      <Button type="submit" variant="primary" disabled={loading} className="w-full">
        {loading ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
