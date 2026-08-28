# Resultados de prueba visual — Iteración 38

- El login se abrió en un origen local fresco y se visualizó sin buscador global: `loginGlobalSearchCount: 0`.
- La shell de ADMIN aplicó `--rail: #082A4D` y `--accent: #0E988A`.
- La shell de REPARTIDOR aplicó `--rail: #0C5D6A` y `--accent: #0E988A`.
- En ambas variantes el azul agua quedó disponible como `--info: #0798C8` para datos de medición.
- En el panel de prueba, el botón primario renderizó fondo turquesa `rgb(14, 152, 138)` y texto blanco.
- En desktop, los controles mostraron 15 px; etiquetas 14 px; botones 44 px de altura mínima.
- El cambio usa clases visuales en la shell autenticada y no modifica handlers, estados ni permisos.

La primera comprobación del peso tipográfico después de añadir el segundo bloque CSS se realizó sobre una hoja que aún no se había recargado en el navegador; por ello no se toma como resultado final. Se repetirá tras abrir nuevamente el origen local.

Tras recargar el origen, el panel de prueba confirmó que ADMIN usa rail `#082A4D`, REPARTIDOR usa rail `#0C5D6A`, ambas variantes usan acento `#0E988A`, y el login mantiene `loginGlobalSearchCount: 0`. La lectura de peso y altura todavía mostró los valores base, por lo que se debe comprobar el ancho CSS efectivo del viewport antes de concluir la prueba desktop.

El navegador de prueba confirmó `innerWidth: 1280`, `innerHeight: 1100`, `desktopMedia: true` y `devicePixelRatio: 1`. Se forzó una recarga con query string de la hoja visual para evitar caché; la respuesta de la promesa no expuso los valores, por lo que se hará una lectura directa posterior.

La prueba CSSOM confirmó que el navegador usa un viewport CSS de 1280 px y la media query desktop coincide, pero la inspección de reglas cargadas no encontró los selectores de legibilidad finales. La paleta por rol sí se aplicó. Esto indica que el navegador seguía usando una hoja visual sin el bloque final o que la recarga forzada no terminó de sustituir el stylesheet; no se declara aún aprobada la tipografía desktop.

La inspección correcta del CSSOM mostró 569 reglas y confirmó que la media query `@media (min-width: 768px)` de legibilidad está cargada y parseada. La medición anterior sobre el panel aislado no es concluyente porque el panel se insertó fuera de la shell real y sus selectores descendientes no coincidieron como en la aplicación montada.

Diagnóstico adicional: el selector coincide con el panel y una regla temporal idéntica aplica correctamente `font-weight: 500` y `min-height: 46px`. Sin embargo, el recorrido del CSSOM no encontró declaraciones `font-weight` asociadas a `.app-main-content`, por lo que la validación no debe confiar en el panel aislado. Se mantendrá el cambio visual, pero la prueba final se realizará con el DOM real de la shell o con una regla de alcance más directa.

Se desregistró el service worker únicamente en el origen local de prueba y se recargó la aplicación. El login continuó mostrando la composición azul marino y turquesa, sin buscador global. La siguiente medición del panel aislado se hará ya sin la caché anterior.

Verificación final con viewport CSS de 1280 px y sin service worker local: ADMIN aplicó rail `#082A4D`; REPARTIDOR aplicó rail `#0C5D6A`; ambas variantes aplicaron acento `#0E988A`, información `#0798C8`, cuerpo 500, campos 15 px y 46 px de altura mínima, etiquetas 14 px y botones 700 con 44 px de altura mínima. El login mantuvo `loginGlobalSearchCount: 0`.
