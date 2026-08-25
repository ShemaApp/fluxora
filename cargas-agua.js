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
  const MAX_AGUA_JORNADA_LITROS = 5000;
  global.APP_MAX_AGUA_JORNADA_LITROS = MAX_AGUA_JORNADA_LITROS;
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
    const firestore = obtenerDb();
    if (!firestore) throw new Error('Firestore aún no está inicializado');
    const carga = normalizarCarga({ jornadaId, litros, usuario, tipo });
    const jornadaRef = firestore.collection(nombreJornadas()).doc(carga.jornadaId);
    const cargaRef = firestore.collection(nombreColeccion()).doc();
    const fecha = new Date().toISOString();
    let resultado = null;

    const escribirCarga = (writer, jornada, usarIncrementos = false) => {
      if (jornada.estado !== 'abierta') throw errorBloqueo('La jornada ya está cerrada', { tipo: 'jornada_cerrada' });
      if (!jornada.repartidorId || jornada.repartidorId !== carga.usuario.uid) throw errorBloqueo('La recarga no corresponde al repartidor de la jornada', { tipo: 'repartidor_no_autorizado' });
      if (!jornada.localidadId || !jornada.vehiculoId || !jornada.medidorId) throw errorBloqueo('La jornada no tiene localidad, vehículo y medidor completos', { tipo: 'referencias_incompletas' });

      const aguaDisponibleAntes = Number(jornada.aguaDisponibleLitros || 0);
      const aguaCargadaAntes = Number(jornada.aguaCargadaLitros || 0);
      const recargasAntes = Number(jornada.litrosRecargadosAcumulados || 0);
      const aguaDisponibleDespues = aguaDisponibleAntes + carga.litros;
      const aguaCargadaDespues = aguaCargadaAntes + carga.litros;
      if (aguaCargadaDespues > MAX_AGUA_JORNADA_LITROS) throw errorBloqueo(`La carga acumulada no puede superar ${MAX_AGUA_JORNADA_LITROS.toLocaleString('es-MX')} L`, { tipo: 'limite_carga_jornada', maximoLitros: MAX_AGUA_JORNADA_LITROS, cargaAcumuladaLitros: aguaCargadaAntes, litrosSolicitados: carga.litros });
      const datosCarga = {
        jornadaId: carga.jornadaId,
        tipo: carga.tipo,
        litros: carga.litros,
        aguaDisponibleAntesLitros: aguaDisponibleAntes,
        aguaDisponibleDespuesLitros: aguaDisponibleDespues,
        aguaCargadaAcumuladaLitros: aguaCargadaDespues,
        litrosRecargadosAcumulados: recargasAntes + carga.litros,
        localidadId: jornada.localidadId,
        localidadNombre: jornada.localidadNombre || jornada.localidad || '',
        vehiculoId: jornada.vehiculoId,
        vehiculoNombre: jornada.vehiculoNombre || jornada.vehiculo || '',
        medidorId: jornada.medidorId,
        medidorNombre: jornada.medidorNombre || '',
        jornadaEstado: jornada.estado,
        fechaHora: fecha,
        usuarioUid: carga.usuario.uid,
        usuarioNombre: carga.usuario.nombre || '',
        repartidorId: carga.usuario.uid,
        repartidorNombre: carga.usuario.nombre || '',
        origen: estaEnLinea() ? 'jornada_repartidor' : 'jornada_repartidor_offline'
      };
      writer.set(cargaRef, datosCarga);
      const delta = usarIncrementos ? incrementoAtómico(carga.litros) : null;
      writer.update(jornadaRef, {
        aguaDisponibleLitros: delta || aguaDisponibleDespues,
        aguaCargadaLitros: delta || aguaCargadaDespues,
        litrosRecargadosAcumulados: delta || recargasAntes + carga.litros,
        ultimaRecargaId: cargaRef.id,
        ultimaRecargaLitros: carga.litros,
        ultimaRecargaEn: fecha,
        actualizadoEn: fecha
      });
      resultado = { estado: estaEnLinea() ? 'confirmada' : 'pendiente_local', cargaId: cargaRef.id, litros: carga.litros, aguaDisponibleLitros: aguaDisponibleDespues };
      return resultado;
    };

    if (estaEnLinea()) {
      await firestore.runTransaction(async tx => {
        const jornadaSnap = await tx.get(jornadaRef);
        if (!jornadaSnap.exists) throw errorBloqueo('La jornada no existe', { tipo: 'jornada_no_encontrada' });
        escribirCarga(tx, { id: jornadaSnap.id, ...jornadaSnap.data() });
      });
    } else {
      const base = jornadaBase && String(jornadaBase.id) === carga.jornadaId ? jornadaBase : null;
      if (!base) throw new Error('No hay una copia local de la jornada para registrar la recarga sin conexión');
      const batch = firestore.batch();
      escribirCarga(batch, base, true);
      await batch.commit();
    }
    return resultado;
  };

  global.appRegistrarRecargaAgua = aplicarCarga;
})(typeof window !== 'undefined' ? window : globalThis);
