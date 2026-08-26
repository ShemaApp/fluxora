# Validación — Auditoría de consistencia visual v32

## Alcance validado

La iteración revisa únicamente presentación. La validación se realizó sobre la rama local `main` de `ShemaApp/fluxora`, preservando el flujo funcional de venta medida, jornada, medidor, carga, stock móvil, créditos, caja, cierres, conciliación, offline, PDF y Storage.

## Pruebas automatizadas

| Prueba | Resultado |
|---|---|
| `node --check` sobre todos los `.js` del proyecto | `JS_SYNTAX_OK` |
| `git diff --check` | `DIFF_CHECK_OK` |
| `/tmp/test_cargas_agua_logic.js` | `WATER_RECHARGE_LOGIC_OK` |
| `/tmp/test_gerencia_close_history.js` | `GERENCIA_CLOSE_HISTORY_OK` |
| `/tmp/test_reportes_locality_labels.js` | `REPORT_LOCALITY_LABELS_OK` |
| `/tmp/test_sale_water_balance.js` | `SALE_WATER_BALANCE_OK` |
| `/tmp/test_recharge_rules.sh` | `RECHARGE_RULES_TEST_OK` |
| `/tmp/test_client_rules.sh` | `CLIENT_RULES_TEST_OK` |
| `/tmp/test_service_refill.js` | `test_service_refill: OK` |

Las pruebas de recargas y clientes se ejecutaron como regresiones de reglas existentes, pero no se desplegó ninguna regla nueva durante esta iteración.

## Revisión en navegador

Se levantó la aplicación en `http://127.0.0.1:4173/` sin modificar Firebase ni crear datos de prueba. La pantalla de acceso se renderizó correctamente con el logotipo, correo electrónico, contraseña e inicio de sesión. No se muestran registro, recuperación de contraseña ni enlaces auxiliares visibles. El pie legal continúa como `Aplicación con derechos reservados 2026-2029`.

La inspección DOM confirmó un contenedor `.fx-login-shell`, un logotipo `.fx-login-logo-img` con `object-fit: contain`, exactamente dos campos dentro del panel, `.fx-login-links` con `display: none` y el texto legal en el pseudo-elemento `::after`.

No hubo una sesión Firebase autenticada disponible en el navegador de prueba. Por ello las vistas autenticadas ADMIN y REPARTIDOR se validaron estáticamente a través de sus raíces visuales, selectores, ramas de rol y pruebas de sintaxis. No se introdujeron credenciales, no se falsificó `currentUser` y no se alteraron colecciones para simular la revisión.

## Invariantes funcionales no modificados

| Invariante | Resultado |
|---|---|
| El repartidor opera solo con jornada, localidad, vehículo, medidor, ruta y cierre | Preservado |
| La lectura física manual se limita a apertura y cierre | Preservado |
| La lectura lógica entre clientes se calcula automáticamente | Preservado |
| La venta guarda `jornadaId`, `vehiculoId` y `medidorId` | Preservado |
| La carga y la sobreventa continúan sujetas a sus validaciones existentes | Preservado |
| Las tarifas siguen separadas del incremento del medidor | Preservado |
| El crédito no se suma al efectivo recibido | Preservado |
| Los IDs técnicos no se muestran en Inicio de Jornada | Corregido visualmente; siguen en datos internos |
| El regreso global aparece solo en pantallas secundarias | Preservado; se eliminó únicamente el duplicado interno de Configuración |
| Se mantienen únicamente ADMIN y REPARTIDOR | Preservado |

## Service worker

La versión de caché se actualizó una sola vez de `v1.6.9` a `v1.6.10`. Todos los archivos JavaScript y CSS modificados ya estaban incluidos en `APP_SHELL`; no fue necesario agregar rutas nuevas a la precaché.

## Resultado

La auditoría visual queda lista para publicación. El siguiente paso de la validación es confirmar el commit remoto, los workflows de GitHub Pages, la versión `v1.6.10` en `sw.js` y el estado limpio del worktree.

## Referencias

[1]: https://github.com/ShemaApp/fluxora "Repositorio autorizado ShemaApp/fluxora"
[2]: https://shemaapp.github.io/fluxora/ "FLUXORA en GitHub Pages"
