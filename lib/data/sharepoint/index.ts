import { nivelAprobacionPorMonto, totalUSD } from "@/lib/business";
import type { DataStore } from "@/lib/data/store";
import { sharepointConfig } from "@/lib/sharepoint/config";
import { graphGet, graphGetAllItems, graphPatch, graphPost } from "@/lib/sharepoint/graphClient";
import {
  mapAprobadorFields,
  mapCatalogoFields,
  mapRenglonFields,
  mapRequisicion,
  mapRolFields,
  mapTipoCambioFields,
  type AprobadorFields,
  type RenglonFields,
  type RequisicionFields,
  type RolFields,
  type TipoCambioFields
} from "@/lib/sharepoint/mappers";
import { odataEscape, spGet } from "@/lib/sharepoint/restClient";
import type { NuevaRequisicionInput, Requisicion } from "@/lib/types";

const siteId = () => sharepointConfig.siteId();

async function listIdCache(): Promise<Map<string, string>> {
  const g = globalThis as unknown as { __spListIdCache?: Map<string, string> };
  if (!g.__spListIdCache) {
    const names = [
      sharepointConfig.listRequisiciones(),
      sharepointConfig.listRenglones(),
      sharepointConfig.listAprobadores(),
      sharepointConfig.listTipoCambio(),
      sharepointConfig.listRoles()
    ];
    const cache = new Map<string, string>();
    for (const name of names) {
      const res = await graphGet<{ id: string }>(
        `/sites/${siteId()}/lists/${encodeURIComponent(name)}`
      );
      cache.set(name, res.id);
    }
    g.__spListIdCache = cache;
  }
  return g.__spListIdCache;
}

async function listId(listTitle: string): Promise<string> {
  const cache = await listIdCache();
  const id = cache.get(listTitle);
  if (!id) throw new Error(`No se encontró el id de la lista "${listTitle}".`);
  return id;
}

async function renglonesDe(requisicionId: number) {
  const listaId = await listId(sharepointConfig.listRenglones());
  const items = await graphGetAllItems<RenglonFields>(
    `/sites/${siteId()}/lists/${listaId}/items?expand=fields&$filter=fields/RequisicionLookupId eq ${requisicionId}`
  );
  return items.map((item) => mapRenglonFields(item.fields, item.id));
}

export const sharepointStore: DataStore = {
  async buscarPartes(prefijo, limite = 25) {
    const p = prefijo.trim();
    if (!p) return [];
    const listName = encodeURIComponent(sharepointConfig.listCatalogo());
    // startswith() sobre NumeroParte (columna indexada) evita el límite de
    // 5,000 elementos por vista de SharePoint en una lista de ~84,000 filas.
    // Nota: "Activo" NO se filtra aquí en el OData — en el catálogo real llega
    // como texto ("TRUE"/"FALSE") en vez de un campo Sí/No real, y un filtro
    // `eq 1` sobre una columna de texto falla o no devuelve nada. En vez de
    // exigir que alguien convierta el tipo de columna en SharePoint, se trae
    // un poco más de margen y se filtra aquí ya normalizado (mapCatalogoFields).
    const filter = `startswith(NumeroParte,'${odataEscape(p)}')`;
    const margen = Math.max(limite * 3, 50);
    const query =
      `$select=NumeroParte,Descripcion,Origen,Costo,Localidad,Activo` +
      `&$filter=${encodeURIComponent(filter)}` +
      `&$orderby=NumeroParte asc&$top=${margen}`;
    const res = await spGet<{ value: import("@/lib/sharepoint/mappers").CatalogoFields[] }>(
      `/web/lists/getbytitle('${listName}')/items?${query}`
    );
    return res.value.map(mapCatalogoFields).filter((parte) => parte.activo).slice(0, limite);
  },

  async obtenerParte(numeroParte) {
    const listName = encodeURIComponent(sharepointConfig.listCatalogo());
    const filter = `NumeroParte eq '${odataEscape(numeroParte.trim())}'`;
    const query = `$select=NumeroParte,Descripcion,Origen,Costo,Localidad,Activo&$filter=${encodeURIComponent(filter)}&$top=1`;
    const res = await spGet<{ value: import("@/lib/sharepoint/mappers").CatalogoFields[] }>(
      `/web/lists/getbytitle('${listName}')/items?${query}`
    );
    return res.value[0] ? mapCatalogoFields(res.value[0]) : null;
  },

  async obtenerTipoCambioVigente() {
    const listaId = await listId(sharepointConfig.listTipoCambio());
    const items = await graphGetAllItems<TipoCambioFields>(
      `/sites/${siteId()}/lists/${listaId}/items?expand=fields&$filter=fields/Vigente eq 1`,
      1
    );
    const item = items[0];
    if (!item) throw new Error("No hay un tipo de cambio marcado como Vigente en la lista TipoCambio.");
    return mapTipoCambioFields(item.fields);
  },

  async listarAprobadores() {
    const listaId = await listId(sharepointConfig.listAprobadores());
    const items = await graphGetAllItems<AprobadorFields>(
      `/sites/${siteId()}/lists/${listaId}/items?expand=fields`,
      100
    );
    return items.map((i) => mapAprobadorFields(i.fields));
  },

  async obtenerAprobador(rol) {
    const listaId = await listId(sharepointConfig.listAprobadores());
    const items = await graphGetAllItems<AprobadorFields>(
      `/sites/${siteId()}/lists/${listaId}/items?expand=fields&$filter=fields/Rol eq '${rol}' and fields/Activo eq 1`,
      1
    );
    return items[0] ? mapAprobadorFields(items[0].fields) : null;
  },

  async crearRequisicion(input: NuevaRequisicionInput) {
    const tipoCambio = await sharepointStore.obtenerTipoCambioVigente();
    const total = totalUSD(input.renglones, tipoCambio.valorMXNporUSD);
    const nivel = nivelAprobacionPorMonto(total);
    const aprobador = await sharepointStore.obtenerAprobador(nivel);

    const reqListaId = await listId(sharepointConfig.listRequisiciones());
    const created = await graphPost<{ id: string; fields: RequisicionFields }>(
      `/sites/${siteId()}/lists/${reqListaId}/items`,
      {
        fields: {
          Nombre: input.nombre,
          NoReloj: input.noReloj,
          Turno: input.turno,
          AreaDepto: input.areaDepto,
          Fecha: input.fecha,
          SolicitanteCorreo: input.solicitanteCorreo,
          TotalUSD: total,
          NivelAprobacion: nivel,
          Estado: "Pendiente",
          AprobadorCorreo: aprobador?.correo ?? ""
        }
      }
    );

    const requisicionId = Number(created.id);
    const renglonesListaId = await listId(sharepointConfig.listRenglones());
    for (const renglon of input.renglones) {
      await graphPost(`/sites/${siteId()}/lists/${renglonesListaId}/items`, {
        fields: {
          RequisicionLookupId: requisicionId,
          Cantidad: renglon.cantidad,
          NumeroParte: renglon.numeroParte,
          Descripcion: renglon.descripcion,
          Maquina: renglon.maquina,
          Origen: renglon.origen,
          Moneda: renglon.moneda,
          CostoUnitario: renglon.costoUnitario,
          Localidad: renglon.localidad,
          CapturaManual: renglon.capturaManual
        }
      });
    }

    const requisicion = await sharepointStore.obtenerRequisicion(`REQ-${String(requisicionId).padStart(5, "0")}`);
    if (!requisicion) throw new Error("La requisición se creó pero no pudo releerse.");
    // La creación del renglón de encabezado dispara el flujo de Power
    // Automate (trigger "cuando se crea un elemento" en la lista
    // Requisiciones) que envía la aprobación — ver docs/POWER-AUTOMATE-FLOW.md.
    return requisicion;
  },

  async listarRequisiciones(): Promise<Requisicion[]> {
    const listaId = await listId(sharepointConfig.listRequisiciones());
    const items = await graphGetAllItems<RequisicionFields>(
      `/sites/${siteId()}/lists/${listaId}/items?expand=fields&$orderby=fields/Created desc`,
      1000
    );
    // Nota: el detalle completo (renglones) solo se carga en obtenerRequisicion,
    // para que el historial sea rápido incluso con miles de requisiciones.
    return items.map((item) => mapRequisicion(item.id, item.fields, []));
  },

  async obtenerRequisicion(folio) {
    const id = Number(folio.replace(/[^0-9]/g, ""));
    if (!id) return null;
    const listaId = await listId(sharepointConfig.listRequisiciones());
    try {
      const item = await graphGet<{ id: string; fields: RequisicionFields }>(
        `/sites/${siteId()}/lists/${listaId}/items/${id}?expand=fields`
      );
      const renglones = await renglonesDe(id);
      return mapRequisicion(item.id, item.fields, renglones);
    } catch {
      return null;
    }
  },

  async marcarSurtida(folio, surtidoPor) {
    const requisicion = await sharepointStore.obtenerRequisicion(folio);
    if (!requisicion) throw new Error(`Requisición ${folio} no encontrada.`);
    if (requisicion.estado !== "Aprobada") {
      throw new Error(
        `Solo una requisición Aprobada puede marcarse como Surtida (estado actual: ${requisicion.estado}).`
      );
    }
    const listaId = await listId(sharepointConfig.listRequisiciones());
    await graphPatch(`/sites/${siteId()}/lists/${listaId}/items/${requisicion.id}/fields`, {
      Estado: "Surtida",
      SurtidoPor: surtidoPor,
      FechaSurtido: new Date().toISOString()
    });
    const actualizada = await sharepointStore.obtenerRequisicion(folio);
    if (!actualizada) throw new Error("No se pudo releer la requisición actualizada.");
    return actualizada;
  },

  async obtenerRol(correo) {
    const listaId = await listId(sharepointConfig.listRoles());
    const items = await graphGetAllItems<RolFields>(
      `/sites/${siteId()}/lists/${listaId}/items?expand=fields&$filter=fields/Correo eq '${odataEscape(correo)}'`,
      1
    );
    return items[0] ? mapRolFields(items[0].fields) : null;
  }
};
