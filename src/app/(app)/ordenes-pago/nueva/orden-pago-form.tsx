"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Field, Input, Select, Button, Table, Th, pesos } from "@/components/ui";

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
  sujeto_retencion_iibb: boolean;
  tasa_retencion_iibb: number;
  sujeto_retencion_iva: boolean;
  tasa_retencion_iva: number;
  sujeto_retencion_ganancias: boolean;
  tasa_retencion_ganancias: number;
  sujeto_retencion_suss: boolean;
  tasa_retencion_suss: number;
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
  const proveedorInfo = facturasDelProveedor[0];
  const total = facturasDelProveedor
    .filter((f) => seleccionadas.has(f.comprobante_id))
    .reduce((s, f) => s + Number(f.total), 0);
  const neto = total - retencionIva - retencionGanancias - retencionIibb - retencionSuss;

  const muestraIva = agente.iva && !!proveedorInfo?.sujeto_retencion_iva;
  const muestraGanancias = agente.ganancias && !!proveedorInfo?.sujeto_retencion_ganancias;
  const muestraIibb = agente.iibb && !!proveedorInfo?.sujeto_retencion_iibb;
  const muestraSuss = agente.suss && !!proveedorInfo?.sujeto_retencion_suss;

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <div className="grid grid-cols-1 gap-4 p-[1.15rem] sm:grid-cols-3">
          <Field label="Proveedor">
            <Select value={terceroId} onChange={(e) => cambiarProveedor(e.target.value)} className="w-full normal-case">
              <option value="">Seleccionar...</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full normal-case" />
          </Field>
          <Field label="Pagar desde">
            <Select value={cuentaBancariaId} onChange={(e) => setCuentaBancariaId(e.target.value)} className="w-full normal-case">
              <option value="">Seleccionar cuenta...</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {terceroId && (
        <Card title="Facturas pendientes">
          {facturasDelProveedor.length === 0 ? (
            <p className="p-[1.15rem] text-[12.5px] text-ink-2">Este proveedor no tiene facturas pendientes.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{""}</Th>
                  <Th>Comprobante</Th>
                  <Th>Fecha</Th>
                  <Th right>Total</Th>
                </tr>
              </thead>
              <tbody>
                {facturasDelProveedor.map((f) => (
                  <tr key={f.comprobante_id} className="border-b border-line hover:bg-accent/5">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={seleccionadas.has(f.comprobante_id)}
                        onChange={() => toggleFactura(f.comprobante_id)}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] uppercase text-ink">
                      {f.tipo.replace("_", " ")} {f.punto_venta.toString().padStart(4, "0")}-
                      {(f.numero ?? 0).toString().padStart(8, "0")}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-ink-2">{f.fecha}</td>
                    <td className="px-3 py-2 text-right font-mono text-[11.5px] text-ink">{pesos(Number(f.total))}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {seleccionadas.size > 0 && !muestraIva && !muestraGanancias && !muestraIibb && !muestraSuss && (
        <p className="text-[12.5px] text-ink-2">
          No corresponde practicar retenciones en este pago: o tu empresa no es agente de retención
          (revisá el{" "}
          <a href="/perfil" className="text-accent hover:opacity-80">
            Perfil del Cliente
          </a>
          ), o este proveedor no está marcado como sujeto a retención (revisá su ficha en{" "}
          <a href="/terceros" className="text-accent hover:opacity-80">
            Clientes / Proveedores
          </a>
          ).
        </p>
      )}

      {seleccionadas.size > 0 && (muestraIva || muestraGanancias || muestraIibb || muestraSuss) && (
        <Card title="Retenciones">
          <div className="p-[1.15rem]">
            <p className="mb-3 text-[11px] text-ink-2">
              Alícuotas configuradas en la ficha de este proveedor — revisalas antes de confirmar.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {muestraIva && (
                <Field label="Retención IVA">
                  <Input
                    type="number"
                    step="0.01"
                    value={retencionIva}
                    onChange={(e) => setRetencionIva(Number(e.target.value))}
                    className="w-full normal-case"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRetencionIva(Math.round(total * (proveedorInfo.tasa_retencion_iva / 100) * 100) / 100)
                    }
                    className="mt-1 text-left text-[11px] normal-case text-accent hover:opacity-80"
                  >
                    Aplicar {proveedorInfo.tasa_retencion_iva}%
                  </button>
                </Field>
              )}
              {muestraGanancias && (
                <Field label="Retención Ganancias">
                  <Input
                    type="number"
                    step="0.01"
                    value={retencionGanancias}
                    onChange={(e) => setRetencionGanancias(Number(e.target.value))}
                    className="w-full normal-case"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRetencionGanancias(
                        Math.round(total * (proveedorInfo.tasa_retencion_ganancias / 100) * 100) / 100
                      )
                    }
                    className="mt-1 text-left text-[11px] normal-case text-accent hover:opacity-80"
                  >
                    Aplicar {proveedorInfo.tasa_retencion_ganancias}%
                  </button>
                </Field>
              )}
              {muestraIibb && (
                <Field label="Retención IIBB">
                  <Input
                    type="number"
                    step="0.01"
                    value={retencionIibb}
                    onChange={(e) => setRetencionIibb(Number(e.target.value))}
                    className="w-full normal-case"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRetencionIibb(Math.round(total * (proveedorInfo.tasa_retencion_iibb / 100) * 100) / 100)
                    }
                    className="mt-1 text-left text-[11px] normal-case text-accent hover:opacity-80"
                  >
                    Aplicar {proveedorInfo.tasa_retencion_iibb}%
                  </button>
                </Field>
              )}
              {muestraSuss && (
                <Field label="Retención SUSS">
                  <Input
                    type="number"
                    step="0.01"
                    value={retencionSuss}
                    onChange={(e) => setRetencionSuss(Number(e.target.value))}
                    className="w-full normal-case"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRetencionSuss(Math.round(total * (proveedorInfo.tasa_retencion_suss / 100) * 100) / 100)
                    }
                    className="mt-1 text-left text-[11px] normal-case text-accent hover:opacity-80"
                  >
                    Aplicar {proveedorInfo.tasa_retencion_suss}%
                  </button>
                </Field>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-6 border-t border-line pt-3 text-[12.5px]">
              <p className="text-ink-2">
                Total facturas: <span className="font-mono font-medium text-ink">{pesos(total)}</span>
              </p>
              <p className="text-ink-2">
                Retenciones:{" "}
                <span className="font-mono font-medium text-ink">
                  {pesos(retencionIva + retencionGanancias + retencionIibb + retencionSuss)}
                </span>
              </p>
              <p className="text-ink-2">
                Neto a pagar: <span className="font-mono text-[15px] font-semibold text-accent">{pesos(neto)}</span>
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-end gap-3">
        {error && <p className="text-[12px] text-bad">{error}</p>}
        <Button type="submit" variant="primary" disabled={loading || seleccionadas.size === 0}>
          {loading ? "Generando..." : "Confirmar Orden de Pago"}
        </Button>
      </div>
    </form>
  );
}
