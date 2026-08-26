import type { TipoComprobante, CondicionIva } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Genera el PDF de una factura/nota con CAE en el formato oficial de ARCA (encabezado con
 * letra y código, datos del emisor/receptor, ítems, totales, CAE y código QR según la
 * especificación de RG 4291) y dispara la descarga en el navegador.
 */

const TIPO_COD: Record<TipoComprobante, number> = {
  factura_a: 1,
  nota_debito_a: 2,
  nota_credito_a: 3,
  factura_b: 6,
  nota_debito_b: 7,
  nota_credito_b: 8,
  factura_c: 11,
  nota_debito_c: 12,
  nota_credito_c: 13,
  recibo: 0,
};

const TIPO_LETRA: Record<TipoComprobante, string> = {
  factura_a: "A",
  nota_debito_a: "A",
  nota_credito_a: "A",
  factura_b: "B",
  nota_debito_b: "B",
  nota_credito_b: "B",
  factura_c: "C",
  nota_debito_c: "C",
  nota_credito_c: "C",
  recibo: "X",
};

const TIPO_NOMBRE: Record<TipoComprobante, string> = {
  factura_a: "FACTURA",
  factura_b: "FACTURA",
  factura_c: "FACTURA",
  nota_debito_a: "NOTA DE DÉBITO",
  nota_debito_b: "NOTA DE DÉBITO",
  nota_debito_c: "NOTA DE DÉBITO",
  nota_credito_a: "NOTA DE CRÉDITO",
  nota_credito_b: "NOTA DE CRÉDITO",
  nota_credito_c: "NOTA DE CRÉDITO",
  recibo: "RECIBO",
};

const CONDICION_IVA_LABEL: Record<CondicionIva, string> = {
  responsable_inscripto: "IVA Responsable Inscripto",
  monotributo: "Responsable Monotributo",
  exento: "IVA Sujeto Exento",
  consumidor_final: "Consumidor Final",
  no_categorizado: "Consumidor Final",
};

interface DatosPdf {
  empresa: {
    nombre: string;
    cuit: string | null;
    domicilio_fiscal: string | null;
    condicion_iva: CondicionIva;
    numero_iibb: string | null;
    inicio_actividades: string | null;
  };
  comprobante: {
    tipo: TipoComprobante;
    punto_venta: number;
    numero: number | null;
    fecha: string;
    subtotal: number;
    iva: number;
    percepcion_iva: number;
    percepcion_iibb: number;
    total: number;
    cae: string | null;
    cae_vencimiento: string | null;
    condicion_venta: "contado" | "cuenta_corriente";
  };
  tercero: {
    razon_social: string;
    cuit: string | null;
    condicion_iva: CondicionIva;
    direccion: string | null;
  };
  items: { descripcion: string; cantidad: number; precio_unitario: number; alicuota_iva: number; subtotal: number }[];
}

function formatearCuit(cuit: string | null): string {
  if (!cuit) return "-";
  const d = cuit.replace(/\D/g, "");
  if (d.length !== 11) return cuit;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

function formatearFecha(fecha: string): string {
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const money = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function generarUrlQr(datos: DatosPdf): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  const payload = {
    ver: 1,
    fecha: datos.comprobante.fecha.slice(0, 10),
    cuit: Number((datos.empresa.cuit ?? "").replace(/\D/g, "")),
    ptoVta: datos.comprobante.punto_venta,
    tipoCmp: TIPO_COD[datos.comprobante.tipo],
    nroCmp: datos.comprobante.numero ?? 0,
    importe: datos.comprobante.total,
    moneda: "PES",
    ctz: 1,
    tipoDocRec: datos.tercero.cuit ? 80 : 99,
    nroDocRec: datos.tercero.cuit ? Number(datos.tercero.cuit.replace(/\D/g, "")) : 0,
    tipoCodAut: "E",
    codAut: Number(datos.comprobante.cae),
  };
  const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
  return QRCode.toDataURL(url, { margin: 1, width: 200 });
}

export async function descargarPdfComprobante(supabase: SupabaseClient, comprobanteId: string): Promise<void> {
  const { data: comprobante, error } = await supabase
    .from("comprobantes")
    .select(
      "tipo, punto_venta, numero, fecha, subtotal, iva, percepcion_iva, percepcion_iibb, total, cae, cae_vencimiento, condicion_venta, empresa_id, terceros(razon_social, cuit, condicion_iva, direccion), comprobante_items(descripcion, cantidad, precio_unitario, alicuota_iva, subtotal)"
    )
    .eq("id", comprobanteId)
    .single();
  if (error || !comprobante) throw new Error(error?.message ?? "No se encontró el comprobante");

  const { data: empresa, error: empresaError } = await supabase
    .from("empresas")
    .select("nombre, cuit, domicilio_fiscal, condicion_iva, numero_iibb, inicio_actividades")
    .eq("id", comprobante.empresa_id)
    .single();
  if (empresaError || !empresa) throw new Error(empresaError?.message ?? "No se encontró la empresa");

  const datos: DatosPdf = {
    empresa,
    comprobante,
    tercero: comprobante.terceros as unknown as DatosPdf["tercero"],
    items: (comprobante.comprobante_items as unknown as DatosPdf["items"]) ?? [],
  };

  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const qrDataUrl = await generarUrlQr(datos);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margen = 14;

  // Encabezado: datos del emisor a la izquierda, recuadro con letra a la derecha
  doc.setFontSize(13);
  doc.text(datos.empresa.nombre, margen, 18);
  doc.setFontSize(9);
  doc.text(`CUIT: ${formatearCuit(datos.empresa.cuit)}`, margen, 24);
  doc.text(CONDICION_IVA_LABEL[datos.empresa.condicion_iva], margen, 29);
  if (datos.empresa.domicilio_fiscal) doc.text(datos.empresa.domicilio_fiscal, margen, 34);
  if (datos.empresa.numero_iibb) doc.text(`Ingresos Brutos: ${datos.empresa.numero_iibb}`, margen, 39);
  if (datos.empresa.inicio_actividades) {
    doc.text(`Inicio de actividades: ${formatearFecha(datos.empresa.inicio_actividades)}`, margen, 44);
  }

  const cajaX = 150;
  doc.rect(cajaX, 10, 46, 24);
  doc.setFontSize(20);
  doc.text(TIPO_LETRA[datos.comprobante.tipo], cajaX + 23, 20, { align: "center" });
  doc.setFontSize(7);
  doc.text(`Cód. ${String(TIPO_COD[datos.comprobante.tipo]).padStart(2, "0")}`, cajaX + 23, 24, { align: "center" });
  doc.setFontSize(10);
  doc.text(TIPO_NOMBRE[datos.comprobante.tipo], cajaX + 23, 30, { align: "center" });

  doc.setFontSize(9);
  doc.text(
    `${String(datos.comprobante.punto_venta).padStart(4, "0")}-${String(datos.comprobante.numero ?? 0).padStart(8, "0")}`,
    cajaX,
    40
  );
  doc.text(`Fecha: ${formatearFecha(datos.comprobante.fecha)}`, cajaX, 45);

  doc.setDrawColor(200);
  doc.line(margen, 50, 196, 50);

  // Datos del receptor
  doc.setFontSize(9);
  doc.text(`Cliente: ${datos.tercero.razon_social}`, margen, 57);
  doc.text(`CUIT: ${formatearCuit(datos.tercero.cuit)}`, margen, 62);
  doc.text(CONDICION_IVA_LABEL[datos.tercero.condicion_iva], margen, 67);
  doc.text(`Condición de venta: ${datos.comprobante.condicion_venta === "contado" ? "Contado" : "Cuenta corriente"}`, 120, 62);

  // Ítems
  autoTable(doc, {
    startY: 74,
    head: [["Descripción", "Cant.", "P. Unit.", "IVA %", "Subtotal"]],
    body: datos.items.map((it) => [
      it.descripcion,
      String(it.cantidad),
      money(it.precio_unitario),
      `${it.alicuota_iva}%`,
      money(it.subtotal),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [13, 92, 72] },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });

  // Totales
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const lineas: [string, number][] = [["Subtotal", datos.comprobante.subtotal], ["IVA", datos.comprobante.iva]];
  if (datos.comprobante.percepcion_iva > 0) lineas.push(["Percepción IVA", datos.comprobante.percepcion_iva]);
  if (datos.comprobante.percepcion_iibb > 0) lineas.push(["Percepción IIBB", datos.comprobante.percepcion_iibb]);
  lineas.push(["TOTAL", datos.comprobante.total]);

  let y = finalY;
  for (const [label, valor] of lineas) {
    doc.setFontSize(label === "TOTAL" ? 11 : 9);
    doc.text(label, 150, y);
    doc.text(`$ ${money(valor)}`, 196, y, { align: "right" });
    y += 6;
  }

  // CAE y QR
  const yPie = Math.max(y + 10, 250);
  doc.addImage(qrDataUrl, "PNG", margen, yPie - 20, 28, 28);
  doc.setFontSize(9);
  doc.text(`CAE: ${datos.comprobante.cae ?? "-"}`, margen + 34, yPie - 8);
  doc.text(`Vencimiento CAE: ${datos.comprobante.cae_vencimiento ? formatearFecha(datos.comprobante.cae_vencimiento) : "-"}`, margen + 34, yPie - 2);

  doc.save(
    `${TIPO_NOMBRE[datos.comprobante.tipo]}_${TIPO_LETRA[datos.comprobante.tipo]}_${String(datos.comprobante.punto_venta).padStart(4, "0")}-${String(datos.comprobante.numero ?? 0).padStart(8, "0")}.pdf`
  );
}
