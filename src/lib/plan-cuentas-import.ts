import Papa from "papaparse";
import ExcelJS from "exceljs";
import type { NaturalezaCuenta, TipoCuenta } from "@/lib/types";

export interface FilaImportada {
  codigo: string;
  nombre: string;
  tipo: TipoCuenta;
  naturaleza: NaturalezaCuenta;
  imputable: boolean;
}

export interface ErrorImportacion {
  fila: number;
  motivo: string;
}

const NATURALEZA_POR_TIPO: Record<TipoCuenta, NaturalezaCuenta> = {
  activo: "deudora",
  egreso: "deudora",
  pasivo: "acreedora",
  patrimonio_neto: "acreedora",
  ingreso: "acreedora",
};

const TIPO_ALIASES: Record<string, TipoCuenta> = {
  activo: "activo",
  pasivo: "pasivo",
  patrimonioneto: "patrimonio_neto",
  patrimonio_neto: "patrimonio_neto",
  pn: "patrimonio_neto",
  ingreso: "ingreso",
  ingresos: "ingreso",
  egreso: "egreso",
  egresos: "egreso",
  gasto: "egreso",
  gastos: "egreso",
};

function normalizarTipo(raw: string): TipoCuenta | null {
  const key = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  return TIPO_ALIASES[key] ?? null;
}

function normalizarImputable(raw: string): boolean {
  const key = raw.trim().toLowerCase();
  return ["si", "sí", "s", "true", "1", "x", "yes"].includes(key);
}

function normalizarHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function filasDesdeRegistros(registros: Record<string, string>[]): { filas: FilaImportada[]; errores: ErrorImportacion[] } {
  const filas: FilaImportada[] = [];
  const errores: ErrorImportacion[] = [];

  registros.forEach((registro, idx) => {
    const numeroFila = idx + 2; // +1 por índice base 0, +1 por la fila de encabezado
    const entradas = Object.fromEntries(
      Object.entries(registro).map(([k, v]) => [normalizarHeader(k), typeof v === "string" ? v.trim() : v])
    );
    const codigo = String(entradas["codigo"] ?? entradas["código"] ?? "").trim();
    const nombre = String(entradas["nombre"] ?? "").trim();
    const tipoRaw = String(entradas["tipo"] ?? "").trim();
    const imputableRaw = String(entradas["imputable"] ?? "").trim();

    if (!codigo && !nombre && !tipoRaw && !imputableRaw) return; // fila vacía

    if (!codigo || !nombre || !tipoRaw) {
      errores.push({ fila: numeroFila, motivo: "Faltan datos obligatorios (código, nombre o tipo)" });
      return;
    }
    const tipo = normalizarTipo(tipoRaw);
    if (!tipo) {
      errores.push({
        fila: numeroFila,
        motivo: `Tipo "${tipoRaw}" no reconocido (usar Activo, Pasivo, Patrimonio Neto, Ingreso o Egreso)`,
      });
      return;
    }

    filas.push({
      codigo,
      nombre,
      tipo,
      naturaleza: NATURALEZA_POR_TIPO[tipo],
      imputable: normalizarImputable(imputableRaw),
    });
  });

  return { filas, errores };
}

async function parseCsv(file: File): Promise<{ filas: FilaImportada[]; errores: ErrorImportacion[] }> {
  const texto = await file.text();
  const { data } = Papa.parse<Record<string, string>>(texto, { header: true, skipEmptyLines: true });
  return filasDesdeRegistros(data);
}

async function parseXlsx(file: File): Promise<{ filas: FilaImportada[]; errores: ErrorImportacion[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const hoja = workbook.worksheets[0];
  if (!hoja) return { filas: [], errores: [{ fila: 0, motivo: "El archivo no tiene hojas" }] };

  const filasRaw: string[][] = [];
  hoja.eachRow((row) => {
    const valores = (row.values as unknown[]).slice(1).map((v) => (v == null ? "" : String(v)));
    filasRaw.push(valores);
  });
  if (filasRaw.length === 0) return { filas: [], errores: [] };

  const headers = filasRaw[0].map(normalizarHeader);
  const registros = filasRaw.slice(1).map((fila) => {
    const registro: Record<string, string> = {};
    headers.forEach((h, i) => (registro[h] = fila[i] ?? ""));
    return registro;
  });
  return filasDesdeRegistros(registros);
}

export async function parseArchivoPlanCuentas(
  file: File
): Promise<{ filas: FilaImportada[]; errores: ErrorImportacion[] }> {
  const esXlsx = /\.xlsx$/i.test(file.name);
  const esCsv = /\.csv$/i.test(file.name);
  if (esXlsx) return parseXlsx(file);
  if (esCsv) return parseCsv(file);
  throw new Error("Formato no soportado. Subí un archivo .csv o .xlsx.");
}
