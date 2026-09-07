import type { DataStore } from "./store";
import { mockStore } from "./mock";
import { sharepointStore } from "./sharepoint";

/**
 * DATA_MODE=mock   -> datos en memoria, para correr `npm run dev` sin un
 *                      tenant de Microsoft 365 real (demo / desarrollo local).
 * DATA_MODE=sharepoint (default en producción) -> listas reales de
 *                      SharePoint vía Microsoft Graph + SharePoint REST.
 * Las funciones de lib/sharepoint/config solo leen variables de entorno
 * cuando un método del store se invoca, así que importar sharepointStore
 * aquí es seguro aunque esas variables no existan en modo mock.
 */
function resolveStore(): DataStore {
  const mode = process.env.DATA_MODE ?? "mock";
  return mode === "sharepoint" ? sharepointStore : mockStore;
}

export const dataStore: DataStore = resolveStore();
