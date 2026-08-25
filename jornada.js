/* jornada.js — Jornada y medidor.
   La localidad es la unidad operativa; vehículo y medidor llegan como
   referencias separadas desde su asignación administrativa. */
const CAPACIDAD_TANQUE_LITROS = 5000;
function JornadaMedidor({ localidades = [], jornadas = [], notas = [], clientes = [], cargasAgua = [], servicios = [], medicion = null, vehiculos = [], medidores = [], currentUser = {}, onIrA }) {
  const localidadesDisponibles = obtenerLocalidadesAsignadas({ localidades, currentUser, localidadIds: currentUser.localidadIds });
  const jornadaAbierta = (jornadas || []).find(j => j.estado === 'abierta' && (currentUser.role === 'admin' || j.repartidorId === currentUser.uid));
  const [form, setForm] = useState(() => {
    const borrador = typeof appReadDraft === 'function' ? appReadDraft('jornada', currentUser?.uid) : null;
    return borrador?.form || { localidadId: '', localidadNombre: '', vehiculoId: '', vehiculo: '', vehiculoNombre: '', medidorId: '', medidorNombre: '', lecturaInicial: '', aguaCargadaLitros: '' };
  });
  const [lecturaFinal, setLecturaFinal] = useState('');
  const [recargaLitros, setRecargaLitros] = useState('');
  const [recargando, setRecargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const localidadActual = localidadesDisponibles.find(l => l.id === form.localidadId) || buscarLocalidadOperativa({ localidades: localidadesDisponibles, localidadId: form.localidadId, localidadNombre: form.localidadNombre });
  const vehiculoActual = resolverVehiculoOperativo({ jornada: form, localidad: localidadActual, vehiculos });
  const medidorActual = resolverMedidorOperativo({ jornada: form, localidad: localidadActual, vehiculo: vehiculoActual, medidores, medicion });
  const referenciasCoinciden = j => {
    const tieneVehiculo = !!vehiculoActual.id;
    const tieneMedidor = !!medidorActual.id;
    const mismoVehiculo = tieneVehiculo && String(j.vehiculoId || '') === String(vehiculoActual.id);
    const mismoMedidor = tieneMedidor && String(j.medidorId || '') === String(medidorActual.id);
    const mismaLocalidad = !!localidadActual?.id && String(j.localidadId || '') === String(localidadActual.id);
    if (tieneVehiculo && tieneMedidor) return mismoVehiculo && mismoMedidor;
    if (tieneVehiculo) return mismoVehiculo;
    if (tieneMedidor) return mismoMedidor;
    if (mismaLocalidad) return true;
    return !!form.localidadNombre && String(j.localidadNombre || j.localidad || '') === String(form.localidadNombre);
  };
  const jornadaLocalidadAbierta = (jornadas || []).find(j => j.estado === 'abierta' && referenciasCoinciden(j));
  const jornadasInstrumento = (jornadas || []).filter(j => j.estado === 'cerrada' && referenciasCoinciden(j)).sort((a, b) => new Date(b.fechaCierre || 0) - new Date(a.fechaCierre || 0));
  const jornadaAnterior = jornadasInstrumento[0];
  const lecturaLocalidadCompatible = !localidadActual?.medidorId || !medidorActual.id || String(localidadActual.medidorId) === String(medidorActual.id);
  const lecturaAnterior = jornadaAnterior?.lecturaFinal ?? (lecturaLocalidadCompatible ? localidadActual?.lecturaActual : null) ?? null;
  const litrosPorUnidad = Number(localidadActual?.litrosPorUnidad ?? medicion?.litrosPorUnidad ?? FACTOR_LITROS_POR_GARRAFON);
  const incrementoContadorPorUnidad = Number(localidadActual?.incrementoContadorPorUnidad ?? medicion?.incrementoContadorPorUnidad ?? 2);
  const unidadComercial = localidadActual?.unidadComercial || medicion?.unidadComercial || 'Garrafón';
  const precioPorUnidad = Number(localidadActual?.precioPorUnidad ?? medicion?.precioPorUnidad ?? 0);
  const clientesJornada = (clientes || []).filter(c => {
    if (c.activo === false) return false;
    const localidadId = jornadaAbierta?.localidadId || form.localidadId;
    const localidadNombre = jornadaAbierta?.localidadNombre || form.localidadNombre || localidadActual?.nombre;
    return (localidadId && String(c.localidadId || '') === String(localidadId)) || (!c.localidadId && localidadNombre && String(c.localidadNombre || c.localidad || c.domicilio || '').trim().toLowerCase() === String(localidadNombre).trim().toLowerCase());
  });
  const clientesAtendidos = new Set((notas || []).filter(n => jornadaAbierta && n.capturadoPorUid === jornadaAbierta.repartidorId && new Date(n.fecha || 0).getTime() >= new Date(jornadaAbierta.fechaInicio || 0).getTime()).map(n => n.clienteId).concat((servicios || []).filter(servicio => jornadaAbierta && servicio.jornadaId === jornadaAbierta.id && servicio.estado === 'completado').map(servicio => servicio.clienteId)));
  const cargasJornada = (cargasAgua || []).filter(carga => jornadaAbierta && carga.jornadaId === jornadaAbierta.id);
  const litrosRecargadosJornada = cargasJornada.filter(carga => carga.tipo === 'recarga').reduce((total, carga) => total + Number(carga.litros || 0), 0);
  const capacidadTanqueLitros = Number(jornadaAbierta?.capacidadTanqueLitros || CAPACIDAD_TANQUE_LITROS);
  const aguaDisponibleJornada = Math.max(0, Number(jornadaAbierta?.aguaDisponibleLitros || 0));
  const porcentajeAguaJornada = capacidadTanqueLitros > 0 ? Math.max(0, Math.min(100, aguaDisponibleJornada / capacidadTanqueLitros * 100)) : 0;
  const flash = texto => { setMensaje(texto); setTimeout(() => setMensaje(''), 3000); };

  useEffect(() => {
    if (typeof appWriteDraft === 'function') appWriteDraft('jornada', currentUser?.uid, { form });
  }, [form, currentUser?.uid]);

  const recargar = async () => {
    const litros = Number(recargaLitros);
    if (!jornadaAbierta) return flash('Primero inicia una jornada');
    if (currentUser.role !== 'repartidor') return flash('Solo el repartidor de la jornada puede registrar una recarga');
    if (!Number.isFinite(litros) || litros <= 0) return flash('Captura una cantidad de litros válida');
    const aguaDisponibleActual = Number(jornadaAbierta.aguaDisponibleLitros || 0);
    if (aguaDisponibleActual + litros > CAPACIDAD_TANQUE_LITROS) return flash(`La recarga excede el espacio disponible. Capacidad del tanque: ${CAPACIDAD_TANQUE_LITROS.toLocaleString('es-MX')} L`);
    const runtime = typeof window !== 'undefined' ? window : globalThis;
    if (typeof runtime.appRegistrarRecargaAgua !== 'function') return flash('El módulo de recargas no está disponible');
    setRecargando(true);
    try {
      const resultado = await runtime.appRegistrarRecargaAgua({
        jornadaId: jornadaAbierta.id,
        litros,
        usuario: { uid: currentUser.uid, nombre: currentUser.nombre || '' },
        jornadaBase: jornadaAbierta
      });
      setRecargaLitros('');
      flash(resultado.estado === 'pendiente_local' ? 'Recarga guardada en el teléfono; queda pendiente de sincronizar' : `Recarga registrada: +${litros.toFixed(2)} L`);
    } catch (e) { flash('No se pudo registrar la recarga: ' + e.message); }
    setRecargando(false);
  };
  const seleccionarLocalidad = id => {
    const localidad = localidadesDisponibles.find(l => l.id === id);
    const vehiculo = resolverVehiculoOperativo({ localidad, vehiculos });
    const medidor = resolverMedidorOperativo({ localidad, vehiculo, medidores, medicion });
    setForm(f => ({
      ...f,
      localidadId: id,
      localidadNombre: localidad?.nombre || '',
      vehiculo: vehiculo.nombre || '',
      vehiculoId: vehiculo.id || '',
      vehiculoNombre: vehiculo.nombre || '',
      medidorId: medidor.id || '',
      medidorNombre: medidor.nombre || '',
      lecturaInicial: '',
      aguaCargadaLitros: ''
    }));
  };
  const iniciar = async () => {
    const inicio = Number(form.lecturaInicial);
    const aguaCargadaLitros = Number(form.aguaCargadaLitros);
    if (jornadaAbierta) return flash('Ya existe una jornada abierta; ciérrala antes de iniciar otra');
    if (jornadaLocalidadAbierta) return flash('El vehículo, medidor o localidad ya está ocupado por otra jornada abierta');
    if (medicion && (medicion.unidadActivo === false || medicion.medidorActivo === false)) return flash('La configuración de medición está inactiva; solicita a ADMIN que la habilite');
    const localidad = localidadActual || buscarLocalidadOperativa({ localidades: localidadesDisponibles, localidadId: form.localidadId, localidadNombre: form.localidadNombre });
    const vehiculo = resolverVehiculoOperativo({ jornada: form, localidad, vehiculos });
    const medidor = resolverMedidorOperativo({ jornada: form, localidad, vehiculo, medidores, medicion });
    if (!localidad?.id || !vehiculo.id || !medidor.id) return flash('La localidad no tiene repartidor, vehículo y medidor configurados; solicita a ADMIN completar la asignación');
    if (!Number.isFinite(inicio) || inicio < 0) return flash('Captura una lectura inicial válida');
    if (!Number.isFinite(aguaCargadaLitros) || aguaCargadaLitros <= 0) return flash('Captura los litros de agua cargados');
    if (aguaCargadaLitros > CAPACIDAD_TANQUE_LITROS) return flash(`La carga inicial no puede superar la capacidad del tanque de ${CAPACIDAD_TANQUE_LITROS.toLocaleString('es-MX')} L`);
    if (lecturaAnterior !== null && inicio < Number(lecturaAnterior)) return flash('La lectura inicial no puede ser menor que la última lectura registrada');
    try {
      const jornadaRef = db.collection('jornadas').doc();
      const fechaInicio = new Date().toISOString();
      const lecturaInicialRef = db.collection('lecturas_medidor').doc(`${jornadaRef.id}-inicial`);
      const cargaInicialRef = db.collection(COLECCIONES.CARGAS_AGUA).doc(`${jornadaRef.id}-inicial`);
      const escribirInicio = tx => {
        tx.set(jornadaRef, {
          estado: 'abierta', repartidorId: currentUser.uid, repartidorNombre: currentUser.nombre || '',
          localidadId: localidad.id, localidadNombre: localidad.nombre || '', localidad: localidad.nombre || '', vehiculo: vehiculo.nombre, vehiculoId: vehiculo.id, vehiculoNombre: vehiculo.nombre, medidorId: medidor.id, medidorNombre: medidor.nombre,
          lecturaAnterior: lecturaAnterior === null ? null : Number(lecturaAnterior), lecturaInicial: inicio, lecturaActual: inicio, lecturaCalculadaActual: inicio,
          capacidadTanqueLitros: CAPACIDAD_TANQUE_LITROS, aguaCargadaLitros, aguaDisponibleLitros: aguaCargadaLitros, litrosRecargadosAcumulados: 0, litrosMedidos: null, litrosVendidos: 0, litrosVendidosAcumulados: 0, otrasSalidasLitros: 0, diferenciaLitros: null,
          unidadComercial, litrosPorUnidad, incrementoContadorPorUnidad, precioPorUnidad, medidorDigitos: medidor.digitos, medidorLitrosPorIncremento: medidor.litrosPorIncremento, creadoOffline: typeof navigator !== 'undefined' && !navigator.onLine
        });
        tx.set(cargaInicialRef, {
          jornadaId: jornadaRef.id, tipo: 'carga_inicial', litros: aguaCargadaLitros,
          aguaDisponibleAntesLitros: 0, aguaDisponibleDespuesLitros: aguaCargadaLitros, aguaCargadaAcumuladaLitros: aguaCargadaLitros,
          capacidadTanqueLitros: CAPACIDAD_TANQUE_LITROS, litrosRecargadosAcumulados: 0, localidadId: localidad.id, localidadNombre: localidad.nombre || '',
          vehiculoId: vehiculo.id, vehiculoNombre: vehiculo.nombre || '', medidorId: medidor.id, medidorNombre: medidor.nombre || '',
          jornadaEstado: 'abierta', fechaHora: fechaInicio, usuarioUid: currentUser.uid, usuarioNombre: currentUser.nombre || '',
          repartidorId: currentUser.uid, repartidorNombre: currentUser.nombre || '', origen: 'apertura_jornada'
        });
        tx.set(lecturaInicialRef, {
          jornadaId: jornadaRef.id, tipo: 'inicial', lecturaFisica: true, valor: inicio, valorAnterior: lecturaAnterior === null ? null : Number(lecturaAnterior),
          fechaHora: fechaInicio, usuarioUid: currentUser.uid, usuarioNombre: currentUser.nombre || '',
          localidadId: localidad.id, localidadNombre: localidad.nombre || '', vehiculo: vehiculo.nombre, vehiculoId: vehiculo.id, vehiculoNombre: vehiculo.nombre, medidorId: medidor.id, medidorNombre: medidor.nombre, medidorDigitos: medidor.digitos, medidorLitrosPorIncremento: medidor.litrosPorIncremento, operacion: 'apertura_jornada'
        });
      };
      if (typeof navigator !== 'undefined' && navigator.onLine) await db.runTransaction(async tx => escribirInicio(tx));
      else { const batch = db.batch(); escribirInicio(batch); await batch.commit(); }
      if (typeof appClearDraft === 'function') appClearDraft('jornada', currentUser?.uid);
      setForm({ localidadId: '', localidadNombre: '', vehiculoId: '', vehiculo: '', vehiculoNombre: '', medidorId: '', medidorNombre: '', lecturaInicial: '', aguaCargadaLitros: '' });
      flash('Jornada iniciada');
    } catch (e) { flash('No se pudo iniciar la jornada: ' + e.message); }
  };
  const actualizarOtrasSalidas = async (jornada, valor) => {
    const otrasSalidasLitros = Math.max(0, Number(valor) || 0);
    const diferenciaBase = Number(jornada.diferenciaLitrosFisicaContraCalculada ?? (Number(jornada.litrosMedidos || 0) - Number(jornada.litrosVendidos || 0)));
    const diferenciaLitros = diferenciaBase - otrasSalidasLitros;
    const litrosUnidad = Number(jornada.litrosPorUnidad || litrosPorUnidad);
    try {
      await db.collection('jornadas').doc(jornada.id).update({ otrasSalidasLitros, diferenciaLitros, tipoDiferencia: Math.abs(diferenciaLitros) < 1e-9 ? 'sin_diferencia' : 'diferencia_merma_revision', diferenciaGarrafones: litrosUnidad > 0 ? diferenciaLitros / litrosUnidad : null, actualizadoPorUid: currentUser.uid, actualizadoEn: new Date().toISOString() });
      flash('Conciliación actualizada');
    } catch (e) { flash('No se pudo actualizar la conciliación: ' + e.message); }
  };
  const cerrar = async () => {
    const final = Number(lecturaFinal);
    const inicial = Number(jornadaAbierta.lecturaInicial);
    if (!Number.isFinite(final) || final < inicial) return flash('La lectura final debe ser mayor o igual a la inicial');
    const incrementoContadorMedido = final - inicial;
    const litrosEscalaJornada = Number(jornadaAbierta.litrosPorUnidad || litrosPorUnidad);
    const incrementoEscalaJornada = Number(jornadaAbierta.incrementoContadorPorUnidad || incrementoContadorPorUnidad);
    const litrosMedidos = incrementoEscalaJornada > 0 ? (incrementoContadorMedido / incrementoEscalaJornada) * litrosEscalaJornada : 0;
    const inicio = new Date(jornadaAbierta.fechaInicio || 0).getTime();
    const ventasJornadaSincronizadas = (notas || []).filter(n => n.jornadaId === jornadaAbierta.id || (!n.jornadaId && n.capturadoPorUid === jornadaAbierta.repartidorId && new Date(n.fecha || 0).getTime() >= inicio));
    const pendientesLocales = typeof appVentasPendientesJornada === 'function' ? await appVentasPendientesJornada(jornadaAbierta.id) : { ventas: [] };
    const clavesSincronizadas = new Set(ventasJornadaSincronizadas.map(v => v.operacionIdempotente || v.ventaOfflineId || v.id));
    const ventasPendientes = (pendientesLocales.ventas || []).filter(v => !clavesSincronizadas.has(v.operacionIdempotente || v.id));
    const ventasJornada = ventasJornadaSincronizadas.concat(ventasPendientes);
    const serviciosJornada = (servicios || []).filter(servicio => servicio.jornadaId === jornadaAbierta.id && servicio.estado === 'completado').map(servicio => ({
      ...servicio,
      fecha: servicio.createdAt || servicio.creadoEn,
      litrosVendidos: Number(servicio.medicion?.litrosRellenados || 0),
      garrafones: Number(servicio.venta?.garrafonesCobrables || servicio.medicion?.garrafonesEquivalentes || 0),
      total: Number(servicio.venta?.total || 0),
      formaPago: 'facturado',
      tarifaId: servicio.venta?.tarifaId || '',
      tarifaNombre: servicio.venta?.tarifaNombre || '',
      tarifaSnapshot: servicio.venta?.tarifaSnapshot || null,
      precioUnitario: Number(servicio.venta?.precioUnitarioAplicado || 0),
      incrementoContador: Number(servicio.lecturaCamion?.incrementoContador || 0),
      tipoOperacion: 'relleno_por_medicion'
    }));
    const operacionesJornada = ventasJornada.concat(serviciosJornada);
    const litrosVendidos = operacionesJornada.reduce((total, venta) => {
      const litrosDirectos = Number(venta.litrosVendidos || 0);
      if (litrosDirectos > 0) return total + litrosDirectos;
      return total + (venta.items || []).reduce((suma, item) => { const litrosExplicitos = Number(item.litrosVendidos || item.litros || 0); const litrosItem = litrosExplicitos > 0 ? litrosExplicitos : Number(item.cant || 0) * Number(jornadaAbierta.litrosPorUnidad || FACTOR_LITROS_POR_GARRAFON); return suma + litrosItem; }, 0);
    }, 0);
    const incrementoContadorCalculado = operacionesJornada.reduce((total, venta) => {
      const incrementoDirecto = Number(venta.incrementoContador || 0);
      if (incrementoDirecto > 0) return total + incrementoDirecto;
      const litrosVenta = Number(venta.litrosVendidos || 0);
      return total + (incrementoEscalaJornada > 0 ? litrosVenta / litrosEscalaJornada * incrementoEscalaJornada : 0);
    }, 0);
    const resumenTarifas = Object.values(operacionesJornada.reduce((mapa, venta) => {
      const snapshot = venta.tarifaSnapshot || { id: venta.tarifaId || 'tarifa-base-historica', nombre: venta.tarifaNombre || venta.unidadComercial || 'Tarifa base', unidadComercial: venta.unidadComercial || jornadaAbierta.unidadComercial || 'Unidad', litrosPorUnidad: Number(venta.litrosPorUnidad || litrosEscalaJornada), incrementoContadorPorUnidad: Number(venta.incrementoContadorPorUnidad || incrementoEscalaJornada), precioUnitario: Number(venta.precioUnitario || 0) };
      const clave = String(snapshot.id || venta.tarifaId || snapshot.nombre);
      const unidades = Number(venta.garrafones || (venta.items || []).reduce((suma, item) => suma + Number(item.cant || 0), 0));
      const litros = Number(venta.litrosVendidos || unidades * Number(snapshot.litrosPorUnidad || 0));
      const subtotal = Number(venta.total || venta.importe || 0);
      const registro = mapa[clave] || { tarifaId: snapshot.id || clave, tarifaNombre: snapshot.nombre || 'Tarifa', unidadComercial: snapshot.unidadComercial || '', litrosPorUnidad: Number(snapshot.litrosPorUnidad || 0), incrementoContadorPorUnidad: Number(snapshot.incrementoContadorPorUnidad || 0), precioUnitario: Number(snapshot.precioUnitario || 0), unidades: 0, litros: 0, subtotal: 0, efectivo: 0, credito: 0, facturado: 0 };
      registro.unidades += unidades;
      registro.litros += litros;
      registro.subtotal += subtotal;
      if (String(venta.formaPago || '').toLowerCase() === 'credito') registro.credito += subtotal;
      else if (String(venta.formaPago || '').toLowerCase() === 'facturado') registro.facturado += subtotal;
      else registro.efectivo += subtotal;
      mapa[clave] = registro;
      return mapa;
    }, {}));
    const lecturaCalculadaFinal = inicial + incrementoContadorCalculado;
    const diferenciaContador = final - lecturaCalculadaFinal;
    const litrosCalculadosPorVentas = incrementoEscalaJornada > 0 ? (incrementoContadorCalculado / incrementoEscalaJornada) * litrosEscalaJornada : 0;
    const diferenciaLitrosFisicaContraCalculada = incrementoEscalaJornada > 0 ? (diferenciaContador / incrementoEscalaJornada) * litrosEscalaJornada : 0;
    const otrasSalidasLitros = Number(jornadaAbierta.otrasSalidasLitros || 0);
    const diferenciaLitros = diferenciaLitrosFisicaContraCalculada - otrasSalidasLitros;
    const tipoDiferencia = Math.abs(diferenciaLitros) < 1e-9 ? 'sin_diferencia' : 'diferencia_merma_revision';
    try {
      const fechaCierre = new Date().toISOString();
      const jornadaRef = db.collection('jornadas').doc(jornadaAbierta.id);
      const lecturaFinalRef = db.collection('lecturas_medidor').doc(`${jornadaAbierta.id}-final`);
      const escribirCierre = tx => {
        tx.update(jornadaRef, {
          estado: 'cerrada', lecturaActual: final, lecturaFinal: final, lecturaCalculadaFinal, incrementoContadorMedido, incrementoContadorCalculado, diferenciaContador, litrosMedidos, litrosCalculadosPorVentas, ventasRegistradas: operacionesJornada.length, serviciosMedidos: serviciosJornada.length,
          litrosVendidos, resumenTarifas, diferenciaLitros, diferenciaLitrosFisicaContraCalculada, tipoDiferencia, aguaDisponibleLitros: Math.max(0, Number(jornadaAbierta.aguaDisponibleLitros || 0)), diferenciaGarrafones: Number(jornadaAbierta.litrosPorUnidad || FACTOR_LITROS_POR_GARRAFON) ? diferenciaLitros / Number(jornadaAbierta.litrosPorUnidad || FACTOR_LITROS_POR_GARRAFON) : null,
          fechaCierre, usuarioCierreUid: currentUser.uid, usuarioCierreNombre: currentUser.nombre || '', explicacionDiferencia: ''
        });
        tx.set(lecturaFinalRef, {
          jornadaId: jornadaAbierta.id, tipo: 'final', lecturaFisica: true, valor: final, lecturaCalculadaFinal, fechaHora: fechaCierre,
          usuarioUid: currentUser.uid, usuarioNombre: currentUser.nombre || '', localidadId: jornadaAbierta.localidadId || '', localidadNombre: jornadaAbierta.localidadNombre || jornadaAbierta.localidad || '', vehiculo: jornadaAbierta.vehiculo || '', vehiculoId: jornadaAbierta.vehiculoId || jornadaAbierta.vehiculo || '', vehiculoNombre: jornadaAbierta.vehiculoNombre || jornadaAbierta.vehiculo || '',
          medidorId: jornadaAbierta.medidorId || '', medidorNombre: jornadaAbierta.medidorNombre || '', medidorDigitos: jornadaAbierta.medidorDigitos ?? null, medidorLitrosPorIncremento: jornadaAbierta.medidorLitrosPorIncremento ?? null, operacion: 'cierre_jornada'
        });
      };
      if (typeof navigator !== 'undefined' && navigator.onLine) await db.runTransaction(async tx => escribirCierre(tx));
      else { const batch = db.batch(); escribirCierre(batch); await batch.commit(); }
      setLecturaFinal('');
      flash(`Jornada cerrada. Físico: ${litrosMedidos.toFixed(2)} L · Calculado por ventas: ${litrosCalculadosPorVentas.toFixed(2)} L · Diferencia: ${diferenciaLitros.toFixed(2)} L`);
    } catch (e) { flash('No se pudo cerrar la jornada: ' + e.message); }
  };
  if (currentUser.role === 'admin') return React.createElement('div', { className: 'fx-page-jornada-admin', style: { padding: '16px 12px' } }, React.createElement('div', { style: { fontSize: 21, fontWeight: 800, marginBottom: 4 } }, 'Conciliación de jornadas'), React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 12, lineHeight: 1.45, marginBottom: 14 } }, 'Consulta lecturas, litros medidos, ventas registradas y diferencias pendientes de explicación.'), (jornadas || []).filter(j => j.estado === 'cerrada').map(j => React.createElement('div', { key: j.id, style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 13, marginBottom: 9 } }, React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } }, React.createElement('strong', null, j.localidadNombre || j.localidad || 'Sin localidad'), React.createElement('span', { style: { color: Number(j.diferenciaLitros || 0) === 0 ? 'var(--ok-text)' : 'var(--danger-text)', fontWeight: 800, fontSize: 12 } }, Number(j.diferenciaLitros || 0).toFixed(2), ' L diferencia')), React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 11, marginTop: 5 } }, j.repartidorNombre || 'Sin repartidor', ' · ', j.vehiculo || 'Sin vehículo', ' · Medidor ', j.medidorId || '—'), React.createElement('div', { style: { fontSize: 12, marginTop: 8 } }, 'Inicial ', j.lecturaInicial, ' → Final físico ', j.lecturaFinal, ' · Calculada ', Number(j.lecturaCalculadaFinal ?? j.lecturaActual ?? 0).toFixed(2), ' · Diferencia física ', Number(j.diferenciaContador || 0).toFixed(2), ' contador · Físico ', Number(j.litrosMedidos || 0).toFixed(2), ' L · Ventas calculadas ', Number(j.litrosCalculadosPorVentas ?? j.litrosVendidos ?? 0).toFixed(2), ' L · Otras salidas ', Number(j.otrasSalidasLitros || 0).toFixed(2), ' L'), j.resumenTarifas?.length > 0 && React.createElement('div', { style: { marginTop: 9, padding: 9, background: 'var(--surface-2)', borderRadius: 8 } }, React.createElement('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--ink-faint)', letterSpacing: '.06em', marginBottom: 5 } }, 'VENTAS POR TARIFA'), j.resumenTarifas.map((t, i) => React.createElement('div', { key: t.tarifaId || i, style: { borderTop: i ? '1px solid var(--line)' : 'none', padding: '6px 0', fontSize: 11 } }, React.createElement('strong', null, t.tarifaNombre || 'Tarifa'), ' · ', Number(t.unidades || 0).toFixed(2), ' unidades · ', Number(t.litros || 0).toFixed(2), ' L · $', Number(t.precioUnitario || 0).toFixed(2), ' · Subtotal $', Number(t.subtotal || 0).toFixed(2), ' · Efectivo $', Number(t.efectivo || 0).toFixed(2), ' · Crédito $', Number(t.credito || 0).toFixed(2)))), React.createElement('input', { type: 'number', min: 0, step: 0.01, defaultValue: j.otrasSalidasLitros || 0, placeholder: 'Otras salidas autorizadas (L)', onBlur: e => actualizarOtrasSalidas(j, e.target.value), style: { width: '100%', marginTop: 8, padding: 8, boxSizing: 'border-box', borderRadius: 7, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 11 } }), React.createElement('input', { defaultValue: j.explicacionDiferencia || '', placeholder: 'Explicación de diferencia', onBlur: e => db.collection('jornadas').doc(j.id).update({ explicacionDiferencia: e.target.value.trim(), explicadoPorUid: currentUser.uid, explicadoEn: new Date().toISOString() }), style: { width: '100%', marginTop: 8, padding: 8, boxSizing: 'border-box', borderRadius: 7, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 11 } }))), (jornadas || []).filter(j => j.estado === 'cerrada').length === 0 && React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12 } }, 'No hay jornadas cerradas para conciliar todavía.'));
  return React.createElement('div', { className: 'fx-page-jornada', style: { padding: '16px 12px' } },
    React.createElement('div', { style: { fontSize: 21, fontWeight: 800, marginBottom: 4 } }, 'Jornada y medidor'),
    React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 12, lineHeight: 1.45, marginBottom: 14 } }, 'La lectura anterior es solo lectura. El repartidor captura cantidad comercial por cliente; el sistema calcula la lectura acumulada. Solo se capturan físicamente las lecturas inicial y final, y el cierre compara el final físico contra el cálculo de ventas.'),
    mensaje && React.createElement('div', { style: { background: 'var(--ok-bg)', color: 'var(--ok-text)', borderRadius: 9, padding: 10, fontSize: 12, fontWeight: 700, marginBottom: 12 } }, mensaje),
    jornadaAbierta ? React.createElement('div', { style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 14 } },
      React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', fontWeight: 800 } }, 'JORNADA ABIERTA'),
      React.createElement('div', { style: { fontSize: 18, fontWeight: 800, margin: '5px 0' } }, jornadaAbierta.localidadNombre || jornadaAbierta.localidad || 'Localidad'),
      React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 12, marginBottom: 5 } }, 'Vehículo: ', jornadaAbierta.vehiculoNombre || jornadaAbierta.vehiculo || jornadaAbierta.vehiculoId || '—', ' · Medidor: ', jornadaAbierta.medidorNombre || jornadaAbierta.medidorId || '—'),
      React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 12, marginBottom: 12 } }, 'Escala: 1 ', jornadaAbierta.unidadComercial || unidadComercial, ' = ', Number(jornadaAbierta.litrosPorUnidad || litrosPorUnidad).toFixed(2), ' L y +', Number(jornadaAbierta.incrementoContadorPorUnidad || incrementoContadorPorUnidad).toFixed(4), ' contador físico'),
      React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 12, marginBottom: 8 } }, 'Lectura anterior: ', jornadaAbierta.lecturaAnterior ?? 'Sin registro', ' · Inicial: ', jornadaAbierta.lecturaInicial),
      React.createElement('div', { style: { background: 'var(--surface-2)', borderRadius: 9, padding: 10, marginBottom: 10 } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800 } },
          React.createElement('span', null, 'AGUA DISPONIBLE'),
          React.createElement('span', { style: { color: porcentajeAguaJornada <= 15 ? 'var(--danger-text)' : 'var(--ok-text)' } }, aguaDisponibleJornada.toFixed(2), ' L')
        ),
        React.createElement('div', { style: { height: 8, background: 'var(--line)', borderRadius: 8, overflow: 'hidden', marginTop: 7 } },
          React.createElement('div', { style: { width: `${porcentajeAguaJornada}%`, height: '100%', background: porcentajeAguaJornada <= 15 ? 'var(--danger-text)' : 'var(--accent)' } })
        ),
        React.createElement('div', { style: { fontSize: 10, color: 'var(--ink-soft)', marginTop: 5 } }, 'Capacidad: ', capacidadTanqueLitros.toFixed(2), ' L · Cargado en el día: ', Number(jornadaAbierta.aguaCargadaLitros || 0).toFixed(2), ' L · Recargas: ', litrosRecargadosJornada.toFixed(2), ' L · Lectura calculada: ', Number(jornadaAbierta.lecturaCalculadaActual ?? jornadaAbierta.lecturaActual ?? jornadaAbierta.lecturaInicial).toFixed(2), ' contador')
      ),
      currentUser.role === 'repartidor' && React.createElement('div', { className: 'fx-recharge-panel', style: { background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 9, padding: 10, marginBottom: 10 } },
        React.createElement('div', { style: { fontSize: 11, fontWeight: 800, marginBottom: 4 } }, 'RECARGA ADICIONAL'),
        React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 10, lineHeight: 1.4, marginBottom: 7 } }, 'Aumenta el agua disponible del mismo vehículo y jornada. No modifica el medidor físico ni la lectura lógica.'),
        React.createElement('div', { className: 'fx-recharge-controls', style: { display: 'flex', gap: 8, alignItems: 'stretch' } },
          React.createElement('input', { value: recargaLitros, onChange: e => setRecargaLitros(e.target.value), inputMode: 'decimal', type: 'number', min: 0.01, step: 0.01, placeholder: 'Litros a agregar', 'aria-label': 'Litros de recarga adicional', style: { flex: 1, minWidth: 0, padding: 10, boxSizing: 'border-box', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }),
          React.createElement('button', { onClick: recargar, disabled: recargando, style: { flex: '0 0 auto', border: 0, borderRadius: 8, padding: '10px 13px', background: 'var(--accent)', color: 'var(--ink)', fontWeight: 800, cursor: recargando ? 'wait' : 'pointer' } }, recargando ? 'Guardando…' : 'Agregar litros'))
      ),
      React.createElement('input', { value: lecturaFinal, onChange: e => setLecturaFinal(e.target.value), inputMode: 'decimal', placeholder: 'Lectura final del medidor', style: { width: '100%', padding: 12, boxSizing: 'border-box', borderRadius: 9, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', marginBottom: 10 } }),
      React.createElement('button', { onClick: cerrar, style: { width: '100%', padding: 14, border: 0, borderRadius: 9, background: 'var(--accent)', color: 'var(--ink)', fontWeight: 800 } }, 'Cerrar jornada y conciliar'),
      React.createElement('div', { style: { marginTop: 18, fontSize: 12, fontWeight: 800 } }, 'CLIENTES ASIGNADOS'),
      clientesJornada.length ? clientesJornada.map(c => React.createElement('div', { key: c.id, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--line)' } }, React.createElement('div', null, React.createElement('strong', { style: { fontSize: 13 } }, c.nombre || 'Cliente'), React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 11 } }, c.localidadNombre || c.localidad || 'Localidad asignada'), React.createElement('div', { style: { color: c.metodoServicio === 'relleno_por_medicion' ? 'var(--info-text)' : 'var(--ink-faint)', fontSize: 10, fontWeight: 800, marginTop: 3 } }, c.metodoServicio === 'relleno_por_medicion' ? 'Medido por medidor · Nota y firma' : 'Doméstica')), clientesAtendidos.has(c.id) ? React.createElement('span', { style: { color: 'var(--ok-text)', fontWeight: 800, fontSize: 11 } }, '✓ Atendido') : React.createElement('button', { onClick: () => onIrA && onIrA('ruta'), style: { border: 0, borderRadius: 8, padding: '9px 12px', background: 'var(--accent)', color: 'var(--ink)', fontWeight: 800, fontSize: 11 } }, 'Vender'))) : React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12, padding: '10px 0' } }, 'No hay clientes asignados a esta localidad.')
    ) : React.createElement('div', { style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 14 } },
      React.createElement('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 10 } }, 'INICIAR JORNADA'),
      React.createElement('select', { value: form.localidadId, onChange: e => seleccionarLocalidad(e.target.value), style: { width: '100%', padding: 11, marginBottom: 9, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }, React.createElement('option', { value: '' }, 'Selecciona localidad'), localidadesDisponibles.map(localidad => React.createElement('option', { key: localidad.id, value: localidad.id }, localidad.nombre))),
      React.createElement('div', { style: { background: 'var(--surface-2)', padding: 9, borderRadius: 8, fontSize: 11, marginBottom: 9 } }, 'Última lectura registrada: ', lecturaAnterior === null ? 'Sin registro' : lecturaAnterior, ' (solo lectura)'),
      React.createElement('div', { style: { background: 'var(--surface-2)', padding: 9, borderRadius: 8, fontSize: 12, marginBottom: 9 } }, 'Localidad asignada: ', form.localidadNombre || localidadActual?.nombre || 'Selecciona una localidad', ' · ID: ', form.localidadId || 'pendiente'),
      React.createElement('div', { style: { background: 'var(--surface-2)', padding: 9, borderRadius: 8, fontSize: 12, marginBottom: 9 } }, 'Vehículo asignado: ', form.vehiculoNombre || form.vehiculo || 'Selecciona una localidad', ' · ID: ', form.vehiculoId || 'pendiente'),
      React.createElement('div', { style: { background: 'var(--surface-2)', padding: 9, borderRadius: 8, fontSize: 12, marginBottom: 9 } }, 'Medidor asociado: ', form.medidorNombre || form.medidorId || 'Selecciona una localidad', ' · ID: ', form.medidorId || 'pendiente'),
      React.createElement('div', { style: { background: 'var(--info-bg)', padding: 9, borderRadius: 8, fontSize: 11, marginBottom: 9, color: 'var(--info-text)' } }, 'Escala física: ', medidorActual.digitos, ' dígitos · el sexto dígito incrementa cada ', medidorActual.litrosPorIncremento, ' L'),
      React.createElement('input', { value: form.lecturaInicial, onChange: e => setForm(f => ({ ...f, lecturaInicial: e.target.value })), inputMode: 'decimal', placeholder: 'Lectura inicial física del medidor', style: { width: '100%', padding: 11, boxSizing: 'border-box', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', marginBottom: 10 } }),
      React.createElement('input', { value: form.aguaCargadaLitros, onChange: e => setForm(f => ({ ...f, aguaCargadaLitros: e.target.value })), inputMode: 'decimal', type: 'number', min: 0.01, step: 0.01, placeholder: 'Litros cargados en el vehículo (máximo 5,000 L)', max: CAPACIDAD_TANQUE_LITROS, style: { width: '100%', padding: 11, boxSizing: 'border-box', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', marginBottom: 10 } }),
      React.createElement('button', { onClick: iniciar, style: { width: '100%', padding: 14, border: 0, borderRadius: 9, background: 'var(--accent)', color: 'var(--ink)', fontWeight: 800 } }, 'Iniciar jornada')
    )
  );
}
