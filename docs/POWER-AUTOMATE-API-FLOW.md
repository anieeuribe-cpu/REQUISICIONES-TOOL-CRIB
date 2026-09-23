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

### ⚠️ Paso "Seleccionar" obligatorio antes de cada "Respuesta"

**Lección aprendida al construir `buscarPartes`:** el JSON crudo que
regresa "Obtener elementos"/"Crear elemento" de SharePoint **no** usa
los nombres de columna visibles (`Descripcion`, `Origen`, `Costo`...) —
usa nombres internos genéricos tipo `field_1`, `field_2`, `field_3`...
(pasa cada vez que una lista se creó con el asistente "Desde Excel", que
es como se crearon todas las listas de este proyecto). Por eso, **antes
de cada acción "Respuesta" que entregue datos de una lista, hay que
agregar una acción "Seleccionar"** (categoría "Operación de datos",
filtro "Integrado") que traduzca esos nombres raros a los nombres
limpios que espera la app, usando el **selector de contenido dinámico**
(que sí resuelve el nombre amigable correcto aunque el interno sea
`field_1`) — nunca escribas `field_1` a mano en la Respuesta.

Patrón general para una lista (X = mapa de columnas de esa lista):
1. **Obtener elementos** (o **Crear elemento**) de la lista.
2. **Seleccionar** — "Desde" = `value` (o el body del elemento creado si
   es un solo elemento, ver notas por acción) → "Mapa": una fila por
   columna, Clave = nombre limpio (ej. `Descripcion`), Valor = esa misma
   columna elegida por su nombre amigable en el content picker.
3. **Respuesta** — referencia la **salida de "Seleccionar"**, nunca la
   salida cruda de "Obtener elementos"/"Crear elemento".

### ⚠️ Al escribir expresiones a mano, siempre hay que bajar a `?['body']`

**Lección aprendida al construir `obtenerParte`:** cuando insertas la
salida de una acción con el **selector de contenido dinámico** (el rayo
⚡ en modo "Contenido dinámico"), Power Automate arma la referencia
correcta solo. Pero en cuanto necesitas **escribir tú una función a mano**
en la pestaña `fx` (como `length(...)` o `first(...)`) y ahí refieres a
otra acción por su nombre, **`outputs('NombreDeLaAccion')` te da el
objeto completo de esa acción (con `statusCode`, `headers`, etc.), no el
resultado en sí** — hay que bajar un nivel más:

- Para "Obtener elementos": `outputs('Obtener_elementos_1')?['body/value']`
- Para "Seleccionar": `outputs('Seleccionar_1')?['body']`

Ejemplos que sí funcionan (probados contra SharePoint real):
```
length(outputs('Obtener_elementos_1')?['body/value'])
first(outputs('Seleccionar_1')?['body'])
```

Además, dentro del campo "Cuerpo" de una "Respuesta", si vas a envolver
un cuadrito insertado con una función (ej. `first(...)`), **arma la
función completa de un jalón en la pestaña `fx`** (no mezcles texto
escrito tipo `first(` con un cuadrito insertado a mitad — eso rompe el
JSON). El texto literal `{ "clave":` y `}` sí se escribe a mano
alrededor del cuadrito de expresión ya armado.

También: al comparar un número escrito a mano en una Condición (ej. el
`0` de "es mayor que 0"), escríbelo en la pestaña `fx` (no como texto
plano) para que quede como número y no como texto — si no, sale el
error "greater expects two parameters of matching types".

Para las listas de las que ya conocemos el esquema completo
(`CatalogoPartes`: `Title`=número de parte, `Descripcion`, `Origen`,
`Costo`, `Localidad`, `Activo`) el detalle de abajo ya está probado
contra SharePoint real. Para las demás (`Requisiciones`,
`RequisicionRenglones`, `Aprobadores`, `TipoCambio`, `RolesUsuarios`)
se arma cada caso en vivo, viendo qué nombres amigables te muestra el
selector de contenido dinámico al agregar la acción.

### `buscarPartes` ✅ probado contra SharePoint real
- **Obtener elementos** — Lista: `CatalogoPartes`.
  - Filter Query: `startswith(Title,'@{triggerBody()?['payload']?['prefijo']}')`
  - Order By: `Title asc`
  - Top Count: `@{triggerBody()?['payload']?['limite']}`
- **Seleccionar** — Desde: `value` (de "Obtener elementos"). Mapa:
  `Title`→Title, `Descripcion`→Descripcion, `Origen`→Origen,
  `Costo`→Costo, `Localidad`→Localidad, `Activo`→Activo (cada Valor
  elegido por nombre amigable en el content picker, no escrito a mano).
- **Respuesta**: `{ "partes": @{outputs('Seleccionar')} }` (aquí sí
  funciona sin `?['body']` porque se insertó con el content picker, no
  escrito a mano — el picker ya resuelve la referencia correcta).

### `obtenerParte` ✅ probado contra SharePoint real
- **Obtener elementos** — Lista: `CatalogoPartes`.
  - Filter Query: `Title eq '@{triggerBody()?['payload']?['numeroParte']}'`
  - Top Count: `1`
- **Seleccionar** — mismo mapa de 6 columnas que `buscarPartes`, Desde: `value`.
- **Condición**: `length(outputs('Obtener_elementos_1')?['body/value'])` **es mayor que** `0` (el `0` escrito en la pestaña `fx`, no como texto plano).
  - Sí → **Respuesta**: `{ "parte":` + `first(outputs('Seleccionar_1')?['body'])` (armado completo en `fx`) + `}`
  - No → **Respuesta**: `{ "parte": null }`

### `tipoCambioVigente` ✅ probado contra SharePoint real
- **Obtener elementos** — Lista: `TipoCambio` (lista creada a mano, sin
  el asistente "Desde Excel", así que sus columnas ya tienen nombres
  internos limpios: `Fecha`, `ValorMXNporUSD`, `Vigente` de verdad).
  - Filter Query: `Vigente eq 1`
  - Top Count: `1`
- **Seleccionar** — Desde: `value` (de "Obtener elementos"). Mapa (3
  filas): `Fecha`→Fecha, `ValorMXNporUSD`→ValorMXNporUSD,
  `Vigente`→Vigente (cada Valor elegido por nombre amigable en el
  content picker).
- **Condición**: `length(outputs('Obtener_elementos_2')?['body/value'])`
  (armado en `fx`) **es mayor que** `0` (el `0` también escrito en `fx`).
  - Sí → **Respuesta** (código `200`) — Cuerpo armado así: texto literal
    `{ "tipoCambio":` + expresión completa en `fx`
    `first(outputs('Seleccionar_2')?['body'])` (una sola burbuja, nunca
    mezclada con texto a mitad) + texto literal `}`.
  - No → **Respuesta** (código `200`) — Cuerpo: `{ "tipoCambio": null }`
    (texto literal, sin expresión — no depende de ningún dato).

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
