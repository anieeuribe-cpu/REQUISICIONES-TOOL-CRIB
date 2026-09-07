function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Revisa .env.example y docs/SETUP-SHAREPOINT.md.`
    );
  }
  return value;
}

export const sharepointConfig = {
  tenantId: () => required("AZURE_TENANT_ID"),
  clientId: () => required("AZURE_CLIENT_ID"),
  clientSecret: () => required("AZURE_CLIENT_SECRET"),
  /** Ej. https://empresa.sharepoint.com/sites/ToolCrib */
  siteUrl: () => required("SHAREPOINT_SITE_URL"),
  /** Ej. empresa.sharepoint.com,<site-guid>,<web-guid> — id de sitio para Microsoft Graph. */
  siteId: () => required("SHAREPOINT_SITE_ID"),

  listRequisiciones: () => process.env.SP_LIST_REQUISICIONES || "Requisiciones",
  listRenglones: () => process.env.SP_LIST_RENGLONES || "RequisicionRenglones",
  listCatalogo: () => process.env.SP_LIST_CATALOGO || "CatalogoPartes",
  listAprobadores: () => process.env.SP_LIST_APROBADORES || "Aprobadores",
  listTipoCambio: () => process.env.SP_LIST_TIPOCAMBIO || "TipoCambio",
  listRoles: () => process.env.SP_LIST_ROLES || "RolesUsuarios"
};

function hostFromSiteUrl(siteUrl: string): string {
  return new URL(siteUrl).hostname;
}

export function sharepointResourceScope(): string {
  return `https://${hostFromSiteUrl(sharepointConfig.siteUrl())}/.default`;
}
