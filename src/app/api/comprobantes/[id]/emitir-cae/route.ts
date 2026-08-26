import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emitirCae } from "@/lib/arca-facturacion";
import type { CondicionIva } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: comprobante, error: compError } = await supabase
    .from("comprobantes")
    .select("*, terceros(cuit, condicion_iva), comprobante_items(subtotal, alicuota_iva)")
    .eq("id", id)
    .single();
  if (compError || !comprobante) {
    return NextResponse.json({ error: "Comprobante no encontrado" }, { status: 404 });
  }
  if (comprobante.direccion !== "venta") {
    return NextResponse.json({ error: "Solo se emiten con CAE los comprobantes de venta" }, { status: 400 });
  }
  if (comprobante.cae) {
    return NextResponse.json({ error: "Este comprobante ya tiene CAE" }, { status: 400 });
  }

  const tercero = comprobante.terceros as { cuit: string | null; condicion_iva: CondicionIva } | null;
  const items = (comprobante.comprobante_items as { subtotal: number; alicuota_iva: number }[]) ?? [];

  try {
    const resultado = await emitirCae({
      tipo: comprobante.tipo,
      puntoVenta: comprobante.punto_venta,
      fecha: comprobante.fecha,
      total: Number(comprobante.total),
      subtotal: Number(comprobante.subtotal),
      iva: Number(comprobante.iva),
      cuitReceptor: tercero?.cuit?.replace(/\D/g, "") || null,
      condicionIvaReceptor: tercero?.condicion_iva ?? "consumidor_final",
      items: items.map((it) => ({ subtotal: Number(it.subtotal), alicuota_iva: Number(it.alicuota_iva) })),
    });

    const { error: updateError } = await supabase
      .from("comprobantes")
      .update({ cae: resultado.cae, cae_vencimiento: resultado.caeVencimiento, numero: resultado.numero })
      .eq("id", id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ resultado });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo emitir el CAE";
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}
