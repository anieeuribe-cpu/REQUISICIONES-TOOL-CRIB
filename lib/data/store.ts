import type {
  Aprobador,
  NuevaRequisicionInput,
  ParteCatalogo,
  Requisicion,
  TipoCambio,
  UsuarioRol
} from "@/lib/types";

/**
 * Contrato único para acceder a los datos (requisiciones, catálogo,
 * aprobadores, tipo de cambio, roles). Dos implementaciones:
 *  - lib/data/mock: en memoria, para desarrollo/demo local sin tenant.
 *  - lib/data/sharepoint: listas reales de SharePoint (Graph + SP REST).
 * Elegida en runtime por lib/data/index.ts según DATA_MODE.
 */
export interface DataStore {
  /** Autocompletado por "empieza con" sobre la columna indexada NumeroParte. */
  buscarPartes(prefijo: string, limite?: number): Promise<ParteCatalogo[]>;
  obtenerParte(numeroParte: string): Promise<ParteCatalogo | null>;

  obtenerTipoCambioVigente(): Promise<TipoCambio>;

  listarAprobadores(): Promise<Aprobador[]>;
  obtenerAprobador(rol: Aprobador["rol"]): Promise<Aprobador | null>;

  crearRequisicion(input: NuevaRequisicionInput): Promise<Requisicion>;
  listarRequisiciones(): Promise<Requisicion[]>;
  obtenerRequisicion(folio: string): Promise<Requisicion | null>;
  marcarSurtida(folio: string, surtidoPor: string): Promise<Requisicion>;

  obtenerRol(correo: string): Promise<UsuarioRol | null>;
}
