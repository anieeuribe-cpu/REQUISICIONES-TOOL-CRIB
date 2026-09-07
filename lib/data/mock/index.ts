import type { DataStore } from "@/lib/data/store";
import { formatFolio, nivelAprobacionPorMonto, totalUSD } from "@/lib/business";
import type { NuevaRequisicionInput, Requisicion } from "@/lib/types";
import { APROBADORES_SEED, CATALOGO_SEED, ROLES_SEED, TIPO_CAMBIO_SEED } from "./seed";

// El estado vive en globalThis para sobrevivir el hot-reload de `next dev`.
const g = globalThis as unknown as { __toolcribRequisiciones?: Requisicion[]; __toolcribNextId?: number };
if (!g.__toolcribRequisiciones) g.__toolcribRequisiciones = [];
if (!g.__toolcribNextId) g.__toolcribNextId = 1;

function nextId(): number {
  const id = g.__toolcribNextId!;
  g.__toolcribNextId = id + 1;
  return id;
}

export const mockStore: DataStore = {
  async buscarPartes(prefijo, limite = 25) {
    const p = prefijo.trim().toUpperCase();
    if (!p) return [];
    return CATALOGO_SEED.filter((parte) => parte.activo && parte.numeroParte.toUpperCase().startsWith(p)).slice(
      0,
      limite
    );
  },

  async obtenerParte(numeroParte) {
    const p = numeroParte.trim().toUpperCase();
    return CATALOGO_SEED.find((parte) => parte.numeroParte.toUpperCase() === p) ?? null;
  },

  async obtenerTipoCambioVigente() {
    return TIPO_CAMBIO_SEED;
  },

  async listarAprobadores() {
    return APROBADORES_SEED;
  },

  async obtenerAprobador(rol) {
    return APROBADORES_SEED.find((a) => a.rol === rol && a.activo) ?? null;
  },

  async crearRequisicion(input: NuevaRequisicionInput) {
    const { valorMXNporUSD } = TIPO_CAMBIO_SEED;
    const total = totalUSD(input.renglones, valorMXNporUSD);
    const nivel = nivelAprobacionPorMonto(total);
    const aprobador = APROBADORES_SEED.find((a) => a.rol === nivel && a.activo);

    const id = nextId();
    const requisicion: Requisicion = {
      id,
      folio: formatFolio(id),
      nombre: input.nombre,
      noReloj: input.noReloj,
      turno: input.turno,
      areaDepto: input.areaDepto,
      fecha: input.fecha,
      solicitanteCorreo: input.solicitanteCorreo,
      renglones: input.renglones.map((r, i) => ({ ...r, id: i + 1 })),
      totalUSD: total,
      nivelAprobacion: nivel,
      estado: "Pendiente",
      aprobadorCorreo: aprobador?.correo,
      creado: new Date().toISOString()
    };

    g.__toolcribRequisiciones!.unshift(requisicion);
    return requisicion;
  },

  async listarRequisiciones() {
    return [...g.__toolcribRequisiciones!];
  },

  async obtenerRequisicion(folio) {
    return g.__toolcribRequisiciones!.find((r) => r.folio === folio) ?? null;
  },

  async marcarSurtida(folio, surtidoPor) {
    const req = g.__toolcribRequisiciones!.find((r) => r.folio === folio);
    if (!req) throw new Error(`Requisición ${folio} no encontrada.`);
    if (req.estado !== "Aprobada") {
      throw new Error(`Solo una requisición Aprobada puede marcarse como Surtida (estado actual: ${req.estado}).`);
    }
    req.estado = "Surtida";
    req.surtidoPor = surtidoPor;
    req.fechaSurtido = new Date().toISOString();
    return req;
  },

  async obtenerRol(correo) {
    return ROLES_SEED.find((u) => u.correo.toLowerCase() === correo.toLowerCase()) ?? null;
  }
};

/**
 * Simula lo que en producción hace el flujo de Power Automate: al crear
 * una requisición Pendiente, un aprobador la aprueba o rechaza. Solo
 * existe en el modo mock para poder probar la UI de punta a punta sin
 * un tenant real; en SharePoint esto lo hace el flujo descrito en
 * docs/POWER-AUTOMATE-FLOW.md, no la aplicación web.
 */
export async function simularDecisionAprobador(
  folio: string,
  decision: "Aprobada" | "Rechazada",
  motivoRechazo?: string
) {
  const req = g.__toolcribRequisiciones!.find((r) => r.folio === folio);
  if (!req) throw new Error(`Requisición ${folio} no encontrada.`);
  if (req.estado !== "Pendiente") {
    throw new Error(`Solo una requisición Pendiente puede aprobarse/rechazarse (estado actual: ${req.estado}).`);
  }
  const aprobador = APROBADORES_SEED.find((a) => a.rol === req.nivelAprobacion);
  req.estado = decision;
  req.aprobadoPor = aprobador?.nombreCompleto;
  req.fechaAprobacion = new Date().toISOString();
  if (decision === "Rechazada") req.motivoRechazo = motivoRechazo || "Sin motivo especificado.";
  return req;
}
