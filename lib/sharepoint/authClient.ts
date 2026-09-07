import { ConfidentialClientApplication } from "@azure/msal-node";
import { sharepointConfig, sharepointResourceScope } from "./config";

/**
 * Autenticación app-only (client credentials) contra Microsoft Entra ID.
 * Requiere un registro de aplicación en Entra ID con permisos de
 * aplicación concedidos por un administrador (Sites.ReadWrite.All en
 * Microsoft Graph, y/o permisos "Sitios.ReadWrite.All" en SharePoint) —
 * ver docs/SETUP-SHAREPOINT.md. Esto reemplaza el registro de app que la
 * versión 100% Power Platform de esta solución buscaba evitar: al ser
 * ahora una aplicación web propia, es indispensable para poder llamar a
 * la API de SharePoint desde el backend.
 */
let msalApp: ConfidentialClientApplication | null = null;

function getMsalApp(): ConfidentialClientApplication {
  if (!msalApp) {
    msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: sharepointConfig.clientId(),
        authority: `https://login.microsoftonline.com/${sharepointConfig.tenantId()}`,
        clientSecret: sharepointConfig.clientSecret()
      }
    });
  }
  return msalApp;
}

async function acquireToken(scope: string): Promise<string> {
  const result = await getMsalApp().acquireTokenByClientCredential({ scopes: [scope] });
  if (!result?.accessToken) {
    throw new Error(`No se pudo obtener un token de acceso para el scope ${scope}.`);
  }
  return result.accessToken;
}

/** Token para Microsoft Graph (listas de Requisiciones, Renglones, Aprobadores, TipoCambio, Roles). */
export function getGraphToken(): Promise<string> {
  return acquireToken("https://graph.microsoft.com/.default");
}

/**
 * Token con el recurso de SharePoint (no Graph). Se usa exclusivamente
 * para el catálogo de partes: la REST API clásica de SharePoint
 * (_api/web/lists) soporta `startswith()` sobre una columna indexada sin
 * tropezar con el límite de vista de 5,000 elementos, algo que Graph no
 * garantiza igual para listas de ~84,000 filas.
 */
export function getSharePointToken(): Promise<string> {
  return acquireToken(sharepointResourceScope());
}
