# Auditoría de Configuración ADMIN → REPARTIDOR

## 1. Resumen ejecutivo

La página actual de **Configuración** no es todavía el centro completo de la jerarquía operativa. Actualmente funciona como una combinación de configuración de cuenta, acceso, permisos y parámetros globales de medición/venta. Las asignaciones operativas —zona, chofer, vehículo, medidor y clientes— se administran principalmente desde **Jerarquía / Asignaciones** y desde la ficha administrativa del cliente.

La conexión real con el REPARTIDOR sí existe, pero está distribuida entre varios documentos y colecciones. Para evitar inconsistencias, la interfaz debe distinguir claramente entre **configuración global**, **asignación operativa**, **preferencia del cliente** y **snapshot congelado de una jornada/venta**.

> La página de Configuración debe definir parámetros generales y acceso. No debe duplicar la pantalla de Asignaciones ni convertirse en un CRUD paralelo de zonas, vehículos o clientes.

## 2. Qué maneja actualmente Configuración

| Subpestaña actual | Quién la ve | Qué administra | ¿Afecta directamente al REPARTIDOR? |
|---|---|---|---|
| Perfil | Usuario autenticado | Nombre, correo y cierre de sesión visual. | Solo identidad de sesión; no cambia la operación. |
| Contraseña | Usuario con permiso de contraseña | Reautenticación y cambio de contraseña. | No altera ventas, jornadas ni medidor. |
| PIN | Usuario autenticado | Candado local del dispositivo. | Solo agiliza el acceso en el dispositivo; no es un permiso Firebase. |
| Privacidad | Usuario autenticado | Enlaces a documentos informativos. | No altera la operación. |
| Usuarios | ADMIN | Alta, edición de nombre/rol y eliminación documental de perfiles. | Cambia quién puede existir como ADMIN o REPARTIDOR, pero no asigna zonas. |
| Permisos | ADMIN | Acceso por pantalla, edición de formularios y acciones de interfaz. | El repartidor conserva las capacidades estructurales de ruta, jornada y créditos; no puede reactivar módulos administrativos bloqueados. |
| Medición y Venta | ADMIN | Unidad comercial, litros por unidad, incremento físico, precio, medidor y estado global. También administra tarifas configurables. | Sí. Es la conexión global principal con Jornada, Ruta, Venta y conciliación. |

La estructura anterior proviene de `config.js`, donde las subpestañas administrativas se agregan solo cuando el usuario tiene rol `admin`.[1]

## 3. Qué configuración sí llega al REPARTIDOR

### 3.1 Configuración global de medición y venta

`ConfiguracionMedicion` guarda el documento `_meta/medicion_venta`. Ahí se encuentran la unidad comercial, litros por unidad, incremento del contador físico, precio por unidad, nombre y tipo del medidor, modo de lectura, unidad mostrada, resolución, decimales y estados activo/inactivo.[2]

El hook de sesión escucha ese documento y también escucha la colección `tarifas`. Después entrega ambos valores al `App`, que los pasa a `JornadaMedidor` y `RutaReparto`.[3]

| Parámetro ADMIN | Consumidor operativo | Uso real |
|---|---|---|
| `unidadComercial` | Jornada y Ruta | Nombre de la unidad capturada por el repartidor. |
| `litrosPorUnidad` | Jornada y Ruta | Conversión comercial para litros vendidos y agua disponible. |
| `incrementoContadorPorUnidad` | Jornada y Ruta | Incremento calculado de la lectura física entre clientes. |
| `precioPorUnidad` | Tarifa base de Ruta | Cálculo del importe cuando no se selecciona otra tarifa. |
| `medidorNombre`, `medidorId` relacionado por zona | Jornada | Contexto del instrumento asociado a la jornada. |
| `unidadMostrada`, `resolucion`, `decimales` | Configuración y trazabilidad | Descripción de la escala física; no sustituyen la lectura inicial/final. |
| `medidorActivo` y `unidadActivo` | Inicio de Jornada y Ruta | Impiden iniciar o vender cuando la configuración global está inactiva. |
| Tarifa activa | Cliente y Ruta | Preselección por tarifa habitual o selección puntual mediante cambio de tarifa. |

### 3.2 Asignaciones de zona

La pantalla `JerarquiaPanel` administra la relación operativa. Una zona guarda chofer, vehículo, medidor, localidades, litros por unidad e incremento del contador.[4] La misma pantalla propaga a los clientes ligados datos como `zonaId`, `zonaNombre`, `zonaChoferId`, `zonaChoferNombre` y `zonaVehiculo`.

Por lo tanto, para la operación diaria hay una precedencia práctica:

```text
Configuración global de Medición y Venta
                 ↓ valor de respaldo
Zona asignada con litros/incremento/vehículo/medidor
                 ↓ valor operativo de la jornada
Jornada abierta con parámetros congelados
                 ↓ continuidad de la ruta
Venta del repartidor con snapshot de tarifa
```

La zona puede actuar como override de `litrosPorUnidad` e `incrementoContadorPorUnidad`. Cuando se inicia una jornada, esos valores se guardan en el documento de jornada. Después, la ruta usa los valores de la jornada activa, no vuelve a preguntar la configuración en cada cliente.[5]

### 3.3 Cliente fijo y tarifa habitual

La ficha del cliente permite asignar zona y muestra el encadenamiento Empresa → Zona → Chofer → Vehículo → Clientes. También permite seleccionar una `tarifaHabitualId` entre tarifas activas.[6]

La tarifa habitual no cambia la configuración global ni la jornada. Solo sirve como valor inicial de la venta para ese cliente. Durante la venta, el repartidor puede cambiar a otra tarifa activa para esa operación; la venta conserva un snapshot para no recalcular históricos con la tarifa vigente posterior.[7]

### 3.4 Jornada, venta y cola offline

La jornada captura físicamente la lectura inicial y la carga de agua. La lectura anterior es de solo lectura. La venta captura la cantidad comercial; el sistema calcula litros, incremento del contador y saldo de agua. La lectura calculada se encadena entre ventas, pero no es una segunda lectura física.

La cola offline conserva en cada venta `jornadaId`, `vehiculoId`, `medidorId`, `tarifaSnapshot`, `litrosPorUnidad`, `incrementoContadorPorUnidad`, lectura calculada antes/después y agua disponible antes/después.[8] Al conciliar, la transacción valida continuidad de lectura calculada, saldo de agua, jornada, vehículo y medidor; después actualiza atómicamente la jornada.[9]

La lectura física final se captura al cierre y es la fuente para comparar el consumo físico contra el volumen registrado por ventas. La configuración actual no debe reescribir snapshots históricos.

## 4. Qué no maneja actualmente Configuración

| Tema | Pantalla o fuente actual | Observación |
|---|---|---|
| Localidades y zonas | `JerarquiaPanel` | No debe duplicarse dentro de Configuración. |
| Chofer por zona | `JerarquiaPanel` | Se asigna por zona; Usuarios solo crea el perfil. |
| Vehículo por zona | `JerarquiaPanel` | Actualmente se guarda como campo de la zona, no como catálogo operativo independiente en Configuración. |
| Medidor por vehículo/zona | `JerarquiaPanel` y jornada | La configuración global describe el medidor; la relación concreta se guarda en la zona/jornada. |
| Clientes fijos | `Clientes` y `JerarquiaPanel` | La ficha del cliente contiene la asignación y la tarifa habitual. |
| Productos comerciales | `Productos` | Es un módulo separado y no debe mezclarse con la unidad de agua a granel. |
| Inventario y cargas | `Inventario`, `Repartidores / Cargas`, `ventas-offline.js` | Representan existencias, cargas y salidas; no son una subpestaña actual de Configuración. |
| Caja, créditos y conciliación | `Gerencia`, `Creditos`, `JornadaMedidor` | Son resultados y controles operativos posteriores, no parámetros globales de Configuración. |

## 5. Hallazgos que debemos resolver antes de rediseñar o ampliar

### Hallazgo A — Configuración global y asignación por zona están separadas, pero la UI no lo explica suficientemente

La pantalla global define valores de respaldo, mientras que una zona puede guardar litros e incremento propios. La interfaz debe mostrar explícitamente si el repartidor está usando **valor global** o **override de zona**, sin permitir que el usuario confunda una escala comercial con una escala física.

### Hallazgo B — Usuarios no equivale a asignaciones

La subpestaña Usuarios crea o edita perfiles. No asigna zonas, vehículos ni medidores. La asignación debe mantenerse en `JerarquiaPanel`, que visualmente sí representa el flujo Empresa → Zona → Chofer → Vehículo → Medidor → Clientes.

### Hallazgo C — Permisos no deben usarse para reactivar el modelo del repartidor

La pantalla Permisos permite administrar parte de la interfaz, pero `sesion.js` fuerza para REPARTIDOR las capacidades estructurales de ruta, jornada y créditos, y mantiene bloqueados productos, inventario, reportes y otras áreas administrativas.[10] Esto debe mostrarse como una restricción estructural, no como un simple switch ambiguo.

### Hallazgo D — La página Configuración no contiene actualmente todos los switches de la especificación visual

`pantallas.md` propone tarjetas de operación, cobro, offline y apariencia.[11] Sin embargo, el código actual no tiene una persistencia completa para cada uno de esos switches. No se deben mostrar como controles editables hasta definir su fuente de datos y su efecto real. Visualmente pueden organizarse secciones existentes, pero no deben inventar comportamiento.

### Hallazgo E — La configuración global se congela en la jornada

Una vez abierta la jornada, los campos críticos —vehículo, medidor, unidad comercial, litros por unidad, incremento físico y agua cargada— se conservan en el documento de jornada. Esto es correcto para trazabilidad. Cambiar la configuración global durante una jornada no debe modificar ventas ni lecturas ya capturadas.

## 6. Organización recomendada de la página Configuración

La página debe mantenerse como **Centro de control administrativo**, no como una pantalla que absorba todos los módulos.

| Bloque visual recomendado | Contenido existente | Conexión |
|---|---|---|
| Cuenta y dispositivo | Perfil, Contraseña, PIN y Privacidad. | No altera datos operativos. |
| Acceso y roles | Usuarios y Permisos. | Define quién entra y qué interfaz puede ver; no asigna zonas. |
| Operación base | Medición y Venta. | Define unidad, conversiones, precio base, medidor global y tarifas activas. |
| Relaciones operativas | Enlace visual a Asignaciones / Zonas, sin duplicar sus formularios. | Resuelve localidad, chofer, vehículo, medidor y clientes. |
| Estado de sincronización | Indicador informativo de ventas pendientes, sin crear una nueva cola. | Permite al ADMIN detectar continuidad de operación offline. |

La ruta recomendada de configuración sería:

```text
CONFIGURACIÓN
├── Operación base: unidad, litros, incremento, precio y medidor
├── Tarifas: unidad, litros, incremento y precio por tarifa
├── Usuarios y permisos: identidad y acceso
└── Ver asignaciones: enlace a la jerarquía existente

ASIGNACIONES / ZONAS
└── Empresa → Zona → Chofer → Vehículo → Medidor → Clientes

CLIENTES FIJOS
└── Zona, tarifa habitual, forma habitual, crédito y datos operativos

REPARTIDOR
└── Jornada → Ruta → Venta → Crédito/Efectivo → Cierre → Conciliación
```

## 7. Decisiones pendientes antes de implementar cambios funcionales

| Decisión | Opciones seguras |
|---|---|
| ¿La configuración de vehículo y medidor será catálogo independiente o seguirá dentro de zona? | Mantenerla en zona por ahora, o crear catálogo administrativo en una iteración separada. No duplicar ambos modelos sin definir autoridad. |
| ¿Los litros e incremento serán globales, por zona o ambos? | Mantener global como respaldo y zona como override explícito; congelar el resultado en jornada. |
| ¿Los switches de operación/offline/apariencia tendrán persistencia real? | Implementarlos solo después de definir documento, campos y consumidores; por ahora mostrarlos como estado informativo o no mostrarlos. |
| ¿El ADMIN podrá cambiar medición global con jornadas abiertas? | Recomendación: permitir guardar, pero no alterar jornadas abiertas ni snapshots existentes. La validación de esa regla debe definirse antes de tocar código. |
| ¿La tarifa habitual del cliente debe estar limitada a tarifas compatibles con su zona? | Actualmente se eligen tarifas activas globales. Si se requiere compatibilidad por zona, debe documentarse como nueva regla antes de implementarla. |

## 8. Conclusión

La conexión principal ya está construida y puede describirse así:

```text
ADMIN · Configuración de Medición y Venta
        ↓
_meta/medicion_venta + tarifas
        ↓
useSesion()
        ↓
Jornada del repartidor
        ↓
Ruta y venta por cliente
        ↓
Snapshot offline + jornadaId + vehículo + medidor
        ↓
Cierre físico y conciliación
```

La configuración de usuarios y permisos controla acceso; la jerarquía controla el alcance operativo; la ficha del cliente aporta la tarifa habitual; y la jornada congela los valores usados. La siguiente implementación segura debe mejorar primero la **claridad visual y la precedencia de valores** dentro de Configuración, sin copiar allí los CRUD de zonas, vehículos o clientes ni crear controles sin consumidor real.

## Referencias internas

[1]: ../../config.js "Configuración del ADMIN"
[2]: ../../medicion.js "Configuración de medición y tarifas"
[3]: ../../hooks/useSesion.js "Suscripciones y contexto de sesión"
[4]: ../../jerarquia.js "Jerarquía y asignaciones"
[5]: ../../jornada.js "Jornada y medidor"
[6]: ../../clientes.js "Ficha de cliente operativo"
[7]: ../../ruta.js "Ruta y venta del repartidor"
[8]: ../../ventas-offline.js "Normalización de ventas offline"
[9]: ../../ventas-offline.js "Conciliación atómica de ventas"
[10]: ../../sesion.js "Permisos efectivos por rol"
[11]: ../00_especificacion_fuente/pantallas.md "Especificación rectora de pantallas"
