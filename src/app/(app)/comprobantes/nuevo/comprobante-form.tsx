"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CondicionVenta, DireccionComprobante, TipoComprobante } from "@/lib/types";

interface Item {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  alicuota_iva: number;
}

const TIPOS: { value: TipoComprobante; label: string }[] = [
  { value: "factura_a", label: "Factura A" },
  { value: "factura_b", label: "Factura B" },
  { value: "factura_c", label: "Factura C" },
  { value: "nota_credito_a", label: "Nota de Crédito A" },
  { value: "nota_credito_b", label: "Nota de Crédito B" },
  { value: "nota_credito_c", label: "Nota de Crédito C" },
  { value: "nota_debito_a", label: "Nota de Débito A" },
  { value: "nota_debito_b", label: "Nota de Débito B" },
  { value: "nota_debito_c", label: "Nota de Débito C" },
  { value: "recibo", label: "Recibo" },
];

export default function ComprobanteForm({
  terceros,
  empresaId,
}: {
  terceros: { id: string; razon_social: string; tipo: string }[];
  empresaId: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [direccion, setDireccion] = useState<DireccionComprobante>("venta");
  const [tipo, setTipo] = useState<TipoComprobante>("factura_b");
  const [puntoVenta, setPuntoVenta] = useState(1);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [terceroId, setTerceroId] = useState("");
  const [condicionVenta, setCondicionVenta] = useState<CondicionVenta>("contado");
  const [items, setItems] = useState<Item[]>([
    { descripcion: "", cantidad: 1, precio_unitario: 0, alicuota_iva: 21 },
  ]);
  const [confirmarYa, setConfirmarYa] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
  const iva = items.reduce((s, i) => s + i.cantidad * i.precio_unitario * (i.alicuota_iva / 100), 0);
  const total = subtotal + iva;

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { descripcion: "", cantidad: 1, precio_unitario: 0, alicuota_iva: 21 }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!terceroId) {
      setError("Elegí un cliente/proveedor");
      return;
    }
    if (items.some((i) => !i.descripcion)) {
      setError("Completá la descripción de todos los ítems");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: comprobante, error: compError } = await supabase
      .from("comprobantes")
      .insert({
        empresa_id: empresaId,
        direccion,
        tipo,
        punto_venta: puntoVenta,
        fecha,
        tercero_id: terceroId,
        condicion_venta: condicionVenta,
        creado_por: user?.id,
      })
      .select()
      .single();

    if (compError || !comprobante) {
      setError(compError?.message ?? "Error al crear el comprobante");
      setLoading(false);
      return;
    }

    const { error: itemsError } = await supabase.from("comprobante_items").insert(
      items.map((i) => ({
        comprobante_id: comprobante.id,
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        alicuota_iva: i.alicuota_iva,
        subtotal: i.cantidad * i.precio_unitario,
      }))
    );

    if (itemsError) {
      setError(itemsError.message);
      setLoading(false);
      return;
    }

    if (confirmarYa) {
      const { error: confirmError } = await supabase
        .from("comprobantes")
        .update({ estado: "confirmado" })
        .eq("id", comprobante.id);
      if (confirmError) {
        setError(confirmError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/comprobantes");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 rounded-lg border bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-gray-600">Dirección</label>
          <select
            value={direccion}
            onChange={(e) => setDireccion(e.target.value as DireccionComprobante)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="venta">Venta</option>
            <option value="compra">Compra</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoComprobante)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Punto de Venta</label>
          <input
            type="number"
            min={1}
            value={puntoVenta}
            onChange={(e) => setPuntoVenta(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Cliente / Proveedor</label>
          <select
            value={terceroId}
            onChange={(e) => setTerceroId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">Seleccionar...</option>
            {terceros.map((t) => (
              <option key={t.id} value={t.id}>
                {t.razon_social}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Condición</label>
          <select
            value={condicionVenta}
            onChange={(e) => setCondicionVenta(e.target.value as CondicionVenta)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="contado">Contado</option>
            <option value="cuenta_corriente">Cuenta Corriente</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900">Ítems</h2>
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            + Agregar ítem
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <input
                placeholder="Descripción"
                value={item.descripcion}
                onChange={(e) => updateItem(idx, { descripcion: e.target.value })}
                className="col-span-5 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Cant."
                value={item.cantidad}
                onChange={(e) => updateItem(idx, { cantidad: Number(e.target.value) })}
                className="col-span-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Precio Unit."
                value={item.precio_unitario}
                onChange={(e) => updateItem(idx, { precio_unitario: Number(e.target.value) })}
                className="col-span-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <select
                value={item.alicuota_iva}
                onChange={(e) => updateItem(idx, { alicuota_iva: Number(e.target.value) })}
                className="col-span-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value={0}>0%</option>
                <option value={10.5}>10.5%</option>
                <option value={21}>21%</option>
                <option value={27}>27%</option>
              </select>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="col-span-1 text-sm text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-6 border-t pt-3 text-sm">
          <p>
            Subtotal: <span className="font-medium">{subtotal.toFixed(2)}</span>
          </p>
          <p>
            IVA: <span className="font-medium">{iva.toFixed(2)}</span>
          </p>
          <p>
            Total: <span className="font-semibold">{total.toFixed(2)}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={confirmarYa}
            onChange={(e) => setConfirmarYa(e.target.checked)}
          />
          Confirmar y generar asiento contable automáticamente
        </label>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar Comprobante"}
          </button>
        </div>
      </div>
    </form>
  );
}
