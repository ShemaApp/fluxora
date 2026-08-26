/* sesion.js — modelo de permisos por rol + utilidades de sesión local (PIN).
   El sembrado inicial y el hook de sesión/Firestore se movieron a
   db/semillas.js y hooks/useSesion.js respectivamente.
   Carga DESPUÉS de app-core.js (usa uid(), ya global) y ANTES de
   permisos.js/config.js (consumen TABS_INFO/EDICION_INFO/ACCIONES_INFO
   y pinKey). */

/* ── Modelo de permisos: constantes de rol + helpers de acceso ── */
const TABS_INFO = [['nota', '', 'Venta administrativa'], ['clientes', '', 'Clientes'], ['creditos', '', 'Créditos'], ['ruta', '', 'Jornadas'], ['jornada', '', 'Control'], ['repartidores', '', 'Operación'], ['productos', '', 'Catálogo'], ['inventario', '', 'Inventario'], ['reportes', '', 'Reportes'], ['gerencia', '', 'Caja'], ['jerarquia', '', 'Cobertura']];
const EDICION_INFO = [['productos', '', 'Editar productos'], ['clientes', '', 'Editar clientes'], ['creditos', '', 'Registrar pagos']];
const ACCIONES_INFO = [['password', '', 'Cambiar su propia contraseña']];
const ACCIONES_DEFAULT_ROL = {
  admin: {
    camara: false,
    csv: true,
    gps: false,
    password: true
  },
  repartidor: {
    camara: false,
    csv: false,
    gps: false,
    password: true
  }
};
const permisoAcciones = u => {
  if (u?.role === 'admin') return { ...ACCIONES_DEFAULT_ROL.admin, camara: false, gps: false };
  const acciones = {
    ...(ACCIONES_DEFAULT_ROL[u?.role] || { camara: false, csv: false, gps: false, password: true }),
    ...(u?.permisos?.acciones || {})
  };
  // GPS, cámara y QR quedan fuera del modelo operativo rector.
  acciones.camara = false;
  acciones.gps = false;
  if (u?.role === 'repartidor') acciones.csv = false;
  return acciones;
};
const TABS_DEFAULT_ROL = {
  admin: {
    productos: true,
    nota: true,
    clientes: true,
    creditos: true,
    ruta: true,
    repartidores: true,
    inventario: true,
    reportes: true,
    gerencia: true,
    jerarquia: true,
    jornada: true
  },
  repartidor: {
    productos: false,
    nota: false,
    clientes: false,
    creditos: false,
    ruta: true,
    jornada: true,
    repartidores: false,
    inventario: false,
    reportes: false,
    gerencia: false
  }
};
const EDITA_DEFAULT_ROL = {
  admin: {
    productos: true,
    clientes: true,
    creditos: true
  },
  repartidor: {
    productos: false,
    clientes: false,
    creditos: false
  }
};
const permisoTabs = u => {
  const tabs = {
    ...(TABS_DEFAULT_ROL[u?.role] || {}),
    ...(u?.permisos?.tabs || {})
  };
  if (u?.role === 'repartidor') {
    // Capacidades operativas obligatorias del repartidor.
    tabs.nota = false;
    tabs.clientes = false;
    tabs.creditos = false;
    tabs.ruta = true;
    tabs.jornada = true;
    tabs.repartidores = false;
    tabs.gerencia = false;
    // Restricciones estructurales: no se pueden reactivar desde UI.
    tabs.productos = false;
    tabs.inventario = false;
    tabs.reportes = false;
  }
  return tabs;
};
const permisoEdita = u => {
  if (u?.role === 'admin') return EDITA_DEFAULT_ROL.admin;
  const edita = {
    ...(EDITA_DEFAULT_ROL[u?.role] || {}),
    ...(u?.permisos?.edita || {})
  };
  if (u?.role === 'repartidor') {
    edita.productos = false;
    edita.clientes = false;
    edita.creditos = false;
  }
  return edita;
};

/* ── Utilidades de sesión local (candado por PIN) ── */
const pinKey = uid_ => 'app_pin_' + uid_;
const hashPin = async (pin, salt) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + ':' + salt));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};
const savePin = async (uid_, pin) => {
  const salt = uid() + uid();
  const hash = await hashPin(pin, salt);
  localStorage.setItem(pinKey(uid_), JSON.stringify({
    hash,
    salt,
    len: pin.length
  }));
};
const clearPin = uid_ => localStorage.removeItem(pinKey(uid_));
