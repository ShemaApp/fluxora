# Versión 43 — Matriz de roles y acciones

## 1. Alcance aprobado de roles

FLUXORA opera únicamente con dos roles funcionales:

| Rol | Ámbito |
|---|---|
| **ADMIN** | Empresa completa. Consulta y administra localidades, asignaciones, clientes, vehículos, medidores, productos, tarifas, inventario, créditos, caja, gastos, jornadas, conciliaciones, reportes, permisos y auditoría. |
| **REPARTIDOR** | Solo su operación asignada: localidades autorizadas, clientes de esas localidades, vehículo, medidor y jornada activa. Registra operaciones de campo, pero no administra el catálogo global ni aprueba sus propios cierres o ajustes. |

El valor `usuario` no se considera un rol operativo. Tampoco se implementa ahora un tercer rol futuro. Cualquier cuenta con otro valor debe quedar sin menú ni capacidades hasta que exista una definición independiente.

## 2. Claves de la matriz

| Clave | Significado |
|---|---|
| **C** | Puede crear o capturar el registro inicial. |
| **A** | Puede aprobar o confirmar el registro para que tenga efecto administrativo definitivo. |
| **X** | Puede cancelar siguiendo el flujo autorizado. Cancelar no significa borrar; conserva el registro y genera motivo, usuario y fecha. |
| **R** | Puede corregir mediante una operación compensatoria o una corrección auditada. No sobrescribe el histórico original. |
| **V** | Puede consultar dentro de su ámbito. |
| **S** | Puede solicitar o ejecutar sincronización de sus registros locales. |
| **—** | No tiene esa acción. |

## 3. Regla general de autoridad

El **REPARTIDOR crea operaciones de campo** dentro de su jornada y alcance. El **ADMIN administra referencias, aprueba operaciones sensibles y corrige mediante compensaciones**. Las ventas normales no requieren una aprobación manual previa: al confirmar la venta, se registra la operación y queda sujeta a validación atómica, sincronización e historial.

El repartidor nunca puede ampliar su alcance, cambiar la localidad asignada, cambiar de vehículo o medidor por su cuenta, editar una lectura física histórica, alterar una tarifa ya usada, aprobar su propio cierre administrativo, modificar un saldo de crédito existente ni borrar registros confirmados.

## 4. Matriz principal por operación

| Módulo u operación | REPARTIDOR | ADMIN | Regla operativa |
|---|---|---|---|
| **Localidades y cobertura** | V: solo localidades asignadas. | C, A, X, R, V. | La localidad existe primero en el catálogo; la asignación ocurre después. Cancelar una localidad debe ser baja lógica y no debe romper clientes históricos. |
| **Asignación de repartidor, vehículo y medidor** | V: sus referencias vigentes. | C, A, X, R, V. | El repartidor no se autoasigna ni cambia el vínculo durante una jornada abierta. |
| **Clientes fijos** | V: clientes de sus localidades. | C, A, X, R, V. | El repartidor no crea ni edita el catálogo de clientes desde la operación; sus ventas sí quedan ligadas al cliente fijo. |
| **Vehículos** | V: vehículo operativo asignado. | C, A, X, R, V. | El vehículo y su identificador se administran aparte del medidor. |
| **Medidores** | V: medidor vinculado a su vehículo. | C, A, X, R, V. | La lectura anterior es solo lectura para el repartidor. La configuración física la administra ADMIN. |
| **Productos y tarifas** | V: referencias activas y snapshots recibidos. | C, A, X, R, V. | Una tarifa inactiva no se usa en nuevas ventas. El snapshot de la venta no se modifica si después cambia el catálogo. |
| **Inicio de jornada** | C, S, V: crea apertura con vehículo, medidor, localidad, lectura física inicial y carga inicial. X solo antes de sincronizar y con motivo local. | A, X, R, V. | La jornada local debe existir antes de ventas, recargas y cierre. Si ya fue confirmada, la cancelación requiere una operación administrativa auditada. |
| **Carga inicial de agua** | C, S, V: dentro de la apertura. | A, X, R, V. | Respeta capacidad del tanque y queda ligada a jornada, vehículo y medidor. No cambia la lectura física inicial. |
| **Recarga adicional** | C, S, V: solo en jornada abierta y dentro de capacidad. | A, X, R, V. | Valida saldo anterior y no mezcla vehículos ni jornadas. Una recarga confirmada se revierte mediante compensación, no por borrado. |
| **Venta de agua por cantidad** | C, S, V: cantidad comercial, tarifa, forma de pago y cliente asignado. | A, X, R, V. | No requiere aprobación previa. El sistema calcula litros e incremento lógico; el repartidor no captura lectura física después de cada cliente. |
| **Venta a crédito** | C, S, V: mediante la venta. | A, X, R, V. | La venta crea el movimiento de crédito; no representa efectivo recibido. El repartidor no edita el saldo después de confirmada la venta. |
| **Abono de crédito** | V: solo si se habilita expresamente una capacidad futura. | C, A, X, R, V. | La matriz base deja el registro de abonos en ADMIN hasta definir permisos operativos y control de efectivo. |
| **Lectura física inicial** | C, S, V: una vez al abrir jornada. | A, R, V; X solo con corrección auditada. | Nunca se reemplaza por una lectura calculada ni se reescribe por una recarga o venta. |
| **Lectura física final** | C, S, V: al cerrar su jornada. | A, R, V; X solo con corrección auditada. | Es la fuente de verdad para conciliación. La diferencia no modifica ventas originales. |
| **Cierre de jornada** | C, S, V: captura lectura final y envía el cierre. | A, X, R, V. | El cierre se confirma con jornada, lecturas, ventas, recargas, otras salidas y diferencias. El snapshot administrativo se crea después del cierre remoto. |
| **Conciliación** | V: resultado de su jornada y explicación solicitada. | C, A, X, R, V. | ADMIN revisa y resuelve diferencias. La corrección es compensatoria y conserva el resultado original. |
| **Caja y cierre de caja** | V: movimientos producidos por sus ventas, si se habilita el alcance. | C, A, X, R, V. | El cierre de caja requiere confirmación explícita. Puede haber varios cierres en un día, cada uno con folio y periodo; no se duplica un cierre confirmado. |
| **Gastos** | C: solo como borrador ligado a una jornada, si se aprueba esta capacidad. | A, X, R, V. | Un gasto no se disfraza como recarga, venta o ajuste de inventario. Requiere tipo, monto, motivo y evidencia según política. |
| **Inventario de agua** | C, S, V: carga y recarga operativa dentro del tanque asignado. | A, X, R, V. | Agua a granel se controla por litros, tanque, jornada y medidor. No se mezcla con inventario comercial. |
| **Inventario de productos comerciales** | C, S, V: solo consumo o venta si se habilita en su operación. | A, X, R, V. | ADMIN administra existencias, entradas, transferencias y ajustes. El repartidor no modifica existencias globales. |
| **Reportes** | V: solo su operación y jornadas autorizadas. | C, A, X, R, V. | ADMIN puede consultar el consolidado global; el repartidor no ve reportes de otros repartidores. |
| **Sincronización** | C, S, V: registros propios y jornada propia. | V, S: soporte y consulta global. | El repartidor puede sincronizar ahora o esperar la detección automática de internet. No puede editar el payload local para cambiar el resultado. |
| **Auditoría administrativa** | V: solo incidencias propias que se le soliciten. | C, V; R solo mediante nueva entrada de auditoría. | Nadie borra la auditoría. Cada cambio registra actor, fecha, motivo, antes, después, origen y referencia. |

## 5. Flujo de estados

### Operaciones de campo

```text
capturada_localmente
        ↓
pendiente_sincronizacion
        ↓
sincronizando
        ├── confirmada → disponible en el historial remoto
        ├── error_transitorio → permanece pendiente y reintenta
        ├── conflicto → requiere revisión, no sobrescribe el remoto
        └── bloqueada → conserva evidencia y no se aplica
```

Una operación local confirmada no se elimina antes de la confirmación remota. Una operación bloqueada o en conflicto no debe convertirse en una operación aplicada por insistencia del botón. Debe mostrar la causa y permitir una corrección autorizada o una nueva operación compensatoria.

### Operaciones que requieren aprobación administrativa

Los cierres, gastos, ajustes de inventario, abonos de crédito, cancelaciones posteriores a la confirmación y correcciones de jornadas deben seguir este flujo:

```text
creada por REPARTIDOR o ADMIN
        ↓
requiere_aprobacion
        ├── aprobada por ADMIN
        ├── rechazada por ADMIN con motivo
        └── cancelada por ADMIN con motivo
```

Las ventas normales, cargas y recargas válidas no deben bloquearse esperando una aprobación manual si la transacción atómica y las reglas de continuidad las aceptan. La aprobación se reserva para operaciones de control o excepciones.

## 6. Reglas de cancelación y corrección

Cancelar es una acción controlada, no una eliminación física. El sistema debe conservar el registro original, su `idLocal`, el usuario que lo creó, el motivo y la referencia de la cancelación. Cuando la operación ya afectó saldo, inventario, crédito, caja o conciliación, la cancelación se realiza mediante una compensación que deja el origen intacto.

El repartidor puede descartar un borrador local que todavía no haya sido confirmado y que no haya generado una operación dependiente. No puede cancelar silenciosamente una venta, una lectura física, una recarga o un cierre que ya haya sido sincronizado. ADMIN puede solicitar la cancelación, pero la aplicación debe conservar ambos movimientos.

## 7. Conflictos y escalamiento

Un conflicto se produce, entre otros casos, cuando cambia el saldo de agua, la jornada ya fue cerrada, el vehículo o medidor no coincide, el registro ya existe con otro payload o dos dispositivos intentan cerrar la misma jornada. La resolución base es conservar el primer registro confirmado, marcar el segundo como conflicto y enviar el caso a ADMIN.

“Escalamiento de rol” no se implementa como un tercer rol en esta matriz. La propuesta base es que ADMIN gestione los cambios de rol y permisos. Si se necesita doble aprobación para cambios de alto riesgo, se agregará una regla de aprobación entre administradores sin crear una nueva experiencia para el usuario genérico.

## 8. Auditoría mínima obligatoria

Cada creación, aprobación, cancelación, corrección, cambio de permiso, cambio de asignación, cambio de tarifa, ajuste de inventario, movimiento de crédito, movimiento de caja y gasto debe generar una entrada de auditoría con:

| Campo | Propósito |
|---|---|
| `auditId` | Identificador inmutable del evento. |
| `actorUid` y `actorRole` | Quién ejecutó la acción y con qué rol. |
| `accion` y `entidad` | Qué operación se ejecutó sobre qué entidad. |
| `entidadId` e `idLocal` | Referencia remota y referencia local cuando exista. |
| `antes` y `despues` | Valores relevantes antes y después. |
| `motivo` | Obligatorio para cancelar, corregir, aprobar excepciones o ajustar. |
| `createdAt` y `origen` | Fecha y si provino de operación online u offline. |
| `jornadaId`, `vehiculoId`, `medidorId` | Trazabilidad operativa cuando corresponda. |

La auditoría debe ser de solo agregado. Una corrección no edita la auditoría anterior: crea un evento nuevo que referencia al evento original.

## 9. Decisiones que deben confirmarse antes de implementar reglas

| Decisión pendiente | Recomendación base |
|---|---|
| ¿REPARTIDOR puede registrar abonos? | Mantenerlo deshabilitado hasta definir control de efectivo y permisos; ADMIN registra y aprueba. |
| ¿REPARTIDOR puede crear gastos? | Permitir únicamente borradores ligados a jornada si el negocio necesita captura en ruta; ADMIN aprueba o cancela. |
| ¿Se requiere segundo ADMIN para cambios críticos? | Recomendable para cambios de rol, permisos, saldos, inventario y correcciones históricas cuando haya más de un ADMIN. |
| ¿Una carga o recarga requiere aprobación manual? | No para operaciones válidas; sí para ajustes, reversas o excepciones. |
| ¿Qué ocurre con una venta local que llega después del cierre? | Aceptarla solo si su `createdOfflineAt` pertenece a la jornada abierta y pasa la regla de continuidad; de lo contrario, conflicto para ADMIN. |
| ¿Qué datos puede consultar ADMIN sobre todos los repartidores? | Proponer acceso global completo, con filtros y auditoría de consulta para datos sensibles de crédito y caja. |

## 10. Resultado de la matriz

La frontera queda definida así: **REPARTIDOR captura la operación real en campo y la sincroniza; ADMIN configura, supervisa, aprueba las excepciones, corrige mediante compensaciones y conserva la auditoría**. Esta separación evita que el repartidor opere fuera de sus localidades, que una venta modifique el medidor físico, que el crédito se confunda con efectivo o que una corrección borre el historial.
