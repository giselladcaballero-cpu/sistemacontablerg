"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { NaturalezaCuenta, PlanCuenta, TipoCuenta } from "@/lib/types";
import { Row, Td, Badge, type Tone } from "@/components/ui";

const TIPO_TONE: Record<string, Tone> = {
  activo: "accent",
  pasivo: "bad",
  patrimonio_neto: "plum",
  ingreso: "good",
  egreso: "good",
};

export default function PlanCuentaRow({ cuenta }: { cuenta: PlanCuenta }) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(cuenta.nombre);
  const [tipo, setTipo] = useState<TipoCuenta>(cuenta.tipo);
  const [naturaleza, setNaturaleza] = useState<NaturalezaCuenta>(cuenta.naturaleza);
  const [imputable, setImputable] = useState(cuenta.imputable);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("plan_cuentas")
      .update({ nombre, tipo, naturaleza, imputable })
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
    if (!confirm(`¿Eliminar la cuenta "${cuenta.codigo} — ${cuenta.nombre}"?`)) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("plan_cuentas").delete().eq("id", cuenta.id);
    setLoading(false);
    if (error) {
      setError(
        error.code === "23503"
          ? "No se puede eliminar: tiene movimientos o subcuentas asociadas."
          : error.message
      );
      return;
    }
    router.refresh();
  }

  async function reactivar() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("plan_cuentas").update({ activa: true }).eq("id", cuenta.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <tr>
        <td className="px-3 py-2 text-ink-soft">{cuenta.codigo}</td>
        <td className="px-3 py-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-md border border-line px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoCuenta)}
            className="w-full rounded-md border border-line px-2 py-1 text-sm"
          >
            <option value="activo">Activo</option>
            <option value="pasivo">Pasivo</option>
            <option value="patrimonio_neto">Patrimonio neto</option>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </select>
        </td>
        <td className="px-3 py-2">
          <select
            value={naturaleza}
            onChange={(e) => setNaturaleza(e.target.value as NaturalezaCuenta)}
            className="w-full rounded-md border border-line px-2 py-1 text-sm"
          >
            <option value="deudora">Deudora</option>
            <option value="acreedora">Acreedora</option>
          </select>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={imputable} onChange={(e) => setImputable(e.target.checked)} />
            <button onClick={guardar} disabled={loading} className="text-xs font-medium text-accent hover:opacity-80">
              Guardar
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-ink-soft hover:text-ink">
              Cancelar
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <Row>
      <Td mono className={`text-ink-2 ${cuenta.imputable ? "" : "font-semibold"} ${cuenta.activa ? "" : "opacity-50"}`}>
        {cuenta.codigo}
      </Td>
      <Td className={`${cuenta.imputable ? "" : "font-semibold"} ${cuenta.activa ? "" : "opacity-50"}`}>
        <div className="flex items-center gap-2">
          {cuenta.nombre}
          {!cuenta.activa && <Badge tone="muted">Inactiva</Badge>}
        </div>
      </Td>
      <Td className={cuenta.activa ? "" : "opacity-50"}>
        <Badge tone={TIPO_TONE[cuenta.tipo] ?? "muted"}>{cuenta.tipo.replace("_", " ")}</Badge>
      </Td>
      <Td className={`capitalize text-ink-2 ${cuenta.activa ? "" : "opacity-50"}`}>{cuenta.naturaleza}</Td>
      <Td>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-ink-2 ${cuenta.activa ? "" : "opacity-50"}`}>{cuenta.imputable ? "Sí" : "No"}</span>
          <span className="flex shrink-0 gap-2 opacity-0 group-hover:opacity-100">
            {cuenta.activa ? (
              <>
                <button onClick={() => setEditing(true)} className="text-[11px] font-medium text-accent hover:opacity-80">
                  Editar
                </button>
                <button onClick={eliminar} disabled={loading} className="text-[11px] text-bad hover:opacity-80">
                  Eliminar
                </button>
              </>
            ) : (
              <button onClick={reactivar} disabled={loading} className="text-[11px] font-medium text-accent hover:opacity-80">
                Reactivar
              </button>
            )}
          </span>
        </div>
      </Td>
    </Row>
  );
}
