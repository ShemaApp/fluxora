# Iteración 23 — Índice de cambios

Esta carpeta contiene la documentación del flujo de **relleno por medición** para clientes facturados. La implementación mantiene separadas las lecturas físicas de apertura y cierre del camión, pero aplica el volumen calculado como salida comercial lógica sobre el saldo móvil y el medidor lógico de la jornada.

| Archivo | Propósito |
|---|---|
| `ARQUITECTURA_RELLENO_MEDIDO_FIRMAS.md` | Contrato funcional, cálculo, persistencia, historial, cierre y decisiones comerciales. |
| `VALIDACION_NAVEGADOR.md` | Evidencia de carga de la PWA y ausencia de errores críticos en la vista local. |
| `README.md` | Índice de esta iteración. |

La iteración modifica el formulario de cliente para los cinco campos vigentes, agrega el módulo de servicio, incorpora el historial de notas y PDF, suma los servicios completados a reportes y conciliación y actualiza el app shell de la PWA a `v1.6.0`.

## Validaciones ejecutadas

Se ejecutaron comprobaciones sintácticas con `node --check`, revisión `git diff --check`, la prueba determinista del cálculo y borradores, la prueba de reglas del emulador con operación atómica, regresiones de ventas, recargas, conciliación, reportes, clientes y cierres de caja, además de una revisión visual de la pantalla de acceso en servidor local.

## Alcance de Firebase

`firestore.rules` y `storage.rules` quedan versionados para revisión y prueba local. **No se ejecutó ningún despliegue remoto de reglas**. Para probar la firma y persistencia en el proyecto `fluxora-appe`, primero debe revisarse y desplegarse explícitamente la política de Firestore y Storage.

## Decisión sobre cobro

Las notas de relleno se registran como `facturado` y no se suman automáticamente a efectivo ni crédito. El paso posterior para convertir una nota en cobro debe definirse como una operación comercial explícita antes de modificar Caja o Créditos.
