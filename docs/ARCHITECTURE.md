# Arquitectura

## Resumen

Aplicación web a la medida (Next.js 14, App Router, TypeScript) que usa
**listas de SharePoint como única base de datos**. No hay base de datos
propia: todo (requisiciones, renglones, catálogo de partes, aprobadores,
tipo de cambio, roles) vive en el sitio de SharePoint de la empresa,
dentro del tenant de Microsoft 365.

```
Navegador (empleado / almacén)
        │  HTTPS
        ▼
Next.js app (frontend + API routes)
        │  Microsoft Graph API           (Requisiciones, Renglones,
        │  SharePoint REST API           Aprobadores, TipoCambio, Roles)
        │  (_api/web/lists, solo Catálogo)
        ▼
Listas de SharePoint (tenant de Microsoft 365 de la empresa)
        ▲
        │  trigger "cuando se crea un elemento"
Power Automate (flujo de aprobación)
        │  conector Aprobaciones + Office 365 Outlook/Teams (estándar)
        ▼
Aprobador (Supervisor/Superintendente/Gerente) — botones Aprobar/Rechazar
en el correo o en Teams, sin abrir la app.
```

## Por qué esta división de responsabilidades

- **La app** hace todo el CRUD (crear requisición, listar historial, ver
  detalle, marcar "Surtida") y el autocompletado del catálogo de partes.
  Esto es lo que un flujo de Power Automate no puede hacer bien: UI rica,
  autocompletado con debounce, tablas de renglones dinámicas, cálculo de
  total en tiempo real.
- **Power Automate** hace solo el flujo de aprobación (correo/Teams con
  botones reales de Aprobar/Rechazar, sin que el aprobador tenga que
  abrir nada). Se dispara automáticamente cuando la app crea el
  encabezado de la requisición en la lista `Requisiciones` — la app no
  necesita llamar a ningún webhook ni exponer ningún endpoint público
  para esto. Ver [`POWER-AUTOMATE-FLOW.md`](POWER-AUTOMATE-FLOW.md).

## Capa de datos (`lib/data`)

Toda la app programa contra la interfaz `DataStore`
(`lib/data/store.ts`), con dos implementaciones intercambiables por la
variable de entorno `DATA_MODE`:

- `lib/data/mock` — datos en memoria con catálogo, aprobadores, tipo de
  cambio y roles de ejemplo. Permite correr `npm run dev` y probar la
  app de punta a punta (incluida una simulación de la decisión del
  aprobador) sin tener un tenant de Microsoft 365 real a la mano.
- `lib/data/sharepoint` — listas reales, vía:
  - **Microsoft Graph** (`/sites/{id}/lists/{id}/items`) para
    Requisiciones, RequisicionRenglones, Aprobadores, TipoCambio y
    RolesUsuarios (listas pequeñas/medianas).
  - **SharePoint REST clásica** (`_api/web/lists/getbytitle(...)/items`)
    solo para el catálogo de partes: es la que soporta `startswith()`
    sobre una columna indexada sin toparse con el límite de vista de
    5,000 elementos en una lista de ~84,000 filas. Ver
    [`SETUP-SHAREPOINT.md`](SETUP-SHAREPOINT.md).

Las reglas de negocio (conversión de moneda, total en USD, nivel de
aprobación, folio) están en `lib/business.ts` y se usan tanto en el
navegador (para el total en tiempo real mientras se captura) como en el
backend (al guardar), así nunca se desincronizan.

## Autenticación

La versión actual usa una identificación ligera por cookie
(`lib/auth.ts`, pantalla "Identifícate") para saber quién captura la
requisición y resolver el rol de Almacén — **no** es un mecanismo de
seguridad. Antes de producción, sustituir `getCurrentUser()` por el
inicio de sesión único (SSO) de Microsoft Entra ID que ya usan las demás
apps internas de la planta (por ejemplo `next-auth` con el proveedor de
Azure AD, o el mismo reverse proxy/IdP corporativo). Como el resto de la
app solo depende de `getCurrentUser()`, ese cambio no toca pantallas ni
rutas de API.

## Credenciales de la app hacia SharePoint

A diferencia de una solución 100% Power Platform, una aplicación web
propia sí necesita un **registro de aplicación en Microsoft Entra ID**
(client id + client secret, autenticación app-only/"client credentials")
para poder llamar a Microsoft Graph y a la REST API de SharePoint desde
el backend. Esto es inherente a conectar cualquier código externo a
SharePoint — no hay forma de evitarlo sin usar Power Apps/Power Automate
como capa exclusiva de acceso a datos. El detalle de permisos y consentimiento
está en [`SETUP-SHAREPOINT.md`](SETUP-SHAREPOINT.md). Los datos, en
cualquier caso, nunca salen del tenant de Microsoft de la empresa: el app
registration solo autoriza a la propia app a leer/escribir sus listas.

## Estructura del proyecto

```
app/
  layout.tsx                 Header + identificación (navy/blanco)
  page.tsx                   Landing
  requisiciones/
    nueva/page.tsx            Pantalla 1: Nueva requisición
    historial/page.tsx        Pantalla 2: Historial
    [folio]/page.tsx          Pantalla 3: Detalle
  api/
    catalogo/search           Autocompletado (startswith, indexado)
    requisiciones              Crear / listar
    requisiciones/[folio]      Detalle
    requisiciones/[folio]/surtir  Marcar Surtida (rol Almacén)
    tipo-cambio                 Tipo de cambio vigente
    dev/aprobar/[folio]         Solo DATA_MODE=mock: simula la decisión
                                 que en producción toma Power Automate
    auth/session                 Identificación ligera (cookie)
components/                  UI (form, tabla de renglones, autocompletar,
                              badges de estado, botón Surtir, etc.)
lib/
  types.ts                   Tipos del dominio
  business.ts                Reglas de negocio (moneda, total, nivel, folio)
  auth.ts                    Identidad del usuario actual
  data/                      DataStore + implementaciones mock/sharepoint
  sharepoint/                Auth (MSAL), cliente Graph, cliente REST, mapeos
docs/                        Este documento + esquema de listas + flujo de aprobación
```
