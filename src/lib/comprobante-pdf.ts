import type { TipoComprobante, CondicionIva } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { jsPDF } from "jspdf";

/**
 * Genera el PDF de una factura/nota con CAE, replicando el diseño de referencia (banda oscura
 * con datos del emisor, badge con la letra del comprobante, tabla de ítems, caja de totales,
 * pie con QR y datos del CAE — según la especificación RG 4291 para el QR) y dispara la
 * descarga en el navegador.
 *
 * Las medidas están convertidas 1:1 desde el diseño de referencia (794px = 210mm de ancho,
 * escala k = 210/794 mm/px; tamaños de fuente en pt = px * 0.75 a 96dpi).
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
  responsable_inscripto: "Resp. Inscripto",
  monotributo: "Responsable Monotributo",
  exento: "IVA Sujeto Exento",
  consumidor_final: "Consumidor Final",
  no_categorizado: "Consumidor Final",
};

// Paleta exacta del diseño de referencia
const NAVY: [number, number, number] = [16, 22, 37]; // #101625
const BLUE: [number, number, number] = [6, 99, 196]; // #0663C4
const GRIS_TOTALES: [number, number, number] = [245, 246, 249]; // #F5F6F9
const GRIS_LABEL: [number, number, number] = [138, 147, 166]; // #8A93A6
const GRIS_VALOR: [number, number, number] = [75, 85, 99]; // #4B5563
const GRIS_LINEA: [number, number, number] = [227, 230, 237]; // #E3E6ED
const GRIS_LINEA_SUAVE: [number, number, number] = [238, 240, 244]; // #EEF0F4
const BANDA_MUTED: [number, number, number] = [158, 161, 168]; // blanco ~60% opacidad sobre navy

// Escala: 794px de referencia = 210mm de ancho de página
const K = 210 / 794; // mm por px
const px = (v: number) => v * K;
const pt = (v: number) => v * 0.75;

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

function arrayBufferABase64(buffer: ArrayBuffer): string {
  let binario = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binario += String.fromCharCode(bytes[i]);
  return btoa(binario);
}

/** Embebe DM Mono (la fuente monoespaciada del diseño de referencia) para los números. */
async function registrarFuenteMono(doc: jsPDF): Promise<void> {
  const [regular, medium] = await Promise.all([
    fetch("/fonts/DMMono-Regular.ttf").then((r) => r.arrayBuffer()),
    fetch("/fonts/DMMono-Medium.ttf").then((r) => r.arrayBuffer()),
  ]);
  doc.addFileToVFS("DMMono-Regular.ttf", arrayBufferABase64(regular));
  doc.addFont("DMMono-Regular.ttf", "DMMono", "normal");
  doc.addFileToVFS("DMMono-Medium.ttf", arrayBufferABase64(medium));
  doc.addFont("DMMono-Medium.ttf", "DMMono", "bold");
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

  const { default: jsPDFCtor } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const qrDataUrl = await generarUrlQr(datos);

  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  await registrarFuenteMono(doc);

  const M = px(40); // padding lateral del diseño de referencia (10.6mm)
  const ANCHO_PAGINA = 210;
  const ANCHO_UTIL = ANCHO_PAGINA - M * 2;
  const esFacturaC = datos.comprobante.tipo === "factura_c";
  const numeroFmt = `${String(datos.comprobante.punto_venta).padStart(4, "0")}-${String(datos.comprobante.numero ?? 0).padStart(8, "0")}`;
  const tipoNombreConLetra = `${TIPO_NOMBRE[datos.comprobante.tipo]} ${TIPO_LETRA[datos.comprobante.tipo]}`;

  // ---- Banda del emisor ----
  const ALTO_BANDA = px(130);
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, ANCHO_PAGINA, ALTO_BANDA, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(pt(21));
  doc.text(datos.empresa.nombre.toUpperCase(), M, px(38));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(pt(11));
  doc.setTextColor(...BANDA_MUTED);
  if (datos.empresa.domicilio_fiscal) doc.text(datos.empresa.domicilio_fiscal, M, px(58));

  const camposMeta: [string, string, "helvetica" | "DMMono"][] = [
    ["CUIT", formatearCuit(datos.empresa.cuit), "DMMono"],
  ];
  if (datos.empresa.numero_iibb) camposMeta.push(["IIBB", datos.empresa.numero_iibb, "DMMono"]);
  if (datos.empresa.inicio_actividades) {
    camposMeta.push(["Inicio act.", formatearFecha(datos.empresa.inicio_actividades), "DMMono"]);
  }
  camposMeta.push(["IVA", CONDICION_IVA_LABEL[datos.empresa.condicion_iva], "helvetica"]);

  // Cada campo ocupa el ancho de su línea más larga (rótulo o valor) + un gap fijo,
  // para que nunca se superponga con el siguiente.
  let xSlot = M;
  const gapSlot = px(20);
  for (const [label, valor, fuente] of camposMeta) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(pt(9));
    const anchoLabel = doc.getTextWidth(label);
    doc.setFont(fuente, "bold");
    doc.setFontSize(pt(10.5));
    const anchoValor = doc.getTextWidth(valor);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(pt(9));
    doc.setTextColor(...BANDA_MUTED);
    doc.text(label, xSlot, px(76));
    doc.setFont(fuente, "bold");
    doc.setFontSize(pt(10.5));
    doc.setTextColor(255, 255, 255);
    doc.text(valor, xSlot, px(90));

    xSlot += Math.max(anchoLabel, anchoValor) + gapSlot;
  }

  const badgeW = px(56);
  const badgeX = ANCHO_PAGINA - M - badgeW;
  const badgeY = px(26);
  doc.setFillColor(...BLUE);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeW, px(3), px(3), "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(pt(30));
  doc.setTextColor(255, 255, 255);
  doc.text(TIPO_LETRA[datos.comprobante.tipo], badgeX + badgeW / 2, badgeY + badgeW / 2 + px(10), { align: "center" });

  const docInfoX = badgeX - px(14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(pt(10));
  doc.setTextColor(...BANDA_MUTED);
  doc.text(tipoNombreConLetra, docInfoX, px(30), { align: "right" });
  doc.setFont("DMMono", "bold");
  doc.setFontSize(pt(21));
  doc.setTextColor(255, 255, 255);
  doc.text(numeroFmt, docInfoX, px(48), { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(pt(10.5));
  doc.setTextColor(...BANDA_MUTED);
  doc.text(
    `Emisión ${formatearFecha(datos.comprobante.fecha)} · Cód. ${String(TIPO_COD[datos.comprobante.tipo]).padStart(2, "0")}`,
    docInfoX,
    px(62),
    { align: "right" }
  );

  // ---- Facturar a / condición de venta ----
  const bodyTop = ALTO_BANDA + px(26);
  const col2X = M + 102.8 + px(26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(pt(9.5));
  doc.setTextColor(...GRIS_LABEL);
  doc.text("FACTURAR A", M, bodyTop);
  doc.text("CONDICIÓN DE VENTA", col2X, bodyTop);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(pt(13));
  doc.setTextColor(...NAVY);
  doc.text(datos.tercero.razon_social, M, bodyTop + px(18));
  doc.setFontSize(pt(11));
  doc.text(datos.comprobante.condicion_venta === "contado" ? "Contado" : "Cta. cte." , col2X, bodyTop + px(18));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(pt(10.5));
  doc.setTextColor(...GRIS_VALOR);
  let yTercero = bodyTop + px(32);
  if (datos.tercero.direccion) {
    doc.text(datos.tercero.direccion, M, yTercero);
    yTercero += px(15);
  }
  const anchoCuitLabel = doc.getTextWidth("CUIT ");
  doc.text("CUIT ", M, yTercero);
  doc.setFont("DMMono", "normal");
  doc.text(formatearCuit(datos.tercero.cuit), M + anchoCuitLabel, yTercero);
  const anchoCuitVal = doc.getTextWidth(formatearCuit(datos.tercero.cuit));
  doc.setFont("helvetica", "normal");
  doc.text(` · ${CONDICION_IVA_LABEL[datos.tercero.condicion_iva]}`, M + anchoCuitLabel + anchoCuitVal, yTercero);

  const yDivisor = bodyTop + px(48);
  doc.setDrawColor(...GRIS_LINEA);
  doc.setLineWidth(0.25);
  doc.line(M, yDivisor, ANCHO_PAGINA - M, yDivisor);

  // ---- Ítems ----
  const anchoCant = px(86);
  const anchoUnit = px(96);
  const anchoSubtotal = px(108);
  autoTable(doc, {
    startY: yDivisor + px(22),
    margin: { left: M, right: M },
    head: [["Detalle", "Cantidad", "P. Unitario", "Subtotal"]],
    body: datos.items.map((it) => [
      `${it.descripcion}\n${it.alicuota_iva > 0 ? `IVA ${it.alicuota_iva.toFixed(2)}%` : "Sin discriminar"}`,
      String(it.cantidad),
      money(it.precio_unitario),
      money(it.subtotal),
    ]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: pt(11), textColor: NAVY, cellPadding: { top: px(11), bottom: px(11), left: 0, right: px(10) } },
    headStyles: {
      fontStyle: "normal",
      fontSize: pt(9.5),
      textColor: GRIS_LABEL,
      cellPadding: { top: 0, bottom: px(8), left: 0, right: px(10) },
    },
    columnStyles: {
      0: { cellWidth: ANCHO_UTIL - anchoCant - anchoUnit - anchoSubtotal },
      1: { halign: "right", cellWidth: anchoCant, font: "DMMono" },
      2: { halign: "right", cellWidth: anchoUnit, font: "DMMono" },
      3: { halign: "right", cellWidth: anchoSubtotal, font: "DMMono" },
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        data.cell.styles.lineWidth = { top: 0, right: 0, bottom: 0.25, left: 0 };
        data.cell.styles.lineColor = GRIS_LINEA_SUAVE;
        if (data.column.index === 0) data.cell.styles.valign = "top";
      }
      if (data.section === "head") {
        data.cell.styles.lineWidth = { top: 0, right: 0, bottom: 0.35, left: 0 };
        data.cell.styles.lineColor = NAVY;
      }
    },
  });

  // ---- Totales ----
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + px(22);
  const lineas: [string, number][] = [["Neto gravado", esFacturaC ? 0 : datos.comprobante.subtotal]];
  if (esFacturaC) lineas[0] = ["Subtotal", datos.comprobante.subtotal];
  if (!esFacturaC) lineas.push(["IVA", datos.comprobante.iva]);
  if (datos.comprobante.percepcion_iva > 0) lineas.push(["Percepción IVA", datos.comprobante.percepcion_iva]);
  if (datos.comprobante.percepcion_iibb > 0) lineas.push(["Percepción IIBB", datos.comprobante.percepcion_iibb]);

  const cajaW = px(330);
  const cajaX = ANCHO_PAGINA - M - cajaW;
  const padCajaX = px(20);
  const padCajaY = px(18);
  const cajaAlto = padCajaY * 2 + lineas.length * px(19) + px(38);
  doc.setFillColor(...GRIS_TOTALES);
  doc.rect(cajaX, finalY, cajaW, cajaAlto, "F");

  let y = finalY + padCajaY + px(9);
  doc.setFontSize(pt(11));
  for (const [label, valor] of lineas) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRIS_VALOR);
    doc.text(label, cajaX + padCajaX, y);
    doc.setFont("DMMono", "normal");
    doc.setTextColor(...NAVY);
    doc.text(money(valor), cajaX + cajaW - padCajaX, y, { align: "right" });
    y += px(19);
  }
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.35);
  doc.line(cajaX + padCajaX, y - px(9), cajaX + cajaW - padCajaX, y - px(9));
  y += px(8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(pt(10));
  doc.setTextColor(...GRIS_VALOR);
  doc.text("TOTAL", cajaX + padCajaX, y);
  doc.setFont("DMMono", "bold");
  doc.setFontSize(pt(20));
  doc.setTextColor(...NAVY);
  doc.text(`$ ${money(datos.comprobante.total)}`, cajaX + cajaW - padCajaX, y, { align: "right" });

  // ---- Pie: QR y CAE ----
  const yPie = 260;
  doc.setDrawColor(...GRIS_LINEA);
  doc.setLineWidth(0.25);
  doc.line(M, yPie, ANCHO_PAGINA - M, yPie);

  const qrSize = px(88);
  doc.addImage(qrDataUrl, "PNG", M, yPie + px(18), qrSize, qrSize);

  const pieInfoX = M + qrSize + px(24);
  const filasPie: [string, string][] = [
    ["Autorizado", "ARCA"],
    ["CAE N°", datos.comprobante.cae ?? "-"],
    ["Vto. CAE", datos.comprobante.cae_vencimiento ? formatearFecha(datos.comprobante.cae_vencimiento) : "-"],
  ];
  let yPieTexto = yPie + px(20);
  for (const [label, valor] of filasPie) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(pt(10.5));
    doc.setTextColor(...GRIS_LABEL);
    doc.text(label, pieInfoX, yPieTexto);
    doc.setFont("DMMono", "bold");
    doc.setTextColor(...NAVY);
    doc.text(valor, pieInfoX + px(60), yPieTexto);
    yPieTexto += px(21);
  }

  doc.save(`${tipoNombreConLetra.replace(" ", "_")}_${numeroFmt}.pdf`);
}
