# Configuración de SharePoint

Esta app usa **6 listas** en un sitio de SharePoint dedicado (por ejemplo
`https://empresa.sharepoint.com/sites/ToolCrib`). Los nombres usados
aquí (`Requisiciones`, `RequisicionRenglones`, `CatalogoPartes`,
`Aprobadores`, `TipoCambio`, `RolesUsuarios`) son solo una referencia:
el flujo de Power Automate ([`POWER-AUTOMATE-API-FLOW.md`](POWER-AUTOMATE-API-FLOW.md))
elige cada lista directamente en su conector de SharePoint, así que si
usas otros nombres no hay ninguna variable de entorno que ajustar — solo
selecciona la lista correcta al construir cada acción del flujo.

## 1. Crear el sitio

Crear (o reutilizar) un sitio de equipo de SharePoint para el Tool Crib.
No requiere permisos especiales de IT más allá de crear un sitio, algo
que normalmente ya está disponible para el equipo de la planta.

## 2. Listas y columnas

### `Requisiciones` (encabezado)

| Columna interna | Tipo | Notas |
|---|---|---|
| Nombre | Una línea de texto | |
| NoReloj | Una línea de texto | |
| Turno | Una línea de texto | En la app se sugieren `4`, `9`, `53`, `54` u "Otro" (texto libre), pero se guarda como texto simple para no bloquear valores nuevos |
| AreaDepto | Una línea de texto | |
| Fecha | Fecha (solo fecha) | |
| SolicitanteCorreo | Una línea de texto | |
| TotalUSD | Número (2 decimales) | Calculado por la app al guardar |
| NivelAprobacion | Choice: `Supervisor`, `Superintendente`, `Gerente` | Calculado por la app |
| Estado | Choice: `Pendiente`, `Aprobada`, `Rechazada`, `Surtida` | **Indexar esta columna** |
| AprobadorCorreo | Una línea de texto | Copiado de `Aprobadores` al crear |
| AprobadoPor | Una línea de texto | Lo llena el flujo de Power Automate |
| FechaAprobacion | Fecha y hora | Lo llena el flujo |
| MotivoRechazo | Varias líneas de texto | Lo llena el flujo |
| SurtidoPor | Una línea de texto | Lo llena la app (rol Almacén) |
| FechaSurtido | Fecha y hora | Lo llena la app |

El **folio** (`REQ-00001`) no se guarda como columna: se calcula como
`REQ-` + el `ID` autonumérico de SharePoint con relleno de ceros
(`lib/business.ts#formatFolio`). Así el folio es siempre único y
consecutivo sin lógica adicional ni condiciones de carrera.

### `RequisicionRenglones` (detalle)

| Columna interna | Tipo | Notas |
|---|---|---|
| Requisicion | Búsqueda (Lookup) a `Requisiciones`, campo mostrado `ID` | **Indexar esta columna** |
| Cantidad | Número | |
| NumeroParte | Una línea de texto | |
| Descripcion | Una línea de texto | |
| Maquina | Una línea de texto | |
| Origen | Choice: `Americana`, `Mexicana` | |
| Moneda | Choice: `USD`, `MXN` | |
| CostoUnitario | Número (2 decimales) | |
| Localidad | Una línea de texto | |
| CapturaManual | Sí/No | `Sí` cuando el número de parte no estaba en `CatalogoPartes` y se capturó a mano desde la opción "Otro" — útil para auditar/depurar el catálogo después |

### `CatalogoPartes` (~84,000 filas)

| Columna interna | Tipo | Notas |
|---|---|---|
| Title | Una línea de texto | **Este es el número de parte** — es el campo especial "Título" que toda lista de SharePoint trae por default. La app lo consulta por su nombre interno `Title` (no `NumeroParte`); puedes renombrar su título visible a "NumeroParte" en la configuración de la lista para que sea más claro al capturar/ver datos, pero eso no cambia el nombre interno que usa la consulta. **Indexar esta columna.** Si al crear la lista desde Excel alcanzas a elegir el tipo antes de que se fusione con Título, mejor — pero si ya quedó así (como es lo más común con el asistente "Desde Excel"), no hay que rehacer nada, la app ya está armada para leerlo de `Title` |
| Descripcion | Una línea de texto | |
| Origen | Una línea de texto | En el catálogo real de la planta esta columna trae directamente el código de moneda `USD`/`MXN` (no "Americana"/"Mexicana") — la app lo normaliza sola (`lib/sharepoint/mappers.ts#normalizarOrigen`), no hace falta editar el Excel |
| Costo | Número (2 decimales) | En la moneda que indique `Origen` para ese renglón |
| Localidad | Una línea de texto | El mismo `NumeroParte` puede repetirse varias veces con distinta `Localidad` (la pieza existe en varias ubicaciones) — es válido, el buscador de la app muestra la localidad de cada opción para distinguirlas |
| Activo | Sí/No o texto | Ideal como Sí/No, pero la app también acepta que quede como texto (`TRUE`/`FALSE`, tal cual la deja el asistente "Desde Excel") — no es necesario convertirla; el filtrado por "activo" lo hace la app, no la consulta a SharePoint |

**Por qué indexar `Title` es obligatorio:** SharePoint bloquea cualquier
consulta sobre una lista de más de 5,000 elementos a menos que el
filtro use como primer predicado una columna indexada. La app consulta
esta lista con `startswith(Title,'<prefijo>')`
(`lib/data/sharepoint/index.ts#buscarPartes`) contra la **REST API
clásica de SharePoint** (no Microsoft Graph), que es la que soporta esta
función de forma eficiente sobre una columna indexada. Sin el índice, la
búsqueda del catálogo dejará de funcionar en cuanto la lista supere las
5,000 filas. Desde **Configuración de la lista → Columnas indizadas →
Crear índice nuevo**, elige `Title` como columna principal (puede
aparecer en el selector con el nombre visible que le hayas puesto, p.
ej. "NumeroParte").

**Carga inicial de las ~84,000 filas:** no se cargan a mano. La forma más
simple sin PowerShell es **"+ Nuevo → Lista → Desde Excel"** en
SharePoint, subiendo el catálogo real completo (debe estar formateado
como Tabla de Excel — Ctrl+T — antes de subirlo). En el asistente:

- La primera columna del Excel normalmente se mapea al tipo "Título"
  (queda como campo interno `Title`) — está bien dejarlo así, no hace
  falta forzarlo a "Una sola línea de texto"; la app ya sabe leer el
  número de parte desde `Title`.
- Deja las demás columnas con el tipo que detecta automáticamente.
- Nombra la lista exactamente `CatalogoPartes` (o lo que digas en
  `SP_LIST_CATALOGO`).
- Después de creada: en **Configuración de lista → Nombre de columna** puedes
  renombrar el título visible de `Title` a "NumeroParte" (cosmético, no
  afecta a la app) e indexar `Title` (ver arriba). No hace falta tocar
  el tipo de `Activo` — puede quedar como texto.

Alternativa por PnP PowerShell (mejor para actualizaciones periódicas
del catálogo vía script). A diferencia del asistente "Desde Excel", aquí
sí se crea una columna `NumeroParte` de verdad en vez de usar `Title` —
si usas este camino en vez del de Excel, cambia también las consultas
de `lib/data/sharepoint/index.ts#buscarPartes`/`obtenerParte` (y
`CatalogoFields` en `lib/sharepoint/mappers.ts`) de vuelta a
`NumeroParte`:

```powershell
Connect-PnPOnline -Url "https://empresa.sharepoint.com/sites/ToolCrib" -Interactive
Add-PnPField -List "CatalogoPartes" -DisplayName "NumeroParte" -InternalName "NumeroParte" -Type Text
Import-Csv .\catalogo-partes.csv | ForEach-Object {
    Add-PnPListItem -List "CatalogoPartes" -Values @{
        NumeroParte = $_.NumeroParte
        Descripcion = $_.Descripcion
        Origen      = $_.Origen
        Costo       = [double]$_.Costo
        Localidad   = $_.Localidad
        Activo      = $true
    }
}
Set-PnPField -List "CatalogoPartes" -Identity "NumeroParte" -Values @{Indexed = $true}
```

### `Aprobadores`

| Columna interna | Tipo | Notas |
|---|---|---|
| Rol | Choice: `Supervisor`, `Superintendente`, `Gerente` | Un renglón activo por rol |
| NombreCompleto | Una línea de texto | |
| Correo | Una línea de texto | Correo de Microsoft 365 del aprobador |
| Activo | Sí/No | Para desactivar sin borrar histórico |

Editar esta lista (cambiar el correo de un renglón) cambia
inmediatamente a quién se dirige la aprobación — no requiere tocar el
flujo de Power Automate ni la app.

### `TipoCambio`

| Columna interna | Tipo | Notas |
|---|---|---|
| Fecha | Fecha | |
| ValorMXNporUSD | Número (4 decimales) | Cuántos pesos equivalen a 1 USD |
| Vigente | Sí/No | Solo un renglón debe estar en Sí |

Para actualizar el tipo de cambio: crear un renglón nuevo con `Vigente =
Sí` y poner `Vigente = No` en el anterior (o editar el valor del
renglón vigente). La app siempre usa el renglón con `Vigente = Sí`.

### `RolesUsuarios`

| Columna interna | Tipo | Notas |
|---|---|---|
| Correo | Una línea de texto | |
| EsAlmacen | Sí/No | Puede marcar requisiciones como "Surtida" |
| EsToolCrib | Sí/No | Puede crear/consultar requisiciones |
| Activo | Sí/No | |

## 3. Conexión de la app: Power Automate (sin Entra ID, sin IT)

La app **no** se conecta directo a Microsoft Graph ni requiere ningún
registro de aplicación en Entra ID — eso hubiera exigido permisos de
administrador de IT. En vez de eso, la app llama a un flujo de Power
Automate (conector estándar de SharePoint, disparador HTTP) que
cualquier persona con licencia de Microsoft 365 puede crear con su
propia cuenta. Ver la guía completa y las 10 acciones del flujo en
[`POWER-AUTOMATE-API-FLOW.md`](POWER-AUTOMATE-API-FLOW.md).

## 4. Variables de entorno

Copiar `.env.example` a `.env.local`, poner `DATA_MODE=sharepoint` y
`POWER_AUTOMATE_FLOW_URL` con la URL del disparador HTTP del flujo
`ToolCrib-API` (se obtiene al guardar el flujo — ver
[`POWER-AUTOMATE-API-FLOW.md`](POWER-AUTOMATE-API-FLOW.md)).
