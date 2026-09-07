export type Origen = "Americana" | "Mexicana";
export type Moneda = "USD" | "MXN";

export type NivelAprobacion = "Supervisor" | "Superintendente" | "Gerente";

export type EstadoRequisicion = "Pendiente" | "Aprobada" | "Rechazada" | "Surtida";

export type Turno = "1er Turno" | "2do Turno" | "3er Turno";

/** Renglon del catálogo de partes (~84,000 filas). */
export interface ParteCatalogo {
  numeroParte: string;
  descripcion: string;
  origen: Origen;
  costo: number; // en USD si Origen=Americana, en MXN si Origen=Mexicana
  localidad: string;
  activo: boolean;
}

/** Un renglon capturado dentro de una requisición. */
export interface RenglonRequisicion {
  id?: number;
  numeroParte: string;
  descripcion: string;
  cantidad: number;
  maquina: string;
  origen: Origen;
  moneda: Moneda;
  costoUnitario: number; // en la moneda original de la pieza
  localidad: string;
}

export interface Aprobador {
  rol: NivelAprobacion;
  nombreCompleto: string;
  correo: string;
  activo: boolean;
}

export interface TipoCambio {
  fecha: string; // ISO date
  valorMXNporUSD: number;
  vigente: boolean;
}

export interface Requisicion {
  id: number; // SharePoint list item ID -> folio = REQ-#####
  folio: string;
  nombre: string;
  noReloj: string;
  turno: Turno;
  areaDepto: string;
  fecha: string; // ISO date
  solicitanteCorreo: string;
  renglones: RenglonRequisicion[];
  totalUSD: number;
  nivelAprobacion: NivelAprobacion;
  estado: EstadoRequisicion;
  aprobadorCorreo?: string;
  aprobadoPor?: string;
  fechaAprobacion?: string;
  motivoRechazo?: string;
  surtidoPor?: string;
  fechaSurtido?: string;
  creado: string; // ISO datetime
}

export interface NuevaRequisicionInput {
  nombre: string;
  noReloj: string;
  turno: Turno;
  areaDepto: string;
  fecha: string;
  solicitanteCorreo: string;
  renglones: RenglonRequisicion[];
}

export interface UsuarioRol {
  correo: string;
  esAlmacen: boolean;
  esToolCrib: boolean;
  activo: boolean;
}
