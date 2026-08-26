import Papa from "papaparse";
import ExcelJS from "exceljs";

export interface MovimientoImportado {
  fecha: string; // YYYY-MM-DD
  descripcion: string;
  importe: number; // siempre positivo
  tipo: "ingreso" | "egreso";
}

const CANDIDATOS_FECHA = ["fecha", "fecha valor", "fecha operacion", "fecha operación", "date"];
const CANDIDATOS_DESC = ["concepto", "descripcion", "descripción", "detalle", "movimiento", "leyenda", "referencia"];
const CANDIDATOS_IMPORTE = ["importe", "monto", "importe operacion", "importe operación"];
const CANDIDATOS_DEBITO = ["debito", "débito", "debitos", "débitos", "debe", "cargo", "egreso"];
const CANDIDATOS_CREDITO = ["credito", "crédito", "creditos", "créditos", "haber", "abono", "ingreso"];

function normalizarHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function buscarColumna(headers: string[], candidatos: string[]): string | null {
  for (const c of candidatos) {
    if (headers.includes(c)) return c;
  }
  return null;
}

function parseImporteAr(raw: string): number {
  const t = (raw ?? "").trim().replace(/[^\d,.-]/g, "");
  if (!t) return 0;
  let normalizado = t;
  if (t.includes(",") && t.includes(".")) {
    normalizado = t.replace(/\./g, "").replace(",", ".");
  } else if (t.includes(",")) {
    normalizado = t.replace(",", ".");
  }
  const valor = parseFloat(normalizado);
  return Number.isFinite(valor) ? valor : 0;
}

function parseFechaFlexible(raw: string): string | null {
  const t = (raw ?? "").trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const arMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
  if (arMatch) {
    const [, dd, mm, yyyy] = arMatch;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return null;
}

function filasDesdeRegistros(registros: Record<string, string>[]): MovimientoImportado[] {
  if (registros.length === 0) return [];
  const headers = Object.keys(registros[0]);
  const colFecha = buscarColumna(headers, CANDIDATOS_FECHA);
  const colDesc = buscarColumna(headers, CANDIDATOS_DESC);
  const colImporte = buscarColumna(headers, CANDIDATOS_IMPORTE);
  const colDebito = buscarColumna(headers, CANDIDATOS_DEBITO);
  const colCredito = buscarColumna(headers, CANDIDATOS_CREDITO);

  if (!colFecha || (!colImporte && !colDebito && !colCredito)) {
    throw new Error(
      "No se reconocen las columnas del archivo. Necesita al menos Fecha e Importe (o Débito/Crédito por separado)."
    );
  }

  const movimientos: MovimientoImportado[] = [];
  for (const registro of registros) {
    const fecha = parseFechaFlexible(registro[colFecha] ?? "");
    if (!fecha) continue;
    const descripcion = (colDesc ? registro[colDesc] : "") || "Movimiento bancario";

    let importe = 0;
    let tipo: "ingreso" | "egreso" = "ingreso";
    if (colImporte) {
      importe = parseImporteAr(registro[colImporte] ?? "");
      tipo = importe < 0 ? "egreso" : "ingreso";
      importe = Math.abs(importe);
    } else {
      const debito = colDebito ? parseImporteAr(registro[colDebito] ?? "") : 0;
      const credito = colCredito ? parseImporteAr(registro[colCredito] ?? "") : 0;
      if (Math.abs(debito) > 0) {
        importe = Math.abs(debito);
        tipo = "egreso";
      } else {
        importe = Math.abs(credito);
        tipo = "ingreso";
      }
    }
    if (importe === 0) continue;

    movimientos.push({ fecha, descripcion: descripcion.trim(), importe, tipo });
  }
  return movimientos;
}

async function parseCsv(file: File): Promise<MovimientoImportado[]> {
  const texto = await file.text();
  const { data } = Papa.parse<Record<string, string>>(texto, { header: true, skipEmptyLines: true });
  const normalizados = data.map((registro) =>
    Object.fromEntries(Object.entries(registro).map(([k, v]) => [normalizarHeader(k), v]))
  );
  return filasDesdeRegistros(normalizados);
}

async function parseXlsx(file: File): Promise<MovimientoImportado[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const hoja = workbook.worksheets[0];
  if (!hoja) return [];

  const filasRaw: string[][] = [];
  hoja.eachRow((row) => {
    const valores = (row.values as unknown[]).slice(1).map((v) => (v == null ? "" : String(v)));
    filasRaw.push(valores);
  });
  if (filasRaw.length === 0) return [];

  const headers = filasRaw[0].map(normalizarHeader);
  const registros = filasRaw.slice(1).map((fila) => {
    const registro: Record<string, string> = {};
    headers.forEach((h, i) => (registro[h] = fila[i] ?? ""));
    return registro;
  });
  return filasDesdeRegistros(registros);
}

function extraerTag(bloque: string, tag: string): string {
  const match = new RegExp(`<${tag}>([^\\r\\n<]*)`, "i").exec(bloque);
  return (match?.[1] ?? "").trim();
}

async function parseOfx(file: File): Promise<MovimientoImportado[]> {
  const texto = await file.text();
  const bloques = texto.split(/<STMTTRN>/i).slice(1);

  const movimientos: MovimientoImportado[] = [];
  for (const bloqueCompleto of bloques) {
    const bloque = bloqueCompleto.split(/<\/STMTTRN>/i)[0];
    const fechaRaw = extraerTag(bloque, "DTPOSTED");
    const montoRaw = extraerTag(bloque, "TRNAMT");
    if (!fechaRaw || !montoRaw) continue;

    const fecha = `${fechaRaw.slice(0, 4)}-${fechaRaw.slice(4, 6)}-${fechaRaw.slice(6, 8)}`;
    const monto = parseFloat(montoRaw.replace(",", "."));
    if (!Number.isFinite(monto) || monto === 0) continue;

    const nombre = extraerTag(bloque, "NAME");
    const memo = extraerTag(bloque, "MEMO");
    const descripcion = [nombre, memo].filter(Boolean).join(" — ") || "Movimiento bancario";

    movimientos.push({
      fecha,
      descripcion,
      importe: Math.abs(monto),
      tipo: monto < 0 ? "egreso" : "ingreso",
    });
  }
  return movimientos;
}

export async function parseExtractoBancario(file: File): Promise<MovimientoImportado[]> {
  if (/\.xlsx$/i.test(file.name)) return parseXlsx(file);
  if (/\.csv$/i.test(file.name)) return parseCsv(file);
  if (/\.ofx$/i.test(file.name)) return parseOfx(file);
  throw new Error("Formato no soportado. Subí un archivo .csv, .xlsx o .ofx.");
}
