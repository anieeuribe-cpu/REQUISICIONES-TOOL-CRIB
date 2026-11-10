import type { Aprobador, NivelAprobacion, RenglonRequisicion } from "./types";

/**
 * Reglas de negocio de la requisición: conversión de moneda, total en USD
 * y nivel de aprobación. Viven en un solo lugar para que la captura (en
 * tiempo real) y el backend (al guardar) calculen exactamente lo mismo.
 */

export function costoLineaEnUSD(renglon: RenglonRequisicion, valorMXNporUSD: number): number {
  const importe = renglon.cantidad * renglon.costoUnitario;
  if (renglon.moneda === "USD") return importe;
  if (valorMXNporUSD <= 0) {
    throw new Error("El tipo de cambio configurado debe ser mayor a cero.");
  }
  return importe / valorMXNporUSD;
}

export function totalUSD(renglones: RenglonRequisicion[], valorMXNporUSD: number): number {
  const total = renglones.reduce((acc, r) => acc + costoLineaEnUSD(r, valorMXNporUSD), 0);
  return Math.round(total * 100) / 100;
}

/** $0–100 Supervisor · $101–500 Superintendente · >$500 Gerente. */
export function nivelAprobacionPorMonto(totalUsd: number): NivelAprobacion {
  if (totalUsd <= 100) return "Supervisor";
  if (totalUsd <= 500) return "Superintendente";
  return "Gerente";
}

/**
 * Elige a quién se le manda la aprobación: primero busca aprobadores de ese
 * nivel en la MISMA área/departamento de la requisición (puede haber más de
 * uno — ej. dos Supervisores de Mantenimiento — y se mandan todos juntos,
 * separados por ";", para que apruebe el que responda primero). Si no hay
 * nadie de ese nivel para esa área exacta (incluye cuando el área es "Otro",
 * o cuando esa combinación nivel+área simplemente no está dada de alta
 * todavía), cae de regreso a cualquier aprobador de ese nivel, sin importar
 * su área — mejor avisarle a alguien de más que dejar la requisición sin
 * nadie que la apruebe.
 */
export function elegirAprobadorCorreos(aprobadores: Aprobador[], nivel: NivelAprobacion, area: string): string {
  const porNivel = aprobadores.filter((a) => a.rol === nivel);
  const areaNormalizada = area.trim().toLowerCase();
  const porNivelYArea = porNivel.filter((a) => a.area && a.area.trim().toLowerCase() === areaNormalizada);
  const candidatos = porNivelYArea.length > 0 ? porNivelYArea : porNivel;
  // Quita duplicados por correo (comparando sin mayúsculas/minúsculas, pero
  // conservando el primero tal como viene): si dos aprobadores comparten el
  // mismo correo (a propósito, como en pruebas, o por una fila repetida que
  // SharePoint regrese de más alguna vez), no tiene caso mandarlo dos veces
  // — con que le llegue una sola notificación a ese buzón basta.
  const vistos = new Set<string>();
  const correosUnicos: string[] = [];
  for (const a of candidatos) {
    const correo = a.correo.trim();
    const clave = correo.toLowerCase();
    if (correo && !vistos.has(clave)) {
      vistos.add(clave);
      correosUnicos.push(correo);
    }
  }
  return correosUnicos.join(";");
}

/** Se le suma 999 al ID de SharePoint para que el folio visible empiece en 1000. */
const BASE_FOLIO = 999;

export function formatFolio(id: number): string {
  return String(id + BASE_FOLIO);
}

/** Inverso de formatFolio: recupera el ID real de SharePoint a partir del folio mostrado. */
export function parseFolioId(folio: string): number {
  return Number(folio.replace(/[^0-9]/g, "")) - BASE_FOLIO;
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function formatMXN(value: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}
