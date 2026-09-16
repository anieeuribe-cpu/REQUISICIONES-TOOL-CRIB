import { nivelAprobacionPorMonto, totalUSD } from "@/lib/business";
import type { DataStore } from "@/lib/data/store";
import { callFlow } from "@/lib/sharepoint/powerAutomateClient";
import {
  mapAprobadorFields,
  mapCatalogoFields,
  mapRenglonFields,
  mapRequisicion,
  mapRolFields,
  mapTipoCambioFields,
  type AprobadorFields,
  type CatalogoFields,
  type RenglonFields,
  type RequisicionFields,
  type RolFields,
  type TipoCambioFields
} from "@/lib/sharepoint/mappers";
import type { NuevaRequisicionInput, Requisicion } from "@/lib/types";

/** Forma en que el flujo de Power Automate devuelve una requisición completa (encabezado + renglones). */
interface RequisicionFlowItem {
  id: number;
  fields: RequisicionFields;
  renglones: Array<{ id: string; fields: RenglonFields }>;
}

function mapRequisicionFlowItem(item: RequisicionFlowItem): Requisicion {
  return mapRequisicion(
    String(item.id),
    item.fields,
    item.renglones.map((r) => mapRenglonFields(r.fields, r.id))
  );
}

export const sharepointStore: DataStore = {
  async buscarPartes(prefijo, limite = 25) {
    const p = prefijo.trim();
    if (!p) return [];
    const { partes } = await callFlow<{ partes: CatalogoFields[] }>("buscarPartes", { prefijo: p, limite });
    return partes.map(mapCatalogoFields).filter((parte) => parte.activo).slice(0, limite);
  },

  async obtenerParte(numeroParte) {
    const { parte } = await callFlow<{ parte: CatalogoFields | null }>("obtenerParte", {
      numeroParte: numeroParte.trim()
    });
    return parte ? mapCatalogoFields(parte) : null;
  },

  async obtenerTipoCambioVigente() {
    const { tipoCambio } = await callFlow<{ tipoCambio: TipoCambioFields | null }>("tipoCambioVigente", {});
    if (!tipoCambio) throw new Error("No hay un tipo de cambio marcado como Vigente en la lista TipoCambio.");
    return mapTipoCambioFields(tipoCambio);
  },

  async listarAprobadores() {
    const { aprobadores } = await callFlow<{ aprobadores: AprobadorFields[] }>("aprobadoresListar", {});
    return aprobadores.map(mapAprobadorFields);
  },

  async obtenerAprobador(rol) {
    const { aprobador } = await callFlow<{ aprobador: AprobadorFields | null }>("aprobadorObtener", { rol });
    return aprobador ? mapAprobadorFields(aprobador) : null;
  },

  async crearRequisicion(input: NuevaRequisicionInput) {
    // El cálculo de negocio (conversión de moneda, total, nivel de firma) se
    // queda en la app — igual que en modo mock — para que el flujo de Power
    // Automate solo tenga que crear los renglones en SharePoint, sin
    // reimplementar reglas de negocio en fórmulas de Power Automate.
    const tipoCambio = await sharepointStore.obtenerTipoCambioVigente();
    const total = totalUSD(input.renglones, tipoCambio.valorMXNporUSD);
    const nivel = nivelAprobacionPorMonto(total);
    const aprobador = await sharepointStore.obtenerAprobador(nivel);

    const { requisicion } = await callFlow<{ requisicion: RequisicionFlowItem }>("requisicionCrear", {
      nombre: input.nombre,
      noReloj: input.noReloj,
      turno: input.turno,
      areaDepto: input.areaDepto,
      fecha: input.fecha,
      solicitanteCorreo: input.solicitanteCorreo,
      totalUSD: total,
      nivelAprobacion: nivel,
      aprobadorCorreo: aprobador?.correo ?? "",
      renglones: input.renglones
    });
    // La creación del encabezado en SharePoint (dentro del flujo) dispara el
    // flujo de aprobación por separado — ver docs/POWER-AUTOMATE-FLOW.md.
    return mapRequisicionFlowItem(requisicion);
  },

  async listarRequisiciones(): Promise<Requisicion[]> {
    const { requisiciones } = await callFlow<{
      requisiciones: Array<{ id: number; fields: RequisicionFields }>;
    }>("requisicionesListar", {});
    // Nota: el detalle completo (renglones) solo se carga en obtenerRequisicion,
    // para que el historial sea rápido incluso con miles de requisiciones.
    return requisiciones.map((item) => mapRequisicion(String(item.id), item.fields, []));
  },

  async obtenerRequisicion(folio) {
    const id = Number(folio.replace(/[^0-9]/g, ""));
    if (!id) return null;
    const { requisicion } = await callFlow<{ requisicion: RequisicionFlowItem | null }>("requisicionObtener", {
      id
    });
    return requisicion ? mapRequisicionFlowItem(requisicion) : null;
  },

  async marcarSurtida(folio, surtidoPor) {
    const id = Number(folio.replace(/[^0-9]/g, ""));
    if (!id) throw new Error(`Requisición ${folio} no encontrada.`);
    // La validación de que el estado actual sea "Aprobada" la hace el propio
    // flujo (evita una condición de carrera entre leer y actualizar); si no
    // se cumple, el flujo responde con error y callFlow lanza una excepción.
    const { requisicion } = await callFlow<{ requisicion: RequisicionFlowItem }>("requisicionMarcarSurtida", {
      id,
      surtidoPor
    });
    return mapRequisicionFlowItem(requisicion);
  },

  async obtenerRol(correo) {
    const { rol } = await callFlow<{ rol: RolFields | null }>("rolObtener", { correo });
    return rol ? mapRolFields(rol) : null;
  }
};
