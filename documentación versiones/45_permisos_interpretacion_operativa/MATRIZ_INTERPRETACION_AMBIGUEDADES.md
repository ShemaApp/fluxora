# FLUXORA — Matriz de Interpretación Operativa y Ambigüedades

## Propósito

Este documento debe leerse antes de modificar permisos, navegación, reglas Firebase o lógica de operaciones. Su objetivo es detectar qué podría hacer Manus si interpreta literalmente una frase de la especificación y convertirla en una regla operativa precisa.

Cada entrada sigue obligatoriamente esta secuencia:

```text
Frase original
↓
Interpretación peligrosa
↓
Consecuencia operativa
↓
Intención real
↓
Redacción corregida
↓
Qué SÍ debe permitir
↓
Qué NO debe permitir
↓
Quién resuelve la excepción
↓
Esto NO debe impedir
```

## Roles que deben conservarse

La matriz se aplica únicamente a **ADMIN** y **REPARTIDOR**. `usuario` no se convierte en rol comodín y el tercer rol futuro no se implementa en esta etapa.

## Regla de lectura obligatoria

Una prohibición administrativa debe bloquear una **alteración manual no autorizada**, no una operación normal que produce una actualización automática. Una venta a crédito puede aumentar el saldo; una venta de agua puede disminuir el saldo del tanque; una recarga puede aumentarlo; un cierre puede generar una diferencia. Esos efectos son parte de las operaciones permitidas cuando la operación cumple sus condiciones.

---

## 1. “No puede modificar el saldo”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “El repartidor no puede modificar el saldo.” |
| **Interpretación peligrosa** | El repartidor no puede registrar ventas a crédito, pagos o cualquier operación que cambie el saldo. |
| **Consecuencia operativa** | Se bloquea una venta legítima a crédito o un pago recibido en ruta; el saldo queda desactualizado y se obliga a contactar a ADMIN. |
| **Intención real** | El repartidor no debe escribir un saldo arbitrario ni borrar el historial; el sistema sí debe recalcularlo por operaciones válidas. |
| **Redacción corregida** | El REPARTIDOR puede registrar una venta a crédito y, si la capacidad está habilitada, un pago real. El sistema calcula el saldo por las operaciones registradas. No puede introducir, reemplazar o eliminar manualmente el saldo resultante. |
| **Qué SÍ debe permitir** | Registrar una venta a crédito habilitada y registrar un pago permitido, ambos primero en IndexedDB y luego en sincronización idempotente. |
| **Qué NO debe permitir** | Escribir un saldo final sin movimiento de venta, pago o ajuste autorizado; borrar un abono o sobrescribir el saldo histórico. |
| **Quién resuelve la excepción** | ADMIN mediante ajuste o reversa auditada. |
| **Esto NO debe impedir** | Registrar una venta a crédito ni registrar un pago permitido, porque ambas operaciones actualizan automáticamente el saldo. |

## 2. “No puede modificar la jornada”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “El repartidor no puede modificar la jornada.” |
| **Interpretación peligrosa** | El repartidor no puede iniciar, cargar, vender, recargar ni cerrar la jornada. |
| **Consecuencia operativa** | La operación de campo queda bloqueada o depende de ADMIN conectado. |
| **Intención real** | El repartidor puede ejecutar operaciones dentro de su jornada; no puede alterar retrospectivamente acumulados o una jornada ya confirmada. |
| **Redacción corregida** | El REPARTIDOR puede iniciar, operar y cerrar su jornada autorizada. No puede editar manualmente los acumulados ni modificar una jornada confirmada fuera de una corrección autorizada. |
| **Qué SÍ debe permitir** | Apertura, carga, ventas, recargas, lectura final y cierre local-first dentro de su jornada. |
| **Qué NO debe permitir** | Reabrir una jornada cerrada, cambiar su vehículo o medidor después de confirmarla o sustituir sus operaciones por valores manuales. |
| **Quién resuelve la excepción** | ADMIN mediante corrección auditada o nueva operación compensatoria. |
| **Esto NO debe impedir** | Iniciar, continuar y cerrar una jornada normal, incluso offline y aunque exista una diferencia de medidor. |

## 3. “No puede modificar el medidor”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “El repartidor no puede modificar el medidor.” |
| **Interpretación peligrosa** | El repartidor no puede registrar la lectura inicial, la lectura final o los incrementos lógicos de la ruta. |
| **Consecuencia operativa** | Se pierde trazabilidad física y se impide la conciliación. |
| **Intención real** | Puede capturar las lecturas físicas de su jornada y el sistema calcula el medidor lógico; no puede cambiar configuración, factor, asignación o historial. |
| **Redacción corregida** | El REPARTIDOR puede capturar la lectura física inicial y final del medidor autorizado. El sistema calcula los incrementos lógicos según las ventas. No puede modificar configuración, factor de conversión, asignación permanente ni lecturas confirmadas. |
| **Qué SÍ debe permitir** | Capturar inicial y final; mostrar medidor lógico acumulado; guardar snapshots de conversión. |
| **Qué NO debe permitir** | Capturar una lectura física después de cada cliente, alterar el factor de incremento o usar el medidor de otro vehículo. |
| **Quién resuelve la excepción** | ADMIN mediante corrección de lectura o configuración auditada. |
| **Esto NO debe impedir** | Registrar lecturas físicas inicial y final ni calcular automáticamente el incremento lógico durante la ruta. |

## 4. “No puede modificar el vehículo”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “El repartidor no puede modificar el vehículo.” |
| **Interpretación peligrosa** | El repartidor no puede seleccionar un vehículo autorizado para iniciar su jornada ni continuar con el vehículo asignado. |
| **Consecuencia operativa** | Una falla o cambio operativo detiene la jornada. |
| **Intención real** | Puede seleccionar una referencia autorizada; no puede editar la ficha ni cambiar la asignación permanente. |
| **Redacción corregida** | El REPARTIDOR puede seleccionar un vehículo previamente autorizado para su operación antes de iniciar jornada. No puede cambiar la ficha administrativa ni la asignación permanente del vehículo. |
| **Qué SÍ debe permitir** | Seleccionar el vehículo asignado y, si se aprueba, un vehículo alterno previamente autorizado con su medidor correspondiente. |
| **Qué NO debe permitir** | Vincularse a cualquier vehículo, mezclar operaciones entre vehículos o cambiar la asociación permanente. |
| **Quién resuelve la excepción** | ADMIN autoriza el alterno o corrige la asignación. |
| **Esto NO debe impedir** | Elegir un vehículo autorizado y comenzar la jornada con la pareja vehículo-medidor correcta. |

## 5. “No puede modificar el cliente”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “El repartidor no puede modificar el cliente.” |
| **Interpretación peligrosa** | El repartidor no puede consultar al cliente, seleccionarlo para venderle o registrar una operación. |
| **Consecuencia operativa** | Se bloquea la venta a clientes fijos y se confunde consulta con administración. |
| **Intención real** | Puede consultar y operar sobre clientes de su alcance; no puede cambiar sus datos administrativos. |
| **Redacción corregida** | El REPARTIDOR puede consultar y seleccionar clientes activos de sus localidades autorizadas para registrar ventas. No puede cambiar nombre, localidad, tarifa habitual, límite de crédito, responsable o estado administrativo. |
| **Qué SÍ debe permitir** | Consultar cliente, domicilio operativo, crédito permitido y registrar su venta. |
| **Qué NO debe permitir** | Moverlo de localidad, cambiar condiciones comerciales, cambiar responsable o convertirlo en cliente fijo sin proceso administrativo. |
| **Quién resuelve la excepción** | ADMIN actualiza la ficha o revisa un caso no listado. |
| **Esto NO debe impedir** | Consultar al cliente asignado ni registrar una venta válida dentro de su alcance. |

## 6. “No puede modificar la venta”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “El repartidor no puede modificar ventas.” |
| **Interpretación peligrosa** | No puede corregir una captura en borrador ni registrar una nueva venta que afecte acumulados. |
| **Consecuencia operativa** | La captura de campo se vuelve rígida y una equivocación antes de confirmar requiere intervención remota. |
| **Intención real** | Puede editar un borrador local antes de confirmarlo; una venta confirmada no se sobrescribe. |
| **Redacción corregida** | El REPARTIDOR puede editar una venta mientras permanezca en borrador local. Después de confirmada, la venta es inmutable y cualquier corrección se registra como operación administrativa auditada. |
| **Qué SÍ debe permitir** | Capturar, revisar, corregir el borrador y confirmar la venta con snapshot de tarifa y forma de pago. |
| **Qué NO debe permitir** | Editar o eliminar una venta confirmada, cambiar su tarifa usada o alterar su impacto en medidor e inventario sin compensación. |
| **Quién resuelve la excepción** | ADMIN mediante reversa, cancelación lógica o compensación auditada. |
| **Esto NO debe impedir** | Registrar nuevas ventas ni corregir una captura local antes de confirmarla. |

## 7. “No puede modificar el crédito”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “El repartidor no puede modificar el crédito.” |
| **Interpretación peligrosa** | No puede registrar ventas a crédito ni pagos recibidos. |
| **Consecuencia operativa** | Se detiene la venta legítima y el saldo del cliente queda incompleto. |
| **Intención real** | Puede registrar movimientos de crédito permitidos; no puede editar directamente el saldo, límites o condiciones. |
| **Redacción corregida** | El REPARTIDOR puede registrar una venta a crédito cuando el cliente esté habilitado y un pago real cuando la capacidad de abonos esté activa. No puede cambiar manualmente saldo, límite, condición o historial de crédito. |
| **Qué SÍ debe permitir** | Crear el movimiento de venta o pago y permitir que el sistema calcule el saldo. |
| **Qué NO debe permitir** | Borrar movimientos, introducir saldos, conceder límites o revertir abonos sin operación autorizada. |
| **Quién resuelve la excepción** | ADMIN administra condiciones y correcciones. |
| **Esto NO debe impedir** | Registrar una venta a crédito habilitada ni un pago real permitido. |

## 8. “Editar”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “No puede editar.” |
| **Interpretación peligrosa** | Ningún formulario o borrador puede corregirse antes de confirmarse. |
| **Consecuencia operativa** | Una captura equivocada se convierte en un bloqueo de operación o en una llamada al administrador. |
| **Intención real** | Editar depende del objeto y su estado: un borrador propio puede editarse; un registro confirmado requiere corrección auditada. |
| **Redacción corregida** | El usuario puede editar un borrador de su alcance antes de confirmación. Un registro confirmado no se edita directamente; se corrige con una operación autorizada que referencia el original. |
| **Qué SÍ debe permitir** | Corregir borradores locales antes de sincronización y completar campos faltantes permitidos. |
| **Qué NO debe permitir** | Editar silenciosamente registros confirmados o cambiar el payload para eludir una validación. |
| **Quién resuelve la excepción** | ADMIN mediante corrección auditada. |
| **Esto NO debe impedir** | Corregir un borrador antes de confirmar la operación. |

## 9. “Eliminar”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “No puede eliminar.” |
| **Interpretación peligrosa** | El sistema no puede descartar un borrador local, retirar un duplicado evidente o cancelar lógicamente una referencia. |
| **Consecuencia operativa** | Se acumulan errores o se obliga a conservar operaciones nunca confirmadas. |
| **Intención real** | No se borran registros confirmados; un borrador sin dependencias puede descartarse y una entidad administrativa puede darse de baja lógicamente. |
| **Redacción corregida** | El REPARTIDOR puede descartar un borrador local propio que no tenga dependencias. Nadie elimina físicamente una operación confirmada; ADMIN puede cancelarla lógicamente mediante un registro auditado. |
| **Qué SÍ debe permitir** | Descartar borradores no confirmados y dar de baja referencias sin destruir el historial. |
| **Qué NO debe permitir** | Borrar ventas, pagos, cargas, recargas, lecturas, cierres o auditoría confirmados. |
| **Quién resuelve la excepción** | ADMIN mediante cancelación lógica o compensación. |
| **Esto NO debe impedir** | Descartar un borrador que todavía no produjo efectos ni dependencias. |

## 10. “Cerrar”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “Cerrar jornada” o “cerrar caja”. |
| **Interpretación peligrosa** | Se debe bloquear el cierre si hay diferencia, pendiente offline o cualquier anomalía. |
| **Consecuencia operativa** | El repartidor no puede terminar su ruta o queda obligado a esperar conexión y aprobación. |
| **Intención real** | Puede cerrar operativamente y registrar las diferencias; las anomalías pasan a revisión. Caja requiere confirmación explícita y conserva folios. |
| **Redacción corregida** | El REPARTIDOR puede cerrar su jornada capturando la lectura física final aunque exista diferencia o sincronización pendiente. El cierre de caja requiere confirmación del usuario y registra un movimiento independiente. |
| **Qué SÍ debe permitir** | Cerrar con diferencia, guardar localmente y sincronizar después; realizar más de un cierre de caja en el día con periodos separados. |
| **Qué NO debe permitir** | Cerrar dos veces la misma jornada, editar un cierre confirmado o borrar la diferencia detectada. |
| **Quién resuelve la excepción** | ADMIN revisa diferencias, conflictos y cierres duplicados. |
| **Esto NO debe impedir** | Completar el cierre operativo ni registrar una diferencia de medidor o una sincronización pendiente. |

## 11. “Aprobar”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “ADMIN debe aprobar la operación.” |
| **Interpretación peligrosa** | Toda venta, carga, recarga, crédito, pago o cierre queda detenido hasta que ADMIN pulse un botón. |
| **Consecuencia operativa** | Se destruye la autonomía offline y el dueño se convierte en operador remoto. |
| **Intención real** | ADMIN aprueba excepciones, ajustes, reversas, gastos y correcciones; la operación normal se confirma por validaciones automáticas. |
| **Redacción corregida** | Las operaciones normales se confirman operativamente cuando cumplen las reglas. ADMIN aprueba solo excepciones y operaciones administrativas definidas, siempre con motivo y auditoría. |
| **Qué SÍ debe permitir** | Confirmar automáticamente una venta, carga, recarga o cierre normal válido. |
| **Qué NO debe permitir** | Usar la aprobación previa como requisito general de conexión o permitir que una operación excepcional se aplique sin revisión. |
| **Quién resuelve la excepción** | ADMIN; si se requiere doble aprobación, se definirá posteriormente sin crear un tercer rol. |
| **Esto NO debe impedir** | Ejecutar una operación normal de jornada sin conexión o sin esperar a ADMIN. |

## 12. “Pendiente”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “La operación queda pendiente.” |
| **Interpretación peligrosa** | Todo registro pendiente es inválido, no puede usarse o debe reintentarse indefinidamente sin mostrar su causa. |
| **Consecuencia operativa** | Se confunden operación creada localmente, error transitorio, conflicto y aprobación administrativa. |
| **Intención real** | Pendiente describe un estado de sincronización o revisión, no necesariamente un error de captura. |
| **Redacción corregida** | Una operación pendiente conserva su registro local, estado, causa, dependencias y alcance. Puede ser reintentable, estar en revisión o esperar una aprobación específica. |
| **Qué SÍ debe permitir** | Continuar una jornada con operaciones pendientes y mostrarlas por jornada en Sincronización. |
| **Qué NO debe permitir** | Ocultar la operación, duplicarla por reintento o aplicar una operación con dependencia no resuelta. |
| **Quién resuelve la excepción** | El sincronizador resuelve errores transitorios; ADMIN resuelve conflictos y aprobaciones. |
| **Esto NO debe impedir** | Continuar trabajando ni consultar la operación local mientras espera sincronización. |

## 13. “Asignado”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “Cliente, localidad o vehículo asignado.” |
| **Interpretación peligrosa** | Si no hay conexión para consultar la asignación, el repartidor no puede operar, aunque la referencia ya estuviera autorizada localmente. |
| **Consecuencia operativa** | Una falla de red detiene rutas previamente preparadas. |
| **Intención real** | La asignación es una referencia administrativa que debe estar disponible localmente con versión y vigencia. |
| **Redacción corregida** | El REPARTIDOR puede operar sobre referencias asignadas y vigentes en su catálogo local. No puede crear ni cambiar asignaciones permanentes. |
| **Qué SÍ debe permitir** | Usar la copia local vigente de sus localidades, clientes, vehículo y medidor durante la jornada. |
| **Qué NO debe permitir** | Operar sobre referencias fuera de alcance o crear una asignación local que no exista en el catálogo autorizado. |
| **Quién resuelve la excepción** | ADMIN actualiza o corrige el catálogo y las asignaciones. |
| **Esto NO debe impedir** | Operar offline con una asignación válida previamente sincronizada. |

## 14. “Autorizado”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “Solo puede operar sobre recursos autorizados.” |
| **Interpretación peligrosa** | Cada paso requiere una consulta online o una aprobación manual adicional. |
| **Consecuencia operativa** | La palabra “autorizado” se convierte en un bloqueo técnico durante la pérdida de conexión. |
| **Intención real** | La autorización debe estar representada por una referencia local vigente y por reglas comprobables de alcance. |
| **Redacción corregida** | El REPARTIDOR puede operar sobre recursos incluidos en su catálogo local vigente y asociados a su usuario, localidad, vehículo o jornada según corresponda. No puede ampliar ese alcance desde el dispositivo. |
| **Qué SÍ debe permitir** | Operar offline sobre referencias previamente autorizadas. |
| **Qué NO debe permitir** | Elegir recursos de otro repartidor o alterar localmente la autorización permanente. |
| **Quién resuelve la excepción** | ADMIN actualiza la autorización; el sincronizador reporta inconsistencias. |
| **Esto NO debe impedir** | Continuar la operación offline dentro del alcance previamente autorizado. |

## 15. “Disponible”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “Agua o producto disponible.” |
| **Interpretación peligrosa** | La disponibilidad solo puede conocerse consultando Firestore o que una venta parcial se bloquee por una solicitud superior al saldo. |
| **Consecuencia operativa** | Se pierde continuidad offline y se castiga toda la jornada por una sola venta excesiva. |
| **Intención real** | El saldo local se calcula por carga, recargas y ventas confirmadas localmente; una venta que excede el saldo se rechaza solo a ella. |
| **Redacción corregida** | El sistema muestra el saldo local disponible por jornada y vehículo. Solo permite vender hasta ese saldo y permite recargar dentro de la capacidad restante. |
| **Qué SÍ debe permitir** | Vender los litros disponibles, vender los últimos litros y continuar después de rechazar una cantidad superior al saldo. |
| **Qué NO debe permitir** | Vender más litros que el saldo local válido o mezclar existencias de otro vehículo o jornada. |
| **Quién resuelve la excepción** | ADMIN resuelve divergencias remotas, ajustes o conflictos de inventario. |
| **Esto NO debe impedir** | Registrar una venta válida menor o igual al saldo ni continuar la jornada después de rechazar una sola venta excesiva. |

## 16. “Consultar”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “Puede consultar.” |
| **Interpretación peligrosa** | Consultar se interpreta como editar o como permiso global para ver toda la empresa. |
| **Consecuencia operativa** | Se expone información fuera del alcance o se eliminan consultas útiles para la venta. |
| **Intención real** | Consultar es leer información necesaria dentro del ámbito del rol, sin conceder administración. |
| **Redacción corregida** | El REPARTIDOR puede consultar datos operativos de sus localidades, clientes, jornada, vehículo, medidor, saldo y operaciones propias. ADMIN puede consultar el ámbito global autorizado. |
| **Qué SÍ debe permitir** | Ver datos necesarios para operar y revisar su historial. |
| **Qué NO debe permitir** | Ver clientes, saldos, caja o jornadas fuera del alcance del repartidor ni editar desde una consulta. |
| **Quién resuelve la excepción** | ADMIN define ampliaciones de consulta y revisa accesos indebidos. |
| **Esto NO debe impedir** | Consultar la información necesaria para seleccionar cliente, vender, cerrar y sincronizar. |

## 17. “Historial”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “Conservar el historial.” |
| **Interpretación peligrosa** | El historial solo se conserva en Firestore y no existe evidencia local mientras la operación esté offline. |
| **Consecuencia operativa** | Una actualización, cierre inesperado o error de sincronización puede ocultar una operación todavía no confirmada remotamente. |
| **Intención real** | La evidencia nace localmente y permanece hasta confirmación; el historial remoto agrega la versión confirmada y las correcciones. |
| **Redacción corregida** | Cada operación conserva localmente su payload, `idLocal`, estado, fechas, dependencias y resultado. Las operaciones confirmadas forman el historial remoto; las correcciones agregan nuevos eventos sin sobrescribir el origen. |
| **Qué SÍ debe permitir** | Ver operaciones pendientes, confirmadas, en conflicto o corregidas según el alcance. |
| **Qué NO debe permitir** | Ocultar, borrar o reemplazar el registro original para aparentar una operación distinta. |
| **Quién resuelve la excepción** | ADMIN resuelve conflictos y correcciones; la cola conserva la evidencia técnica. |
| **Esto NO debe impedir** | Trabajar offline ni consultar una operación local antes de su sincronización. |

## 18. “Sincronizar”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “Sincronizar cuando haya conexión.” |
| **Interpretación peligrosa** | Al recuperar internet se envía el estado actual completo y se pueden perder operaciones o sobrescribir cambios. |
| **Consecuencia operativa** | Duplicados, operaciones fuera de orden, pérdida de payload y conflictos silenciosos. |
| **Intención real** | Sincronizar significa procesar una cola única de operaciones locales con idempotencia, dependencias, estados y resultado por registro. |
| **Redacción corregida** | El sistema procesa la cola local por dependencias y orden de creación. Cada operación se identifica por `idLocal`, se conserva hasta confirmación y se marca como confirmada, reintentable, conflicto o bloqueada. |
| **Qué SÍ debe permitir** | Sincronización manual y automática, sincronización parcial, reintentos seguros y visualización por jornada. |
| **Qué NO debe permitir** | Borrar antes de confirmar, duplicar por reintento, saltar una dependencia o alterar manualmente el payload. |
| **Quién resuelve la excepción** | El sincronizador gestiona errores transitorios; ADMIN resuelve conflictos y bloqueos. |
| **Esto NO debe impedir** | Continuar offline, recuperar conexión intermitente y sincronizar solo las operaciones listas. |

## 19. “Recalcular”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “Recalcular los datos.” |
| **Interpretación peligrosa** | Los históricos se vuelven a calcular con la tarifa, factor del medidor o configuración vigente. |
| **Consecuencia operativa** | Cambian ventas, importes, litros o conciliaciones que fueron correctos bajo la configuración de su momento. |
| **Intención real** | El sistema calcula una nueva operación con la configuración vigente; los históricos usan snapshots inmutables. |
| **Redacción corregida** | El sistema calcula valores nuevos al registrar una operación y conserva los snapshots usados. No recalcula históricos con configuraciones posteriores; una corrección crea una operación compensatoria. |
| **Qué SÍ debe permitir** | Calcular automáticamente litros, incremento lógico, precio, saldo y conciliación de una operación nueva. |
| **Qué NO debe permitir** | Cambiar retrospectivamente precio, litros, medidor lógico, saldo o totales históricos. |
| **Quién resuelve la excepción** | ADMIN mediante corrección auditada y con motivo. |
| **Esto NO debe impedir** | Calcular automáticamente una venta nueva con la configuración vigente y su snapshot. |

## 20. “Lectura”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “Registrar lecturas del medidor.” |
| **Interpretación peligrosa** | Se pide una lectura física después de cada venta o se permite usar la lectura lógica como lectura física. |
| **Consecuencia operativa** | Se ralentiza la ruta y se mezclan medición física con cálculo comercial. |
| **Intención real** | La lectura física manual es inicial y final; el sistema calcula la lectura lógica durante la ruta con el incremento configurado. |
| **Redacción corregida** | El REPARTIDOR captura físicamente la lectura inicial y final de la jornada. Entre clientes, el sistema calcula el incremento lógico a partir de las ventas y no solicita otra lectura física. |
| **Qué SÍ debe permitir** | Mostrar lectura lógica acumulada, litros comerciales y comparación final contra la lectura física. |
| **Qué NO debe permitir** | Sobrescribir la lectura inicial con una recarga, pedir lectura física por cliente o usar el cálculo como fuente de verdad final. |
| **Quién resuelve la excepción** | ADMIN revisa lecturas incompatibles y diferencias. |
| **Esto NO debe impedir** | Continuar la ruta capturando solo la cantidad comercial vendida por cliente. |

## 21. “Crédito”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “El cliente tiene crédito.” |
| **Interpretación peligrosa** | Crédito se interpreta como efectivo pendiente de cobro o como permiso para vender sin registrar saldo. |
| **Consecuencia operativa** | Se mezclan venta, deuda y caja; los reportes dejan de ser confiables. |
| **Intención real** | Crédito es una forma de pago que crea un saldo; no es efectivo recibido. |
| **Redacción corregida** | Una venta con forma de pago crédito registra la venta, aumenta el saldo del cliente y no incrementa el efectivo recibido. Un pago posterior reduce el saldo y aumenta caja según la operación registrada. |
| **Qué SÍ debe permitir** | Registrar una venta a crédito habilitada y, si se aprueba, un pago recibido en ruta. |
| **Qué NO debe permitir** | Registrar crédito como efectivo, editar saldo sin movimiento o eliminar deuda confirmada. |
| **Quién resuelve la excepción** | ADMIN mediante reglas de crédito, caja y compensación auditada. |
| **Esto NO debe impedir** | Registrar una venta a crédito válida aunque ADMIN no esté conectado. |

## 22. “Operación normal”

| Campo | Interpretación operativa |
|---|---|
| **Frase original** | “Las operaciones normales están permitidas.” |
| **Interpretación peligrosa** | Cualquier acción puede considerarse normal, incluyendo cambios de permisos, reasignaciones o ajustes globales. |
| **Consecuencia operativa** | El repartidor podría administrar referencias o aplicar excepciones fuera de su alcance. |
| **Intención real** | Normal es una acción de campo definida para la jornada, con referencias válidas, reglas de saldo y trazabilidad. |
| **Redacción corregida** | Se considera operación normal la captura de apertura, carga, venta, crédito permitido, pago permitido, recarga, lectura final, cierre y sincronización dentro del alcance del repartidor. Configuración, asignación, ajuste y corrección son administrativas. |
| **Qué SÍ debe permitir** | Completar el ciclo de campo offline y sincronizarlo después. |
| **Qué NO debe permitir** | Usar el modo offline para cambiar catálogo, permisos, asignaciones, condiciones comerciales o históricos. |
| **Quién resuelve la excepción** | ADMIN define y resuelve operaciones fuera del flujo normal. |
| **Esto NO debe impedir** | Ejecutar el ciclo completo de jornada sin aprobación previa de ADMIN. |

## 23. Regla de aceptación antes de programar

Una regla de permisos no está lista para implementación si no responde las siguientes preguntas:

| Verificación | Resultado esperado |
|---|---|
| ¿Cuál es la acción concreta? | Debe estar expresada como verbo operativo. |
| ¿Cuál es el objeto? | Debe identificar jornada, venta, saldo, cliente, vehículo, medidor, caja, gasto o inventario. |
| ¿En qué estado se permite? | Debe indicar borrador, abierta, confirmada, cerrada, pendiente o en conflicto. |
| ¿Cuál es el alcance? | Debe indicar usuario, localidad, jornada, vehículo, medidor y rol. |
| ¿Qué efecto produce? | Debe explicar el cálculo o movimiento automático. |
| ¿Qué queda prohibido exactamente? | Debe bloquear la alteración concreta, no la operación normal. |
| ¿Quién resuelve la excepción? | Debe indicar sincronizador, ADMIN o corrección compensatoria. |
| ¿Qué dice “Esto NO debe impedir”? | Debe nombrar explícitamente la operación normal que conserva continuidad. |

## Conclusión

La especificación debe interpretarse de manera **operativa, no literalista**. El control debe impedir alteraciones manuales, fuera de alcance o posteriores a la confirmación, pero no debe impedir que el repartidor capture la realidad de su jornada. Cada restricción debe preservar de forma visible la continuidad de ventas, cargas, recargas, créditos permitidos, lecturas, cierres y sincronización offline.
