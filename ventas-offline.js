/*
 * Cola offline única de operaciones de agua medida.
 *
 * Incluye inicio de jornada, carga y recarga, ventas y cierre. La venta se captura con cantidad comercial y snapshots de tarifa, pero la
 * jornada conserva la lectura lógica y el saldo de agua. La lectura física
 * solamente se captura al abrir y cerrar la jornada.
 */
(function (global) {
  'use strict';

  const DB_NAME = 'app-offline-ventas-agua-v2';
  const DB_VERSION = 2;
  const STORE = 'ventas_agua';
  const RETRY_STATES = ['pendiente', 'reintentando'];
  const SYNC_STATUS_KEY = 'fluxora_sync_status_v1';
  const SYNC_EVENT = 'fluxora:sincronizacion-estado';
  let dbOpenPromise = null;
  let syncPromise = null;
  const listeners = new Set();
  const syncListeners = new Set();
  const storageKey = () => {
    try {
      const user = global.auth?.currentUser || global.firebase?.auth?.().currentUser;
      return user?.uid ? `${SYNC_STATUS_KEY}_${user.uid}` : SYNC_STATUS_KEY;
    } catch (e) { return SYNC_STATUS_KEY; }
  };
  const readSavedSyncStatus = () => {
    try { return JSON.parse(global.localStorage?.getItem(storageKey()) || '{}'); } catch (e) { return {}; }
  };
  let syncStatus = {
    ultimaSincronizacion: null,
    ultimaResultado: null,
    pendientes: 0,
    errores: [],
    ...readSavedSyncStatus()
  };

  const currentUid = () => {
    try { return global.auth?.currentUser?.uid || global.firebase?.auth?.().currentUser?.uid || null; } catch (e) { return null; }
  };

  const resetDbConnection = () => { dbOpenPromise = null; };

  const openDb = () => {
    if (dbOpenPromise) return dbOpenPromise;
    dbOpenPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in global)) {
        resetDbConnection();
        reject(new Error('Este dispositivo no ofrece almacenamiento local IndexedDB'));
        return;
      }
      const request = global.indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => {
        resetDbConnection();
        reject(request.error || new Error('No se pudo abrir la cola local'));
      };
      request.onupgradeneeded = event => {
        const localDb = event.target.result;
        // Nunca se elimina el object store durante una migración: la cola
        // pendiente debe sobrevivir a las actualizaciones de la aplicación.
        if (!localDb.objectStoreNames.contains(STORE)) localDb.createObjectStore(STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const localDb = request.result;
        localDb.onversionchange = () => {
          localDb.close();
          resetDbConnection();
        };
        localDb.onclose = resetDbConnection;
        // Los registros creados antes del contrato de sincronización reciben
        // metadatos compatibles sin eliminarse ni cambiar su contenido operativo.
        try {
          const tx = localDb.transaction(STORE, 'readwrite');
          const store = tx.objectStore(STORE);
          const cursorRequest = store.openCursor();
          cursorRequest.onsuccess = event => {
            const cursor = event.target.result;
            if (!cursor) return;
            const record = cursor.value || {};
            cursor.update({
              ...record,
              idLocal: record.idLocal || record.id,
              syncStatus: record.syncStatus || (record.estado === 'reintentando' ? 'syncing' : record.estado === 'requiere_revision' ? 'error' : 'pending'),
              createdOfflineAt: record.createdOfflineAt || record.creadoEn || new Date().toISOString(),
              updatedOfflineAt: record.updatedOfflineAt || record.actualizadoEn || record.creadoEn || new Date().toISOString(),
              errorHistorial: Array.isArray(record.errorHistorial) ? record.errorHistorial : []
            });
            cursor.continue();
          };
        } catch (e) {
          console.warn('No se pudieron completar metadatos de la cola local:', e);
        }
        resolve(localDb);
      };
    });
    return dbOpenPromise;
  };

  const withStore = async (mode, action, intento = 0) => {
    const localDb = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        let tx;
        try {
          tx = localDb.transaction(STORE, mode);
          const store = tx.objectStore(STORE);
          const result = action(store);
          tx.oncomplete = () => resolve(result);
          tx.onerror = () => reject(tx.error || new Error('Error en la cola local'));
          tx.onabort = () => reject(tx.error || new Error('Operación local cancelada'));
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      const textoError = String(error?.name || '') + ' ' + String(error?.message || '');
      const conexionCerrada = /InvalidStateError|TransactionInactiveError|closed|closing|connection/i.test(textoError);
      if (conexionCerrada && intento === 0) {
        resetDbConnection();
        return withStore(mode, action, 1);
      }
      throw error;
    }
  };

  const requestResult = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Error al leer la cola local'));
  });
  const allRecords = async () => {
    const uid = currentUid();
    if (!uid) return [];
    return (await withStore('readonly', store => requestResult(store.getAll()))).filter(record => record.repartidorUid === uid);
  };
  const getRecord = async id => withStore('readonly', store => requestResult(store.get(id)));
  const putRecord = async record => withStore('readwrite', store => { store.put(record); return record; });
  const deleteRecord = async id => withStore('readwrite', store => { store.delete(id); return id; });
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = () => global.crypto?.randomUUID?.() || 'off-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);

  const erroresDeRegistros = registros => (registros || [])
    .filter(record => record && (record.ultimoError || record.syncStatus === 'error' || record.estado === 'requiere_revision'))
    .sort((a, b) => new Date(b.updatedOfflineAt || b.actualizadoEn || b.creadoEn || 0) - new Date(a.updatedOfflineAt || a.actualizadoEn || a.creadoEn || 0))
    .slice(0, 20)
    .map(record => ({
      idLocal: record.idLocal || record.id,
      ventaId: record.id,
      syncStatus: record.syncStatus || record.estado || 'error',
      mensaje: record.ultimoError || 'La operación requiere revisión',
      fecha: record.updatedOfflineAt || record.actualizadoEn || record.creadoEn || null,
      jornadaId: record.jornadaId || null
    }));
  const emitirEstadoSincronizacion = (resumen, nuevosErrores = []) => {
    const erroresActuales = [...(syncStatus.errores || []), ...erroresDeRegistros(resumen.registros), ...(nuevosErrores || [])];
    const errores = erroresActuales.filter((item, indice, lista) => item && lista.findIndex(otro => `${otro.idLocal}:${otro.mensaje}:${otro.fecha}` === `${item.idLocal}:${item.mensaje}:${item.fecha}`) === indice).slice(-20).reverse();
    syncStatus = {
      ...syncStatus,
      pendientes: Number(resumen.pendientes || 0),
      errores
    };
    try {
      global.localStorage?.setItem(storageKey(), JSON.stringify({
        ultimaSincronizacion: syncStatus.ultimaSincronizacion,
        ultimaResultado: syncStatus.ultimaResultado,
        errores: syncStatus.errores
      }));
    } catch (e) {}
    syncListeners.forEach(fn => { try { fn({ ...syncStatus }); } catch (e) { console.warn('Listener de sincronización:', e); } });
    try {
      if (typeof global.CustomEvent === 'function') global.dispatchEvent(new global.CustomEvent(SYNC_EVENT, { detail: { ...syncStatus } }));
    } catch (e) {}
    return { ...syncStatus };
  };
  const notify = async (nuevosErrores = []) => {
    const resumen = await (global.appResumenVentasOffline ? global.appResumenVentasOffline() : Promise.resolve({ total: 0, pendientes: 0, incidencias: 0, registros: [] })).catch(() => ({ total: 0, pendientes: 0, incidencias: 0, registros: [] }));
    listeners.forEach(fn => { try { fn(resumen); } catch (e) { console.warn('Listener de ventas offline:', e); } });
    emitirEstadoSincronizacion(resumen, nuevosErrores);
    return resumen;
  };

  const normalizeItems = items => (items || []).map(item => ({
    id: String(item.id),
    nombre: String(item.nombre || ''),
    unidad: String(item.unidad || ''),
    cant: Math.max(0, Number(item.cant || 0)),
    litrosVendidos: item.litrosVendidos == null ? null : Math.max(0, Number(item.litrosVendidos)),
    precio: Number(item.precio || 0),
    precioUnitario: Number(item.precioUnitario ?? item.precio ?? 0),
    importe: Number(item.importe ?? (Number(item.precio || 0) * Number(item.cant || 0))),
    incrementoContador: item.incrementoContador == null ? null : Number(item.incrementoContador)
  })).filter(item => item.id && item.cant > 0);

  const normalizePayload = payload => {
    const ventaId = payload.ventaId || payload.id || payload.operacionIdempotente || uid();
    const fecha = payload.fecha || new Date().toISOString();
    const items = normalizeItems(payload.items);
    if (payload.modoOperacion !== 'agua_medidor' && payload.tipoOperacion !== 'venta_agua_medidor') throw new Error('La cola solo admite ventas de agua medida');
    if (!payload.repartidorUid) throw new Error('La venta offline necesita un repartidor');
    if (!payload.jornadaId || !payload.vehiculoId || !payload.medidorId || !payload.localidadId) throw new Error('La venta de agua necesita jornada, localidad, vehículo y medidor');
    if (!payload.cliente || !payload.cliente.id || !payload.cliente.nombre) throw new Error('La venta offline necesita un cliente');
    if (!items.length) throw new Error('La venta offline necesita una cantidad comercial');
    const total = items.reduce((suma, item) => suma + Number(item.precioUnitario || 0) * Number(item.cant || 0), 0);
    const tarifaSnapshot = payload.tarifaSnapshot ? clone(payload.tarifaSnapshot) : {
      id: payload.tarifaId || null,
      nombre: payload.tarifaNombre || payload.unidadComercial || '',
      unidadComercial: payload.unidadComercial || '',
      litrosPorUnidad: Number(payload.litrosPorUnidad || 0),
      incrementoContadorPorUnidad: Number(payload.incrementoContadorPorUnidad || 0),
      precioUnitario: Number(payload.precioUnitario || 0),
      activo: true
    };
    return {
      id: ventaId,
      idLocal: String(payload.idLocal || ventaId),
      operacionIdempotente: String(payload.operacionIdempotente || ventaId),
      modoOperacion: 'agua_medidor',
      tipoOperacion: 'venta_agua_medidor',
      estado: 'pendiente',
      syncStatus: 'pending',
      version: 2,
      creadoEn: fecha,
      actualizadoEn: fecha,
      createdOfflineAt: payload.createdOfflineAt || fecha,
      updatedOfflineAt: payload.updatedOfflineAt || fecha,
      jornadaId: String(payload.jornadaId),
      vehiculoId: String(payload.vehiculoId),
      vehiculoNombre: payload.vehiculoNombre || payload.vehiculo || '',
      medidorId: String(payload.medidorId),
      medidorNombre: payload.medidorNombre || '',
      medidorDigitos: payload.medidorDigitos == null ? null : Number(payload.medidorDigitos),
      medidorLitrosPorIncremento: payload.medidorLitrosPorIncremento == null ? null : Number(payload.medidorLitrosPorIncremento),
      localidadId: String(payload.localidadId),
      tarifaId: payload.tarifaId || tarifaSnapshot.id || null,
      tarifaNombre: payload.tarifaNombre || tarifaSnapshot.nombre || null,
      tarifaSnapshot,
      lecturaAntesVenta: payload.lecturaAntesVenta == null ? null : Number(payload.lecturaAntesVenta),
      lecturaDespuesVenta: payload.lecturaDespuesVenta == null ? null : Number(payload.lecturaDespuesVenta),
      lecturaCalculadaAntes: payload.lecturaCalculadaAntes == null ? null : Number(payload.lecturaCalculadaAntes),
      lecturaCalculadaDespues: payload.lecturaCalculadaDespues == null ? null : Number(payload.lecturaCalculadaDespues),
      litrosVendidos: payload.litrosVendidos == null ? null : Number(payload.litrosVendidos),
      aguaDisponibleAntesLitros: payload.aguaDisponibleAntesLitros == null ? null : Number(payload.aguaDisponibleAntesLitros),
      aguaDisponibleDespuesLitros: payload.aguaDisponibleDespuesLitros == null ? null : Number(payload.aguaDisponibleDespuesLitros),
      jornadaPatch: payload.jornadaPatch ? clone(payload.jornadaPatch) : {
        lecturaActual: payload.lecturaCalculadaDespues == null ? null : Number(payload.lecturaCalculadaDespues),
        lecturaCalculadaActual: payload.lecturaCalculadaDespues == null ? null : Number(payload.lecturaCalculadaDespues),
        aguaDisponibleLitros: payload.aguaDisponibleDespuesLitros == null ? null : Number(payload.aguaDisponibleDespuesLitros),
        ultimaVentaId: ventaId,
        actualizadoEn: fecha
      },
      garrafones: payload.garrafones == null ? null : Number(payload.garrafones),
      unidadComercial: payload.unidadComercial || null,
      incrementoContador: payload.incrementoContador == null ? null : Number(payload.incrementoContador),
      litrosPorUnidad: payload.litrosPorUnidad == null ? null : Number(payload.litrosPorUnidad),
      incrementoContadorPorUnidad: payload.incrementoContadorPorUnidad == null ? null : Number(payload.incrementoContadorPorUnidad),
      repartidorUid: String(payload.repartidorUid),
      repartidorNombre: String(payload.repartidorNombre || ''),
      cliente: clone(payload.cliente),
      items,
      total: Number.isFinite(total) ? total : 0,
      formaPago: payload.formaPago || 'efectivo',
      precioUnitario: Number(tarifaSnapshot.precioUnitario ?? payload.precioUnitario ?? 0),
      importe: total,
      origen: 'agua_medidor',
      tipoVenta: 'venta_agua_medidor',
      notaId: payload.notaId || ventaId,
      creditoId: payload.formaPago === 'credito' ? (payload.creditoId || uid()) : null,
      ultimoError: '',
      errorHistorial: [],
      intentos: 0
    };
  };

  const TIPOS_OPERACION_OPERATIVA = ['inicio_jornada', 'recarga_agua', 'cierre_jornada'];
  const normalizeOperationalPayload = payload => {
    const tipoOperacion = String(payload.tipoOperacion || '');
    if (!TIPOS_OPERACION_OPERATIVA.includes(tipoOperacion)) throw new Error('Tipo de operación local no admitido');
    if (!payload.repartidorUid) throw new Error('La operación necesita un repartidor autenticado');
    if (!payload.jornadaId || !payload.vehiculoId || !payload.medidorId || !payload.localidadId) throw new Error('La operación necesita jornada, localidad, vehículo y medidor');
    const fecha = payload.fecha || new Date().toISOString();
    const idLocal = String(payload.idLocal || payload.operacionIdempotente || `${tipoOperacion}:${payload.jornadaId}:${uid()}`);
    return {
      id: idLocal,
      idLocal,
      operacionIdempotente: String(payload.operacionIdempotente || idLocal),
      modoOperacion: 'jornada_operativa',
      tipoOperacion,
      estado: 'pendiente',
      syncStatus: 'pending',
      version: 2,
      creadoEn: fecha,
      actualizadoEn: fecha,
      createdOfflineAt: payload.createdOfflineAt || fecha,
      updatedOfflineAt: payload.updatedOfflineAt || fecha,
      jornadaId: String(payload.jornadaId),
      vehiculoId: String(payload.vehiculoId),
      vehiculoNombre: String(payload.vehiculoNombre || payload.vehiculo || ''),
      medidorId: String(payload.medidorId),
      medidorNombre: String(payload.medidorNombre || ''),
      localidadId: String(payload.localidadId),
      localidadNombre: String(payload.localidadNombre || payload.localidad || ''),
      repartidorUid: String(payload.repartidorUid),
      repartidorNombre: String(payload.repartidorNombre || ''),
      payload: clone(payload.payload || {}),
      ultimoError: '',
      errorHistorial: [],
      intentos: 0
    };
  };

  const isRetryableError = error => {
    const code = String(error?.code || '');
    return !code || ['unavailable', 'deadline-exceeded', 'aborted', 'cancelled', 'internal', 'unknown'].includes(code);
  };
  const obtenerDb = () => {
    if (global.db) return global.db;
    try { return db; } catch (e) { return null; }
  };
  const errorIncidencia = (mensaje, detalle = {}) => { const error = new Error(mensaje); error.__appIncidencia = true; error.__appDetalle = detalle; return error; };
  const errorBloqueo = (mensaje, detalle = {}) => { const error = new Error(mensaje); error.__appBloqueo = true; error.__appDetalle = detalle; return error; };
  const esIncidencia = error => error && error.__appIncidencia === true;

  const construirNotaBase = (venta, fecha, items, incidencia, detalleIncidencia = null) => ({
    fecha,
    fechaCapturaOffline: venta.creadoEn,
    idLocal: venta.idLocal || venta.id,
    syncStatus: 'synced',
    createdOfflineAt: venta.createdOfflineAt || venta.creadoEn,
    updatedOfflineAt: venta.updatedOfflineAt || venta.actualizadoEn,
    ventaOfflineId: venta.id,
    modoRegistro: 'conciliada_offline',
    operacionIdempotente: venta.operacionIdempotente,
    modoOperacion: 'agua_medidor',
    tipoOperacion: 'venta_agua_medidor',
    jornadaId: venta.jornadaId,
    repartidorId: venta.repartidorUid,
    repartidorNombre: venta.repartidorNombre || '',
    vehiculoId: venta.vehiculoId,
    vehiculoNombre: venta.vehiculoNombre || '',
    medidorId: venta.medidorId,
    medidorNombre: venta.medidorNombre || '',
    medidorDigitos: venta.medidorDigitos,
    medidorLitrosPorIncremento: venta.medidorLitrosPorIncremento,
    localidadId: venta.localidadId,
    tarifaId: venta.tarifaId,
    tarifaNombre: venta.tarifaNombre,
    tarifaSnapshot: venta.tarifaSnapshot ? { ...venta.tarifaSnapshot } : null,
    lecturaAntesVenta: venta.lecturaAntesVenta,
    lecturaDespuesVenta: venta.lecturaDespuesVenta,
    lecturaCalculadaAntes: venta.lecturaCalculadaAntes,
    lecturaCalculadaDespues: venta.lecturaCalculadaDespues,
    litrosVendidos: venta.litrosVendidos,
    aguaDisponibleAntesLitros: venta.aguaDisponibleAntesLitros,
    aguaDisponibleDespuesLitros: venta.aguaDisponibleDespuesLitros,
    garrafones: venta.garrafones,
    unidadComercial: venta.unidadComercial,
    incrementoContador: venta.incrementoContador,
    litrosPorUnidad: venta.litrosPorUnidad,
    incrementoContadorPorUnidad: venta.incrementoContadorPorUnidad,
    precioUnitario: venta.precioUnitario,
    importe: venta.importe,
    clienteId: venta.cliente.id,
    clienteNombre: venta.cliente.nombre,
    items: items.map(item => ({ ...item })),
    total: venta.total,
    formaPago: venta.formaPago,
    origen: 'agua_medidor',
    tipoVenta: 'venta_agua_medidor',
    capturadoPorUid: venta.repartidorUid,
    capturadoPorNombre: venta.repartidorNombre || '',
    estado: incidencia ? 'incidencia_agua' : 'confirmada',
    requiereRevision: !!incidencia,
    incidenciaAgua: incidencia ? detalleIncidencia : null
  });

  const conciliar = async venta => {
    const firestore = obtenerDb();
    if (!firestore || !global.firebase?.firestore) throw new Error('Firestore aún no está inicializado');
    const notaRef = firestore.collection('notas').doc(venta.notaId || venta.id);
    const jornadaRef = firestore.collection('jornadas').doc(venta.jornadaId);
    const creditoRef = venta.formaPago === 'credito' && venta.creditoId ? firestore.collection('creditos').doc(venta.creditoId) : null;
    return firestore.runTransaction(async tx => {
      const [notaSnap, jornadaSnap] = await Promise.all([tx.get(notaRef), tx.get(jornadaRef)]);
      if (notaSnap.exists) return { estado: notaSnap.data().estado || 'confirmada', notaId: notaSnap.id, yaExistia: true, data: notaSnap.data() };
      if (!jornadaSnap.exists) throw errorBloqueo('La jornada de la venta ya no existe', { tipo: 'jornada_no_encontrada' });
      const jornada = jornadaSnap.data();
      const ventaCapturadaAntesDelCierre = jornada.estado === 'cerrada' && jornada.fechaCierre && Date.parse(venta.creadoEn || '') <= Date.parse(jornada.fechaCierre);
      if ((jornada.estado !== 'abierta' && !ventaCapturadaAntesDelCierre) || jornada.repartidorId !== venta.repartidorUid || String(jornada.vehiculoId || '') !== String(venta.vehiculoId) || String(jornada.medidorId || '') !== String(venta.medidorId) || String(jornada.localidadId || '') !== String(venta.localidadId)) throw errorBloqueo('La jornada, localidad, vehículo o medidor no corresponde a la venta', { tipo: 'jornada_referencias_no_autorizadas' });
      const lecturaActual = Number(jornada.lecturaCalculadaActual ?? jornada.lecturaActual ?? jornada.lecturaInicial ?? 0);
      const lecturaAntes = Number(venta.lecturaCalculadaAntes ?? venta.lecturaAntesVenta);
      const disponible = Number(jornada.aguaDisponibleLitros ?? jornada.aguaCargadaLitros ?? 0);
      const disponibleAntes = Number(venta.aguaDisponibleAntesLitros ?? disponible);
      const litrosSolicitados = Number(venta.litrosVendidos || 0);
      if (!Number.isFinite(lecturaAntes) || Math.abs(lecturaAntes - lecturaActual) > 1e-9) throw errorBloqueo('La lectura calculada de la venta no continúa la jornada', { tipo: 'lectura_calculada_no_continua', lecturaEsperada: lecturaActual, lecturaRecibida: lecturaAntes });
      if (!Number.isFinite(disponibleAntes) || Math.abs(disponibleAntes - disponible) > 1e-9) throw errorBloqueo('El saldo de agua de la venta no coincide con la jornada', { tipo: 'saldo_no_continuo', disponibleJornada: disponible, disponibleVenta: disponibleAntes });
      if (!Number.isFinite(litrosSolicitados) || litrosSolicitados <= 0 || litrosSolicitados > disponible + 1e-9) throw errorBloqueo('Agua insuficiente para completar la venta', { tipo: 'agua_insuficiente', disponibleLitros: disponible, solicitadoLitros: litrosSolicitados });
      const fecha = new Date().toISOString();
      const nota = construirNotaBase(venta, fecha, venta.items, false);
      tx.set(notaRef, nota);
      tx.set(firestore.collection('lecturas_medidor').doc(`${venta.id}-despacho`), {
        idLocal: venta.idLocal || venta.id,
        syncStatus: 'synced',
        jornadaId: venta.jornadaId,
        tipo: 'despacho_calculado',
        lecturaFisica: false,
        tarifaId: venta.tarifaId || null,
        tarifaNombre: venta.tarifaNombre || null,
        tarifaSnapshot: venta.tarifaSnapshot ? { ...venta.tarifaSnapshot } : null,
        valorAntes: venta.lecturaAntesVenta,
        valorDespues: venta.lecturaDespuesVenta,
        litros: venta.litrosVendidos,
        incrementoContador: venta.incrementoContador,
        litrosPorUnidad: venta.litrosPorUnidad,
        incrementoContadorPorUnidad: venta.incrementoContadorPorUnidad,
        lecturaCalculadaAntes: venta.lecturaCalculadaAntes,
        lecturaCalculadaDespues: venta.lecturaCalculadaDespues,
        aguaDisponibleAntesLitros: venta.aguaDisponibleAntesLitros,
        aguaDisponibleDespuesLitros: venta.aguaDisponibleDespuesLitros,
        fechaHora: fecha,
        usuarioUid: venta.repartidorUid,
        usuarioNombre: venta.repartidorNombre || '',
        vehiculoId: venta.vehiculoId,
        vehiculoNombre: venta.vehiculoNombre || '',
        medidorId: venta.medidorId,
        medidorNombre: venta.medidorNombre || '',
        medidorDigitos: venta.medidorDigitos,
        medidorLitrosPorIncremento: venta.medidorLitrosPorIncremento,
        clienteId: venta.cliente.id,
        ventaId: venta.id,
        operacion: 'venta_agua_medidor'
      });
      if (creditoRef) tx.set(creditoRef, {
        idLocal: venta.idLocal || venta.id,
        syncStatus: 'synced',
        notaId: notaRef.id,
        ventaOfflineId: venta.id,
        clienteId: venta.cliente.id,
        clienteNombre: venta.cliente.nombre,
        jornadaId: venta.jornadaId,
        vehiculoId: venta.vehiculoId,
        vehiculoNombre: venta.vehiculoNombre || '',
        medidorId: venta.medidorId,
        medidorNombre: venta.medidorNombre || '',
        localidadId: venta.localidadId,
        tarifaId: venta.tarifaId || null,
        tarifaNombre: venta.tarifaNombre || null,
        tarifaSnapshot: venta.tarifaSnapshot ? { ...venta.tarifaSnapshot } : null,
        fecha,
        total: venta.total,
        saldo: venta.total,
        abonos: [],
        capturadoPorUid: venta.repartidorUid,
        capturadoPorNombre: venta.repartidorNombre || '',
        estado: 'vigente'
      });
      tx.update(jornadaRef, {
        lecturaActual: Number(venta.lecturaDespuesVenta),
        lecturaCalculadaActual: Number(venta.lecturaDespuesVenta),
        aguaDisponibleLitros: Math.max(0, disponible - litrosSolicitados),
        litrosVendidosAcumulados: Number(jornada.litrosVendidosAcumulados || 0) + litrosSolicitados,
        ultimaVentaId: notaRef.id,
        actualizadoEn: fecha
      });
      return { estado: 'confirmada', notaId: notaRef.id, incidencia: false, total: venta.total, fecha };
    });
  };

  const registrarIncidenciaSinTransaccion = async (venta, error) => {
    const firestore = obtenerDb();
    if (!firestore) throw error;
    const notaRef = firestore.collection('notas').doc(venta.notaId || venta.id);
    const fecha = new Date().toISOString();
    const detalle = error.__appDetalle || { tipo: 'conciliacion_requiere_revision' };
    await notaRef.set(construirNotaBase(venta, fecha, venta.items, true, { tipo: detalle.tipo || 'conciliacion_requiere_revision', mensaje: error.message, fechaConciliacion: fecha, revisarEnCierreCaja: true }));
    return { estado: 'incidencia_agua', notaId: notaRef.id, incidencia: true, total: venta.total, fecha };
  };

  const enqueue = async payload => {
    const venta = normalizePayload(payload);
    await putRecord(venta);
    await notify();
    if (global.navigator?.onLine) setTimeout(() => global.appSincronizarVentasOffline && global.appSincronizarVentasOffline(), 0);
    return { estado: 'pendiente_local', ventaId: venta.id, notaId: venta.notaId, total: venta.total };
  };

  const guardar = async payload => {
    const venta = normalizePayload(payload);
    // Regla local-first: la operación nace en IndexedDB, incluso cuando hay
    // conexión. Firestore solo se toca después de confirmar el registro local.
    await putRecord(venta);
    await notify();
    if (!global.navigator?.onLine) return { estado: 'pendiente_local', syncStatus: 'pending', idLocal: venta.idLocal, ventaId: venta.id, notaId: venta.notaId, total: venta.total };
    let estadoNotificado = false;
    try {
      const resultado = await processOne(venta);
      const fechaSync = new Date().toISOString();
      const erroresResultado = resultado.estado === 'incidencia_agua'
        ? [{ idLocal: resultado.idLocal || venta.idLocal, ventaId: venta.id, syncStatus: 'synced_with_incident', mensaje: 'La venta se sincronizó y requiere revisión de conciliación', fecha: fechaSync, jornadaId: venta.jornadaId }]
        : resultado.estado === 'bloqueada'
          ? [{ idLocal: venta.idLocal, ventaId: venta.id, syncStatus: 'blocked', mensaje: resultado.error || 'La venta fue bloqueada durante la sincronización', fecha: fechaSync, jornadaId: venta.jornadaId }]
          : resultado.estado === 'requiere_revision'
            ? [{ idLocal: venta.idLocal, ventaId: venta.id, syncStatus: 'error', mensaje: resultado.error || 'La venta requiere revisión antes de confirmarse', fecha: fechaSync, jornadaId: venta.jornadaId }]
            : [];
      syncStatus = {
        ...syncStatus,
        ultimaSincronizacion: fechaSync,
        ultimaResultado: { total: 1, sincronizadas: resultado.estado === 'confirmada' ? 1 : 0, incidencias: resultado.estado === 'incidencia_agua' ? 1 : 0, pendientes: 0, errores: erroresResultado, origen: 'venta_online' }
      };
      await notify(erroresResultado);
      estadoNotificado = true;
      if (resultado.estado === 'bloqueada') {
        throw errorBloqueo(resultado.error || 'La venta fue bloqueada durante la sincronización', { tipo: 'venta_bloqueada', idLocal: venta.idLocal });
      }
      if (resultado.estado === 'requiere_revision') {
        const revision = new Error(resultado.error || 'La venta requiere revisión antes de confirmarse');
        revision.__appNoReintentar = true;
        revision.__appDetalle = { tipo: 'venta_requiere_revision', idLocal: venta.idLocal };
        throw revision;
      }
      return { ...resultado, idLocal: venta.idLocal, syncStatus: resultado.syncStatus || 'synced' };
    } catch (error) {
      if (error.__appBloqueo === true) {
        if (!estadoNotificado) await notify([{ idLocal: venta.idLocal, ventaId: venta.id, syncStatus: 'blocked', mensaje: error.message, fecha: new Date().toISOString(), jornadaId: venta.jornadaId }]);
        throw error;
      }
      if (error.__appNoReintentar === true) {
        if (!estadoNotificado) await notify([{ idLocal: venta.idLocal, ventaId: venta.id, syncStatus: 'error', mensaje: error.message, fecha: new Date().toISOString(), jornadaId: venta.jornadaId }]);
        throw error;
      }
      if (isRetryableError(error)) {
        await notify([{ idLocal: venta.idLocal, ventaId: venta.id, syncStatus: 'error', mensaje: error.message, fecha: new Date().toISOString(), jornadaId: venta.jornadaId }]);
        return { estado: 'pendiente_local', syncStatus: 'pending', idLocal: venta.idLocal, ventaId: venta.id, notaId: venta.notaId, total: venta.total };
      }
      throw error;
    }
  };

  const aplicarOperacionRemota = async operacion => {
    const firestore = obtenerDb();
    if (!firestore || !global.firebase?.firestore) throw new Error('Firestore aún no está inicializado');
    const payload = operacion.payload || {};
    const jornadaRef = firestore.collection('jornadas').doc(operacion.jornadaId);
    const cargas = firestore.collection('cargas_agua');
    const lecturas = firestore.collection('lecturas_medidor');
    const cargaRef = payload.cargaId ? cargas.doc(payload.cargaId) : null;
    const lecturaRef = payload.lecturaId ? lecturas.doc(payload.lecturaId) : null;
    return firestore.runTransaction(async tx => {
      const jornadaSnap = await tx.get(jornadaRef);
      if (operacion.tipoOperacion === 'inicio_jornada') {
        if (jornadaSnap.exists) return { estado: 'confirmada', tipoOperacion: operacion.tipoOperacion, idLocal: operacion.idLocal, yaExistia: true, jornadaId: operacion.jornadaId };
        tx.set(jornadaRef, payload.jornadaData);
        if (cargaRef && payload.cargaData) tx.set(cargaRef, payload.cargaData);
        if (lecturaRef && payload.lecturaData) tx.set(lecturaRef, payload.lecturaData);
        return { estado: 'confirmada', tipoOperacion: operacion.tipoOperacion, idLocal: operacion.idLocal, jornadaId: operacion.jornadaId };
      }
      if (!jornadaSnap.exists) throw errorBloqueo('La jornada de la operación ya no existe', { tipo: 'jornada_no_encontrada' });
      const jornada = jornadaSnap.data();
      if (String(jornada.repartidorId || '') !== String(operacion.repartidorUid) || String(jornada.localidadId || '') !== String(operacion.localidadId) || String(jornada.vehiculoId || '') !== String(operacion.vehiculoId) || String(jornada.medidorId || '') !== String(operacion.medidorId)) throw errorBloqueo('La jornada, localidad, vehículo o medidor no corresponde a la operación local', { tipo: 'referencias_no_continuas' });
      if (operacion.tipoOperacion === 'recarga_agua') {
        if (jornada.estado !== 'abierta') throw errorBloqueo('La jornada ya está cerrada', { tipo: 'jornada_cerrada' });
        if (cargaRef) {
          const cargaSnap = await tx.get(cargaRef);
          if (cargaSnap.exists) return { estado: 'confirmada', tipoOperacion: operacion.tipoOperacion, idLocal: operacion.idLocal, yaExistia: true, cargaId: cargaRef.id };
        }
        const antes = Number(payload.aguaDisponibleAntesLitros);
        const actual = Number(jornada.aguaDisponibleLitros || 0);
        if (!Number.isFinite(antes) || Math.abs(actual - antes) > 1e-9) throw errorBloqueo('El saldo de agua cambió; la recarga local ya no continúa la jornada', { tipo: 'saldo_no_continuo', disponibleJornada: actual, disponibleOperacion: antes });
        if (cargaRef && payload.cargaData) tx.set(cargaRef, payload.cargaData);
        tx.update(jornadaRef, payload.jornadaPatch || {});
        return { estado: 'confirmada', tipoOperacion: operacion.tipoOperacion, idLocal: operacion.idLocal, cargaId: cargaRef?.id || null };
      }
      if (operacion.tipoOperacion === 'cierre_jornada') {
        if (jornada.estado === 'cerrada') return { estado: 'confirmada', tipoOperacion: operacion.tipoOperacion, idLocal: operacion.idLocal, yaExistia: true, jornadaId: operacion.jornadaId };
        if (jornada.estado !== 'abierta') throw errorBloqueo('La jornada no está disponible para cierre', { tipo: 'jornada_no_abierta' });
        tx.update(jornadaRef, payload.jornadaPatch || {});
        if (lecturaRef && payload.lecturaData) tx.set(lecturaRef, payload.lecturaData);
        return { estado: 'confirmada', tipoOperacion: operacion.tipoOperacion, idLocal: operacion.idLocal, jornadaId: operacion.jornadaId };
      }
      throw errorBloqueo('Tipo de operación no admitido', { tipo: 'tipo_operacion_no_admitido' });
    });
  };

  const sincronizarRegistro = operacion => operacion.tipoOperacion === 'venta_agua_medidor' ? conciliar(operacion) : aplicarOperacionRemota(operacion);

  const guardarOperacionLocal = async payload => {
    const operacion = normalizeOperationalPayload(payload);
    await putRecord(operacion);
    await notify();
    if (!global.navigator?.onLine) return { estado: 'pendiente_local', syncStatus: 'pending', idLocal: operacion.idLocal, tipoOperacion: operacion.tipoOperacion, jornadaId: operacion.jornadaId };
    let estadoNotificado = false;
    try {
      const resultado = await processOne(operacion);
      const fechaSync = new Date().toISOString();
      const erroresResultado = resultado.estado === 'bloqueada'
        ? [{ idLocal: operacion.idLocal, tipoOperacion: operacion.tipoOperacion, syncStatus: 'blocked', mensaje: resultado.error || 'La operación fue bloqueada durante la sincronización', fecha: fechaSync, jornadaId: operacion.jornadaId }]
        : [];
      syncStatus = { ...syncStatus, ultimaSincronizacion: fechaSync, ultimaResultado: { total: 1, sincronizadas: resultado.estado === 'confirmada' ? 1 : 0, incidencias: 0, pendientes: 0, errores: erroresResultado, origen: 'operacion_online' } };
      await notify(erroresResultado);
      estadoNotificado = true;
      if (resultado.estado === 'bloqueada') throw errorBloqueo(resultado.error || 'La operación fue bloqueada durante la sincronización', { tipo: 'operacion_bloqueada', idLocal: operacion.idLocal });
      return { ...resultado, idLocal: operacion.idLocal, tipoOperacion: operacion.tipoOperacion, syncStatus: resultado.syncStatus || 'synced' };
    } catch (error) {
      if (error.__appBloqueo === true) {
        if (!estadoNotificado) await notify([{ idLocal: operacion.idLocal, tipoOperacion: operacion.tipoOperacion, syncStatus: 'blocked', mensaje: error.message, fecha: new Date().toISOString(), jornadaId: operacion.jornadaId }]);
        throw error;
      }
      if (isRetryableError(error)) {
        await notify([{ idLocal: operacion.idLocal, tipoOperacion: operacion.tipoOperacion, syncStatus: 'error', mensaje: error.message, fecha: new Date().toISOString(), jornadaId: operacion.jornadaId }]);
        return { estado: 'pendiente_local', syncStatus: 'pending', idLocal: operacion.idLocal, tipoOperacion: operacion.tipoOperacion, jornadaId: operacion.jornadaId };
      }
      throw error;
    }
  };

  const processOne = async venta => {
    const actual = await getRecord(venta.id);
    if (!actual || !RETRY_STATES.includes(actual.estado)) return { estado: actual?.estado || 'omitida' };
    const actualizadoEn = new Date().toISOString();
    const reintentando = { ...actual, estado: 'reintentando', syncStatus: 'syncing', intentos: Number(actual.intentos || 0) + 1, actualizadoEn, updatedOfflineAt: actualizadoEn };
    await putRecord(reintentando);
    try {
      const resultado = await sincronizarRegistro(reintentando);
      await deleteRecord(reintentando.id);
      return { ...resultado, idLocal: reintentando.idLocal || reintentando.id, syncStatus: 'synced' };
    } catch (error) {
      if (error.__appBloqueo === true) {
        await deleteRecord(reintentando.id);
        return { estado: 'bloqueada', ventaId: reintentando.id, idLocal: reintentando.idLocal || reintentando.id, error: error.message };
      }
      if (esIncidencia(error)) {
        const resultado = await registrarIncidenciaSinTransaccion(reintentando, error);
        await deleteRecord(reintentando.id);
        return { ...resultado, idLocal: reintentando.idLocal || reintentando.id, syncStatus: 'synced_with_incident' };
      }
      const actualizadoError = new Date().toISOString();
      const errorHistorial = [...(reintentando.errorHistorial || []), { mensaje: error.message, fecha: actualizadoError, codigo: error?.code || null }].slice(-10);
      const pendiente = { ...reintentando, estado: isRetryableError(error) ? 'pendiente' : 'requiere_revision', syncStatus: isRetryableError(error) ? 'pending' : 'error', ultimoError: error.message, errorHistorial, actualizadoEn: actualizadoError, updatedOfflineAt: actualizadoError };
      await putRecord(pendiente);
      if (!isRetryableError(error)) return { estado: 'requiere_revision', ventaId: pendiente.id, error: error.message };
      throw error;
    }
  };

  const sincronizar = async (origen = 'automatico') => {
    if (!global.navigator?.onLine) return { total: 0, sincronizadas: 0, incidencias: 0, pendientes: 0, origen, fueraDeLinea: true };
    if (syncPromise) return syncPromise;
    syncPromise = (async () => {
      const records = (await allRecords()).filter(record => RETRY_STATES.includes(record.estado)).sort((a, b) => new Date(a.creadoEn) - new Date(b.creadoEn));
      const resultado = { total: records.length, sincronizadas: 0, incidencias: 0, pendientes: 0, errores: [], origen };
      for (const record of records) {
        try {
          const r = await processOne(record);
          if (r.estado === 'incidencia_agua') {
            resultado.incidencias++;
            resultado.errores.push({ idLocal: r.idLocal || r.ventaId, ventaId: r.ventaId, syncStatus: 'synced_with_incident', mensaje: 'La venta se sincronizó y requiere revisión de conciliación', fecha: new Date().toISOString() });
          } else if (r.estado === 'confirmada' || r.estado === 'pendiente_local') resultado.sincronizadas++;
          else if (r.estado === 'bloqueada') resultado.errores.push({ idLocal: r.idLocal || r.ventaId, ventaId: r.ventaId, syncStatus: 'blocked', mensaje: r.error, fecha: new Date().toISOString() });
        } catch (error) {
          resultado.pendientes++;
          resultado.errores.push({ idLocal: record.idLocal || record.id, ventaId: record.id, syncStatus: 'error', mensaje: error.message, fecha: new Date().toISOString() });
          break;
        }
      }
      syncStatus = { ...syncStatus, ultimaSincronizacion: new Date().toISOString(), ultimaResultado: resultado };
      await notify(resultado.errores);
      return resultado;
    })().finally(() => { syncPromise = null; });
    return syncPromise;
  };

  const pendientesJornada = async jornadaId => {
    const records = (await allRecords()).filter(record => record.jornadaId === jornadaId && RETRY_STATES.includes(record.estado));
    return { total: records.length, ventas: records.filter(record => record.tipoOperacion === 'venta_agua_medidor'), operaciones: records };
  };
  const resumen = async () => {
    const records = await allRecords();
    return {
      total: records.length,
      pendientes: records.filter(record => RETRY_STATES.includes(record.estado)).length,
      incidencias: records.filter(record => record.estado === 'requiere_revision').length,
      registros: records,
      ventas: records.filter(record => record.tipoOperacion === 'venta_agua_medidor'),
      operaciones: records
    };
  };
  const subscribe = callback => {
    listeners.add(callback);
    resumen().then(callback).catch(() => {});
    return () => listeners.delete(callback);
  };
  const obtenerEstadoSincronizacion = () => ({ ...syncStatus, errores: [...(syncStatus.errores || [])] });
  const subscribeSync = callback => {
    if (typeof callback !== 'function') return () => {};
    syncListeners.add(callback);
    callback(obtenerEstadoSincronizacion());
    return () => syncListeners.delete(callback);
  };

  global.appGuardarVentaAgua = guardar;
  global.appGuardarOperacionLocal = guardarOperacionLocal;
  global.appEncolarVentaAgua = enqueue;
  global.appSincronizarVentasOffline = sincronizar;
  global.appVentasPendientesJornada = pendientesJornada;
  global.appResumenVentasOffline = resumen;
  global.appSuscribirVentasOffline = subscribe;
  global.appObtenerEstadoSincronizacion = obtenerEstadoSincronizacion;
  global.appSuscribirSincronizacion = subscribeSync;
  global.addEventListener('online', () => setTimeout(() => sincronizar(), 250));
  try {
    global.firebase?.auth?.().onAuthStateChanged(user => {
      syncStatus = {
        ultimaSincronizacion: null,
        ultimaResultado: null,
        pendientes: 0,
        errores: [],
        ...readSavedSyncStatus()
      };
      notify();
      if (user && global.navigator?.onLine) setTimeout(() => sincronizar(), 250);
    });
  } catch (e) {}
  if (global.navigator?.onLine) setTimeout(() => sincronizar(), 1000);
})(window);
