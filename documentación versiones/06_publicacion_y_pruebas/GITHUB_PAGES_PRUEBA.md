# Prueba de Firebase en GitHub Pages

## Configuración aplicada

El proyecto usa la configuración web del proyecto Firebase `fluxora-appe` en `firebase-init.js`:

- `projectId`: `fluxora-appe`
- `authDomain`: `fluxora-appe.firebaseapp.com`
- `storageBucket`: `fluxora-appe.firebasestorage.app`
- `messagingSenderId`: `440773540626`
- `appId`: `1:440773540626:web:2f6a03dff15e9d257311cb`
- `measurementId`: `G-03Y8PN3QKZ`

La aplicación existente usa el SDK Firebase compat cargado desde CDN y conserva Firebase Authentication, Firestore y persistencia offline. No se sustituyó la inicialización por módulos ES porque el proyecto actual depende de las variables globales `firebase`, `auth` y `db`.

> La configuración web de Firebase, incluida la API key, está diseñada para aparecer en el cliente. La protección real depende de los dominios autorizados, Authentication y las reglas de Firestore que se decidan posteriormente.

## Publicación

Se agregó `.github/workflows/deploy-pages.yml`. Cada push a `main` publica el contenido estático del repositorio mediante GitHub Pages. También puede ejecutarse manualmente desde la pestaña **Actions** de GitHub.

En el repositorio se debe seleccionar **Settings → Pages → Source: GitHub Actions**. Después del primer despliegue, GitHub mostrará la URL pública del sitio.

## Configuración necesaria en Firebase Console

Antes de iniciar sesión desde GitHub Pages, agrega a **Authentication → Settings → Authorized domains** los dominios que correspondan:

```text
<usuario>.github.io
<usuario>.github.io/<nombre-del-repositorio>
```

Firebase suele validar el dominio principal, pero conviene probar la URL exacta publicada y revisar la consola del navegador si Authentication rechaza el origen.

Para la prueba inicial también se debe habilitar en Firebase Console el proveedor de inicio de sesión que utiliza la aplicación, por ejemplo **Email/Password**, y crear al menos una cuenta de prueba.

## Reglas durante esta iteración

Esta iteración es exclusivamente de prueba. No se modificó ni se publicó `firestore.rules`, no se agregaron restricciones nuevas por pantalla y no se cambió la matriz de permisos existente. Las reglas que estén en el proyecto deben considerarse únicamente como archivo pendiente de decisión hasta que se defina qué pantallas y operaciones se habilitarán.

No se debe ejecutar un despliegue de reglas con Firebase CLI durante esta prueba sin una decisión explícita.

## Comprobación local

Desde un servidor estático, no desde `file://`, se puede comprobar la carga con:

```bash
python3 -m http.server 8080
```

Después abre `http://localhost:8080/`. El archivo `firebase-init.js` deja la persistencia offline activada y muestra en la consola cualquier problema de autenticación, Firestore o dominio autorizado.

## Comprobación en GitHub Pages

1. Publicar el repositorio con el workflow incluido.
2. Abrir la URL de GitHub Pages.
3. Confirmar en la consola del navegador que Firebase se inicializó sin errores.
4. Probar el inicio de sesión con una cuenta de prueba.
5. Probar lectura y escritura de Firestore según las reglas actualmente activas en el proyecto Firebase.
6. Comprobar una recarga sin conexión después de haber cargado la aplicación.

La prueba no debe utilizar datos productivos ni cuentas administrativas reales.
