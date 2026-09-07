# REQUISICIONES-TOOL-CRIB

Plataforma de Requisiciones de Material del Tool Crib de la planta:
aplicación web a la medida (Next.js + TypeScript) que usa **listas de
SharePoint como base de datos** y **Power Automate** solo para el flujo
de aprobación (botones reales de Aprobar/Rechazar desde correo/Teams).

Ver la especificación funcional completa en
[`requisiciones-material-tool-crib.md`](requisiciones-material-tool-crib.md)
y el diseño técnico en [`docs/`](docs/):

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitectura general.
- [`docs/SETUP-SHAREPOINT.md`](docs/SETUP-SHAREPOINT.md) — listas,
  columnas, índices y registro de aplicación en Entra ID.
- [`docs/POWER-AUTOMATE-FLOW.md`](docs/POWER-AUTOMATE-FLOW.md) — el
  flujo de aprobación paso a paso.

## Correr en local (modo demo, sin tenant real)

```bash
npm install
cp .env.example .env.local   # DATA_MODE=mock por defecto
npm run dev
```

Abre `http://localhost:3000`. En modo `mock` los datos (catálogo de
partes, aprobadores, tipo de cambio, roles) viven en memoria con datos
de ejemplo, y la pantalla de Detalle incluye un panel para simular la
decisión del aprobador — así se puede probar el flujo completo
(Pendiente → Aprobada/Rechazada → Surtida) sin un tenant de Microsoft
365.

## Conectar a SharePoint real

1. Seguir [`docs/SETUP-SHAREPOINT.md`](docs/SETUP-SHAREPOINT.md) para
   crear las listas y el registro de aplicación en Entra ID.
2. Crear el flujo de Power Automate descrito en
   [`docs/POWER-AUTOMATE-FLOW.md`](docs/POWER-AUTOMATE-FLOW.md).
3. En `.env.local`, poner `DATA_MODE=sharepoint` y llenar
   `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`,
   `SHAREPOINT_SITE_URL` y `SHAREPOINT_SITE_ID`.

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` / `npm run start` — build y arranque de producción.
- `npm run typecheck` — verificación de tipos.
