# Validación — Clientes y localidades independientes

## Alcance

La corrección se limitó a `clientes.js`, `visual-fluxora.css` y la versión del service worker. No se modificaron `hooks/useSesion.js`, `jerarquia.js`, `jornada.js`, `ruta.js`, `ventas-offline.js`, `creditos.js`, `reportes.js`, `firestore.rules` ni `storage.rules`.

## Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| `node --check` de todos los JS del proyecto | Correcto |
| `git diff --check` | Correcto |
| Prueba estática `test_clientes_localidades.js` | `CLIENT_LOCALITIES_STATIC_OK` |
| Verificación de precaché de `clientes.js` y `visual-fluxora.css` | Ambos archivos ya estaban incluidos |
| Service worker | Actualizado de `v1.6.10` a `v1.6.11` |
| Carga local de `index.html` en `http://127.0.0.1:4173/` | Correcta; login renderizado |
| Regresiones históricas en `/tmp` | No disponibles en este entorno restaurado |

## Resultado funcional esperado

ADMIN recibe todas las localidades activas del catálogo, incluidas las que todavía no tienen repartidor. El selector del cliente muestra el nombre real de cada localidad y ya no limita la lista a las que contienen `repartidorId`.

La acción **+ Nueva localidad** aparece junto a **+ Nuevo cliente** exclusivamente para ADMIN. El formulario solicita solo el nombre, rechaza nombres vacíos y duplicados activos, y crea una localidad con `activo: true` y metadatos de alta. No escribe `repartidorId`, `vehiculoId` ni `medidorId`, por lo que la localidad queda pendiente de asignación.

REPARTIDOR continúa restringido por `obtenerLocalidadesAsignadas`. La corrección de Clientes no amplía su alcance ni modifica la consulta de localidades del rol operativo.

## Navegador

La aplicación se recargó localmente y el login renderizó correctamente. No había una sesión Firebase ADMIN disponible para abrir la pantalla autenticada y ejecutar una creación real; no se simularon credenciales ni se modificaron datos de prueba. La validación autenticada queda pendiente de probar con una cuenta real en GitHub Pages.

## Publicación

El cambio fue publicado en `origin/main` mediante SSH.

- Commit: `e8f0949ccdc5c7d4eaab3a7facb21c38cf523b2a`
- [Publicar prueba en GitHub Pages](https://github.com/ShemaApp/fluxora/actions/runs/32976506771): correcto
- [pages-build-deployment](https://github.com/ShemaApp/fluxora/actions/runs/32976505396): correcto
- [FLUXORA publicada](https://shemaapp.github.io/fluxora/?client-localities-fix=36)
- Service worker: `v1.6.11`

No se desplegaron reglas de Firestore o Storage.
