# FLUXORA — Gestión ADMIN de vehículos y medidores

## Alcance

Se implementó una pantalla ADMIN para registrar y gestionar vehículos de reparto y medidores de flujo. Ambos catálogos permanecen separados en Firestore. El vehículo conserva la referencia `medidorId`, mientras que el documento del medidor mantiene su propia identidad, escala física y estado.

La pantalla se encuentra dentro de `Configuración → Vehículos / Medidores`. El REPARTIDOR no recibe este acceso y continúa consumiendo únicamente las referencias que ADMIN asigna a sus localidades.

## Flujo de alta

ADMIN puede registrar primero un medidor desde la sección **Medidores de flujo** y después registrar un vehículo seleccionando ese medidor. También puede registrar un vehículo y activar **Registrar medidor nuevo junto con este vehículo**; ambas escrituras se realizan en un mismo batch de Firestore para que no quede una asociación parcial.

El formulario del medidor exige nombre, código, seis dígitos, lectura acumulativa, litros por incremento, tipo, unidad mostrada, resolución, decimales y estado activo. El formulario del vehículo exige nombre, código, tipo, placa opcional, estado activo y un medidor existente o nuevo.

El código de vehículo y el código de medidor se validan contra los catálogos cargados para evitar duplicados. La interfaz también evita asociar el mismo medidor a dos vehículos distintos desde el formulario de vehículo.

## Contrato de datos

| Colección | Campos principales | Regla de responsabilidad |
|---|---|---|
| `vehiculos/{vehiculoId}` | `nombre`, `codigo`, `placa`, `tipo`, `medidorId`, `medidorNombre`, `medidorCodigo`, `activo` | Es el recurso móvil y referencia a un solo medidor. |
| `medidores/{medidorId}` | `nombre`, `codigo`, `digitos: 6`, `litrosPorIncremento`, `tipo`, `modoLectura: acumulativa`, `unidadMostrada`, `resolucion`, `decimales`, `activo` | Es el instrumento físico separado del vehículo. |
| `localidades/{localidadId}` | `repartidorId`, `vehiculoId`, `vehiculoNombre`, `medidorId`, `medidorNombre` | Fija la asignación operativa que consumen Jornada y Ruta. |
| `_meta/medicion_venta` | Unidad comercial, litros por unidad, incremento físico por unidad, precio y parámetros de medición | Es la configuración administrativa equivalente usada como valor base. |
| `lecturas_medidor/{lecturaId}` | Jornada, medidor, tipo, valor físico o calculado, usuario y fecha | Es el historial operacional; no se escribe al crear el catálogo. |

## Relación con Configuración → Medición y Venta

La interfaz de flota no crea una segunda configuración monetaria. Al registrar un medidor toma como valores equivalentes la configuración existente de `medicion.js`: unidad comercial, litros por unidad, incremento del contador por unidad, precio, unidad mostrada, resolución y decimales. La configuración global continúa editándose desde **Medición y Venta**.

El medidor guarda además `litrosPorIncremento`, que describe la escala física del instrumento. Para el caso vigente, un número rojo equivale a 10 litros y el medidor conserva seis dígitos. La tarifa sigue determinando el valor monetario y nunca modifica el contador físico.

## Historial de lecturas

El alta de un vehículo o medidor no escribe documentos en `lecturas_medidor`. Los nuevos medidores se inicializan con `historialIniciado: false`, `historialLecturasCount: 0`, `ultimaLectura: null`, `lecturaInicial: null` y `lecturaFinal: null`.

La pantalla ADMIN escucha las lecturas existentes y muestra **Historial vacío** mientras no exista una lectura vinculada al medidor. Cuando un REPARTIDOR inicia su primera jornada, `jornada.js` registra la lectura física inicial en `lecturas_medidor`; a partir de ese momento la pantalla muestra que el historial fue iniciado. La lectura física final se agrega al cerrar la jornada. Las lecturas lógicas entre clientes siguen siendo registros calculados de la venta y no sustituyen las lecturas físicas de apertura y cierre.

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `gestion-flota.js` | Nuevo módulo ADMIN de alta, edición, activación/desactivación, asociación vehículo-medidor y estado del historial. |
| `config.js` | Nueva pestaña ADMIN `Vehículos / Medidores` y montaje de `GestionFlota`. |
| `app.js` | Pasa `vehiculos` y `medidores` desde la sesión a Configuración. |
| `index.html` | Carga `gestion-flota.js` antes de `config.js` y `app.js`. |
| `sw.js` | Incorpora el nuevo archivo al app shell y actualiza la caché a `v1.5.0`. |
| `documentación versiones/README.md` | Registra esta iteración. |

No se modificó el flujo de venta, la cola offline ni el cálculo de jornada para generar lecturas intermedias físicas. Se reutilizan las funciones existentes de resolución de referencias en `referencias-operativas.js`.

## Validación

| Prueba | Resultado |
|---|---|
| `node --check gestion-flota.js` | Correcta |
| `node --check config.js`, `app.js`, `jornada.js` y `referencias-operativas.js` | Correcta |
| Sintaxis de todos los archivos JavaScript | Correcta |
| Parseo de `manifest.json` | Correcto |
| `git diff --check` | Correcto |
| Script servido por `index.html` | Correcto |
| Carga global de `GestionFlota` en navegador | Correcta |
| Carga visual del login después de limpiar el service worker | Correcta |
| Creación de lecturas durante el alta de catálogo | No se realiza |
| Prueba autenticada de alta y edición en Firebase | Pendiente de credenciales ADMIN de prueba |

## Reversión y diagnóstico

El cambio puede revertirse restaurando el commit anterior a esta iteración y retirando la referencia de `gestion-flota.js` de `index.html` y `sw.js`. La reversión no debe borrar colecciones de Firestore.

Si la pantalla no aparece, revisar el orden de scripts y la caché del service worker. Si no se muestran vehículos o medidores, revisar los listeners de `hooks/useSesion.js` y los nombres en `db/colecciones.js`. Si la asignación no llega a Jornada, revisar `jerarquia.js`, `referencias-operativas.js` y los campos `vehiculoId`/`medidorId` de la localidad. Si el historial aparece iniciado antes de una jornada, revisar datos preexistentes de `lecturas_medidor`; la pantalla no crea lecturas durante el alta.
