# Evidencia de validación del preview

Fecha de validación: 25 de agosto de 2026.

El preview local se recargó después de eliminar temporalmente el service worker y sus cachés. La aplicación sirvió la versión con `CACHE_VERSION = v1.5.3`, y la vista ADMIN **Cargas y jornadas** se renderizó correctamente. La vista muestra las localidades, el repartidor, el vehículo y el medidor sin errores de renderizado.

La consola no mostró errores JavaScript después de la recarga de la versión nueva. Permanecen únicamente avisos ya existentes sobre App Check no activado y la futura deprecación de `enableMultiTabIndexedDbPersistence`; estos avisos no fueron introducidos por la recarga.

La validación visual de un control de recarga activo requiere una sesión de rol REPARTIDOR con una jornada abierta. La lógica equivalente se validó con prueba unitaria y el permiso correspondiente se validó en el emulador de Firestore.
