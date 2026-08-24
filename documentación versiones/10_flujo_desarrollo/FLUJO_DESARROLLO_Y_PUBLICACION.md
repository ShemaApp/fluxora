# FLUXORA — Flujo de desarrollo y publicación incremental

## Propósito

A partir de esta iteración, FLUXORA se trabajará en modo **desarrollo y pruebas**, no como una liberación de producción. Cada bloque funcional que se termine y pase sus validaciones básicas se sincronizará con el repositorio autorizado `ShemaApp/fluxora`, rama `main`, para que pueda probarse mediante GitHub Pages.

> GitHub Pages funciona aquí como entorno de prueba compartido. Un commit publicado no se considera una aprobación de producción ni sustituye las revisiones de datos, reglas, permisos o pruebas autenticadas.

## Secuencia obligatoria por iteración

| Etapa | Acción | Evidencia esperada |
|---|---|---|
| 1. Alcance | Definir qué pantalla o flujo se modifica y qué queda fuera. | Documento de cambios en la carpeta de la versión. |
| 2. Implementación | Modificar solo los archivos relacionados con el bloque aprobado. | Diff revisado y sin cambios ajenos. |
| 3. Validación local | Ejecutar sintaxis, pruebas reproducibles y validaciones de JSON/caché cuando correspondan. | Registro de pruebas y resultado. |
| 4. Publicación | Sincronizar el clon autorizado, crear commit descriptivo y hacer push a `main`. | Hash del commit y árbol limpio. |
| 5. Verificación | Revisar el workflow de GitHub Pages y probar la URL pública. | Estado del despliegue y observaciones. |
| 6. Diagnóstico | Si falla, conservar el commit anterior y localizar el problema con la documentación de la versión. | Ruta de reversión y causa identificada. |

## Reglas del repositorio

El único destino autorizado es `https://github.com/ShemaApp/fluxora.git`. No se deben usar otros repositorios. La rama de desarrollo compartida es `main` mientras el proyecto permanezca en esta etapa de pruebas.

Cada commit debe describir el bloque realizado. Se recomienda mantener una relación directa entre el commit y la carpeta documental correspondiente, por ejemplo `09_referencias_repartidor` o `11_configuracion_vehiculos_medidores`.

Los archivos Markdown deben permanecer dentro de `documentación versiones/`. No se deben borrar documentos históricos para ocultar una regresión; si un cambio requiere corrección, se agrega una nueva versión con su prueba y su diagnóstico.

## Validaciones mínimas

Antes de publicar un bloque JavaScript se ejecutará `node --check` sobre los módulos afectados y, preferentemente, sobre todos los módulos del proyecto. Los archivos JSON se validarán con un parser. Las pruebas de datos deben utilizar fixtures explícitos y reproducibles, no datos inventados en producción. Cuando el bloque incluya PWA, también se comprobarán `manifest.json`, la versión de caché y la existencia de todos los archivos precacheados.

La validación del navegador debe distinguir entre carga pública y sesión autenticada. Que el login cargue correctamente no demuestra que Firestore, permisos o el flujo del REPARTIDOR funcionen con datos reales.

## Reversión de desarrollo

Si una iteración rompe la aplicación, primero se identifica el commit anterior funcional en GitHub. Después se revisan el diff y la bitácora de la versión antes de revertir o corregir. No se deben modificar reglas, permisos, colecciones o datos históricos para ocultar un fallo de interfaz o de consumo.

## Estado inicial de este flujo

El primer bloque publicado bajo esta dinámica es `f90d466`, correspondiente al consumo de referencias separadas de vehículo y medidor en Jornada, Ruta, venta offline y cierre. La validación local pasó sintaxis JavaScript, resolución de referencias, fallback heredado, manifest, precaché y carga pública del login.
