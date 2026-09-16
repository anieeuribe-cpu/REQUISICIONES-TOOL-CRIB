/**
 * Cliente para el flujo "ToolCrib-API" de Power Automate: un único flujo con
 * disparador "Cuando se recibe una solicitud HTTP" (conector estándar, no
 * premium) que hace de intermediario hacia las listas de SharePoint usando
 * el conector nativo de SharePoint — sin registrar ninguna app en Entra ID
 * ni pedir permisos de administrador de IT. Ver docs/POWER-AUTOMATE-API-FLOW.md.
 *
 * Contrato: POST { accion: string, payload: object } -> el flujo responde
 * con el JSON correspondiente a esa acción (ver el doc de arriba).
 */

function flowUrl(): string {
  const url = process.env.POWER_AUTOMATE_FLOW_URL;
  if (!url) {
    throw new Error(
      "Falta la variable de entorno POWER_AUTOMATE_FLOW_URL. Revisa .env.example y docs/POWER-AUTOMATE-API-FLOW.md."
    );
  }
  return url;
}

export async function callFlow<T>(accion: string, payload: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(flowUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion, payload }),
    cache: "no-store"
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`El flujo de Power Automate respondió algo que no es JSON válido (acción "${accion}"): ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    const mensaje = (data as { error?: string })?.error ?? text;
    throw new Error(`Power Automate (acción "${accion}") -> ${res.status}: ${mensaje}`);
  }
  return data as T;
}
