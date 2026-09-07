# Flujo de aprobación (Power Automate)

Un único flujo de nube, construido solo con conectores estándar
(SharePoint, Aprobaciones, Office 365 Outlook/Teams) — **sin** conector
HTTP/premium, sin registrar nada en Azure, sin permisos especiales de
IT. El flujo lo puede crear cualquier persona con licencia de Power
Automate incluida en Microsoft 365 y acceso al sitio de SharePoint.

## Por qué vive aquí y no en la app

Los botones "Aprobar"/"Rechazar" que funcionan **desde el correo o
Teams sin abrir ninguna app** son la acción nativa **Iniciar y esperar
una aprobación** del conector estándar de Aprobaciones. Reconstruir eso
a mano (tokens firmados, páginas de confirmación, Actionable Messages)
sería más frágil y, sobre todo, innecesario: Microsoft ya lo resuelve
con un conector no premium. Por eso el flujo de aprobación se queda en
Power Automate y la app solo lee el resultado (columnas `Estado`,
`AprobadoPor`, `FechaAprobacion`, `MotivoRechazo`) que el propio flujo
escribe de vuelta en la lista `Requisiciones`.

## Disparador

**Cuando se crea un elemento** — SharePoint — sitio: el del Tool Crib,
lista: `Requisiciones`.

No se necesita ningún endpoint HTTP ni webhook: como la app escribe
directamente en la lista al guardar la requisición, el flujo se dispara
solo.

## Pasos

1. **Obtener elemento** (ya viene en el disparador) — trae
   `NivelAprobacion`, `TotalUSD`, `Nombre`, `AreaDepto`, `Fecha`,
   `AprobadorCorreo` (la app ya resolvió y guardó el correo correcto al
   crear la requisición, según la regla `$0–100 → Supervisor`,
   `$101–500 → Superintendente`, `>$500 → Gerente`).

   *(Opcional, más robusto ante ediciones manuales de la lista: en vez
   de confiar en `AprobadorCorreo`, agregar aquí un **Obtener elementos**
   sobre `Aprobadores` filtrando `Rol eq item()?['NivelAprobacion']` y
   `Activo eq 1`, y usar ese correo. Así un cambio en `Aprobadores` aplica
   incluso si `AprobadorCorreo` quedó desactualizado.)*

2. **Obtener elementos** sobre `RequisicionRenglones`, filtro
   `Requisicion/Id eq [ID del elemento disparador]`, para armar el
   detalle de renglones que se muestra dentro de la aprobación.

3. **Crear texto HTML a partir de una tabla** (o simplemente concatenar
   texto) con los renglones: número de parte, descripción, cantidad,
   costo — para incluirlo en el cuerpo de la aprobación.

4. **Iniciar y esperar una aprobación** (conector *Aprobaciones*):
   - Tipo de aprobación: **Aprobar/Rechazar - Primera respuesta gana**
     (un solo aprobador).
   - Asignado a: el correo obtenido en el paso 1 (o 1-opcional).
   - Título: `Requisición [Folio] — [AreaDepto] — $[TotalUSD] USD —
     firma [NivelAprobacion]`.
   - Detalles: nombre del solicitante, turno, fecha, tabla de renglones
     del paso 3, y el total en USD.

   Esto es lo que genera el correo/notificación de Outlook y Teams con
   los botones **Aprobar** / **Rechazar** de verdad, usable desde el
   celular sin abrir la app ni iniciar sesión en nada adicional. Si el
   aprobador rechaza, el conector de Aprobaciones ya incluye un campo de
   comentario — ahí captura el motivo.

5. **Condición**: `Resultado de la aprobación` es igual a `Approve`.

   - **Si es Sí (Aprobada):**
     **Actualizar elemento** en `Requisiciones` (mismo ID):
     - `Estado` = `Aprobada`
     - `AprobadoPor` = responsable de la respuesta (`Responder cuando`
       → `Responder correo electrónico` o `Nombre para mostrar del
       respondedor`)
     - `FechaAprobacion` = marca de tiempo actual (`utcNow()`)

   - **Si es No (Rechazada):**
     **Actualizar elemento** en `Requisiciones` (mismo ID):
     - `Estado` = `Rechazada`
     - `AprobadoPor` = respondedor
     - `FechaAprobacion` = `utcNow()`
     - `MotivoRechazo` = comentario capturado por el aprobador en el
       paso de Aprobaciones

6. *(Opcional)* **Enviar un correo electrónico (V2)** al solicitante
   (`SolicitanteCorreo`) avisando el resultado, con el folio y — si fue
   rechazada — el motivo.

La app muestra este resultado tal cual en la pantalla de Detalle
(`app/requisiciones/[folio]/page.tsx`): quién aprobó/rechazó, cuándo, y
el motivo si aplica. El botón "Marcar como Surtida" solo aparece ahí
cuando `Estado = Aprobada` y el usuario que entró a la app tiene
`EsAlmacen = Sí` en `RolesUsuarios`.

## Notas de mantenimiento

- Cambiar quién es el Supervisor/Superintendente/Gerente: editar
  `Aprobadores`, no el flujo.
- Cambiar los montos de la regla de aprobación: hoy la app calcula
  `NivelAprobacion` (`lib/business.ts#nivelAprobacionPorMonto`) antes de
  guardar, así que el flujo no necesita conocer los rangos — solo lee el
  valor ya calculado.
- El modo `DATA_MODE=mock` de la app (desarrollo/demo) **no** dispara
  este flujo; en su lugar expone un panel de prueba en la pantalla de
  Detalle (`components/DevAprobarPanel.tsx`) que simula la decisión del
  aprobador localmente, para poder probar la app completa sin un tenant
  real.
