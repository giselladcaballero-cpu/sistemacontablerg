"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Factura {
  comprobante_id: string;
  tercero_id: string;
  razon_social: string;
  cuit: string | null;
  tipo: string;
  punto_venta: number;
  numero: number | null;
  fecha: string;
  total: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
}

export default function OrdenPagoForm({
  empresaId,
  facturas,
  cuentas,
  userId,
  agente,
}: {
  empresaId: string;
  facturas: Factura[];
  cuentas: { id: string; nombre: string }[];
  userId: string | null;
  agente: { iva: boolean; ganancias: boolean; iibb: boolean; suss: boolean };
}) {
  const router = useRouter();
  const supabase = createClient();

  const proveedores = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of facturas) map.set(f.tercero_id, f.razon_social);
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [facturas]);

  const [terceroId, setTerceroId] = useState("");
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [cuentaBancariaId, setCuentaBancariaId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [retencionIva, setRetencionIva] = useState(0);
  const [retencionGanancias, setRetencionGanancias] = useState(0);
  const [retencionIibb, setRetencionIibb] = useState(0);
  const [retencionSuss, setRetencionSuss] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const facturasDelProveedor = facturas.filter((f) => f.tercero_id === terceroId);
  const total = facturasDelProveedor
    .filter((f) => seleccionadas.has(f.comprobante_id))
    .reduce((s, f) => s + Number(f.total), 0);
  const neto = total - retencionIva - retencionGanancias - retencionIibb - retencionSuss;

  function toggleFactura(id: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function cambiarProveedor(id: string) {
    setTerceroId(id);
    setSeleccionadas(new Set());
    setRetencionIva(0);
    setRetencionGanancias(0);
    setRetencionIibb(0);
    setRetencionSuss(0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!terceroId || seleccionadas.size === 0) {
      setError("Elegí un proveedor y al menos una factura");
      return;
    }
    if (!cuentaBancariaId) {
      setError("Elegí de qué cuenta sale el pago");
      return;
    }

    setLoading(true);

    const { data: orden, error: ordenError } = await supabase
      .from("ordenes_pago")
      .insert({
        empresa_id: empresaId,
        tercero_id: terceroId,
        cuenta_bancaria_id: cuentaBancariaId,
        fecha,
        retencion_iva: retencionIva,
        retencion_ganancias: retencionGanancias,
        retencion_iibb: retencionIibb,
        retencion_suss: retencionSuss,
        creado_por: userId,
      })
      .select()
      .single();

    if (ordenError || !orden) {
      setError(ordenError?.message ?? "Error al crear la orden de pago");
      setLoading(false);
      return;
    }

    const items = facturasDelProveedor
      .filter((f) => seleccionadas.has(f.comprobante_id))
      .map((f) => ({
        orden_pago_id: orden.id,
        comprobante_id: f.comprobante_id,
        importe: f.total,
      }));

    const { error: itemsError } = await supabase.from("orden_pago_items").insert(items);
    if (itemsError) {
      setError(itemsError.message);
      setLoading(false);
      return;
    }

    const { error: confirmError } = await supabase
      .from("ordenes_pago")
      .update({ estado: "confirmada" })
      .eq("id", orden.id);

    setLoading(false);
    if (confirmError) {
      setError(confirmError.message);
      return;
    }

    router.push("/ordenes-pago");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 rounded-lg border bg-surface p-4 shadow-sm sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-ink-soft">Proveedor</label>
          <select
            value={terceroId}
            onChange={(e) => cambiarProveedor(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          >
            <option value="">Seleccionar...</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">Pagar desde</label>
          <select
            value={cuentaBancariaId}
            onChange={(e) => setCuentaBancariaId(e.target.value)}
            className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
          >
            <option value="">Seleccionar cuenta...</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {terceroId && (
        <div className="rounded-lg border bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-ink">Facturas pendientes</h2>
          {facturasDelProveedor.length === 0 ? (
            <p className="text-sm text-ink-soft">Este proveedor no tiene facturas pendientes.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-ink-soft">
                  <th className="w-8"></th>
                  <th className="py-1 pr-4">Comprobante</th>
                  <th className="py-1 pr-4">Fecha</th>
                  <th className="py-1 pr-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {facturasDelProveedor.map((f) => (
                  <tr key={f.comprobante_id} className="border-t border-line">
                    <td className="py-1.5">
                      <input
                        type="checkbox"
                        checked={seleccionadas.has(f.comprobante_id)}
                        onChange={() => toggleFactura(f.comprobante_id)}
                      />
                    </td>
                    <td className="py-1.5 pr-4 uppercase text-ink">
                      {f.tipo.replace("_", " ")} {f.punto_venta.toString().padStart(4, "0")}-
                      {(f.numero ?? 0).toString().padStart(8, "0")}
                    </td>
                    <td className="py-1.5 pr-4 text-ink-soft">{f.fecha}</td>
                    <td className="py-1.5 pr-4 text-right text-ink">{fmt(Number(f.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {seleccionadas.size > 0 && !agente.iva && !agente.ganancias && !agente.iibb && !agente.suss && (
        <p className="text-sm text-ink-soft">
          Tu empresa no está marcada como agente de retención en el{" "}
          <a href="/perfil" className="text-accent hover:opacity-80">
            Perfil del Cliente
          </a>
          , así que no se practican retenciones en este pago.
        </p>
      )}

      {seleccionadas.size > 0 && (agente.iva || agente.ganancias || agente.iibb || agente.suss) && (
        <div className="rounded-lg border bg-surface p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-medium text-ink">Retenciones</h2>
          <p className="mb-3 text-xs text-ink-soft">
            Las alícuotas reales dependen de la categoría del proveedor ante AFIP/ARBA. Estos botones
            solo sugieren un monto sobre el total — revisalo antes de confirmar.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {agente.iva && (
              <div>
                <label className="block text-xs font-medium text-ink-soft">Retención IVA</label>
                <div className="mt-1 flex gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={retencionIva}
                    onChange={(e) => setRetencionIva(Number(e.target.value))}
                    className="w-full rounded-md border border-line px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="mt-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setRetencionIva(Math.round(total * 0.21 * 100) / 100)}
                    className="text-xs text-accent hover:opacity-80"
                  >
                    21%
                  </button>
                  <button
                    type="button"
                    onClick={() => setRetencionIva(Math.round(total * 0.105 * 100) / 100)}
                    className="text-xs text-accent hover:opacity-80"
                  >
                    10.5%
                  </button>
                </div>
              </div>
            )}
            {agente.ganancias && (
              <div>
                <label className="block text-xs font-medium text-ink-soft">Retención Ganancias</label>
                <input
                  type="number"
                  step="0.01"
                  value={retencionGanancias}
                  onChange={(e) => setRetencionGanancias(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setRetencionGanancias(Math.round(total * 0.02 * 100) / 100)}
                  className="mt-1 text-xs text-accent hover:opacity-80"
                >
                  2%
                </button>
              </div>
            )}
            {agente.iibb && (
              <div>
                <label className="block text-xs font-medium text-ink-soft">Retención IIBB</label>
                <input
                  type="number"
                  step="0.01"
                  value={retencionIibb}
                  onChange={(e) => setRetencionIibb(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setRetencionIibb(Math.round(total * 0.03 * 100) / 100)}
                  className="mt-1 text-xs text-accent hover:opacity-80"
                >
                  3%
                </button>
              </div>
            )}
            {agente.suss && (
              <div>
                <label className="block text-xs font-medium text-ink-soft">Retención SUSS</label>
                <input
                  type="number"
                  step="0.01"
                  value={retencionSuss}
                  onChange={(e) => setRetencionSuss(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setRetencionSuss(Math.round(total * 0.025 * 100) / 100)}
                  className="mt-1 text-xs text-accent hover:opacity-80"
                >
                  2.5%
                </button>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-6 border-t pt-3 text-sm">
            <p>
              Total facturas: <span className="font-medium">{fmt(total)}</span>
            </p>
            <p>
              Retenciones:{" "}
              <span className="font-medium">
                {fmt(retencionIva + retencionGanancias + retencionIibb + retencionSuss)}
              </span>
            </p>
            <p>
              Neto a pagar: <span className="font-semibold">{fmt(neto)}</span>
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading || seleccionadas.size === 0}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Generando..." : "Confirmar Orden de Pago"}
        </button>
      </div>
    </form>
  );
}
