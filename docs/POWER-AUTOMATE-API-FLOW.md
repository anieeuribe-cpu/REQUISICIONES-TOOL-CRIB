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

### ⚠️ Columnas "Elección" (Choice): usar siempre la opción " Value"

**Lección aprendida al construir `requisicionCrear`:** cuando el Mapa de
un "Seleccionar" toma su Valor de una columna de tipo **Elección**
(`Turno`, `NivelAprobacion`, `Estado`, `Moneda`, etc.), el selector de
contenido dinámico ofrece **dos opciones con nombre parecido**:
`NombreColumna` (trae un objeto completo tipo
`{"@odata.type": "...SPListExpandedReference", "Id": 0, "Value": "..."}`)
y **`NombreColumna Value`** (trae solo el texto plano, ej. `"Supervisor"`).
La app siempre espera el texto plano — hay que elegir SIEMPRE la opción
que termina en **" Value"** para cualquier columna Elección. Las columnas
de texto simple (`Origen`, `NumeroParte`, etc.) no tienen este problema,
solo aparece una opción para esas.

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

### `aprobadoresListar` ✅ probado contra SharePoint real
- Lista real: **`Lista Aprobadores`** (así se llama en el sitio, con
  "Lista" incluido en el nombre). Se creó con el asistente "Desde
  Excel", así que el nombre completo del aprobador quedó fusionado con
  el campo especial "Título" (mismo patrón que `Title` en
  `CatalogoPartes`) — no tiene columna `Activo`.
- **Obtener elementos** — Lista: `Lista Aprobadores`. Sin Filter Query
  (trae todos). Puede salir una advertencia (no error) de "sin Top
  Count" en el comprobador de flujo — se puede ignorar, la lista es
  chica.
- **Seleccionar** — Desde: `value`. Mapa (3 filas): `Rol`→Rol,
  `Correo`→Correo, `NombreCompleto`→Título.
- **Respuesta**: `{ "aprobadores": @{outputs('Seleccionar_3')} }`
  (salida de Seleccionar insertada con el content picker, patrón
  `buscarPartes`).

### `aprobadorObtener` ✅ probado contra SharePoint real
- Lista: `Lista Aprobadores` (mismo mapa de 3 columnas que
  `aprobadoresListar`).
- **Obtener elementos** — Filter Query armado en `fx` con `concat` (más
  seguro que escribir `@{...}` a mano dentro del filtro, evita líos de
  comillas):
  ```
  concat('Rol eq ''', triggerBody()?['payload']?['rol'], '''')
  ```
  - Top Count: `1` (⚠️ va en el campo **"Primeros puestos"**, no en
    "Ordenar por" — son campos separados en "Parámetros avanzados", fácil
    confundirlos).
- **Seleccionar** — mismo mapa de 3 columnas (Rol, Correo,
  NombreCompleto→Título), Desde: `value`.
- **Condición**: `length(outputs('Obtener_elementos_4')?['body/value'])`
  (armado en `fx`) **es mayor que** `0` (el `0` en `fx`). La fila extra
  auto-generada se llenó con `1 = 1` (workaround de siempre).
  - Sí → **Respuesta**: `{ "aprobador":` + `first(outputs('Seleccionar_4')?['body'])` (armado completo en `fx`) + `}`
  - No → **Respuesta**: `{ "aprobador": null }`

### `requisicionCrear` ✅ probado contra SharePoint real

⚠️ Listas reales del tenant (nombres distintos a los de la sección 2 de
este documento — confirmados en vivo):
- Encabezado: **`Requisiciones`**. Columnas reales: `Nombre`, `NoReloj`,
  `Turno` (Elección), **`AreaDpto`** (no `AreaDepto`), `Fecha`, `SolicitanteCorreo`,
  `SolicitanteNombre` (no la usa la app, se deja vacía),
  **`Total`** (no `TotalUSD`), `NivelAprobacion` (Elección), `Estado` (Elección),
  `AprobadorCorreo`, `AprobadoPor`, `FechaAprobacion`, `MotivoRechazo`,
  `SurtidoPor`, `FechaSurtido`. También existe una columna `Folio` de
  texto libre que la app no usa (el folio real se calcula del `ID` —
  ver `lib/business.ts#formatFolio`); se deja vacía.
- Renglones: **`Lista RenglonesRequisicion`**. Columnas reales:
  `RequisicionID` (tipo **Número**, no es Lookup — se guarda ahí el
  `ID` del encabezado y se filtra `RequisicionID eq <id>`), `Cantidad`,
  `NumeroParte`, `Descripcion`, `Maquina`, `Origen` (texto simple),
  `Moneda` (Elección), **`Costo`** (no `CostoUnitario`), **`Loc`** (no
  `Localidad`), `CapturaManual` (Sí/No).

El código de la app (`lib/sharepoint/mappers.ts`) espera los nombres
"limpios" (`AreaDepto`, `TotalUSD`, `CostoUnitario`, `Localidad`, etc.)
y siempre texto plano — la traducción nombre real → nombre limpio, y
objeto Elección → texto plano, se hace en los pasos "Seleccionar" de
abajo.

**Pasos** (probados y confirmados, ⚠️ sin usar la acción "Componer" —
no existe/no se encontró en este tenant; se construye la Respuesta
final directo):

1. **Crear elemento** (`Requisiciones`) — `Nombre`, `NoReloj`, `Turno`,
   `AreaDpto`, `Fecha`, `SolicitanteCorreo` desde
   `triggerBody()?['payload']?['...']` (fx); `Total` desde
   `triggerBody()?['payload']?['totalUSD']`; `NivelAprobacion` y
   `AprobadorCorreo` desde el payload; **`Estado`** = `Pendiente`
   (elegido del desplegable, no fx, no viene del payload).
   `AprobadoPor`, `FechaAprobacion`, `MotivoRechazo`, `SurtidoPor`,
   `FechaSurtido`, `SolicitanteNombre`, `Título`, `Folio` se dejan
   **vacíos** (los llena el flujo de aprobación o la app después).
2. **Obtener elementos** (`Requisiciones`) — Filter Query en `fx`:
   `concat('ID eq ', outputs('Crear_elemento')?['body/ID'])` — Top
   Count: `1`. (Se vuelve a leer el elemento recién creado para poder
   usar el content picker con nombres amigables en el Seleccionar de
   abajo.)
3. **Seleccionar** ("header") — Desde: `value` (del paso 2). Mapa (16
   filas, Clave = nombre limpio / Valor = columna real elegida del
   picker, siempre bajo la acción "Obtener elementos" del paso 2, nunca
   bajo "Crear elemento"): `Nombre`→Nombre, `NoReloj`→NoReloj,
   **`Turno`→"Turno Value"** ⚠️, `AreaDepto`→AreaDpto, `Fecha`→Fecha,
   `SolicitanteCorreo`→SolicitanteCorreo, `TotalUSD`→Total,
   **`NivelAprobacion`→"NivelAprobacion Value"** ⚠️,
   **`Estado`→"Estado Value"** ⚠️, `AprobadorCorreo`→AprobadorCorreo,
   `AprobadoPor`→AprobadoPor, `FechaAprobacion`→FechaAprobacion,
   `MotivoRechazo`→MotivoRechazo, `SurtidoPor`→SurtidoPor,
   `FechaSurtido`→FechaSurtido, `Created`→Creado (fecha de creación del
   elemento).
   ⚠️ **Las 3 filas marcadas son columnas "Elección"**: el picker
   siempre ofrece dos opciones con nombre parecido (`NombreColumna` y
   `NombreColumna Value`) — hay que elegir la que termina en **" Value"**,
   si no la respuesta trae un objeto `{"@odata.type": ..., "Id": 0,
   "Value": "..."}` en vez de texto plano.
4. **Aplicar a cada uno** sobre `triggerBody()?['payload']?['renglones']`
   (armado en `fx`: `triggerBody()?['payload']?['renglones']`):
   - **Crear elemento** (`Lista RenglonesRequisicion`) — `RequisicionID`
     = `outputs('Crear_elemento')?['body/ID']` (puede insertarse por
     content picker eligiendo "Id" de "Crear elemento" — se ve igual de
     válido); `Cantidad` = `item()?['cantidad']`; `NumeroParte` =
     `item()?['numeroParte']`; `Descripcion` = `item()?['descripcion']`;
     `Maquina` = `item()?['maquina']`; `Origen` = `item()?['origen']`;
     `Moneda` = `item()?['moneda']` (aunque el campo sea desplegable,
     acepta fx); `Costo` = `item()?['costoUnitario']`; `Loc` =
     `item()?['localidad']`; `CapturaManual` = `item()?['capturaManual']`.
5. **Obtener elementos** (`Lista RenglonesRequisicion`, **afuera** del
   "Aplicar a cada uno") — Filter Query en `fx`:
   `concat('RequisicionID eq ', outputs('Crear_elemento')?['body/ID'])`
   — Top Count: `200`.
6. **Seleccionar** ("renglones") — Desde: `value` (del paso 5). Mapa
   (10 filas, siempre bajo "Obtener elementos" del paso 5): `ID`→Id,
   `Cantidad`→Cantidad, `NumeroParte`→NumeroParte,
   `Descripcion`→Descripcion, `Maquina`→Maquina, `Origen`→Origen,
   **`Moneda`→"Moneda Value"** ⚠️ (columna Elección, mismo problema que
   arriba), `CostoUnitario`→Costo, `Localidad`→Loc,
   `CapturaManual`→CapturaManual.
7. **Respuesta** — Código `200`. Cuerpo armado con 3 burbujas, cada una
   insertada de un jalón (nunca mezclada a mitad con texto):
   texto `{ "requisicion": { "id": ` + fx
   `outputs('Crear_elemento')?['body/ID']` + texto `, "fields": ` + fx
   `first(outputs('Seleccionar_5')?['body'])` (ajustar `Seleccionar_5`
   al nombre real de la acción del paso 3) + texto `, "renglones": ` +
   contenido dinámico "Salida" del paso 6 (Seleccionar renglones) +
   texto ` } }`.

Nota: la app espera que cada renglón de la respuesta venga "plano"
(`{ID, NumeroParte, Descripcion, ...}`, sin anidar en `{id, fields}`) —
por eso el Mapa del paso 6 es un Seleccionar simple, sin ningún truco.

### `requisicionesListar` ✅ probado contra SharePoint real
- **Obtener elementos** — Lista: `Requisiciones`. Sin Filter Query (trae
  todas). Top Count: `500` (o el volumen esperado).
- **Seleccionar** — Desde: `value`. Mapa (17 filas — las mismas 16 de
  `requisicionCrear` paso 3, **más** `ID`→Id): recuerda usar **" Value"**
  en `Turno`, `NivelAprobacion` y `Estado` (columnas Elección).
- **Respuesta**: `{ "requisiciones": ` + contenido dinámico "Salida" del
  Seleccionar + ` }` (una sola burbuja, patrón `buscarPartes`/`aprobadoresListar`).

Nota: cada requisición viene "plana" (`ID` + columnas, sin anidar en
`{id, fields}`) — la app arma el objeto `Requisicion` a partir de eso
(`lib/data/sharepoint/index.ts#listarRequisiciones`), mismo patrón que
los renglones de `requisicionCrear`. El detalle completo (renglones) no
se carga aquí, solo en `requisicionObtener`, para que el historial sea
rápido.

### `requisicionObtener` ✅ probado contra SharePoint real

Mismo patrón que `requisicionCrear` (sin crear nada, solo lee), reusando
el mismo mapa de 16/10 columnas:

1. **Obtener elementos** ("header") — Lista: `Requisiciones`. Filter
   Query en `fx`: `concat('ID eq ', triggerBody()?['payload']?['id'])`
   — Top Count: `1`.
2. **Seleccionar** ("header") — Desde: `value` (del paso 1). Mismas 16
   filas que `requisicionCrear` paso 3 (con **" Value"** en Turno,
   NivelAprobacion, Estado).
3. **Condición**: `length(outputs('Obtener_elementos_N')?['body/value'])`
   (⚠️ usa el nombre REAL de tu acción del paso 1, viendo el diagrama —
   no un marcador de posición) **es mayor que** `0`.
   - **True**:
     4. **Obtener elementos** ("renglones") — Lista: `Lista RenglonesRequisicion`.
        Filter Query en `fx`: `concat('RequisicionID eq ', triggerBody()?['payload']?['id'])`
        — Top Count: `200`.
     5. **Seleccionar** ("renglones") — Desde: `value` (del paso 4).
        Mismas 10 filas que `requisicionCrear` paso 6 (con **" Value"**
        en Moneda).
     6. **Respuesta** (código `200`) — Cuerpo con 3 burbujas: texto
        `{ "requisicion": { "id": ` + fx `triggerBody()?['payload']?['id']`
        + texto `, "fields": ` + fx `first(outputs('Seleccionar_N')?['body'])`
        (nombre real del Seleccionar del paso 2) + texto `, "renglones": `
        + contenido dinámico "Salida" del Seleccionar del paso 5 + texto
        ` } }`.
   - **False**: **Respuesta** (código `200`) — Cuerpo literal:
     `{ "requisicion": null }`.

### `requisicionMarcarSurtida` ✅ probado contra SharePoint real

1. **Obtener elementos** ("header") — Lista: `Requisiciones`. Filter
   Query en `fx`: `concat('ID eq ', triggerBody()?['payload']?['id'])`
   — Top Count: `1`.
2. **Seleccionar** — Desde: `value` (del paso 1). Mismas 16 filas de
   siempre (con **" Value"** en Turno, NivelAprobacion, Estado).
3. **Condición**: `first(outputs('Seleccionar_N')?['body'])?['Estado']`
   (nombre real del Seleccionar del paso 2, armado en `fx`) **es igual
   que** `Aprobada` (texto literal, sin fx, en el campo derecho).
   - **True**:
     4. **Actualizar elemento** — Lista: `Requisiciones`. Identificador:
        `fx` → `triggerBody()?['payload']?['id']`. `Estado` = elegir
        `Surtida` del desplegable (no fx). `SurtidoPor` = `fx` →
        `triggerBody()?['payload']?['surtidoPor']`. `FechaSurtido` =
        `fx` → `utcNow()`. Todos los demás campos se dejan **vacíos**
        (no se tocan, para no borrar lo que ya tenían).
     5. **Obtener elementos** ("header releído") — Lista:
        `Requisiciones`. Mismo filtro que el paso 1. ⚠️ Para el "Desde"
        del Seleccionar siguiente, arma la referencia con `fx`
        (`outputs('Obtener_elementos_N')?['body/value']`) en vez de
        clic en el contenido dinámico — de lo contrario Power Automate
        puede ofrecer envolver la acción en un ciclo "Aplicar a cada
        uno" que no se necesita para nada aquí.
     6. **Seleccionar** — mismas 16 filas de siempre.
     7. **Obtener elementos** ("renglones") — Lista: `Lista RenglonesRequisicion`.
        Filter Query en `fx`: `concat('RequisicionID eq ', triggerBody()?['payload']?['id'])`.
     8. **Seleccionar** — mismas 10 filas de siempre (con Moneda Value),
        Desde armado también en `fx`.
     9. **Respuesta** (código `200`) — Cuerpo con 3 burbujas, mismo
        patrón de `requisicionObtener`.
   - **False**: **Respuesta** con código de estado `400` y cuerpo
     literal `{ "error": "Solo una requisición Aprobada puede marcarse como Surtida." }`.

⚠️ **Cuidado con las opciones de la columna "Estado"**: si al escribir
las opciones de una columna Elección se separan por comas dentro de un
solo cuadro de texto, es fácil que una coma quede pegada al final de
una opción (ej. `Aprobada,` en vez de `Aprobada`) — eso hace que
cualquier comparación de texto contra `Aprobada` nunca coincida. Revisa
las opciones de la columna en **Configuración de lista → Estado** y
confirma que no tengan comas ni espacios de más. Si corriges una
opción ya usada en algún elemento, ese elemento no se actualiza solo:
hay que volver a seleccionar el valor corregido en esa fila.

### `rolObtener` ✅ probado contra SharePoint real
- Lista `RolesUsuarios` creada a mano (sin asistente de Excel): `Correo`
  (texto), `EsAlmacen`/`EsToolCrib`/`Activo` (Sí/No) — al ser columnas
  Sí/No reales (no Elección), el picker regresa el booleano directo,
  sin necesidad de la opción " Value".
- **Obtener elementos** — Filter Query en `fx`:
  `concat('Correo eq ''', triggerBody()?['payload']?['correo'], '''')`
  — Top Count: `1`.
- **Seleccionar** — Desde: `value`. Mapa (4 filas, directo):
  `Correo`→Correo, `EsAlmacen`→EsAlmacen, `EsToolCrib`→EsToolCrib,
  `Activo`→Activo.
- **Condición**: `length(outputs('Obtener_elementos_13')?['body/value'])`
  **es mayor que** `0`.
  - Sí → **Respuesta**: `{ "rol":` + `first(outputs('Seleccionar_13')?['body'])` (armado en `fx`) + `}`
  - No → **Respuesta**: `{ "rol": null }`

## 5. Las 10 acciones — todas probadas ✅

`buscarPartes`, `obtenerParte`, `tipoCambioVigente`, `aprobadoresListar`,
`aprobadorObtener`, `requisicionCrear`, `requisicionesListar`,
`requisicionObtener`, `requisicionMarcarSurtida`, `rolObtener` — las 10
quedaron construidas y confirmadas end-to-end contra las listas reales
de SharePoint del tenant. El flujo `ToolCrib-API` ya está listo para
conectar la app (ver sección 4).

## 4. Conectar la app

1. Copia la URL del disparador HTTP (paso 1.7).
2. En Vercel (o `.env.local`): `POWER_AUTOMATE_FLOW_URL=<esa URL>` y
   `DATA_MODE=sharepoint`.
3. Prueba primero solo `buscarPartes` (es la única rama con esquema
   100% confirmado) antes de construir el resto.
