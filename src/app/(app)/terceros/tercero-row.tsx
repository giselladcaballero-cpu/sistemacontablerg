"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CondicionIva, TipoTercero } from "@/lib/types";
import { TASAS_IIBB } from "@/lib/iibb";
import { Row, Td } from "@/components/ui";

interface Cuenta {
  id: string;
  codigo: string;
  nombre: string;
}

interface Tercero {
  id: string;
  numero: number;
  razon_social: string;
  tipo: TipoTercero;
  cuit: string | null;
  condicion_iva: CondicionIva;
  categoria: string | null;
  cuenta_gasto_id: string | null;
  cuenta_pasivo_id: string | null;
  sujeto_retencion_iibb: boolean;
  tasa_retencion_iibb: number;
  sujeto_retencion_iva: boolean;
  tasa_retencion_iva: number;
  sujeto_retencion_ganancias: boolean;
  inscripto_ganancias: boolean;
  tasa_retencion_ganancias: number;
  sujeto_retencion_suss: boolean;
  tasa_retencion_suss: number;
}

export default function TerceroRow({ tercero, cuentas }: { tercero: Tercero; cuentas: Cuenta[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [editandoRetenciones, setEditandoRetenciones] = useState(false);

  const [razonSocial, setRazonSocial] = useState(tercero.razon_social);
  const [tipo, setTipo] = useState<TipoTercero>(tercero.tipo);
  const [cuit, setCuit] = useState(tercero.cuit ?? "");
  const [condicionIva, setCondicionIva] = useState<CondicionIva>(tercero.condicion_iva);
  const [categoria, setCategoria] = useState(tercero.categoria ?? "");
  const [cuentaGastoId, setCuentaGastoId] = useState(tercero.cuenta_gasto_id ?? "");
  const [cuentaPasivoId, setCuentaPasivoId] = useState(tercero.cuenta_pasivo_id ?? "");

  const [sujetoIibb, setSujetoIibb] = useState(tercero.sujeto_retencion_iibb);
  const [tasaIibb, setTasaIibb] = useState(tercero.tasa_retencion_iibb);
  const [sujetoIva, setSujetoIva] = useState(tercero.sujeto_retencion_iva);
  const [tasaIva, setTasaIva] = useState(tercero.tasa_retencion_iva);
  const [sujetoGanancias, setSujetoGanancias] = useState(tercero.sujeto_retencion_ganancias);
  const [inscriptoGanancias, setInscriptoGanancias] = useState(tercero.inscripto_ganancias);
  const [tasaGanancias, setTasaGanancias] = useState(tercero.tasa_retencion_ganancias);
  const [sujetoSuss, setSujetoSuss] = useState(tercero.sujeto_retencion_suss);
  const [tasaSuss, setTasaSuss] = useState(tercero.tasa_retencion_suss);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardarBasico() {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("terceros")
      .update({
        razon_social: razonSocial,
        tipo,
        cuit: cuit || null,
        condicion_iva: condicionIva,
        categoria: categoria || null,
        cuenta_gasto_id: cuentaGastoId || null,
        cuenta_pasivo_id: cuentaPasivoId || null,
      })
      .eq("id", tercero.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function guardarRetenciones() {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("terceros")
      .update({
        sujeto_retencion_iibb: sujetoIibb,
        tasa_retencion_iibb: tasaIibb,
        sujeto_retencion_iva: sujetoIva,
        tasa_retencion_iva: tasaIva,
        sujeto_retencion_ganancias: sujetoGanancias,
        inscripto_ganancias: inscriptoGanancias,
        tasa_retencion_ganancias: tasaGanancias,
        sujeto_retencion_suss: sujetoSuss,
        tasa_retencion_suss: tasaSuss,
      })
      .eq("id", tercero.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditandoRetenciones(false);
    router.refresh();
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar a "${tercero.razon_social}"?`)) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("terceros").delete().eq("id", tercero.id);
    setLoading(false);
    if (error) {
      setError(
        error.code === "23503"
          ? "No se puede eliminar: tiene comprobantes asociados."
          : error.message
      );
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <tr>
        <td className="px-3 py-2 text-ink-soft">{tercero.numero}</td>
        <td className="px-3 py-2">
          <input
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
            className="w-full rounded-md border border-line px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoTercero)}
            className="w-full rounded-md border border-line px-2 py-1 text-sm"
          >
            <option value="cliente">Cliente</option>
            <option value="proveedor">Proveedor</option>
            <option value="ambos">Ambos</option>
          </select>
        </td>
        <td className="px-3 py-2">
          <input
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            className="w-full rounded-md border border-line px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <select
            value={condicionIva}
            onChange={(e) => setCondicionIva(e.target.value as CondicionIva)}
            className="w-full rounded-md border border-line px-2 py-1 text-sm"
          >
            <option value="responsable_inscripto">Responsable Inscripto</option>
            <option value="monotributo">Monotributo</option>
            <option value="exento">Exento</option>
            <option value="consumidor_final">Consumidor Final</option>
            <option value="no_categorizado">No Categorizado</option>
          </select>
        </td>
        <td className="px-3 py-2">
          <input
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full rounded-md border border-line px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <div className="flex flex-col gap-1">
            <select
              value={cuentaGastoId}
              onChange={(e) => setCuentaGastoId(e.target.value)}
              className="w-full rounded-md border border-line px-2 py-1 text-xs"
            >
              <option value="">Cuenta gasto/activo...</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} — {c.nombre}
                </option>
              ))}
            </select>
            <select
              value={cuentaPasivoId}
              onChange={(e) => setCuentaPasivoId(e.target.value)}
              className="w-full rounded-md border border-line px-2 py-1 text-xs"
            >
              <option value="">Cuenta pasivo...</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} — {c.nombre}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={guardarBasico} disabled={loading} className="text-xs font-medium text-accent hover:opacity-80">
                Guardar
              </button>
              <button onClick={() => setEditing(false)} className="text-xs text-ink-soft hover:text-ink">
                Cancelar
              </button>
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <Row>
        <Td mono className="text-ink-2">
          {tercero.numero}
        </Td>
        <Td>{tercero.razon_social}</Td>
        <Td className="capitalize text-ink-2">{tercero.tipo}</Td>
        <Td className="text-ink-2">{tercero.cuit ?? "-"}</Td>
        <Td className="text-ink-2">{tercero.condicion_iva}</Td>
        <Td className="text-ink-2">{tercero.categoria ?? "-"}</Td>
        <Td right>
          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100">
            <button
              onClick={() => setEditandoRetenciones((v) => !v)}
              className="text-[11px] font-medium text-accent hover:opacity-80"
            >
              Retenciones
            </button>
            <button onClick={() => setEditing(true)} className="text-[11px] font-medium text-accent hover:opacity-80">
              Editar
            </button>
            <button onClick={eliminar} disabled={loading} className="text-[11px] text-bad hover:opacity-80">
              Eliminar
            </button>
          </div>
        </Td>
      </Row>
      {editandoRetenciones && (
        <tr>
          <td colSpan={7} className="bg-bg px-3 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  <input type="checkbox" checked={sujetoIibb} onChange={(e) => setSujetoIibb(e.target.checked)} />
                  Retención IIBB
                </label>
                {sujetoIibb && (
                  <select
                    value={tasaIibb}
                    onChange={(e) => setTasaIibb(Number(e.target.value))}
                    className="w-full rounded-md border border-line px-2 py-1 text-sm"
                  >
                    <option value={0}>Elegir tasa...</option>
                    {TASAS_IIBB.map((t) => (
                      <option key={t} value={t}>
                        {t}%
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  <input type="checkbox" checked={sujetoIva} onChange={(e) => setSujetoIva(e.target.checked)} />
                  Retención IVA
                </label>
                {sujetoIva && (
                  <input
                    type="number"
                    step="0.01"
                    value={tasaIva}
                    onChange={(e) => setTasaIva(Number(e.target.value))}
                    placeholder="Tasa %"
                    className="w-full rounded-md border border-line px-2 py-1 text-sm"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    checked={sujetoGanancias}
                    onChange={(e) => setSujetoGanancias(e.target.checked)}
                  />
                  Retención Ganancias
                </label>
                {sujetoGanancias && (
                  <>
                    <label className="flex items-center gap-2 text-xs text-ink-soft">
                      <input
                        type="checkbox"
                        checked={inscriptoGanancias}
                        onChange={(e) => setInscriptoGanancias(e.target.checked)}
                      />
                      Inscripto en Ganancias
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={tasaGanancias}
                      onChange={(e) => setTasaGanancias(Number(e.target.value))}
                      placeholder="Tasa %"
                      className="w-full rounded-md border border-line px-2 py-1 text-sm"
                    />
                  </>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  <input type="checkbox" checked={sujetoSuss} onChange={(e) => setSujetoSuss(e.target.checked)} />
                  Retención SUSS
                </label>
                {sujetoSuss && (
                  <input
                    type="number"
                    step="0.01"
                    value={tasaSuss}
                    onChange={(e) => setTasaSuss(Number(e.target.value))}
                    placeholder="Tasa %"
                    className="w-full rounded-md border border-line px-2 py-1 text-sm"
                  />
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={guardarRetenciones}
                disabled={loading}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink hover:bg-accent/90"
              >
                {loading ? "Guardando..." : "Guardar retenciones"}
              </button>
              <button
                onClick={() => setEditandoRetenciones(false)}
                className="text-xs text-ink-soft hover:text-ink"
              >
                Cancelar
              </button>
              {error && <p className="text-xs text-danger">{error}</p>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
