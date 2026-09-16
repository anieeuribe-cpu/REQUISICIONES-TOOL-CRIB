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
        │  POST { accion, payload }
        ▼
Power Automate — flujo "ToolCrib-API"
        │  disparador HTTP (estándar) + conector nativo de SharePoint
        │  (Obtener/Crear/Actualizar elementos)
        ▼
Listas de SharePoint (tenant de Microsoft 365 de la empresa)
        ▲
        │  trigger "cuando se crea un elemento"
Power Automate — flujo de aprobación (otro flujo, separado)
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
  total en tiempo real. Las reglas de negocio (conversión de moneda,
  total, nivel de aprobación) también viven en la app (`lib/business.ts`),
  no en el flujo — así el flujo se queda simple (solo CRUD contra
  SharePoint) y no hay que reimplementar fórmulas de negocio dos veces.
- **El flujo "ToolCrib-API"** es la única vía de la app hacia
  SharePoint: en vez de que el backend llame directo a Microsoft Graph
  (lo que exigiría un registro de aplicación en Entra ID y aprobación de
  un administrador de IT), la app le hace `POST` a este flujo, y el
  flujo lee/escribe las listas con el conector estándar de SharePoint,
  usando los permisos del usuario de Microsoft 365 que lo creó — sin
  registrar nada en Azure. Ver
  [`POWER-AUTOMATE-API-FLOW.md`](POWER-AUTOMATE-API-FLOW.md).
- **El flujo de aprobación** (uno distinto) hace solo eso: correo/Teams
  con botones reales de Aprobar/Rechazar, sin que el aprobador tenga que
  abrir nada. Se dispara automáticamente cuando se crea el encabezado de
  la requisición en la lista `Requisiciones` (vía el flujo
  "ToolCrib-API") — no hay que llamarlo desde la app. Ver
  [`POWER-AUTOMATE-FLOW.md`](POWER-AUTOMATE-FLOW.md).

## Capa de datos (`lib/data`)

Toda la app programa contra la interfaz `DataStore`
(`lib/data/store.ts`), con dos implementaciones intercambiables por la
variable de entorno `DATA_MODE`:

- `lib/data/mock` — datos en memoria con catálogo, aprobadores, tipo de
  cambio y roles de ejemplo. Permite correr `npm run dev` y probar la
  app de punta a punta (incluida una simulación de la decisión del
  aprobador) sin tener un tenant de Microsoft 365 real a la mano.
- `lib/data/sharepoint` — listas reales, vía `lib/sharepoint/powerAutomateClient.ts`,
  que le hace `POST { accion, payload }` al flujo "ToolCrib-API"
  (`POWER_AUTOMATE_FLOW_URL`) y recibe de vuelta el JSON ya armado. Ver
  [`POWER-AUTOMATE-API-FLOW.md`](POWER-AUTOMATE-API-FLOW.md) para el
  detalle de las 10 acciones del flujo, y
  [`SETUP-SHAREPOINT.md`](SETUP-SHAREPOINT.md) para el esquema de listas.

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

La app **no** tiene credenciales propias hacia SharePoint ni Microsoft
Graph: no hay client id/secret, no hay registro de aplicación en Entra
ID. Todo el acceso a datos pasa por el flujo de Power Automate
"ToolCrib-API", que corre con los permisos de la cuenta de Microsoft
365 de quien lo creó (conector estándar de SharePoint, sin admin
consent). Lo único que la app necesita guardar es la URL del disparador
HTTP de ese flujo (`POWER_AUTOMATE_FLOW_URL`), que no es información
sensible de la empresa — solo apunta a este flujo específico. Los
datos, en cualquier caso, nunca salen del tenant de Microsoft de la
empresa.

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
  sharepoint/                Cliente del flujo Power Automate, mapeos de campos
docs/                        Este documento + esquema de listas + flujo de datos + flujo de aprobación
```
