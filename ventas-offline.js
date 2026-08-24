/*
 * Cola offline de ventas de agua medida.
 *
 * La venta se captura con cantidad comercial y snapshots de tarifa, pero la
 * jornada conserva la lectura lógica y el saldo de agua. La lectura física
 * solamente se captura al abrir y cerrar la jornada.
 */
(function (global) {
  'use strict';

  const DB_NAME = 'app-offline-ventas-agua-v2';
  const DB_VERSION = 1;
  const STORE = 'ventas_agua';
  const RETRY_STATES = ['pendiente', 'reintentando'];
  let dbOpenPromise = null;
  let syncPromise = null;
  const listeners = new Set();

  const currentUid = () => {
    try { return global.auth?.currentUser?.uid || global.firebase?.auth?.().currentUser?.uid || null; } catch (e) { return null; }
  };

  const openDb = () => {
    if (dbOpenPromise) return dbOpenPromise;
    dbOpenPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in global)) {
        reject(new Error('Este dispositivo no ofrece almacenamiento local IndexedDB'));
        return;
      }
      const request = global.indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error || new Error('No se pudo abrir la cola local'));
      request.onupgradeneeded = event => {
        const localDb = event.target.result;
        if (localDb.objectStoreNames.contains(STORE)) localDb.deleteObjectStore(STORE);
        localDb.createObjectStore(STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
    });
    return dbOpenPromise;
  };

  const withStore = async (mode, action) => {
    const localDb = await openDb();
    return new Promise((resolve, reject) => {
      const tx = localDb.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let result;
      try { result = action(store); } catch (e) { reject(e); return; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error('Error en la cola local'));
      tx.onabort = () => reject(tx.error || new Error('Operación local cancelada'));
    });
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

  const notify = async () => {
    const resumen = await (global.appResumenVentasOffline ? global.appResumenVentasOffline() : Promise.resolve({ total: 0, pendientes: 0, incidencias: 0, registros: [] })).catch(() => ({ total: 0, pendientes: 0, incidencias: 0, registros: [] }));
    listeners.forEach(fn => { try { fn(resumen); } catch (e) { console.warn('Listener de ventas offline:', e); } });
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
      operacionIdempotente: String(payload.operacionIdempotente || ventaId),
      modoOperacion: 'agua_medidor',
      tipoOperacion: 'venta_agua_medidor',
      estado: 'pendiente',
      version: 2,
      creadoEn: fecha,
      actualizadoEn: fecha,
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
    try {
      if (!global.navigator?.onLine) return enqueue(venta);
      const resultado = await conciliar(venta);
      await notify();
      return resultado;
    } catch (error) {
      if (error.__appBloqueo === true) throw error;
      if (esIncidencia(error)) {
        const resultado = await registrarIncidenciaSinTransaccion(venta, error);
        await notify();
        return resultado;
      }
      if (isRetryableError(error)) return enqueue(venta);
      throw error;
    }
  };

  const processOne = async venta => {
    const actual = await getRecord(venta.id);
    if (!actual || !RETRY_STATES.includes(actual.estado)) return { estado: actual?.estado || 'omitida' };
    const reintentando = { ...actual, estado: 'reintentando', intentos: Number(actual.intentos || 0) + 1, actualizadoEn: new Date().toISOString() };
    await putRecord(reintentando);
    try {
      const resultado = await conciliar(reintentando);
      await deleteRecord(reintentando.id);
      return resultado;
    } catch (error) {
      if (error.__appBloqueo === true) {
        await deleteRecord(reintentando.id);
        return { estado: 'bloqueada', ventaId: reintentando.id, error: error.message };
      }
      if (esIncidencia(error)) {
        const resultado = await registrarIncidenciaSinTransaccion(reintentando, error);
        await deleteRecord(reintentando.id);
        return resultado;
      }
      const pendiente = { ...reintentando, estado: isRetryableError(error) ? 'pendiente' : 'requiere_revision', ultimoError: error.message, actualizadoEn: new Date().toISOString() };
      await putRecord(pendiente);
      if (!isRetryableError(error)) return { estado: 'requiere_revision', ventaId: pendiente.id, error: error.message };
      throw error;
    }
  };

  const sincronizar = async () => {
    if (!global.navigator?.onLine) return { total: 0, sincronizadas: 0, incidencias: 0, pendientes: 0 };
    if (syncPromise) return syncPromise;
    syncPromise = (async () => {
      const records = (await allRecords()).filter(record => RETRY_STATES.includes(record.estado)).sort((a, b) => new Date(a.creadoEn) - new Date(b.creadoEn));
      const resultado = { total: records.length, sincronizadas: 0, incidencias: 0, pendientes: 0, errores: [] };
      for (const record of records) {
        try {
          const r = await processOne(record);
          if (r.estado === 'incidencia_agua') resultado.incidencias++;
          else if (r.estado === 'confirmada' || r.estado === 'pendiente_local') resultado.sincronizadas++;
        } catch (error) {
          resultado.pendientes++;
          resultado.errores.push({ ventaId: record.id, mensaje: error.message });
          break;
        }
      }
      await notify();
      return resultado;
    })().finally(() => { syncPromise = null; });
    return syncPromise;
  };

  const pendientesJornada = async jornadaId => {
    const records = (await allRecords()).filter(record => record.jornadaId === jornadaId && RETRY_STATES.includes(record.estado));
    return { total: records.length, ventas: records };
  };
  const resumen = async () => {
    const records = await allRecords();
    return {
      total: records.length,
      pendientes: records.filter(record => RETRY_STATES.includes(record.estado)).length,
      incidencias: records.filter(record => record.estado === 'requiere_revision').length,
      registros: records
    };
  };
  const subscribe = callback => {
    listeners.add(callback);
    resumen().then(callback).catch(() => {});
    return () => listeners.delete(callback);
  };

  global.appGuardarVentaAgua = guardar;
  global.appEncolarVentaAgua = enqueue;
  global.appSincronizarVentasOffline = sincronizar;
  global.appVentasPendientesJornada = pendientesJornada;
  global.appResumenVentasOffline = resumen;
  global.appSuscribirVentasOffline = subscribe;
  global.addEventListener('online', () => setTimeout(() => sincronizar(), 250));
  try {
    global.firebase?.auth?.().onAuthStateChanged(user => {
      notify();
      if (user && global.navigator?.onLine) setTimeout(() => sincronizar(), 250);
    });
  } catch (e) {}
  if (global.navigator?.onLine) setTimeout(() => sincronizar(), 1000);
})(window);
