// firebase-init.js
// Configuración e inicialización de Firebase (Auth + Firestore + App Check).
// Script clásico (no módulo, no JSX) — se carga ANTES del <script type="text/babel">
// de index.html, así que `auth` y `db` quedan disponibles ahí como si fueran
// globales (los <script> clásicos comparten el mismo scope de nivel superior).
//
// Este es el ÚNICO archivo que necesitas tocar para conectar el proyecto a
// un proyecto de Firebase (uno por cliente — nunca reutilices credenciales
// de otro cliente).
//
// Dónde conseguir estos valores:
// Firebase Console → ⚙️ Configuración del proyecto → Tus apps → SDK setup and configuration

const firebaseConfig = {
  apiKey: 'AIzaSyAsQX6mB5AVrktWJ-WAT4W6DuUR6BRb68I',
  authDomain: 'fluxora-appe.firebaseapp.com',
  projectId: 'fluxora-appe',
  storageBucket: 'fluxora-appe.firebasestorage.app',
  messagingSenderId: '440773540626',
  appId: '1:440773540626:web:2f6a03dff15e9d257311cb',
  measurementId: 'G-03Y8PN3QKZ'
};

// Opcional. Firebase Console → App Check → reCAPTCHA v3 → site key.
// Si la dejas vacía, App Check simplemente no se activa (no rompe nada).
const APP_CHECK_SITE_KEY = 'PEGA_AQUI_TU_RECAPTCHA_V3_SITE_KEY';

if (typeof firebase === 'undefined') {
  document.getElementById('root').innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;padding:28px;text-align:center;color:#1B1D19;font-family:system-ui,sans-serif"><div style="font-weight:700;font-size:16px;margin-bottom:8px">No se pudo cargar Firebase</div><div style="font-size:13px;color:#585D53;max-width:300px">Revisa tu conexión a internet o intenta abrir esta página en Chrome/Safari en vez de un visor interno. Si el problema sigue, puede que tu red esté bloqueando cdn.jsdelivr.net.</div></div>';
  throw new Error('Firebase SDK no cargó');
}

firebase.initializeApp(firebaseConfig);
try {
  if (firebase.analytics && firebaseConfig.measurementId) firebase.analytics();
} catch (error) {
  console.warn('Analytics no disponible en este entorno de prueba:', error);
}
const auth = firebase.auth();
const db = firebase.firestore();
let storage = null;
try {
  storage = typeof firebase.storage === 'function' ? firebase.storage() : null;
} catch (error) {
  console.warn('Storage no está disponible; el servicio de relleno requerirá reintento:', error);
}

if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

if (!APP_CHECK_SITE_KEY || APP_CHECK_SITE_KEY.startsWith('PEGA_AQUI')) {
  console.warn('⚠️ App Check no está activado todavía: falta pegar la site key de reCAPTCHA v3 en firebase-init.js.');
} else {
  firebase.appCheck().activate(
    new firebase.appCheck.ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
    /* isTokenAutoRefreshEnabled */ true
  );
}

db.enablePersistence({ synchronizeTabs: true })
  .catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistencia offline: solo se puede activar en una pestaña a la vez.');
    } else if (err.code === 'unimplemented') {
      console.warn('Este navegador no soporta persistencia offline.');
    }
  });
