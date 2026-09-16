# Flujo "ToolCrib-API" (Power Automate como capa de datos)

Este flujo reemplaza la conexión directa por Microsoft Graph/registro de
app en Entra ID: la app web llama a **un solo flujo de Power Automate**
(disparador HTTP, conector estándar) que hace el trabajo real contra
SharePoint usando el conector nativo de SharePoint — con el propio
usuario que crea el flujo, sin admin, sin IT.

> Ver también [`POWER-AUTOMATE-FLOW.md`](POWER-AUTOMATE-FLOW.md), que es
> un flujo **distinto**: ese es el de aprobación (correo con botones
> Aprobar/Rechazar). Este documento es el de lectura/escritura de datos.

## Contrato

La app hace `POST` a la URL del disparador con:

```json
{ "accion": "buscarPartes", "payload": { "prefijo": "US-000", "limite": 25 } }
```

Y el flujo responde JSON según la acción (detalle abajo). Dentro del
flujo, cada valor del payload se lee con una expresión así (sin usar
"Parse JSON", para no tener que fijar un esquema único que sirva para
las 10 acciones distintas):

```
triggerBody()?['payload']?['prefijo']
```

## 1. Crear el flujo y el disparador

1. **Power Automate → Crear → Flujo de nube instantáneo.**
2. Nombre: `ToolCrib-API`.
3. Disparador: **"Cuando se recibe una solicitud HTTP"**.
4. En "Quién puede desencadenar el flujo": **Cualquiera**.
5. Método: **POST**.
6. "Esquema JSON del cuerpo de solicitud" → pega esto:

```json
{
  "type": "object",
  "properties": {
    "accion": { "type": "string" },
    "payload": { "type": "object" }
  }
}
```

7. Guarda el flujo una vez (Guardar, arriba a la derecha) — así se genera
   la URL. Ábrela y cópiala: es tu `POWER_AUTOMATE_FLOW_URL`.

## 2. Agregar el control Switch

1. Debajo del disparador, **+ Nuevo paso → Control → Switch**.
2. En "Activado en", pon la expresión: `triggerBody()?['accion']`.
3. Vas a crear un **"Agregar un caso"** por cada acción de la tabla de
   abajo (10 en total). Cada caso lleva el nombre exacto de la acción
   (ej. `buscarPartes`) y, adentro, sus propios pasos que terminan en una
   acción **"Respuesta"** (Response) — cada caso necesita su propia
   Respuesta, con el Content-Type `application/json`.

## 3. Las 10 acciones

Para las que ya conocemos el esquema real de columnas (`CatalogoPartes`,
confirmado: `Title` = número de parte, `Descripcion`, `Origen`, `Costo`,
`Localidad`, `Activo`) el detalle está completo. Para las demás listas
(`Requisiciones`, `RequisicionRenglones`, `Aprobadores`, `TipoCambio`,
`RolesUsuarios`) construimos cada caso en vivo: al agregar la acción
"Obtener elementos" o "Crear elemento" de SharePoint dentro del flujo,
**Power Automate te muestra los nombres reales de las columnas de esa
lista en un formulario** (no hay que adivinar nombres internos como
pasó con `NumeroParte`/`Title`) — por eso no hace falta repetir aquí el
ejercicio de "Configuración de lista" para cada una: el propio editor
de Power Automate ya te lo va a mostrar.

### `buscarPartes`
- **Obtener elementos** — Lista: `CatalogoPartes`.
  - Filter Query: `startswith(Title,'@{triggerBody()?['payload']?['prefijo']}')`
  - Order By: `Title asc`
  - Top Count: `@{triggerBody()?['payload']?['limite']}`
- **Respuesta**: `{ "partes": @{outputs('Obtener_elementos')?['body/value']} }`
  (usa el selector de contenido dinámico para insertar el arreglo completo; no hace falta transformarlo, la app ya sabe leer `Title/Descripcion/Origen/Costo/Localidad/Activo`).

### `obtenerParte`
- **Obtener elementos** — Lista: `CatalogoPartes`.
  - Filter Query: `Title eq '@{triggerBody()?['payload']?['numeroParte']}'`
  - Top Count: `1`
- **Condición**: ¿`length(outputs('Obtener_elementos')?['body/value'])` es mayor que `0`?
  - Sí → **Respuesta**: `{ "parte": @{first(outputs('Obtener_elementos')?['body/value'])} }`
  - No → **Respuesta**: `{ "parte": null }`

### `tipoCambioVigente`
- **Obtener elementos** — Lista: `TipoCambio`.
  - Filter Query: el campo que indique "vigente" (revisar nombre real en el editor; en `docs/SETUP-SHAREPOINT.md` se documentó como `Vigente eq 1`, ajustar si el tipo de columna real es texto).
  - Top Count: `1`
- **Respuesta**: `{ "tipoCambio": @{if(equals(length(outputs('Obtener_elementos')?['body/value']), 0), null, first(outputs('Obtener_elementos')?['body/value']))} }`

### `aprobadoresListar`
- **Obtener elementos** — Lista: `Aprobadores`.
- **Respuesta**: `{ "aprobadores": @{outputs('Obtener_elementos')?['body/value']} }`

### `aprobadorObtener`
- **Obtener elementos** — Lista: `Aprobadores`.
  - Filter Query: `Rol eq '@{triggerBody()?['payload']?['rol']}'` (agregar `and Activo eq 1` si esa columna es un Sí/No real).
  - Top Count: `1`
- **Respuesta**: igual patrón que `obtenerParte` (con Condición para `null` si no hay resultados).

### `requisicionCrear`
- **Crear elemento** — Lista: `Requisiciones`. Llenar cada campo con
  `triggerBody()?['payload']?['nombre']`, `...noReloj`, `...turno`,
  `...areaDepto`, `...fecha`, `...solicitanteCorreo`, `...totalUSD`,
  `...nivelAprobacion`, `...aprobadorCorreo`, y `Estado` = `Pendiente`
  (fijo, no viene del payload).
- **Aplicar a cada uno** sobre `triggerBody()?['payload']?['renglones']`:
  - **Crear elemento** — Lista: `RequisicionRenglones`. Columna de
    búsqueda (lookup) hacia `Requisiciones` = ID del elemento creado en
    el paso anterior (`outputs('Crear_elemento')?['body/ID']`).
    Cantidad = `item()?['cantidad']`, NumeroParte = `item()?['numeroParte']`,
    Descripcion = `item()?['descripcion']`, Maquina = `item()?['maquina']`,
    Origen = `item()?['origen']`, Moneda = `item()?['moneda']`,
    CostoUnitario = `item()?['costoUnitario']`, Localidad =
    `item()?['localidad']`, CapturaManual = `item()?['capturaManual']`.
- **Obtener elementos** sobre `RequisicionRenglones`, filtrando por la
  misma columna de búsqueda = ID del encabezado, para regresarlos en la
  respuesta.
- **Respuesta**:
  ```json
  {
    "requisicion": {
      "id": "@{outputs('Crear_elemento')?['body/ID']}",
      "fields": @{outputs('Crear_elemento')?['body']},
      "renglones": @{outputs('Obtener_elementos_2')?['body/value']}
    }
  }
  ```
  (`renglones` debe quedar como una lista de objetos `{id, fields}` —
  puede hacer falta un **Seleccionar** intermedio para darle esa forma
  exacta a partir de lo que regresa "Obtener elementos"; lo ajustamos
  juntos al construir esta rama viendo la salida real).

### `requisicionesListar`
- **Obtener elementos** — Lista: `Requisiciones`.
  - Order By: por fecha de creación, descendente.
  - Top Count: `1000` (o más, según el volumen esperado).
- **Respuesta**: `{ "requisiciones": @{outputs('Obtener_elementos')?['body/value']} }`

### `requisicionObtener`
- **Obtener elemento** — Lista: `Requisiciones`. Id: `triggerBody()?['payload']?['id']`.
- **Obtener elementos** — Lista: `RequisicionRenglones`, filtrando por
  la columna de búsqueda = `triggerBody()?['payload']?['id']`.
- **Respuesta**: mismo patrón `{id, fields, renglones}` que `requisicionCrear`, con Condición para responder `{ "requisicion": null }` si el "Obtener elemento" falla (usar "Configurar ejecución posterior a fallo" en esa acción para no cortar el flujo).

### `requisicionMarcarSurtida`
- **Obtener elemento** — Lista: `Requisiciones`. Id: `triggerBody()?['payload']?['id']`.
- **Condición**: ¿`Estado` del elemento obtenido es igual a `Aprobada`?
  - Sí → **Actualizar elemento**: `Estado` = `Surtida`, `SurtidoPor` =
    `triggerBody()?['payload']?['surtidoPor']`, `FechaSurtido` =
    `utcNow()`. Luego **Obtener elemento** de nuevo (para traer los
    valores actualizados) y **Respuesta** con `{requisicion:{...}}`.
  - No → **Respuesta** con código de estado `400` y cuerpo
    `{ "error": "Solo una requisición Aprobada puede marcarse como Surtida." }`.

### `rolObtener`
- **Obtener elementos** — Lista: `RolesUsuarios`.
  - Filter Query: `Correo eq '@{triggerBody()?['payload']?['correo']}'`
  - Top Count: `1`
- **Respuesta**: mismo patrón que `obtenerParte`.

## 4. Conectar la app

1. Copia la URL del disparador HTTP (paso 1.7).
2. En Vercel (o `.env.local`): `POWER_AUTOMATE_FLOW_URL=<esa URL>` y
   `DATA_MODE=sharepoint`.
3. Prueba primero solo `buscarPartes` (es la única rama con esquema
   100% confirmado) antes de construir el resto.
