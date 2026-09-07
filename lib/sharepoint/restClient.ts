import { getSharePointToken } from "./authClient";
import { sharepointConfig } from "./config";

/**
 * Cliente para la REST API clásica de SharePoint (_api/web/...), usada
 * solo para el catálogo de partes: soporta `startswith()` sobre una
 * columna indexada de forma eficiente en listas grandes (~84,000 filas),
 * a diferencia de Microsoft Graph.
 */
async function spFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getSharePointToken();
  const siteUrl = sharepointConfig.siteUrl().replace(/\/$/, "");
  const res = await fetch(`${siteUrl}/_api${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json;odata=nometadata",
      "Content-Type": "application/json;odata=verbose",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SharePoint REST ${init?.method ?? "GET"} ${path} -> ${res.status}: ${body}`);
  }
  return res;
}

export async function spGet<T>(path: string): Promise<T> {
  const res = await spFetch(path, { method: "GET" });
  return (await res.json()) as T;
}

/** Escapa comillas simples para armar filtros OData de forma segura ('' == comilla literal). */
export function odataEscape(value: string): string {
  return value.replace(/'/g, "''");
}
