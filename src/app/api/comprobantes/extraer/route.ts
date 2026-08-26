import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extraerComprobante } from "@/lib/comprobante-extraccion";

const TIPOS_ACEPTADOS = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const TAMANO_MAXIMO = 15 * 1024 * 1024; // 15 MB

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (!TIPOS_ACEPTADOS.has(file.type)) {
    return NextResponse.json(
      { error: "Formato no soportado. Subí una imagen (PNG/JPG/WEBP) o un PDF." },
      { status: 400 }
    );
  }
  if (file.size > TAMANO_MAXIMO) {
    return NextResponse.json({ error: "El archivo supera los 15 MB" }, { status: 400 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const extraido = await extraerComprobante(base64, file.type);
    return NextResponse.json({ extraido });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo procesar el comprobante";
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}
