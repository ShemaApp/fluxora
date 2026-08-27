# Versión 46 — Login de escritorio FLUXORA

## Alcance

Esta versión adapta la presentación visual del login de escritorio al modelo proporcionado: una composición dividida con panel azul técnico-operativo de marca a la izquierda y columna clara de acceso a la derecha.

## Cambios visuales

| Área | Cambio |
|---|---|
| Panel de marca | Fondo azul petróleo, textura de retícula y geometría técnica sutil, logotipo FLUXORA, línea ámbar y mensaje “Medición, distribución y control”. |
| Panel de acceso | Encabezado “Acceso al sistema”, línea de acento, subtítulo, campos de correo y contraseña y botón ámbar de acceso. |
| Campos | Bordes sobrios, mayor altura, contraste reforzado e iconos visuales de correo, candado y visibilidad de contraseña. |
| Pie legal | “© 2026 Fluxora. Todos los derechos reservados.” en la base de la columna de acceso. |
| Responsividad | En pantallas menores, el diseño pasa a una composición vertical conservando los dos campos y la acción principal. |

## Lógica preservada

No se modificó la validación existente de campos, el estado de carga, el mapeo de errores ni la llamada `auth.signInWithEmailAndPassword`. No se agregaron registro, Google, recuperación de contraseña ni una nueva acción de autenticación.

El marcado nuevo solo agrega contenedores y elementos presentacionales para que la hoja de estilos pueda reproducir el modelo visual. Los enlaces informativos auxiliares existentes continúan ocultos en el login, por lo que no aparecen en la pantalla.

## Archivos modificados

- `auth.js`: nueva estructura visual del login; handler de autenticación conservado.
- `visual-fluxora.css`: composición de escritorio, responsividad, textura y estilos de campos.
- `sw.js`: incremento de caché a `v1.6.16` para distribuir la actualización a las PWA instaladas.
- `documentación versiones/46_login_visual/`: documentación y validación.

## Validación

Se ejecutó `node --check` sobre `auth.js`, `app-core.js` y `sw.js`, además de `git diff --check`. La PWA se verificó en un origen local con caché y service worker retirados para evitar que los recursos antiguos ocultaran el cambio.

La carga limpia mostró las dos columnas, el encabezado de acceso, los dos campos, los iconos, el botón y el pie legal. La prueba visual no utilizó credenciales reales, por lo que no se declara una prueba de autenticación Firebase.

## Límite de esta versión

El logotipo local se presenta sobre una base clara dentro del panel azul para conservar contraste porque el recurso de marca existente contiene wordmark oscuro. No se sustituyó ni se redibujó el logotipo en esta iteración.
