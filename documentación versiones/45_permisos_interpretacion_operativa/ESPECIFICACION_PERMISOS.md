# FLUXORA — Especificación normativa de permisos

## Estado del documento

Esta especificación reemplaza la redacción ambigua de permisos para fines de diseño y revisión. **No modifica todavía el código, la interfaz, las reglas de Firestore ni la cola offline.** Su propósito es fijar la interpretación que deberá aprobarse antes de implementar.

## 1. Roles vigentes

FLUXORA mantiene únicamente dos roles funcionales:

| Rol | Ámbito autorizado |
|---|---|
| **ADMIN** | Empresa completa: catálogo, cobertura, clientes, vehículos, medidores, productos, tarifas, inventario, créditos, caja, gastos, jornadas, conciliaciones, reportes, permisos y auditoría. |
| **REPARTIDOR** | Operación asignada: localidades autorizadas, clientes de esas localidades, vehículo y medidor autorizados, jornada activa y operaciones de campo propias. |

El valor `usuario` no es un rol operativo. No se crea ni se implementa ahora el tercer rol futuro. Una cuenta con un rol no reconocido no debe recibir menú ni capacidades por defecto.

## 2. Estructura obligatoria de cada permiso

Toda regla debe escribirse con estos siete elementos, en este orden:

| Elemento | Pregunta que debe responder |
|---|---|
| **Acción** | ¿Qué puede intentar hacer la persona? |
| **Objeto** | ¿Sobre qué entidad u operación actúa? |
| **Estado** | ¿En qué estado se permite o se bloquea? |
| **Alcance** | ¿Qué registros puede afectar? |
| **Efecto** | ¿Qué cambio válido produce el sistema? |
| **Prohibición** | ¿Qué alteración exacta queda bloqueada? |
| **Excepción** | ¿Qué ocurre ante una anomalía y quién la resuelve? |

Toda regla que contenga una prohibición debe terminar con la frase exacta:

> **Esto NO debe impedir:** [operación normal que continúa permitida y la razón].

La cláusula evita que una restricción sobre edición, administración o corrección se interprete como una prohibición de ejecutar la operación normal que actualiza automáticamente un dato.

## 3. Principios de interpretación

### 3.1 Capturar no es administrar

**Capturar** significa registrar un hecho que está ocurriendo en una jornada: iniciar, cargar, vender, cobrar un pago si la capacidad está habilitada, recargar, cerrar y sincronizar. **Administrar** significa configurar catálogos, asignaciones, permisos y condiciones globales. **Corregir** significa resolver una operación posterior mediante una compensación o una nueva entrada auditada.

La actualización automática de un saldo, existencia, medidor lógico, caja o conciliación que deriva de una operación válida no es una modificación manual prohibida.

### 3.2 Confirmación operativa no es aprobación previa

La confirmación operativa valida localmente y, cuando corresponde, transaccionalmente en el servidor que la operación cumple reglas de jornada, alcance, saldo, referencias e idempotencia. No requiere que ADMIN esté conectado.

La aprobación administrativa se reserva para excepciones, ajustes, gastos, reversas, cancelaciones posteriores, conflictos y correcciones que cambien un resultado ya confirmado.

### 3.3 Regla superior de continuidad

Ninguna restricción administrativa debe impedir al REPARTIDOR completar una operación normal de su jornada dentro de su alcance autorizado, incluso sin conexión. Una anomalía se registra como incidencia; no se transforma automáticamente en bloqueo de toda la jornada.

## 4. Reglas normativas por operación

### Regla P-01 — Iniciar jornada

- **Acción:** iniciar jornada.
- **Objeto:** jornada operativa, vehículo autorizado, medidor autorizado, localidad y lectura física inicial.
- **Estado:** sin jornada abierta para el repartidor y con referencias vigentes.
- **Alcance:** únicamente el repartidor autenticado y el conjunto de vehículo, medidor y localidad autorizado para él.
- **Efecto:** crea primero en IndexedDB la apertura local con `idLocal`, `jornadaId`, `vehiculoId`, `medidorId`, lectura física inicial, carga inicial y marcas de tiempo; después puede sincronizarse de forma idempotente.
- **Prohibición:** no permite alterar retrospectivamente una jornada cerrada, reutilizar una jornada de otro repartidor ni cambiar después la lectura física inicial como si fuera una lectura calculada.
- **Excepción:** si existe una jornada abierta, una referencia incompatible o una duplicidad, el sistema conserva la operación local y la marca como conflicto; ADMIN resuelve sin sobrescribir la jornada original.
- **Esto NO debe impedir:** iniciar una nueva jornada válida con referencias autorizadas ni continuar offline cuando la apertura aún no se haya confirmado en Firestore.

### Regla P-02 — Registrar carga inicial

- **Acción:** registrar carga inicial.
- **Objeto:** carga de agua del vehículo y saldo inicial de litros.
- **Estado:** durante la apertura de una jornada todavía no cerrada.
- **Alcance:** tanque y vehículo vinculados a la jornada actual del repartidor.
- **Efecto:** registra la carga primero en IndexedDB, incrementa el saldo local dentro de la capacidad máxima y la liga a jornada, vehículo y medidor.
- **Prohibición:** no permite exceder la capacidad configurada, sobrescribir una carga confirmada ni mezclar la carga con otro vehículo o jornada.
- **Excepción:** si el saldo remoto no coincide o la capacidad ya fue consumida por otra operación, la carga queda en conflicto para ADMIN; no se elimina el registro local.
- **Esto NO debe impedir:** cargar la cantidad válida disponible ni iniciar la ruta sin conexión después de que la carga haya quedado registrada localmente.

### Regla P-03 — Registrar recarga adicional

- **Acción:** registrar recarga.
- **Objeto:** saldo de agua del tanque durante una jornada abierta.
- **Estado:** jornada abierta, vehículo y medidor coincidentes y litros solicitados dentro de la capacidad restante.
- **Alcance:** solo la jornada activa y el vehículo vinculado al repartidor.
- **Efecto:** guarda el saldo anterior, litros agregados y saldo posterior en IndexedDB; al sincronizar verifica el saldo remoto y aplica la recarga atómicamente.
- **Prohibición:** no permite cargar más de la capacidad restante, reescribir la lectura física inicial ni trasladar litros entre vehículos o jornadas.
- **Excepción:** un saldo remoto diferente produce conflicto de recarga para revisión administrativa; la recarga no se aplica dos veces por reintento.
- **Esto NO debe impedir:** vender el saldo que sí existe, recargar una cantidad válida después de una venta y continuar la jornada aunque una recarga quede pendiente de sincronización.

### Regla P-04 — Registrar venta de agua medida

- **Acción:** registrar venta.
- **Objeto:** cliente fijo asignado, cantidad comercial, tarifa, forma de pago y consumo de agua.
- **Estado:** jornada abierta, cliente dentro del alcance y saldo de agua suficiente.
- **Alcance:** clientes de las localidades autorizadas y jornada activa del repartidor.
- **Efecto:** guarda primero la venta en IndexedDB; calcula litros comerciales, incremento lógico del medidor, subtotal, forma de pago y saldo posterior; luego sincroniza de forma idempotente.
- **Prohibición:** no permite editar o eliminar una venta confirmada, vender más litros que el saldo disponible, cambiar la tarifa global ni capturar una lectura física después de cada cliente.
- **Excepción:** una cantidad que exceda el saldo se rechaza solo para esa venta; una venta confirmada con error posterior queda pendiente o en conflicto para revisión, sin cancelar ventas anteriores.
- **Esto NO debe impedir:** registrar una cantidad menor o igual al saldo disponible, vender los últimos litros disponibles y continuar con las ventas anteriores aunque una nueva venta sea rechazada.

### Regla P-05 — Registrar venta a crédito

- **Acción:** registrar venta a crédito.
- **Objeto:** venta, cliente con crédito habilitado y movimiento de saldo.
- **Estado:** cliente habilitado para crédito, jornada abierta y venta válida.
- **Alcance:** clientes autorizados del repartidor y la cuenta corriente del cliente correspondiente.
- **Efecto:** registra la venta localmente, aumenta automáticamente el saldo derivado y conserva el snapshot de tarifa, cliente, jornada y forma de pago.
- **Prohibición:** no permite introducir, reemplazar o eliminar manualmente el saldo ni convertir crédito registrado en efectivo recibido.
- **Excepción:** si el crédito está bloqueado, el sistema marca la venta como excepción según la política aprobada; ADMIN resuelve la habilitación, ajuste o reversa mediante una operación auditada.
- **Esto NO debe impedir:** registrar una venta a crédito habilitada ni actualizar automáticamente el saldo como consecuencia de esa venta.

### Regla P-06 — Registrar pago o abono

- **Acción:** registrar pago recibido.
- **Objeto:** abono de crédito, saldo de cliente y movimiento de caja.
- **Estado:** capacidad habilitada para el REPARTIDOR y pago efectivamente recibido; de lo contrario, solo ADMIN puede registrarlo.
- **Alcance:** cliente autorizado, jornada activa y monto realmente recibido.
- **Efecto:** crea un movimiento de pago local con monto, cliente, jornada, usuario y forma de pago; el saldo se recalcula por la operación registrada y el efectivo esperado se actualiza.
- **Prohibición:** no permite modificar directamente el saldo, registrar un pago inexistente, duplicar un abono confirmado ni borrar el movimiento para ocultar una diferencia de caja.
- **Excepción:** pago duplicado, saldo incompatible, devolución o reversa se envía a ADMIN como excepción auditada; el movimiento original permanece.
- **Esto NO debe impedir:** registrar un pago real cuando la capacidad esté habilitada ni actualizar automáticamente el saldo y el efectivo esperado como efecto del pago.

### Regla P-07 — Capturar lectura física inicial

- **Acción:** capturar lectura física inicial.
- **Objeto:** lectura acumulativa física del medidor.
- **Estado:** una sola vez al abrir la jornada, antes de las ventas.
- **Alcance:** medidor vinculado al vehículo y jornada actual.
- **Efecto:** guarda el valor introducido localmente y lo liga a la apertura; la lectura se utiliza como base de conciliación.
- **Prohibición:** no permite reemplazarla por el medidor lógico, editarla después de confirmar la apertura ni modificar la configuración, factor o asignación permanente del medidor.
- **Excepción:** lectura ilegible, incorrecta o incompatible se conserva como incidencia; ADMIN corrige mediante una nueva lectura auditada o una operación de corrección.
- **Esto NO debe impedir:** registrar la lectura inicial válida ni trabajar con incrementos lógicos calculados mientras no exista conexión.

### Regla P-08 — Capturar lectura física final

- **Acción:** capturar lectura física final.
- **Objeto:** lectura acumulativa física al cierre de la jornada.
- **Estado:** jornada abierta y operaciones de la ruta terminadas o registradas.
- **Alcance:** el medidor del vehículo y la jornada activa.
- **Efecto:** guarda localmente la lectura final y calcula litros físicos, litros registrados, diferencia y resumen por tarifa para la conciliación.
- **Prohibición:** no permite usar la lectura lógica como sustituto silencioso de la lectura física final ni editar el cierre confirmado.
- **Excepción:** diferencia, lectura incompatible o cierre concurrente se registra como incidencia; ADMIN revisa sin sobrescribir las ventas originales.
- **Esto NO debe impedir:** cerrar una jornada con diferencia de medidor ni conservar la diferencia como resultado de conciliación.

### Regla P-09 — Cerrar jornada

- **Acción:** cerrar jornada.
- **Objeto:** jornada, ventas, recargas, carga, lectura final y conciliación.
- **Estado:** jornada abierta y cierre capturado localmente.
- **Alcance:** únicamente la jornada del repartidor, su vehículo, medidor y operaciones dependientes.
- **Efecto:** crea primero el cierre en IndexedDB; al sincronizar actualiza la jornada en una operación atómica y permite generar el snapshot administrativo posterior.
- **Prohibición:** no permite cerrar dos veces la misma jornada, cambiar después sus acumulados sin auditoría ni borrar la diferencia detectada.
- **Excepción:** si existen operaciones pendientes, el cierre queda pendiente o en conflicto según sus dependencias; ADMIN resuelve la excepción sin obligar al repartidor a repetir la jornada completa.
- **Esto NO debe impedir:** capturar y cerrar una jornada con diferencia, conservar el historial de ventas y continuar trabajando en una nueva jornada autorizada cuando la anterior quede pendiente de sincronización.

### Regla P-10 — Consultar cliente

- **Acción:** consultar cliente.
- **Objeto:** ficha operativa, localidad, domicilio, saldo, crédito e historial permitido.
- **Estado:** cliente activo o histórico visible por la política de consulta.
- **Alcance:** REPARTIDOR solo clientes de sus localidades; ADMIN todos los clientes de la empresa.
- **Efecto:** muestra información necesaria para operar sin exponer herramientas administrativas al repartidor.
- **Prohibición:** no permite que REPARTIDOR cambie localidad, tarifa habitual, límite de crédito, responsable o atributos administrativos del cliente desde la operación.
- **Excepción:** dato incorrecto o cliente que requiere alta se convierte en incidencia para ADMIN; el cliente eventual no se habilita automáticamente por esta regla.
- **Esto NO debe impedir:** consultar la información operativa necesaria y registrar una venta válida a un cliente asignado.

### Regla P-11 — Seleccionar vehículo y medidor autorizados

- **Acción:** seleccionar referencia operativa.
- **Objeto:** vehículo y medidor vinculados a la jornada.
- **Estado:** antes de iniciar una jornada o cuando ADMIN haya autorizado un alterno.
- **Alcance:** solo referencias vigentes asignadas al repartidor.
- **Efecto:** liga las nuevas operaciones a la pareja vehículo-medidor elegida y conserva la referencia en cada registro local.
- **Prohibición:** no permite modificar la ficha administrativa, la asignación permanente, el factor del medidor ni mezclar operaciones entre vehículos.
- **Excepción:** falla del vehículo requiere un alterno previamente autorizado por ADMIN; si no existe, se crea una incidencia y no se inventa una asignación temporal.
- **Esto NO debe impedir:** seleccionar un vehículo autorizado para iniciar una jornada ni continuar una jornada ya abierta con su referencia original.

### Regla P-12 — Administrar productos y tarifas

- **Acción:** crear, editar, activar o desactivar configuración comercial.
- **Objeto:** producto, tarifa, unidad comercial, litros por unidad, incremento físico y precio.
- **Estado:** catálogo administrativo.
- **Alcance:** ADMIN en toda la empresa; REPARTIDOR solo consulta referencias activas recibidas para su operación.
- **Efecto:** una configuración activa puede ser usada en nuevas operaciones y cada venta conserva un snapshot inmutable.
- **Prohibición:** REPARTIDOR no puede modificar la tarifa global; ADMIN no puede cambiar retrospectivamente el snapshot de una venta ni recalcular históricos con la tarifa vigente.
- **Excepción:** tarifa especial o precio excepcional se registra como excepción con vigencia, motivo y autorización de ADMIN; no se cambia la configuración global por una sola venta.
- **Esto NO debe impedir:** usar una tarifa activa recibida offline ni calcular el precio de una venta con el snapshot específico de esa venta.

### Regla P-13 — Registrar gasto

- **Acción:** registrar gasto operativo.
- **Objeto:** gasto, monto, motivo, jornada, caja y comprobante.
- **Estado:** capacidad habilitada y jornada abierta; el estado inicial puede ser borrador o pendiente de aprobación.
- **Alcance:** solo la jornada y caja operativa del repartidor.
- **Efecto:** crea localmente un movimiento separado de ventas, recargas e inventario; ADMIN posteriormente aprueba, rechaza, cancela o corrige.
- **Prohibición:** no permite que el repartidor apruebe su propio gasto, lo convierta en recarga o altere el efectivo esperado sin un movimiento registrado.
- **Excepción:** falta de comprobante, monto incompatible o gasto no autorizado queda pendiente de revisión; ADMIN resuelve con motivo.
- **Esto NO debe impedir:** capturar un gasto real como borrador o pendiente si la capacidad ha sido aprobada para la operación en ruta.

### Regla P-14 — Administrar inventario

- **Acción:** registrar entrada, salida, transferencia, consumo o ajuste.
- **Objeto:** agua a granel, carga del tanque o producto comercial.
- **Estado:** movimiento operativo o ajuste administrativo según la acción.
- **Alcance:** REPARTIDOR solo tanque y productos que tenga asignados; ADMIN inventario global.
- **Efecto:** agua a granel se actualiza por litros, jornada, vehículo y medidor; productos comerciales por existencia, entrada y salida.
- **Prohibición:** no permite mezclar agua con inventario comercial, transferir existencias entre vehículos sin referencia ni realizar ajustes globales desde el rol repartidor.
- **Excepción:** diferencia de existencia, transferencia no reconocida o ajuste se marca para ADMIN; el movimiento original no se borra.
- **Esto NO debe impedir:** registrar una carga, recarga o consumo válido del tanque asignado ni vender mientras el saldo local disponible sea suficiente.

### Regla P-15 — Sincronizar operaciones

- **Acción:** sincronizar.
- **Objeto:** registros locales de jornada y operaciones dependientes.
- **Estado:** manual al pulsar el botón o automático al detectar internet.
- **Alcance:** REPARTIDOR solo sus registros y su jornada; ADMIN puede consultar el estado global sin alterar payloads ajenos.
- **Efecto:** procesa la cola única respetando dependencias, idempotencia y transacciones; conserva el registro local hasta confirmación remota.
- **Prohibición:** no permite editar manualmente el payload para cambiar una operación, borrar una operación pendiente confirmada localmente ni saltar dependencias de jornada.
- **Excepción:** error transitorio reintenta; conflicto o bloqueo conserva evidencia y requiere resolución administrativa; una sincronización parcial no revierte operaciones ya confirmadas.
- **Esto NO debe impedir:** trabajar offline, continuar una jornada con operaciones pendientes y sincronizar de nuevo al recuperar conexión.

### Regla P-16 — Corregir, cancelar o revertir

- **Acción:** corregir, cancelar o revertir una operación confirmada.
- **Objeto:** venta, pago, recarga, jornada, cierre, inventario, caja o gasto.
- **Estado:** registro ya confirmado o excepción detectada.
- **Alcance:** ADMIN y solo mediante una operación compensatoria auditada.
- **Efecto:** conserva el original y agrega una corrección con actor, fecha, motivo, referencia e impacto calculado.
- **Prohibición:** no permite sobrescribir, borrar silenciosamente ni recalcular el histórico con la configuración actual.
- **Excepción:** conflicto de autoridad o falta de motivo impide la corrección hasta que ADMIN complete la información requerida; no se modifica el original.
- **Esto NO debe impedir:** que el repartidor capture operaciones normales ni que el sistema actualice automáticamente los saldos y acumulados derivados de ellas.

## 5. Matriz resumida de capacidad

| Operación | REPARTIDOR | ADMIN | ¿Aprobación previa para operación normal? |
|---|---|---|---|
| Iniciar jornada | Captura local, sincroniza, consulta propia. | Consulta, corrige excepciones. | No. |
| Carga y recarga | Captura dentro de referencias y capacidad. | Consulta, corrige y revierte. | No. |
| Venta de agua | Captura, calcula y sincroniza. | Consulta, corrige y revierte. | No. |
| Venta a crédito | Captura si el crédito está habilitado. | Administra condiciones y correcciones. | No. |
| Pago o abono | Pendiente de habilitación expresa; si se habilita, captura el pago real. | Registra, aprueba y corrige. | No para un pago real permitido. |
| Lectura inicial y final | Captura físicamente las de su jornada. | Consulta y corrige de forma auditada. | No. |
| Cierre de jornada | Captura y sincroniza; puede cerrar con diferencia. | Revisa y resuelve excepciones. | No. |
| Gastos | Pendiente de habilitación; solo borrador o pendiente si se aprueba. | Aprueba, cancela y corrige. | No para captura; sí para aprobación posterior. |
| Catálogo, cobertura y asignaciones | Consulta referencias propias. | Crea, administra, cancela y corrige. | Sí para cambios administrativos. |
| Sincronización | Manual y automática de sus registros. | Consulta y soporte. | No. |
| Auditoría | Consulta incidencias propias cuando corresponda. | Administra y conserva. | No aplica. |

## 6. Regla final contra bloqueos accidentales

Antes de implementar cualquier permiso, la especificación debe responder explícitamente:

> **¿La prohibición impide una alteración manual concreta o impide una operación normal que actualiza automáticamente el dato?**

Solo la primera debe bloquearse. La segunda debe permanecer permitida y debe auditarse mediante el registro de la operación que produjo el cambio.
