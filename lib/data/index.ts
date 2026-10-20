import type { DataStore } from "./store";
import { mockStore } from "./mock";
import { sharepointStore } from "./sharepoint";

/**
 * DATA_MODE=mock   -> datos en memoria, para correr `npm run dev` sin un
 *                      tenant de Microsoft 365 real (demo / desarrollo local).
 * DATA_MODE=sharepoint (default en producción) -> listas reales de
 *                      SharePoint vía el flujo "ToolCrib-API" de Power
 *                      Automate (ver docs/POWER-AUTOMATE-API-FLOW.md).
 * lib/sharepoint/powerAutomateClient solo lee la variable de entorno
 * POWER_AUTOMATE_FLOW_URL cuando un método del store se invoca, así que
 * importar sharepointStore aquí es seguro aunque no exista en modo mock.
 */
function resolveStore(): DataStore {
  const mode = process.env.DATA_MODE ?? "mock";
  return mode === "sharepoint" ? sharepointStore : mockStore;
}

export const dataStore: DataStore = resolveStore();
