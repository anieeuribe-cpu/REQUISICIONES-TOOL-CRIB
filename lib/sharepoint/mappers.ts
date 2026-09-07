import { formatFolio } from "@/lib/business";
import type {
  Aprobador,
  EstadoRequisicion,
  Moneda,
  NivelAprobacion,
  Origen,
  ParteCatalogo,
  RenglonRequisicion,
  Requisicion,
  TipoCambio,
  Turno,
  UsuarioRol
} from "@/lib/types";

// Nombres internos de columna tal como se crean en docs/SETUP-SHAREPOINT.md.

export interface CatalogoFields {
  NumeroParte: string;
  Descripcion: string;
  Origen: Origen;
  Costo: number;
  Localidad: string;
  Activo: boolean;
}

export function mapCatalogoFields(f: CatalogoFields): ParteCatalogo {
  return {
    numeroParte: f.NumeroParte,
    descripcion: f.Descripcion,
    origen: f.Origen,
    costo: f.Costo,
    localidad: f.Localidad,
    activo: f.Activo
  };
}

export interface AprobadorFields {
  Rol: NivelAprobacion;
  NombreCompleto: string;
  Correo: string;
  Activo: boolean;
}

export function mapAprobadorFields(f: AprobadorFields): Aprobador {
  return { rol: f.Rol, nombreCompleto: f.NombreCompleto, correo: f.Correo, activo: f.Activo };
}

export interface TipoCambioFields {
  Fecha: string;
  ValorMXNporUSD: number;
  Vigente: boolean;
}

export function mapTipoCambioFields(f: TipoCambioFields): TipoCambio {
  return { fecha: f.Fecha, valorMXNporUSD: f.ValorMXNporUSD, vigente: f.Vigente };
}

export interface RolFields {
  Correo: string;
  EsAlmacen: boolean;
  EsToolCrib: boolean;
  Activo: boolean;
}

export function mapRolFields(f: RolFields): UsuarioRol {
  return { correo: f.Correo, esAlmacen: f.EsAlmacen, esToolCrib: f.EsToolCrib, activo: f.Activo };
}

export interface RequisicionFields {
  Nombre: string;
  NoReloj: string;
  Turno: Turno;
  AreaDepto: string;
  Fecha: string;
  SolicitanteCorreo: string;
  TotalUSD: number;
  NivelAprobacion: NivelAprobacion;
  Estado: EstadoRequisicion;
  AprobadorCorreo?: string;
  AprobadoPor?: string;
  FechaAprobacion?: string;
  MotivoRechazo?: string;
  SurtidoPor?: string;
  FechaSurtido?: string;
  Created: string;
}

export interface RenglonFields {
  RequisicionLookupId: string | number;
  Cantidad: number;
  NumeroParte: string;
  Descripcion: string;
  Maquina: string;
  Origen: Origen;
  Moneda: Moneda;
  CostoUnitario: number;
  Localidad: string;
}

export function mapRenglonFields(f: RenglonFields, id: string): RenglonRequisicion {
  return {
    id: Number(id),
    numeroParte: f.NumeroParte,
    descripcion: f.Descripcion,
    cantidad: f.Cantidad,
    maquina: f.Maquina,
    origen: f.Origen,
    moneda: f.Moneda,
    costoUnitario: f.CostoUnitario,
    localidad: f.Localidad
  };
}

export function mapRequisicion(
  itemId: string,
  f: RequisicionFields,
  renglones: RenglonRequisicion[]
): Requisicion {
  const id = Number(itemId);
  return {
    id,
    folio: formatFolio(id),
    nombre: f.Nombre,
    noReloj: f.NoReloj,
    turno: f.Turno,
    areaDepto: f.AreaDepto,
    fecha: f.Fecha,
    solicitanteCorreo: f.SolicitanteCorreo,
    renglones,
    totalUSD: f.TotalUSD,
    nivelAprobacion: f.NivelAprobacion,
    estado: f.Estado,
    aprobadorCorreo: f.AprobadorCorreo,
    aprobadoPor: f.AprobadoPor,
    fechaAprobacion: f.FechaAprobacion,
    motivoRechazo: f.MotivoRechazo,
    surtidoPor: f.SurtidoPor,
    fechaSurtido: f.FechaSurtido,
    creado: f.Created
  };
}
