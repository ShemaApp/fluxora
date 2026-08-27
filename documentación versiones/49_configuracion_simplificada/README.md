# Versión 49 — Configuración simplificada

## Objetivo

Simplificar la entrada a **Configuración** sin convertirla en una lista extensa de módulos ni duplicar Clientes, Operación, Catálogo, Cobertura, Control, Caja o Reportes.

La propuesta adjunta plantea organizar la configuración según la intención humana del administrador. En la implementación actual se adopta esa idea de forma controlada: Configuración queda como un contenedor de cuenta, operación y acceso, mientras que los módulos operativos continúan viviendo en sus propias pantallas.

## Navegación resultante

| Grupo | Opciones actuales | Alcance |
|---|---|---|
| **Cuenta** | Perfil, Contraseña, PIN, Privacidad | Disponible para ADMIN y REPARTIDOR según sus capacidades actuales. |
| **Operación** | Medición, Flota | Solo ADMIN. Mantiene la configuración de tarifas, conversiones, vehículos y medidores. |
| **Acceso** | Usuarios, Permisos | Solo ADMIN. Mantiene la administración de perfiles y permisos. |

La pantalla muestra primero los tres grupos y después las opciones del grupo seleccionado. Esto reemplaza la fila única de ocho pestañas comprimidas.

## Decisiones de no duplicación

No se agregaron dentro de Configuración accesos nuevos a Clientes, Créditos, Caja, Inventario, Reportes, Localidades o Jornadas. Esos conceptos ya tienen módulos operativos y no deben aparecer dos veces con responsabilidades ambiguas.

Tampoco se creó una búsqueda global, un centro de operación nuevo ni acciones rápidas en Inicio en esta versión. Son propuestas válidas del documento adjunto, pero requieren una decisión y una iteración separada para no mezclar simplificación de Configuración con rediseño del shell completo.

## Lógica conservada

Los componentes existentes continúan funcionando con sus mismos identificadores internos:

```text
perfil
password
pin
privacidad
medicion
flota
usuarios
permisos
```

Solo cambió la forma de presentar y seleccionar estas opciones. Se conservaron las condiciones de ADMIN, la edición de contraseña, el PIN local, los enlaces de privacidad, la configuración de medición, la gestión de flota, los usuarios y los permisos.

## Fuera de alcance

Esta versión no modifica reglas Firebase, roles, permisos remotos, sincronización, IndexedDB, jornadas, ventas, créditos, caja, gastos, inventario ni productos. El objetivo es reducir ruido de interfaz, no cambiar el modelo operativo.

## Distribución PWA

El service worker se incrementa a `v1.6.19` porque `config.js` forma parte del App Shell. Las PWA instaladas necesitan descargar la nueva versión para mostrar la navegación agrupada.
