import type { NivelAprobacion, RenglonRequisicion } from "./types";

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

export function formatFolio(id: number): string {
  return `REQ-${String(id).padStart(5, "0")}`;
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function formatMXN(value: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}
