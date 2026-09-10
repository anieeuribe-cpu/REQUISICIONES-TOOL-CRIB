# Configuración de SharePoint

Esta app usa **6 listas** en un sitio de SharePoint dedicado (por ejemplo
`https://empresa.sharepoint.com/sites/ToolCrib`). Los nombres (Title) por
defecto están en `.env.example`; si usas otros nombres, ajusta las
variables `SP_LIST_*`.

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
| NumeroParte | Una línea de texto | **Indexar esta columna.** Debe ser su propia columna de texto — al crear la lista desde Excel, cuida que el asistente no la marque como tipo "Título" (el campo especial reservado de SharePoint), o la app no la va a encontrar |
| Descripcion | Una línea de texto | |
| Origen | Una línea de texto | En el catálogo real de la planta esta columna trae directamente el código de moneda `USD`/`MXN` (no "Americana"/"Mexicana") — la app lo normaliza sola (`lib/sharepoint/mappers.ts#normalizarOrigen`), no hace falta editar el Excel |
| Costo | Número (2 decimales) | En la moneda que indique `Origen` para ese renglón |
| Localidad | Una línea de texto | El mismo `NumeroParte` puede repetirse varias veces con distinta `Localidad` (la pieza existe en varias ubicaciones) — es válido, el buscador de la app muestra la localidad de cada opción para distinguirlas |
| Activo | Sí/No | El asistente "Desde Excel" no ofrece el tipo Sí/No al importar — impórtala como texto (`TRUE`/`FALSE`) y **después** cambia el tipo de la columna a Sí/No desde su configuración; SharePoint convierte los valores automáticamente |

**Por qué indexar `NumeroParte` es obligatorio:** SharePoint bloquea
cualquier consulta sobre una lista de más de 5,000 elementos a menos que
el filtro use como primer predicado una columna indexada. La app
consulta esta lista con `startswith(NumeroParte,'<prefijo>')`
(`lib/data/sharepoint/index.ts#buscarPartes`) contra la **REST API
clásica de SharePoint** (no Microsoft Graph), que es la que soporta esta
función de forma eficiente sobre una columna indexada. Sin el índice, la
búsqueda del catálogo dejará de funcionar en cuanto la lista supere las
5,000 filas.

**Carga inicial de las ~84,000 filas:** no se cargan a mano. La forma más
simple sin PowerShell es **"+ Nuevo → Lista → Desde Excel"** en
SharePoint, subiendo el catálogo real completo (debe estar formateado
como Tabla de Excel — Ctrl+T — antes de subirlo). En el asistente:

- Cambia el tipo de la primera columna de "Título" a "Una sola línea de
  texto" (si no, `NumeroParte` se fusiona con el campo especial Title).
- Deja las demás columnas con el tipo que detecta automáticamente.
- Nombra la lista exactamente `CatalogoPartes` (o lo que digas en
  `SP_LIST_CATALOGO`).
- Después de creada: cambia `Activo` a tipo Sí/No (el asistente la trae
  como texto) e indexa `NumeroParte` (ver arriba).

Alternativa por PnP PowerShell (mejor para actualizaciones periódicas
del catálogo vía script):

```powershell
Connect-PnPOnline -Url "https://empresa.sharepoint.com/sites/ToolCrib" -Interactive
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

## 3. Registro de aplicación en Microsoft Entra ID

La app necesita credenciales propias (autenticación app-only, "client
credentials") para leer/escribir estas listas desde el backend. Esto es
un registro de aplicación normal para software interno — lo crea
cualquier persona con permisos de "App registrations" en Entra ID (no
necesariamente un administrador global), y **no** implica exponer nada
fuera del tenant: solo autoriza a esta app a llamar a la API de
Microsoft 365 de la propia empresa.

1. **Entra ID → App registrations → New registration.** Nombre sugerido:
   `Tool Crib - Requisiciones`. Tipo de cuenta: solo este directorio.
2. **Certificates & secrets → New client secret.** Guardar el valor como
   `AZURE_CLIENT_SECRET` (no se puede volver a ver después).
3. **API permissions → Add a permission → Microsoft Graph → Application
   permissions:**
   - `Sites.Selected` (recomendado: limita el acceso solo al sitio del
     Tool Crib, no a todo SharePoint) **o** `Sites.ReadWrite.All` si
     `Sites.Selected` no es viable en el tenant.
   - Click **Grant admin consent**.
4. Si se usó `Sites.Selected`, un administrador de SharePoint debe
   conceder acceso de escritura de esta app específicamente al sitio del
   Tool Crib (vía la API de permisos de sitio de Graph, una sola vez).
5. Copiar `Application (client) ID` → `AZURE_CLIENT_ID` y
   `Directory (tenant) ID` → `AZURE_TENANT_ID`.
6. Obtener el **Site Id** de Graph para `SHAREPOINT_SITE_ID`:
   `GET https://graph.microsoft.com/v1.0/sites/empresa.sharepoint.com:/sites/ToolCrib`
   (con Graph Explorer o cualquier cliente REST autenticado con una
   cuenta que tenga acceso al sitio).

## 4. Variables de entorno

Copiar `.env.example` a `.env.local` y llenar los valores anteriores,
más `SHAREPOINT_SITE_URL` y, si se cambiaron los nombres de las listas,
las variables `SP_LIST_*`. Poner `DATA_MODE=sharepoint`.
