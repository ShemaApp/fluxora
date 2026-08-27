# FLUXORA — Matriz de Interpretación Operativa y Ambigüedades

## Estado

Documento preparado para revisión y aprobación. **No autoriza todavía cambios en código, permisos, reglas Firebase, navegación, cola offline ni estructura de datos.**

## Objetivo

Revisar las frases importantes de la especificación de FLUXORA antes de implementarlas y evitar que una interpretación literal bloquee la operación normal del repartidor o permita una alteración administrativa indebida.

El documento convierte cada frase ambigua en una secuencia verificable:

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

## Archivos del paquete

| Archivo | Contenido |
|---|---|
| `ESPECIFICACION_PERMISOS.md` | Reglas normativas por operación con acción, objeto, estado, alcance, efecto, prohibición, excepción y la cláusula obligatoria “Esto NO debe impedir”. |
| `MATRIZ_INTERPRETACION_AMBIGUEDADES.md` | Análisis de frases como modificar, editar, eliminar, cerrar, aprobar, pendiente, asignado, autorizado, disponible, consultar, historial, sincronizar, recalcular, crédito, saldo, lectura y operación normal. |

## Principios que quedan sujetos a aprobación

La interpretación propuesta mantiene solo los roles **ADMIN** y **REPARTIDOR**. No reactiva `usuario` ni crea el tercer rol futuro.

Las operaciones normales del repartidor —inicio de jornada, carga, recarga, venta, crédito permitido, lectura inicial, lectura final, cierre y sincronización— no deben requerir aprobación previa de ADMIN ni conectividad permanente. Las restricciones deben controlar edición manual, fuera de alcance, duplicidad, conflicto y alteración posterior a la confirmación.

La especificación separa **CAPTURAR**, **ADMINISTRAR** y **CORREGIR**. Una actualización automática de saldo, inventario, caja, medidor lógico o conciliación que deriva de una operación válida no se considera una modificación manual prohibida.

Toda corrección confirmada debe conservar el registro original y utilizar una cancelación lógica, una compensación o una nueva entrada auditada. Los históricos no deben recalcularse con la configuración vigente.

## Decisiones aún no activadas

Antes de implementar se deben confirmar, por separado, el registro de abonos en ruta, los gastos offline, los clientes eventuales, los vehículos alternos, la doble aprobación y la política de conflictos. Este documento no activa ninguna de esas extensiones.

## Criterio de aprobación

La matriz estará lista para convertirse en permisos de código cuando cada regla identifique explícitamente:

| Campo | Pregunta |
|---|---|
| Acción | ¿Qué puede intentar hacer el usuario? |
| Objeto | ¿Sobre qué entidad u operación? |
| Estado | ¿En qué estado se permite o se bloquea? |
| Alcance | ¿Qué registros, jornada, localidad, vehículo, medidor o cuenta? |
| Efecto | ¿Qué actualización automática produce? |
| Prohibición | ¿Qué alteración exacta queda bloqueada? |
| Excepción | ¿Qué sucede y quién la resuelve? |
| Esto NO debe impedir | ¿Qué operación normal debe continuar disponible? |

La siguiente etapa debe ser una revisión del usuario. Solo después de aprobar la interpretación se debe autorizar la modificación de la lógica de permisos.
