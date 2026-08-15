export type TipoCuenta = "activo" | "pasivo" | "patrimonio_neto" | "ingreso" | "egreso";
export type NaturalezaCuenta = "deudora" | "acreedora";

export interface PlanCuenta {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoCuenta;
  naturaleza: NaturalezaCuenta;
  cuenta_padre_id: string | null;
  imputable: boolean;
  activa: boolean;
}

export type TipoTercero = "cliente" | "proveedor" | "ambos";
export type CondicionIva =
  | "responsable_inscripto"
  | "monotributo"
  | "exento"
  | "consumidor_final"
  | "no_categorizado";

export interface Tercero {
  id: string;
  tipo: TipoTercero;
  razon_social: string;
  cuit: string | null;
  condicion_iva: CondicionIva;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  activo: boolean;
}

export type TipoComprobante =
  | "factura_a"
  | "factura_b"
  | "factura_c"
  | "nota_credito_a"
  | "nota_credito_b"
  | "nota_credito_c"
  | "nota_debito_a"
  | "nota_debito_b"
  | "nota_debito_c"
  | "recibo";
export type DireccionComprobante = "venta" | "compra";
export type EstadoComprobante = "borrador" | "confirmado" | "anulado" | "pagado" | "cobrado";
export type CondicionVenta = "contado" | "cuenta_corriente";

export interface Comprobante {
  id: string;
  direccion: DireccionComprobante;
  tipo: TipoComprobante;
  punto_venta: number;
  numero: number | null;
  fecha: string;
  mes_imputacion: string;
  tercero_id: string;
  condicion_venta: CondicionVenta;
  subtotal: number;
  iva: number;
  total: number;
  estado: EstadoComprobante;
  asiento_id: string | null;
}

export interface ComprobanteItem {
  id: string;
  comprobante_id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  alicuota_iva: number;
  subtotal: number;
}

export interface CuentaBancaria {
  id: string;
  nombre: string;
  banco: string | null;
  cbu: string | null;
  alias: string | null;
  moneda: string;
  saldo_inicial: number;
}

export interface MovimientoBancario {
  id: string;
  cuenta_bancaria_id: string;
  fecha: string;
  descripcion: string;
  importe: number;
  tipo: "ingreso" | "egreso";
  conciliado: boolean;
  categoria: string | null;
}
