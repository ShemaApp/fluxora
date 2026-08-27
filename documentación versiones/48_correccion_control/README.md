# Versión 48 — Corrección de acceso a Control

## Problema detectado

El módulo **Control** no podía renderizarse correctamente porque `jornada.js` utilizaba `FACTOR_LITROS_POR_GARRAFON` como valor de respaldo sin declarar esa constante dentro del archivo ni recibirla desde un módulo global. Al entrar en la función `JornadaMedidor`, el navegador podía producir un `ReferenceError` antes de llegar a la rama específica de ADMIN.

## Corrección aplicada

Se declaró localmente:

```js
const FACTOR_LITROS_POR_GARRAFON = 20;
```

El valor solo se utiliza como fallback cuando no existe una configuración específica de litros por unidad en la localidad, la jornada o la configuración de medición. No reemplaza snapshots históricos ni altera el factor guardado en una operación existente.

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `jornada.js` | Declaración del fallback faltante de 20 litros por garrafón. |
| `sw.js` | Incremento de caché a `v1.6.18`. |
| `documentación versiones/48_correccion_control/` | Registro de causa, alcance y validación. |

## Archivos no modificados

No se modificaron `ventas-offline.js`, `sincronizacion.js`, `app.js`, `permisos.js`, `firestore.rules`, Firebase, créditos, caja, inventario ni productos. La corrección está aislada al fallo de renderizado de Control.

## Resultado esperado

ADMIN puede abrir la pestaña visible **Control** sin que la referencia inexistente interrumpa el renderizado. REPARTIDOR conserva su pestaña **Jornadas** y la misma pantalla continúa usando la configuración específica de jornada cuando existe.
