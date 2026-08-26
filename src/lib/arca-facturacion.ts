import "server-only";
import Afip from "@afipsdk/afip.js";
import type { CondicionIva, TipoComprobante } from "@/lib/types";

/**
 * Emisión de comprobantes de venta con CAE vía ARCA (ex AFIP), usando @afipsdk/afip.js
 * (WSFEv1). Requiere un access_token gratuito de afipsdk.com (proxy de los web services SOAP
 * de ARCA) — ver GEMINI_API_KEY / ARCA_ACCESS_TOKEN en .env.local.example.
 */

const CBTE_TIPO: Partial<Record<TipoComprobante, number>> = {
  factura_a: 1,
  nota_debito_a: 2,
  nota_credito_a: 3,
  factura_b: 6,
  nota_debito_b: 7,
  nota_credito_b: 8,
  factura_c: 11,
  nota_debito_c: 12,
  nota_credito_c: 13,
};

const IVA_ID: Record<number, number> = {
  10.5: 4,
  21: 5,
  27: 6,
};

const CONDICION_IVA_RECEPTOR: Record<CondicionIva, number> = {
  responsable_inscripto: 1,
  exento: 4,
  consumidor_final: 5,
  monotributo: 6,
  no_categorizado: 5,
};

export interface ItemParaCae {
  subtotal: number;
  alicuota_iva: number;
}

export interface ComprobanteParaCae {
  tipo: TipoComprobante;
  puntoVenta: number;
  fecha: string; // YYYY-MM-DD
  total: number;
  subtotal: number;
  iva: number;
  cuitReceptor: string | null; // solo dígitos, null = consumidor final sin identificar
  condicionIvaReceptor: CondicionIva;
  items: ItemParaCae[];
}

export interface ResultadoCae {
  cae: string;
  caeVencimiento: string; // YYYY-MM-DD
  numero: number;
}

function crearCliente() {
  const accessToken = process.env.ARCA_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      "ARCA_ACCESS_TOKEN no está configurada — conseguila gratis en app.afipsdk.com"
    );
  }

  const produccion = process.env.ARCA_PRODUCCION === "true";
  const cuit = Number(process.env.ARCA_CUIT ?? "20409378472"); // CUIT de prueba de homologación por defecto

  if (produccion) {
    const cert = process.env.ARCA_CERT;
    const key = process.env.ARCA_KEY;
    if (!cert || !key) {
      throw new Error("Faltan ARCA_CERT / ARCA_KEY para emitir en producción");
    }
    return new Afip({ CUIT: cuit, cert, key, access_token: accessToken, production: true });
  }

  return new Afip({ CUIT: cuit, access_token: accessToken });
}

function fechaAAaaammdd(fecha: string): number {
  return parseInt(fecha.replaceAll("-", ""), 10);
}

export async function emitirCae(comprobante: ComprobanteParaCae): Promise<ResultadoCae> {
  const cbteTipo = CBTE_TIPO[comprobante.tipo];
  if (!cbteTipo) {
    throw new Error(`El tipo de comprobante "${comprobante.tipo}" no se emite con CAE`);
  }

  const afip = crearCliente();
  const esFacturaC = comprobante.tipo === "factura_c";
  const docTipo = comprobante.cuitReceptor ? 80 : 99;
  const docNro = comprobante.cuitReceptor ? Number(comprobante.cuitReceptor) : 0;

  const data: Record<string, unknown> = {
    PtoVta: comprobante.puntoVenta,
    CbteTipo: cbteTipo,
    Concepto: 1, // Productos
    DocTipo: docTipo,
    DocNro: docNro,
    CbteFch: fechaAAaaammdd(comprobante.fecha),
    ImpTotal: comprobante.total,
    ImpTotConc: 0,
    ImpNeto: esFacturaC ? comprobante.total : comprobante.subtotal,
    ImpOpEx: 0,
    ImpIVA: esFacturaC ? 0 : comprobante.iva,
    ImpTrib: 0,
    MonId: "PES",
    MonCotiz: 1,
    // RG 5616: condición frente al IVA del receptor, obligatoria desde 2024.
    CondicionIVAReceptorId: CONDICION_IVA_RECEPTOR[comprobante.condicionIvaReceptor],
  };

  if (!esFacturaC) {
    const baseYImportePorAlicuota = new Map<number, { base: number; importe: number }>();
    for (const item of comprobante.items) {
      if (item.alicuota_iva <= 0) continue;
      const actual = baseYImportePorAlicuota.get(item.alicuota_iva) ?? { base: 0, importe: 0 };
      const importeIva = Math.round(item.subtotal * (item.alicuota_iva / 100) * 100) / 100;
      baseYImportePorAlicuota.set(item.alicuota_iva, {
        base: actual.base + item.subtotal,
        importe: actual.importe + importeIva,
      });
    }
    if (baseYImportePorAlicuota.size > 0) {
      data.Iva = Array.from(baseYImportePorAlicuota.entries()).map(([alicuota, v]) => ({
        Id: IVA_ID[alicuota] ?? 5,
        BaseImp: v.base,
        Importe: v.importe,
      }));
    }
  }

  const res = await afip.ElectronicBilling.createNextVoucher(data);

  return {
    cae: res.CAE,
    caeVencimiento: res.CAEFchVto,
    numero: res.voucherNumber,
  };
}
