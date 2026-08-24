# FLUXORA — Versión PWA: iconos, manifest y caché

## Objetivo

Preparar los recursos mínimos de identidad para que FLUXORA pueda instalarse como aplicación PWA y no conserve el nombre o los colores de la plantilla anterior.

## Cambio realizado

El símbolo gráfico del logotipo FLUXORA aprobado para el login se convirtió en dos iconos cuadrados, conservando la forma y los colores de marca:

| Archivo | Dimensiones | Uso |
|---|---:|---|
| `icons/icon-192.png` | 192×192 px | Icono PWA estándar, favicon e icono táctil. |
| `icons/icon-512.png` | 512×512 px | Icono PWA de alta resolución y manifest. |

Los iconos utilizan Deep Navy `#063B5C` como fondo y mantienen una zona segura amplia para el propósito `maskable`.

## Manifest actualizado

`manifest.json` ahora declara:

- nombre: `FLUXORA — Medición · Distribución · Control`;
- nombre corto: `FLUXORA`;
- descripción orientada a medición, distribución y control de agua;
- fondo `#F8FAFC`;
- color de tema `#063B5C`;
- iconos PNG de 192×192 y 512×512 para `any` y `maskable`.

## Service worker

`sw.js` conserva el flujo de red y la persistencia existentes. Únicamente se incrementó la versión de caché a `v6-pwa-iconos-fluxora` para que los dispositivos instalados descarten la caché anterior y vuelvan a cargar el manifest, los iconos y la identidad visual actualizada.

La lista de precaché contiene:

```text
./manifest.json
./visual-fluxora.css
./assets/brand/fluxora-logo.svg
./assets/brand/fluxora-logo.png
./icons/icon-192.png
./icons/icon-512.png
```

## Qué no cambió

No se modificaron Firebase, Firestore, reglas, permisos, roles, cálculos de jornada, ventas, medidor, inventario, conciliación, operaciones offline, handlers ni colecciones. El script `crear_iconos_pwa.py` es únicamente una herramienta reproducible de generación de activos; no participa en la aplicación en tiempo de ejecución.

## Validación

Se verificó que los dos archivos existan, sean PNG válidos y tengan exactamente las dimensiones declaradas. También se debe comprobar en el navegador que el manifest cargue sin errores y que una instalación nueva o una actualización de PWA muestre el nombre e icono FLUXORA.

## Diagnóstico rápido

| Síntoma | Revisión |
|---|---|
| El navegador sigue mostrando `Mi Negocio` | Revisar `manifest.json`, eliminar la instalación anterior y comprobar que el service worker activo sea `v6-pwa-iconos-fluxora`. |
| El icono aparece roto | Comprobar que `icons/icon-192.png` y `icons/icon-512.png` existan en la raíz publicada y que sus rutas sean relativas a `manifest.json`. |
| El icono antiguo permanece después de publicar | Desinstalar la PWA de prueba, limpiar datos del sitio y recargar para activar el nuevo service worker. |
| La precaché falla | Revisar primero que ambos iconos existan y que todos los archivos incluidos en `APP_SHELL` estén publicados. |
