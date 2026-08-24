# Verificación y ajuste de la Assignment Management UI

## Resultado de la verificación

La estructura quedó ordenada como una **interfaz de gestión de asignaciones**, no como un CRUD aislado de campos. La relación operativa se representa y se conserva como una cadena única: **Empresa Administrativa → Localidad/Zona → Chofer → Vehículo → Clientes Fijos**.

> La ficha del cliente ahora funciona como el punto de consulta y edición de la asignación operativa. La pantalla “Jerarquía” funciona como tablero de control de relaciones y conteos por zona.

## Ficha del cliente

En `clientes.js`, la ficha administrativa quedó organizada con los siguientes elementos relacionados:

| Elemento de la ficha | Comportamiento |
|---|---|
| **ID fijo único** | Es obligatorio, numérico y no puede duplicarse entre clientes. |
| **Nombre** | Identidad visible del cliente fijo. |
| **Localidad** | Se conserva como agrupación textual y se valida contra las localidades de la zona elegida. |
| **Zona / Localidad asignada** | Selector alimentado por la colección `zonas`; no se captura como texto libre en la ficha. |
| **Chofer responsable** | Se muestra automáticamente a partir del chofer exclusivo de la zona. |
| **Vehículo** | Se muestra automáticamente a partir del vehículo operativo de la zona. |
| **Tipo** | Selector entre `Residencial` y `Comercial`. |
| **Forma habitual** | Selector entre `Efectivo` y `Crédito`. |
| **Estado** | Conserva el estado activo/inactivo existente. |
| **Guardar** | Persiste el cliente junto con la asignación completa, no solo campos sueltos. |

La ficha muestra además un bloque visual **ASIGNACIONES OPERATIVAS** con la cadena Empresa → Zona → Chofer → Vehículo → Clientes. El conteo de clientes se calcula sobre la zona seleccionada, por lo que la relación es visible antes de guardar.

## Panel de asignaciones operativas

La pestaña administrativa **Jerarquía** (`JerarquiaPanel`) actúa como `Assignment Management UI` y no como una colección de formularios independientes. La Empresa puede crear una zona indicando simultáneamente su nombre, localidades, chofer exclusivo y vehículo operativo. En cada zona existente puede revisar y cambiar el chofer, actualizar el vehículo y observar el conteo de clientes ligados.

El panel también permite buscar clientes fijos por nombre, ID o localidad, filtrar por zona y asignar un cliente a una zona únicamente cuando su localidad pertenece a la lista textual de esa zona. Al cambiar el chofer o el vehículo de una zona, la relación derivada se propaga a los clientes de esa zona mediante `zonaChoferId`, `zonaChoferNombre` y `zonaVehiculo`.

La representación visual de cada zona queda conceptualmente así:

```text
EMPRESA ADMINISTRATIVA
        │
        ├── ZONA NORTE
        │     ├── Juan Pérez
        │     ├── Pipa 01
        │     └── 47 clientes
        │
        └── ZONA CENTRO
              ├── Pedro López
              ├── Pipa 02
              └── 32 clientes
```

Los nombres y cantidades anteriores son únicamente la forma visual solicitada; la aplicación utiliza los datos reales almacenados y no inserta esos ejemplos.

## Modelo de datos resultante

| Nivel | Persistencia | Campos relevantes |
|---|---|---|
| Empresa | `usuarios` | `role: "admin"` |
| Zona | `zonas` | `nombre`, `localidades[]`, `choferId`, `choferNombre`, `vehiculo`, `activo` |
| Cliente fijo | `clientes` | `identificacion`, `zonaId`, `zonaNombre`, `zonaChoferId`, `zonaChoferNombre`, `zonaVehiculo`, `tipo`, `formaHabitual`, `localidad`, `domicilio` |
| Ruta activa | `rutas` | `zonaId`, `zona`, `repartidorId`, `repartidorNombre`, `vehiculo` |

Un chofer puede aparecer en varias zonas. Cada zona tiene un solo `choferId`. Cada cliente tiene un solo `zonaId`; por herencia, el chofer y el vehículo se derivan de esa zona. La ruta activa se selecciona mediante `zonaId` y conserva el nombre de zona y vehículo como datos de lectura rápida.

## Permisos y orden de acceso

La pantalla **Jerarquía** solo está habilitada para `admin`. El repartidor consume las zonas asignadas y la consulta de clientes está restringida por `zonaChoferId == usuario actual`. El repartidor puede editar información operativa permitida de sus clientes, pero no puede cambiar `zonaId`, `zonaChoferId` ni `zonaVehiculo`.

Las reglas de Firestore exigen zona y chofer al crear un cliente, restringen la gestión de zonas a la Empresa y protegen la relación heredada del vehículo. La suscripción de sesión utiliza la misma relación para evitar que el repartidor cargue clientes ajenos.

## Archivos ajustados

| Archivo | Ajuste |
|---|---|
| `clientes.js` | Ficha integrada con ID fijo, zona, chofer derivado, vehículo derivado, tipo, forma habitual y bloque de asignaciones operativas. |
| `jerarquia.js` | Panel de gestión de asignaciones con creación coordinada de zona, localidades, chofer y vehículo; actualización de relaciones y conteos por zona. |
| `ruta.js` | Rutas vinculadas con `zonaId`; el flujo rápido del repartidor utiliza las zonas asignadas. |
| `hooks/useSesion.js` | Carga de zonas y consulta de clientes filtrada por chofer. |
| `app.js` | Pestaña y contexto de la pantalla Jerarquía. |
| `sesion.js` | Acceso administrativo de la pestaña Jerarquía. |
| `db/colecciones.js` y `db/semillas.js` | Registro estructural de la colección `zonas`, sin datos ficticios de operación. |
| `firestore.rules` | Control jerárquico de zonas, clientes, choferes derivados y vehículo heredado. |
| `sw.js` | Inclusión del panel nuevo en el caché del PWA. |

## Validación realizada

Se comprobó la sintaxis de todos los archivos JavaScript mediante Node.js. También se verificó que la ficha contenga el bloque `ASIGNACIONES OPERATIVAS`, que el panel incluya vehículo y conteo de clientes, que las rutas conserven `zonaId`, que el repartidor filtre por `zonaChoferId` y que el service worker incluya el módulo jerárquico.
