# Validación — Buscador global

## Resultado general

**Estado: validación funcional local completada; publicación pendiente de commit y verificación remota.**

La prueba confirma que el buscador se monta en la shell autenticada y que no aparece en el login. La navegación de resultados mantiene los destinos permitidos por rol y la indexación no consulta Firestore durante la escritura.

## Pruebas ejecutadas

| Prueba | Resultado | Evidencia |
|---|---|---|
| Sintaxis de `busqueda-global.js` | Aprobada | `node --check busqueda-global.js` terminó sin error |
| Sintaxis de `app.js` | Aprobada | `node --check app.js` terminó sin error |
| Sintaxis del conjunto JavaScript | Aprobada | Se ejecutó `node --check` sobre todos los archivos `.js` del repositorio, incluyendo rutas con espacios |
| Pruebas de snapshots | Aprobada | `node --test functions/test/snapshot.test.js`: 3 pruebas aprobadas, 0 fallos |
| Referencia del script | Aprobada | `index.html` carga `./busqueda-global.js` antes de `app.js` |
| APP_SHELL y versión | Aprobada | `sw.js` contiene `./busqueda-global.js` y `CACHE_VERSION = v1.6.20` |
| Integridad del diff | Aprobada | `git diff --check` terminó sin error |
| Login sin buscador | Aprobada | En origen limpio `http://127.0.0.1:4177/?login-check=1`, el DOM reportó `searchElements: 0`; solo estuvieron visibles los campos de correo y contraseña |
| REPARTIDOR dentro de alcance | Aprobada | Con datos sintéticos, el índice devolvió solo Cliente Norte, Zona Norte, Pipa Norte, Medidor Norte y Jornada propia |
| REPARTIDOR fuera de alcance | Aprobada | No devolvió Cliente Sur, Zona Sur, Pipa Sur, Medidor Sur, Producto Global ni Tarifa Global |
| ADMIN con alcance global | Aprobada | Con datos sintéticos, el índice devolvió referencias de ambas localidades, vehículos, medidores, jornadas, producto, tarifa y crédito |
| Consulta automática | Aprobada | Con `Norte`, el panel mostró cinco resultados sin botón de búsqueda ni envío de formulario |
| Mínimo de caracteres | Aprobada | Con un solo carácter el panel no se mostró |
| Estado sin coincidencias | Aprobada | Con `ZZZ` se mostró `No hay resultados dentro de tu alcance autorizado.` |
| Selección de localidad por REPARTIDOR | Aprobada | Al seleccionar `Zona Norte`, el callback recibió `ruta`, no `jerarquia` |
| Escape | Aprobada | La pulsación real de `Escape` cerró el panel de resultados; el término se conserva en el campo para poder retomarlo |
| Limpiar búsqueda | Aprobada | El clic real en `×` borró el término, ocultó el botón y cerró el panel |
| Clic fuera | Aprobada | Un clic real en un campo externo cerró el panel sin borrar el término ni ejecutar operaciones |
| Responsive del placeholder | Aprobada en código | Se eliminó el selector móvil inválido `::placeholder::after`; el placeholder conserva tamaño visible de 11 px |

## Datos de prueba

Las pruebas de alcance se ejecutaron con datos sintéticos en el navegador. Se utilizaron dos localidades, dos clientes, dos vehículos, dos medidores, dos jornadas, un producto, una tarifa y un crédito. El usuario REPARTIDOR de prueba fue `rep-1`; el segundo conjunto perteneció a `rep-2`. No se escribieron documentos en Firestore ni en la cola local.

## Verificación de login

La pantalla de login se abrió después de recargar el origen local sin el contenedor de prueba. La inspección DOM confirmó:

```text
loginVisible: true
searchElements: 0
searchInputs: ["correo@ejemplo.com", "••••••"]
```

Por tanto, el buscador **no forma parte de la experiencia previa al acceso**. En el código, `App` retorna `Login` cuando no existe `currentUser` y solo monta `BusquedaGlobal` dentro de la topbar posterior a esa condición.

## Validaciones pendientes antes de publicar

Queda pendiente únicamente la publicación y la comprobación de la versión remota en GitHub Pages. Después del push debe comprobarse la respuesta HTTP de `sw.js` y `busqueda-global.js`, además del estado público de Actions. La modificación local pendiente de `documentación versiones/45_permisos_interpretacion_operativa/MATRIZ_INTERPRETACION_AMBIGUEDADES.md` no se incluirá.

## Fuentes de verificación internas

1. `app.js`, condición de sesión y montaje en la topbar.
2. `busqueda-global.js`, índice, filtrado por rol y navegación de resultados.
3. `index.html`, orden de scripts clásicos.
4. `sw.js`, `APP_SHELL` y versión `v1.6.20`.
5. `visual-fluxora.css`, reglas responsive del buscador.
