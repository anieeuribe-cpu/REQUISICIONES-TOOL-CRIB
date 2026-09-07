# Plataforma de Requisiciones de Material — Tool Crib

## Objetivo

Digitalizar el formulario de papel existente de requisiciones de material del Tool Crib de la planta, construyendo la solución **completamente dentro de Microsoft 365** (SharePoint + Power Apps + Power Automate).

### Restricciones no negociables

- Sin hosting externo.
- Sin registrar apps nuevas en Azure/Entra ID.
- Sin depender de aprobaciones de IT.
- Los datos de la empresa no pueden salir del tenant de Microsoft.
- Solo conectores estándar de SharePoint/Power Apps/Power Automate ya disponibles — **no** usar conectores premium bloqueados (como "HTTP Request"), no requerir registro de aplicaciones en Azure, no depender de permisos que solo un administrador de IT pueda otorgar.

---

## Campos del formulario (igual que el papel)

**Encabezado:**
- Nombre
- No. de Reloj
- Turno
- Área/Dpto
- Fecha

**Tabla de renglones (varias piezas por requisición):**
- Cantidad
- Descripción
- Número de parte (Item/Part Number)
- Máquina
- Costo
- Localidad

---

## Catálogo de partes

- Catálogo real de ~84,000 números de parte, cada uno con: Descripción, Origen (Americana o Mexicana, según la planta/Branch Plant de origen), Costo (en dólares si es Americana, en pesos si es Mexicana) y Localidad.
- Al escoger un número de parte en la tabla, se debe autocompletar descripción, costo, origen y localidad — sin captura manual.
- La búsqueda debe funcionar de forma confiable con las 84,000 filas (usar índice en la columna de número de parte y búsqueda por "empieza con" para no toparse con los límites de rendimiento de SharePoint).

---

## Cálculo de total y conversión de moneda

- Una requisición puede mezclar piezas americanas (USD) y mexicanas (MXN).
- El total y las reglas de aprobación siempre se evalúan en dólares: las piezas mexicanas se convierten usando un tipo de cambio configurable (guardado en una lista aparte, editable en cualquier momento sin tocar fórmulas ni código).

---

## Aprobación automática por monto (regla de negocio principal)

| Rango de monto (USD) | Firma requerida |
|---|---|
| $0 – $100 | Supervisor |
| $101 – $500 | Superintendente |
| Más de $500 | Gerente |

La app determina el nivel de firma automáticamente según el total; el usuario nunca lo elige a mano.

---

## Flujo de aprobación

- Al guardar la requisición, se dispara un correo/notificación real (Outlook/Teams) al aprobador correspondiente, con botones de **"Aprobar"** y **"Rechazar"** integrados — el aprobador no necesita abrir ninguna app ni sitio, puede responder desde el celular.
- Si rechaza, debe poder capturar un motivo, que quede visible en el detalle de la requisición.
- Quién es "Supervisor", "Superintendente" y "Gerente" (sus correos) debe vivir en una lista editable, para poder cambiar de persona sin tocar el flujo.

---

## Estados de una requisición

```
Pendiente → Aprobada / Rechazada → Surtida
```

Colores distintos por estado en toda la interfaz.

---

## Roles

| Rol | Permisos |
|---|---|
| Empleado del Tool Crib | Crea y consulta requisiciones |
| Supervisor / Superintendente / Gerente | Solo aprueban/rechazan por correo, sin necesidad de entrar a la app |
| Almacén | Una vez aprobada la requisición y entregado el material físicamente, la marca como "Surtida" |

---

## Pantallas

### 1. Nueva requisición
El formulario descrito arriba, con folio automático (formato `REQ-00001`) y total/firma requerida visibles en tiempo real mientras se captura.

### 2. Historial
Lista de requisiciones pasadas (folio, solicitante, área, total, nivel de aprobación, estado), con acceso al detalle de cada una.

### 3. Detalle
Todos los datos de la requisición, sus renglones, quién aprobó/rechazó y cuándo, y el botón de Almacén para marcar "Surtida" cuando aplique.

---

## Diseño

- Colores de marca de la empresa: navy `#0f1c3f` + blanco.
- Logo de la empresa en el encabezado.
- Consistente con otras apps internas ya existentes.
