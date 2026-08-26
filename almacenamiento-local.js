/* almacenamiento-local.js — protección de datos locales de FLUXORA.
   Solicita persistencia después del login y expone un estado no bloqueante para
   la interfaz. No sustituye IndexedDB, Firebase ni la cola offline existente. */
(function (global) {
  'use strict';

  const EVENTO_ESTADO = 'fluxora:almacenamiento-estado';
  let estado = {
    verificado: false,
    soportado: false,
    persistente: false,
    solicitado: false,
    usoBytes: null,
    cuotaBytes: null,
    porcentajeUso: null,
    error: ''
  };
  const listeners = new Set();

  const emitir = siguiente => {
    estado = { ...estado, ...siguiente, actualizadoEn: new Date().toISOString() };
    listeners.forEach(listener => {
      try { listener(estado); } catch (error) { console.warn('Listener de almacenamiento:', error); }
    });
    try {
      if (typeof global.CustomEvent === 'function') {
        global.dispatchEvent(new global.CustomEvent(EVENTO_ESTADO, { detail: estado }));
      }
    } catch (error) {}
    return estado;
  };

  const obtenerEstado = () => ({ ...estado });

  const revisar = async ({ solicitar = true } = {}) => {
    const storage = global.navigator?.storage;
    if (!storage) {
      return emitir({ verificado: true, soportado: false, persistente: false, solicitado: false, error: 'Este navegador no expone StorageManager' });
    }

    try {
      let persistente = typeof storage.persisted === 'function'
        ? await storage.persisted()
        : false;
      let solicitado = false;

      if (solicitar && !persistente && typeof storage.persist === 'function') {
        solicitado = true;
        persistente = await storage.persist();
      }

      let estimacion = null;
      if (typeof storage.estimate === 'function') estimacion = await storage.estimate();
      const usoBytes = Number.isFinite(Number(estimacion?.usage)) ? Number(estimacion.usage) : null;
      const cuotaBytes = Number.isFinite(Number(estimacion?.quota)) ? Number(estimacion.quota) : null;
      const porcentajeUso = usoBytes !== null && cuotaBytes > 0 ? Math.min(100, usoBytes / cuotaBytes * 100) : null;

      return emitir({
        verificado: true,
        soportado: true,
        persistente: persistente === true,
        solicitado,
        usoBytes,
        cuotaBytes,
        porcentajeUso,
        error: ''
      });
    } catch (error) {
      return emitir({
        verificado: true,
        soportado: true,
        persistente: false,
        solicitado: solicitar,
        error: error?.message || 'No se pudo verificar el almacenamiento local'
      });
    }
  };

  const suscribir = listener => {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    listener(obtenerEstado());
    return () => listeners.delete(listener);
  };

  global.appSolicitarAlmacenamientoPersistente = revisar;
  global.appRevisarAlmacenamiento = () => revisar({ solicitar: false });
  global.appObtenerEstadoAlmacenamiento = obtenerEstado;
  global.appSuscribirAlmacenamiento = suscribir;
})(window);
