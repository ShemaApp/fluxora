# FLUXORA — Buscador global

## Propósito

Esta versión incorpora un **buscador global fijo en la barra superior de la shell autenticada**. El componente no forma parte de la pantalla de login: mientras no existe una sesión autenticada, FLUXORA mantiene únicamente el formulario de acceso.

La búsqueda es automática y trabaja sobre los datos que la sesión ya tiene cargados en memoria. No ejecuta una consulta a Firestore por cada tecla y no crea una colección nueva, una API nueva ni un rol adicional.

## Alcance por rol

| Rol | Puede encontrar | Destinos permitidos | Datos ocultos deliberadamente |
|---|---|---|---|
| **ADMIN** | Clientes, localidades, vehículos, medidores, jornadas, cargas, productos, tarifas, créditos, servicios, comprobantes, notas y operaciones locales disponibles en la sesión | Módulos administrativos ya autorizados por `navegarA` | Ninguno dentro del catálogo y operación globales que ya estén cargados para su sesión |
| **REPARTIDOR** | Clientes de sus localidades asignadas, sus localidades, vehículo y medidor autorizados, sus jornadas, cargas de su alcance y sus propias operaciones locales | `ruta`, `jornada` y `sincronizacion` | Productos, tarifas, créditos, notas, comprobantes, servicios globales, inventario global, clientes fuera de alcance y referencias de otros repartidores |

El filtrado se aplica dentro de `construirResultadosBusqueda` aunque algunos datos amplios puedan permanecer cargados por compatibilidad en `useSesion`. El buscador no debe utilizarse para obtener una referencia fuera del alcance operativo.

## Comportamiento de uso

La barra permanece fija dentro de la topbar autenticada y se adapta al ancho disponible. La consulta se activa a partir de **dos caracteres**, se normaliza para facilitar coincidencias por texto y muestra como máximo 20 resultados. Cada resultado muestra el tipo y un detalle breve.

Si no existen coincidencias, el componente muestra el mensaje: **“No hay resultados dentro de tu alcance autorizado.”**. El botón `×` limpia la consulta. `Escape` cierra el panel de resultados y un clic fuera del componente también lo cierra.

Seleccionar un resultado solo solicita la navegación hacia una pestaña ya permitida por el rol. No se agregan permisos por el hecho de mostrar un resultado y no se permite que el buscador salte las restricciones de `navegarA`.

## Datos y modo offline

La indexación es local y temporal: utiliza los catálogos, jornadas y operaciones que la sesión ya pudo cargar. Durante una interrupción de internet, el buscador puede consultar esos datos locales disponibles; no sustituye la cola local-first, no sincroniza operaciones y no recupera automáticamente datos que nunca llegaron al dispositivo.

Las operaciones locales visibles para REPARTIDOR son únicamente las propias y se envían a `sincronizacion`. La búsqueda no altera ventas, cargas, jornadas, lecturas, créditos ni cierres.

## Archivos incluidos

| Archivo | Cambio |
|---|---|
| `busqueda-global.js` | Componente React global e índice en memoria con filtrado por rol y alcance |
| `app.js` | Montaje del buscador únicamente después de la comprobación de sesión, dentro de la topbar autenticada |
| `index.html` | Inclusión ordenada del nuevo script clásico |
| `visual-fluxora.css` | Estilos de topbar, resultados y adaptación móvil; placeholder visible en móvil |
| `sw.js` | Inclusión del script en `APP_SHELL` y actualización única a `v1.6.20` |

No se añaden colecciones de Firebase, reglas, funciones, endpoints ni roles. La modificación de la matriz pendiente de la versión 45 permanece separada y no forma parte de esta versión.

## Regla operativa

> El buscador ayuda a localizar datos ya autorizados; no concede autorización nueva, no cambia el alcance del usuario y no reemplaza las restricciones de las pestañas ni de las operaciones.
