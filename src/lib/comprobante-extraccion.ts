import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import type { TipoComprobante } from "@/lib/types";

const TIPOS_VALIDOS: TipoComprobante[] = [
  "factura_a",
  "factura_b",
  "factura_c",
  "nota_credito_a",
  "nota_credito_b",
  "nota_credito_c",
  "nota_debito_a",
  "nota_debito_b",
  "nota_debito_c",
  "recibo",
];

export interface ItemExtraido {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  alicuota_iva: number;
}

export interface ComprobanteExtraido {
  tipo: TipoComprobante;
  puntoVenta: number;
  numero: number;
  fecha: string;
  cuitEmisor: string;
  razonSocialEmisor: string;
  items: ItemExtraido[];
  subtotal: number;
  iva: number;
  percepcionIva: number;
  percepcionIibb: number;
  total: number;
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    tipo: { type: Type.STRING, enum: TIPOS_VALIDOS },
    puntoVenta: { type: Type.INTEGER },
    numero: { type: Type.INTEGER },
    fecha: { type: Type.STRING, description: "Fecha de emisión en formato YYYY-MM-DD" },
    cuitEmisor: { type: Type.STRING, description: "Solo dígitos, sin guiones" },
    razonSocialEmisor: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          descripcion: { type: Type.STRING },
          cantidad: { type: Type.NUMBER },
          precio_unitario: { type: Type.NUMBER },
          alicuota_iva: { type: Type.NUMBER, description: "Alícuota de IVA del ítem: 0, 10.5, 21 o 27" },
        },
        required: ["descripcion", "cantidad", "precio_unitario", "alicuota_iva"],
      },
    },
    subtotal: { type: Type.NUMBER },
    iva: { type: Type.NUMBER },
    percepcionIva: { type: Type.NUMBER },
    percepcionIibb: { type: Type.NUMBER },
    total: { type: Type.NUMBER },
  },
  required: [
    "tipo",
    "puntoVenta",
    "numero",
    "fecha",
    "cuitEmisor",
    "razonSocialEmisor",
    "items",
    "subtotal",
    "iva",
    "percepcionIva",
    "percepcionIibb",
    "total",
  ],
};

const PROMPT = `Sos un asistente contable argentino. Vas a recibir la imagen o el PDF de una
factura/comprobante (Factura A/B/C, Nota de Crédito/Débito, Recibo) y tenés que extraer sus datos
estructurados con la mayor precisión posible.

Reglas:
- "tipo" mapea el tipo de comprobante impreso (Factura A/B/C, Nota de Crédito/Débito A/B/C, Recibo).
- "puntoVenta" y "numero" salen del encabezado (formato típico 0001-00001234).
- "cuitEmisor" son los 11 dígitos del CUIT del emisor, sin guiones ni espacios.
- Si el comprobante discrimina IVA por alícuota, generá un ítem por cada línea/alícuota presente.
- Si no discrimina IVA (ej. Factura C de monotributista), un solo ítem con alicuota_iva 0 y el
  importe total como precio_unitario (cantidad 1).
- "percepcionIva" y "percepcionIibb" son percepciones adicionales al pie del comprobante, si figuran; si no, 0.
- Si un dato no es legible, hacé la mejor estimación a partir del resto del comprobante; nunca
  inventes un CUIT o número de comprobante — si no podés leerlos, dejalos en 0 / cadena vacía.

Extraé los datos estructurados de este comprobante.`;

export async function extraerComprobante(base64: string, mediaType: string): Promise<ComprobanteExtraido> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada en el servidor");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType: mediaType, data: base64 } }, { text: PROMPT }],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const texto = response.text;
  if (!texto) {
    throw new Error("El modelo no devolvió una respuesta con los datos extraídos");
  }

  const parsed = JSON.parse(texto) as ComprobanteExtraido & { items: (ItemExtraido & { alicuota_iva: unknown })[] };
  return {
    ...parsed,
    items: parsed.items.map((it) => ({ ...it, alicuota_iva: Number(it.alicuota_iva) })),
  };
}
