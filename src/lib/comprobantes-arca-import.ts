import type { TipoComprobante } from "@/lib/types";

/**
 * Parser del CSV de "Mis Comprobantes > Recibidos" de ARCA (ex AFIP).
 * Formato: separado por ";", decimales con coma, encabezado entre comillas.
 * Columnas (0-based): Fecha de Emisión, Tipo de Comprobante, Punto de Venta,
 * Número Desde, Número Hasta, Cód. Autorización, Tipo Doc. Emisor,
 * Nro. Doc. Emisor, Denominación Emisor, Tipo Doc. Receptor, Nro. Doc. Receptor,
 * Tipo Cambio, Moneda, Imp.Neto Gravado IVA 0%, IVA 2,5%, Imp.Neto Grav. 2,5%,
 * IVA 5%, Imp.Neto Grav. 5%, IVA 10,5%, Imp.Neto Grav. 10,5%, IVA 21%,
 * Imp.Neto Grav. 21%, IVA 27%, Imp.Neto Grav. 27%, Imp.Neto Gravado Total,
 * Imp.Neto No Gravado, Imp.Op.Exentas, Otros Tributos, Total IVA, Imp.Total
 */

const TIPO_MAP: Record<string, TipoComprobante> = {
  "1": "factura_a",
  "2": "nota_debito_a",
  "3": "nota_credito_a",
  "4": "recibo",
  "5": "recibo",
  "6": "factura_b",
  "7": "nota_debito_b",
  "8": "nota_credito_b",
  "9": "recibo",
  "10": "recibo",
  "11": "factura_c",
  "12": "nota_debito_c",
  "13": "nota_credito_c",
  "15": "recibo",
};

const BRACKETS = [
  { alicuota: 2.5, ivaIdx: 14, netoIdx: 15 },
  { alicuota: 5, ivaIdx: 16, netoIdx: 17 },
  { alicuota: 10.5, ivaIdx: 18, netoIdx: 19 },
  { alicuota: 21, ivaIdx: 20, netoIdx: 21 },
  { alicuota: 27, ivaIdx: 22, netoIdx: 23 },
];

export interface ItemArca {
  descripcion: string;
  subtotal: number;
  alicuota_iva: number;
}

export interface FilaArca {
  fila: number;
  fecha: string;
  tipo: TipoComprobante;
  tipoCodigo: string;
  puntoVenta: number;
  numero: number;
  cae: string;
  cuitEmisor: string;
  denominacionEmisor: string;
  items: ItemArca[];
  subtotal: number;
  iva: number;
  total: number;
}

export interface ErrorFilaArca {
  fila: number;
  motivo: string;
}

function parseNumero(s: string): number {
  const t = (s ?? "").trim();
  if (!t) return 0;
  return parseFloat(t.replace(",", ".")) || 0;
}

function limpiar(s: string): string {
  return (s ?? "").trim().replace(/^"|"$/g, "");
}

export async function parseArcaCsv(file: File): Promise<{ filas: FilaArca[]; errores: ErrorFilaArca[] }> {
  const texto = await file.text();
  const lineas = texto.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lineas.length < 2) return { filas: [], errores: [] };

  const filas: FilaArca[] = [];
  const errores: ErrorFilaArca[] = [];

  for (let i = 1; i < lineas.length; i++) {
    const numeroFila = i + 1;
    const cols = lineas[i].split(";").map(limpiar);
    if (cols.length < 30) {
      errores.push({ fila: numeroFila, motivo: "Fila con menos columnas de las esperadas" });
      continue;
    }

    const fecha = cols[0];
    const tipoCodigo = cols[1];
    const puntoVenta = parseInt(cols[2], 10);
    const numeroDesde = parseInt(cols[3], 10);
    const cae = cols[5];
    const cuitEmisor = cols[7];
    const denominacionEmisor = cols[8];
    const moneda = cols[12];
    const netoNoGravado = parseNumero(cols[25]);
    const exento = parseNumero(cols[26]);
    const otrosTributos = parseNumero(cols[27]);
    const totalIva = parseNumero(cols[28]);
    const total = parseNumero(cols[29]);
    const neto0 = parseNumero(cols[13]);

    if (moneda !== "$") {
      errores.push({
        fila: numeroFila,
        motivo: `Moneda ${moneda || "?"} no soportada (solo pesos) — comprobante de ${denominacionEmisor}, cargalo a mano`,
      });
      continue;
    }
    const tipo = TIPO_MAP[tipoCodigo];
    if (!tipo) {
      errores.push({
        fila: numeroFila,
        motivo: `Tipo de comprobante ARCA "${tipoCodigo}" no soportado — comprobante de ${denominacionEmisor}, cargalo a mano`,
      });
      continue;
    }
    if (!cuitEmisor || !denominacionEmisor) {
      errores.push({ fila: numeroFila, motivo: "Falta CUIT o razón social del emisor" });
      continue;
    }

    const items: ItemArca[] = [];
    if (neto0 > 0) {
      items.push({ descripcion: "Compra según comprobante ARCA", subtotal: neto0, alicuota_iva: 0 });
    }
    for (const b of BRACKETS) {
      const neto = parseNumero(cols[b.netoIdx]);
      if (neto > 0) {
        items.push({
          descripcion: `Compra según comprobante ARCA (IVA ${b.alicuota}%)`,
          subtotal: neto,
          alicuota_iva: b.alicuota,
        });
      }
    }
    if (netoNoGravado > 0) {
      items.push({ descripcion: "Conceptos no gravados", subtotal: netoNoGravado, alicuota_iva: 0 });
    }
    if (exento > 0) {
      items.push({ descripcion: "Conceptos exentos", subtotal: exento, alicuota_iva: 0 });
    }
    if (otrosTributos > 0) {
      items.push({
        descripcion: "Otros tributos (percepciones, impuestos internos, etc.)",
        subtotal: otrosTributos,
        alicuota_iva: 0,
      });
    }
    if (items.length === 0) {
      if (total > 0) {
        // Recibo C / Factura C de monotributista: no discrimina IVA, todo el importe es neto.
        items.push({ descripcion: "Compra según comprobante ARCA (sin discriminar IVA)", subtotal: total, alicuota_iva: 0 });
      } else {
        errores.push({ fila: numeroFila, motivo: `Comprobante de ${denominacionEmisor} sin importe — se omite` });
        continue;
      }
    }

    const subtotal = total - totalIva;

    filas.push({
      fila: numeroFila,
      fecha,
      tipo,
      tipoCodigo,
      puntoVenta,
      numero: numeroDesde,
      cae,
      cuitEmisor: cuitEmisor.replace(/\D/g, ""),
      denominacionEmisor,
      items,
      subtotal,
      iva: totalIva,
      total,
    });
  }

  return { filas, errores };
}
