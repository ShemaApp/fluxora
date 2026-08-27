/* cargas-agua.js — registro de carga inicial y recargas adicionales de agua.
   Una carga modifica únicamente el saldo de agua de la jornada; nunca altera
   lecturas físicas ni la lectura lógica del medidor. */
(function (global) {
  const obtenerDb = () => {
    if (global.db) return global.db;
    try { return db; } catch (e) { return null; }
  };
  const nombreColeccion = () => {
    try { return COLECCIONES.CARGAS_AGUA; } catch (e) { return 'cargas_agua'; }
  };
  const nombreJornadas = () => {
    try { return COLECCIONES.JORNADAS; } catch (e) { return 'jornadas'; }
  };
  const errorBloqueo = (mensaje, detalle = {}) => {
    const error = new Error(mensaje);
    error.__appBloqueo = true;
    error.__appDetalle = detalle;
    return error;
  };
  const CAPACIDAD_TANQUE_LITROS = 5000;
  global.APP_CAPACIDAD_TANQUE_LITROS = CAPACIDAD_TANQUE_LITROS;
  const estaEnLinea = () => typeof navigator === 'undefined' || navigator.onLine;
  const incrementoAtómico = valor => {
    const fieldValue = global.firebase?.firestore?.FieldValue;
    return fieldValue && typeof fieldValue.increment === 'function' ? fieldValue.increment(valor) : null;
  };

  const normalizarCarga = ({ jornadaId, litros, usuario, tipo = 'recarga' }) => {
    const litrosNumero = Number(litros);
    if (!jornadaId) throw new Error('La carga necesita una jornada abierta');
    if (!Number.isFinite(litrosNumero) || litrosNumero <= 0) throw new Error('Captura una cantidad de litros válida');
    if (!usuario?.uid) throw new Error('La carga necesita un repartidor autenticado');
    return { jornadaId: String(jornadaId), litros: litrosNumero, tipo, usuario };
  };

  const aplicarCarga = async ({ jornadaId, litros, usuario, tipo = 'recarga', jornadaBase = null }) => {
    const carga = normalizarCarga({ jornadaId, litros, usuario, tipo });
    const base = jornadaBase && String(jornadaBase.id) === carga.jornadaId ? jornadaBase : null;
    if (!base) throw new Error('No hay una copia local de la jornada para registrar la carga');
    if (base.estado !== 'abierta') throw errorBloqueo('La jornada ya está cerrada', { tipo: 'jornada_cerrada' });
    if (!base.repartidorId || base.repartidorId !== carga.usuario.uid) throw errorBloqueo('La carga no corresponde al repartidor de la jornada', { tipo: 'repartidor_no_autorizado' });
    if (!base.localidadId || !base.vehiculoId || !base.medidorId) throw errorBloqueo('La jornada no tiene localidad, vehículo y medidor completos', { tipo: 'referencias_incompletas' });
    const capacidadTanque = Number(base.capacidadTanqueLitros || CAPACIDAD_TANQUE_LITROS);
    const aguaDisponibleAntesLitros = Number(base.aguaDisponibleLitros || 0);
    const aguaCargadaAntes = Number(base.aguaCargadaLitros || 0);
    const recargasAntes = Number(base.litrosRecargadosAcumulados || 0);
    const aguaDisponibleDespuesLitros = aguaDisponibleAntesLitros + carga.litros;
    const aguaCargadaDespues = aguaCargadaAntes + carga.litros;
    if (capacidadTanque > CAPACIDAD_TANQUE_LITROS) throw errorBloqueo(`La capacidad del tanque no puede superar ${CAPACIDAD_TANQUE_LITROS.toLocaleString('es-MX')} L`, { tipo: 'capacidad_tanque_invalida', maximoLitros: CAPACIDAD_TANQUE_LITROS });
    if (aguaDisponibleDespuesLitros > capacidadTanque) throw errorBloqueo(`La recarga excede el espacio disponible. Capacidad: ${capacidadTanque.toLocaleString('es-MX')} L`, { tipo: 'capacidad_tanque_excedida', capacidadTanqueLitros: capacidadTanque, disponibleAntesLitros: aguaDisponibleAntesLitros, litrosSolicitados: carga.litros });
    const runtime = typeof window !== 'undefined' ? window : globalThis;
    if (typeof runtime.appGuardarOperacionLocal !== 'function') throw new Error('El módulo local-first no está disponible');
    const fecha = new Date().toISOString();
    const cargaId = `carga-${carga.jornadaId}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
    const cargaData = {
      idLocal: `recarga:${cargaId}`, jornadaId: carga.jornadaId, tipo: carga.tipo, litros: carga.litros,
      aguaDisponibleAntesLitros, aguaDisponibleDespuesLitros, aguaCargadaAcumuladaLitros: aguaCargadaDespues,
      litrosRecargadosAcumulados: recargasAntes + carga.litros, capacidadTanqueLitros: capacidadTanque,
      localidadId: base.localidadId, localidadNombre: base.localidadNombre || base.localidad || '', vehiculoId: base.vehiculoId,
      vehiculoNombre: base.vehiculoNombre || base.vehiculo || '', medidorId: base.medidorId, medidorNombre: base.medidorNombre || '',
      jornadaEstado: 'abierta', fechaHora: fecha, usuarioUid: carga.usuario.uid, usuarioNombre: carga.usuario.nombre || '',
      repartidorId: carga.usuario.uid, repartidorNombre: carga.usuario.nombre || '', origen: estaEnLinea() ? 'jornada_repartidor' : 'jornada_repartidor_offline'
    };
    const jornadaPatch = {
      capacidadTanqueLitros: capacidadTanque, aguaDisponibleLitros: aguaDisponibleDespuesLitros, aguaCargadaLitros: aguaCargadaDespues,
      litrosRecargadosAcumulados: recargasAntes + carga.litros, ultimaRecargaId: cargaId, ultimaRecargaLitros: carga.litros,
      ultimaRecargaEn: fecha, actualizadoEn: fecha
    };
    return runtime.appGuardarOperacionLocal({
      idLocal: `recarga:${carga.jornadaId}:${cargaId}`,
      operacionIdempotente: `recarga:${carga.jornadaId}:${cargaId}`,
      tipoOperacion: 'recarga_agua', jornadaId: carga.jornadaId, localidadId: base.localidadId, localidadNombre: base.localidadNombre || base.localidad || '',
      vehiculoId: base.vehiculoId, vehiculoNombre: base.vehiculoNombre || base.vehiculo || '', medidorId: base.medidorId, medidorNombre: base.medidorNombre || '',
      repartidorUid: carga.usuario.uid, repartidorNombre: carga.usuario.nombre || '',
      payload: { cargaId, cargaData, aguaDisponibleAntesLitros, jornadaPatch }
    });
  };

  global.appRegistrarRecargaAgua = aplicarCarga;
})(typeof window !== 'undefined' ? window : globalThis);
