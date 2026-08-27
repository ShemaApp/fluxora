# Versión 44 — Revisión de auditoría de permisos y operación offline

## Opinión ejecutiva

El documento adjunto es **útil y conceptualmente correcto** para evitar que los permisos administrativos bloqueen la operación normal del repartidor. Su mejor aportación es separar **CAPTURAR, ADMINISTRAR y CORREGIR**, y aclarar que una operación permitida puede actualizar automáticamente un saldo, una jornada, el inventario o la conciliación sin que eso equivalga a una edición manual indebida.

No recomiendo implementarlo literalmente todavía. El documento mezcla una base operativa muy compatible con FLUXORA y varias ampliaciones de producto que no están aprobadas en el modelo rector actual. La decisión correcta es adoptar la regla maestra, corregir la matriz vigente y dejar como decisiones separadas los abonos en ruta, clientes eventuales, vehículos alternos, gastos y el alcance de aprobación.

## 1. Coincidencias que conviene adoptar

| Propuesta del documento | Opinión | Acción recomendada |
|---|---|---|
| Ninguna restricción administrativa debe impedir una operación normal de jornada. | Correcta y central para Offline First. | Adoptarla como principio superior de permisos. |
| ADMIN no debe aprobar cada venta, carga, crédito, abono o cierre normal. | Correcta; evita que el dueño se convierta en operador remoto. | Separar captura operativa de revisión administrativa. |
| Toda restricción debe indicar acción, alcance, momento, prohibición y excepción. | Correcta; evita frases ambiguas como “no puede modificar saldo”. | Usarla como formato obligatorio en la UI y reglas futuras. |
| Separar CAPTURAR, ADMINISTRAR y CORREGIR. | Es la mejora conceptual más importante. | Convertirla en la base de la matriz. |
| Venta a crédito actualiza el saldo automáticamente; no permite editarlo manualmente. | Compatible con el modelo de ventas y crédito. | Mantener la venta como operación; reservar ajustes y reversas para ADMIN. |
| La diferencia del medidor no debe bloquear el cierre. | Compatible con la conciliación rectora. | Cerrar, registrar la diferencia y enviarla a revisión administrativa. |
| Trabajo offline no depende de autorización online. | Compatible con local-first. | Mantener IndexedDB como origen de captura y sincronización posterior. |
| Sincronización parcial, dependencias e idempotencia. | Compatible y necesaria. | Convertirlas en pruebas y reglas del motor genérico. |
| No multitenant. | Compatible con el proyecto actual del cliente. | No agregar separación multiempresa. |
| No sobrescribir historial confirmado. | Correcta. | Resolver mediante cancelación lógica, compensación y auditoría. |

## 2. Contradicciones o ambigüedades que deben corregirse

### 2.1 Aprobación administrativa de operaciones normales

La matriz vigente asignaba `A` a ADMIN en filas como cierre de jornada, carga, recarga, venta y crédito. Si `A` significa aprobación previa obligatoria, contradice directamente la regla maestra del documento y el propósito del modo offline.

La solución es dividir dos conceptos:

| Concepto | Significado |
|---|---|
| **Confirmación operativa** | La operación se valida y se aplica automáticamente si cumple reglas de jornada, saldo, referencias e idempotencia. No necesita a ADMIN conectado. |
| **Aprobación administrativa** | Revisión posterior o aprobación de una excepción, ajuste, cancelación, reversa, gasto, abono según política o conflicto. |

Con esta distinción, el repartidor puede capturar y confirmar una venta, carga, recarga o cierre normal. ADMIN consulta y revisa; solo interviene antes cuando la operación sea una excepción definida.

### 2.2 Lecturas “operativas” del medidor

El documento usa “lecturas inicial, operativas y final”. En FLUXORA esto puede interpretarse erróneamente como una lectura física después de cada cliente, lo cual contradice la especificación rectora.

La redacción correcta debe ser: **el repartidor captura físicamente únicamente la lectura inicial y la lectura final; durante la ruta el sistema calcula la lectura lógica a partir de las ventas y la configuración del medidor**. Las lecturas lógicas no son capturas físicas ni sustituyen la lectura final.

### 2.3 Abonos en ruta

El documento recomienda permitir que el repartidor registre pagos recibidos. Esto es operativamente razonable, pero no está definido todavía en la matriz vigente, que deja los abonos administrativos para una decisión posterior.

Permitirlo implica definir simultáneamente crédito, caja, local-first, idempotencia, límite de abono, comprobante, reversa, devolución y conciliación de efectivo. Por tanto, debe aprobarse como una decisión de producto independiente, no activarse solo por la auditoría.

### 2.4 Cliente eventual

El documento recomienda un cliente eventual para no perder una venta. Esto se aparta del modelo rector de **clientes operativos fijos ligados a una localidad**. Introducirlo afectaría créditos, localidad, reportes, historial, facturación y administración de clientes.

Mi recomendación es **no adoptarlo en esta etapa**. Si el negocio lo necesita, debe diseñarse después como una operación temporal mínima, con estado `pendiente_revision`, sin convertirlo automáticamente en cliente fijo ni ampliar el alcance del repartidor.

### 2.5 Vehículo alterno

La recomendación de permitir vehículos alternos puede resolver una falla en ruta, pero contradice la asignación fija actual y puede mezclar medidor, tanque, jornada y conciliación si no hay una relación previamente autorizada.

No debe permitirse seleccionar cualquier vehículo. Si se aprueba en el futuro, solo debe permitirse un par vehículo-medidor alterno previamente autorizado por ADMIN, con nueva referencia de jornada, lectura inicial propia, trazabilidad y sin reescribir la asignación permanente.

### 2.6 Gastos

La captura de gastos como borrador offline es compatible con la autonomía del repartidor, pero actualmente no está implementada ni definida. Debe quedar separada de recargas, inventario, caja y ventas. Como mínimo necesitará tipo, monto, motivo, jornada, usuario, comprobante opcional, estado de aprobación y mecanismo de cancelación compensatoria.

## 3. Comparación con la implementación local-first actual

| Tema | Estado actual | Conclusión |
|---|---|---|
| Inicio, carga, recargas, ventas y cierre local-first | Ya se implementó una cola única con tipos de operación. | Compatible con el documento; falta convertirla en motor genérico por handlers. |
| Firestore como origen durante captura | La operación se registra primero en IndexedDB y luego se intenta sincronizar. | Compatible. |
| Estados locales | Existen estados pendientes, sincronizando, error y confirmación. | Compatible; falta formalizar conflictos como estado persistente. |
| Orden | Se procesa por orden de creación. | Base correcta; falta expresar dependencias explícitas y no solo orden temporal. |
| Conflictos | Se validan jornada, referencias y saldo. | Correcto; debe conservarse el registro bloqueado para resolución, no depender solo del historial auxiliar. |
| Apertura y cierre | Conservan lecturas físicas y resultados calculados. | Compatible con la separación físico versus lógico. |
| Diferencia de medidor | El cierre puede registrar diferencia sin bloquear la jornada. | Compatible y debe permanecer así. |
| Créditos | La venta a crédito está contemplada como operación de venta. | Compatible; abonos offline en ruta siguen pendientes de decisión. |
| Catálogo local completo | Aún no está completamente resuelto como copia local versionada. | Pendiente técnico de alta prioridad. |
| Actualización y reinicio de PWA | La cola sobrevive a migraciones no destructivas. | Falta ejecutar las pruebas específicas del documento. |

## 4. Riesgo técnico que debe resolverse antes de declarar conflictos completos

La cola actual elimina el registro local cuando una sincronización termina en un bloqueo de negocio y conserva el incidente principalmente en el historial de sincronización. Para una política fuerte de conflictos, esto no es suficiente: el registro original debe permanecer disponible con estado `conflict` o `blocked`, su payload, causa, fecha y referencias, hasta que ADMIN lo resuelva o se genere una compensación.

La regla recomendada es:

```text
operación local
        ↓
conflicto o bloqueo
        ↓
se conserva en IndexedDB
        ↓
se muestra por jornada en Sincronización
        ↓
ADMIN resuelve, cancela o crea compensación
        ↓
se conserva la evidencia original
```

Esto no significa reintentar ciegamente una operación bloqueada. Significa no perder su evidencia local.

## 5. Recomendación de matriz corregida

La matriz debe usar dos niveles:

| Tipo de operación | REPARTIDOR | ADMIN |
|---|---|---|
| Venta, carga, recarga y cierre normal | Captura, confirmación operativa local, sincronización y consulta de su alcance. | Consulta y supervisión; no aprobación previa. |
| Venta a crédito normal | Captura si el cliente tiene crédito habilitado; el sistema calcula saldo. | Consulta; ajustes y reversas auditadas. |
| Abono en ruta | Pendiente de decisión; si se habilita, captura el pago real sin editar saldo manualmente. | Define política, consulta, aprueba excepciones y corrige. |
| Diferencia de medidor | Cierra y registra la incidencia. | Revisa y resuelve sin cambiar ventas originales. |
| Gasto normal en ruta | Pendiente de decisión; si se habilita, crea borrador u operación pendiente. | Aprueba, cancela o corrige. |
| Ajuste, cancelación, reversa o corrección posterior | No. | Crea y aprueba según política; siempre con auditoría. |
| Catálogo, asignaciones y configuración | Solo consulta referencias asignadas. | Administra y audita. |

## 6. Decisiones que necesitamos confirmar

| Decisión | Opciones |
|---|---|
| Abonos en ruta | A. Solo ADMIN. B. REPARTIDOR captura pagos reales offline y ADMIN corrige excepciones. |
| Gastos en ruta | A. No se capturan todavía. B. Se capturan como pendientes offline y ADMIN aprueba. |
| Cliente eventual | A. No se permite; solo clientes fijos. B. Se diseña un flujo temporal separado. |
| Vehículo alterno | A. No se permite durante esta etapa. B. Se permiten únicamente pares previamente autorizados. |
| Doble aprobación | A. No por ahora; un ADMIN puede resolver. B. Se exige para cambios críticos cuando existan varios administradores. |
| Conflictos | A. Conservar bloqueados indefinidamente hasta resolución. B. Permitir cancelación local del pendiente con evidencia y nueva operación compensatoria. |

## Conclusión

Mi opinión es **favorable al documento como corrección de la política de permisos**, especialmente en su regla de que ADMIN no debe bloquear la jornada normal y en la separación CAPTURAR / ADMINISTRAR / CORREGIR. No recomiendo activar todavía sus ampliaciones de cliente eventual, vehículo alterno, abonos en ruta y gastos sin decisiones específicas.

La siguiente implementación debería ser: primero corregir la matriz para eliminar la interpretación de aprobación previa en operaciones normales; después completar el motor genérico, dependencias explícitas, recuperación y conflictos; finalmente definir créditos, caja y gastos. El documento no autoriza por sí solo nuevas pantallas, roles, colecciones ni reglas Firebase.
