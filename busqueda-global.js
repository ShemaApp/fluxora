/* busqueda-global.js — búsqueda automática transversal con alcance por rol. */

const normalizarBusquedaGlobal = valor => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const primerValorBusqueda = (...valores) => valores.find(valor => valor !== undefined && valor !== null && String(valor).trim() !== '') || '';

const etiquetaOperacionBusqueda = tipo => ({
  inicio_jornada: 'Inicio de jornada',
  carga_inicial: 'Carga inicial',
  recarga_agua: 'Recarga de agua',
  venta_agua_medidor: 'Venta de agua',
  cierre_jornada: 'Cierre de jornada'
}[tipo] || 'Operación local');

const estadoOperacionBusqueda = registro => {
  if (registro?.syncStatus === 'blocked' || registro?.estado === 'bloqueada' || registro?.estado === 'conflicto') return 'Bloqueada para revisión';
  if (registro?.syncStatus === 'error' || registro?.estado === 'error') return 'Con error';
  if (registro?.syncStatus === 'synced' || registro?.estado === 'confirmada') return 'Confirmada';
  return 'Pendiente de sincronización';
};

const perteneceAlUsuarioBusqueda = (registro, uid) => {
  if (!uid) return false;
  return [registro?.actorUid, registro?.repartidorUid, registro?.repartidorId, registro?.usuarioUid, registro?.ownerUid]
    .some(valor => String(valor || '') === String(uid));
};

function construirResultadosBusqueda({
  currentUser = {},
  clientes = [],
  localidades = [],
  productos = [],
  creditos = [],
  jornadas = [],
  cargasAgua = [],
  vehiculos = [],
  medidores = [],
  tarifas = [],
  servicios = [],
  comprobantes = [],
  notas = [],
  offlineVentaResumen = {}
} = {}) {
  const esAdmin = currentUser?.role === 'admin';
  const uidActual = currentUser?.uid || '';
  const localidadPorId = new Map((localidades || []).map(localidad => [String(localidad.id || ''), localidad]));
  const localidadIdsAsignadas = new Set((localidades || [])
    .filter(localidad => esAdmin || localidad.activo !== false && (
      String(localidad.repartidorId || '') === String(uidActual) ||
      (Array.isArray(localidad.repartidorIds) && localidad.repartidorIds.map(String).includes(String(uidActual)))
    ))
    .map(localidad => String(localidad.id || ''))
    .filter(Boolean));
  const clientesVisibles = (clientes || []).filter(cliente => esAdmin || (
    cliente.activo !== false && localidadIdsAsignadas.has(String(cliente.localidadId || ''))
  ));
  const clienteIdsVisibles = new Set(clientesVisibles.map(cliente => String(cliente.id || '')).filter(Boolean));

  const jornadasPropias = (jornadas || []).filter(jornada => esAdmin || String(jornada.repartidorId || jornada.usuarioUid || '') === String(uidActual));
  const jornadaIdsPropias = new Set(jornadasPropias.map(jornada => String(jornada.id || '')).filter(Boolean));
  const vehiculoIdsPropios = new Set([
    ...(Array.isArray(currentUser?.vehiculoIds) ? currentUser.vehiculoIds : []),
    currentUser?.vehiculoId,
    ...jornadasPropias.map(jornada => jornada.vehiculoId)
  ].map(String).filter(valor => valor && valor !== 'undefined'));
  const vehiculosVisibles = (vehiculos || []).filter(vehiculo => esAdmin || (
    vehiculo.repartidorId && String(vehiculo.repartidorId) === String(uidActual) || vehiculoIdsPropios.has(String(vehiculo.id || ''))
  ));
  const medidorIdsPropios = new Set([
    ...vehiculosVisibles.map(vehiculo => vehiculo.medidorId),
    ...jornadasPropias.map(jornada => jornada.medidorId),
    ...(cargasAgua || []).filter(carga => esAdmin || String(carga.repartidorId || carga.repartidorUid || '') === String(uidActual)).map(carga => carga.medidorId)
  ].map(String).filter(valor => valor && valor !== 'undefined'));
  const medidoresVisibles = (medidores || []).filter(medidor => esAdmin || (
    medidor.repartidorId && String(medidor.repartidorId) === String(uidActual) || medidorIdsPropios.has(String(medidor.id || ''))
  ));
  const cargasVisibles = (cargasAgua || []).filter(carga => esAdmin || String(carga.repartidorId || carga.repartidorUid || '') === String(uidActual));
  const creditosVisibles = (creditos || []).filter(credito => esAdmin || clienteIdsVisibles.has(String(credito.clienteId || '')));
  const resultados = [];
  const agregar = (tipo, registro, tab, titulo, detalle, valores = []) => {
    const id = String(registro?.id || registro?.idLocal || `${tipo}-${resultados.length}`);
    resultados.push({
      key: `${tipo}:${id}`,
      tipo,
      registro,
      tab,
      titulo: String(titulo || tipo),
      detalle: String(detalle || ''),
      valores: valores.filter(valor => valor !== undefined && valor !== null).map(String)
    });
  };

  clientesVisibles.forEach(cliente => {
    const localidad = localidadPorId.get(String(cliente.localidadId || ''));
    agregar('Cliente', cliente, esAdmin ? 'clientes' : 'ruta', primerValorBusqueda(cliente.nombre, cliente.nombreCompleto, 'Cliente'),
      primerValorBusqueda(localidad?.nombre, cliente.direccion, cliente.tipo, cliente.estado, cliente.metodoServicio, 'Cliente operativo'),
      [cliente.nombre, cliente.nombreCompleto, cliente.telefono, cliente.direccion, cliente.tipo, cliente.estado, cliente.metodoServicio, localidad?.nombre]);
  });
  (localidades || []).filter(localidad => esAdmin || localidadIdsAsignadas.has(String(localidad.id || ''))).forEach(localidad => {
    agregar('Localidad', localidad, esAdmin ? 'jerarquia' : 'ruta', primerValorBusqueda(localidad.nombre, 'Localidad'),
      esAdmin ? 'Catálogo de localidades' : 'Localidad asignada', [localidad.nombre, localidad.codigo, localidad.descripcion]);
  });
  vehiculosVisibles.forEach(vehiculo => {
    const medidor = (medidores || []).find(item => String(item.id || '') === String(vehiculo.medidorId || ''));
    agregar('Vehículo', vehiculo, esAdmin ? 'repartidores' : 'jornada', primerValorBusqueda(vehiculo.nombre, vehiculo.codigo, 'Vehículo'),
      `Medidor: ${primerValorBusqueda(medidor?.nombre, medidor?.codigo, 'Sin medidor')}`, [vehiculo.nombre, vehiculo.codigo, vehiculo.placa, vehiculo.tipo, medidor?.nombre, medidor?.codigo]);
  });
  medidoresVisibles.forEach(medidor => {
    agregar('Medidor', medidor, esAdmin ? 'repartidores' : 'jornada', primerValorBusqueda(medidor.nombre, medidor.codigo, 'Medidor'),
      `${medidor.unidadMostrada || 'Unidad de contador'} · ${medidor.litrosPorIncremento || 10} L por incremento`, [medidor.nombre, medidor.codigo, medidor.tipo, medidor.unidadMostrada]);
  });
  jornadasPropias.forEach(jornada => {
    const fecha = jornada.fechaInicio || jornada.createdAt || jornada.creadoEn;
    const vehiculo = (vehiculos || []).find(item => String(item.id || '') === String(jornada.vehiculoId || ''));
    agregar('Jornada', jornada, 'jornada', 'Jornada ' + (fecha ? new Date(fecha).toLocaleDateString('es-MX') : 'operativa'),
      `${jornada.estado || jornada.status || 'Sin estado'} · ${primerValorBusqueda(vehiculo?.nombre, jornada.vehiculoNombre, 'Sin vehículo')}`,
      [jornada.estado, jornada.status, jornada.fechaInicio, jornada.fechaFin, jornada.vehiculoId, jornada.vehiculoNombre, jornada.medidorId, jornada.localidadId]);
  });
  cargasVisibles.forEach(carga => {
    const tipo = carga.tipo === 'inicial' || carga.tipo === 'carga_inicial' ? 'Carga inicial' : 'Recarga de agua';
    agregar('Carga', carga, 'jornada', tipo,
      `${Number(carga.litros || 0).toFixed(2)} L · ${carga.estado || 'Operación de jornada'}`,
      [carga.tipo, carga.litros, carga.jornadaId, carga.vehiculoId, carga.vehiculoNombre, carga.medidorId, carga.localidadId]);
  });

  if (esAdmin) {
    (productos || []).forEach(producto => agregar('Producto', producto, 'productos', primerValorBusqueda(producto.nombre, 'Producto'),
      primerValorBusqueda(producto.codigoBarras, producto.unidad, producto.activo === false ? 'Inactivo' : 'Activo'),
      [producto.nombre, producto.codigoBarras, producto.unidad, producto.tipo, producto.estado]));
    (tarifas || []).forEach(tarifa => agregar('Tarifa', tarifa, 'config', primerValorBusqueda(tarifa.nombre, 'Tarifa'),
      `${tarifa.unidadComercial || 'Unidad'} · $${Number(tarifa.precioUnitario ?? tarifa.precioPorUnidad ?? 0).toFixed(2)}`,
      [tarifa.nombre, tarifa.unidadComercial, tarifa.precioUnitario, tarifa.litrosPorUnidad, tarifa.incrementoContadorPorUnidad]));
    creditosVisibles.forEach(credito => {
      const cliente = clientesVisibles.find(item => String(item.id || '') === String(credito.clienteId || ''));
      agregar('Crédito', credito, 'creditos', primerValorBusqueda(cliente?.nombre, 'Crédito'),
        `Saldo ${Number(credito.saldo ?? credito.saldoActual ?? 0).toFixed(2)}`, [cliente?.nombre, credito.clienteId, credito.estado, credito.saldo, credito.saldoActual]);
    });
    (servicios || []).forEach(servicio => agregar('Servicio', servicio, 'reportes', primerValorBusqueda(servicio.clienteNombre, servicio.nombre, 'Servicio'),
      primerValorBusqueda(servicio.tipo, servicio.estado, servicio.createdAt, 'Registro de servicio'),
      [servicio.clienteNombre, servicio.clienteId, servicio.tipo, servicio.estado, servicio.localidadId]));
    (comprobantes || []).forEach(comprobante => agregar('Comprobante', comprobante, 'reportes', primerValorBusqueda(comprobante.clienteNombre, comprobante.folio, 'Comprobante'),
      primerValorBusqueda(comprobante.estado, comprobante.createdAt, 'Documento'), [comprobante.clienteNombre, comprobante.folio, comprobante.clienteId, comprobante.estado]));
    (notas || []).forEach(nota => agregar('Nota', nota, 'reportes', primerValorBusqueda(nota.clienteNombre, nota.titulo, 'Nota'),
      primerValorBusqueda(nota.estado, nota.fecha, 'Documento operativo'), [nota.clienteNombre, nota.clienteId, nota.titulo, nota.estado, nota.fecha]));
  }

  if (!esAdmin) {
    const operacionesLocales = [
      ...(offlineVentaResumen?.operaciones || []),
      ...(offlineVentaResumen?.ventas || []),
      ...(offlineVentaResumen?.registros || [])
    ].filter((registro, indice, lista) => {
      const id = String(registro?.id || registro?.idLocal || indice);
      return perteneceAlUsuarioBusqueda(registro, uidActual) && lista.findIndex(item => String(item?.id || item?.idLocal || '') === id) === indice;
    });
    operacionesLocales.forEach(operacion => {
      agregar('Operación local', operacion, 'sincronizacion', etiquetaOperacionBusqueda(operacion.tipoOperacion || operacion.operationType || operacion.tipo),
        `${estadoOperacionBusqueda(operacion)} · ${primerValorBusqueda(operacion.localidadNombre, operacion.vehiculoNombre, 'Trabajo de ruta')}`,
        [operacion.idLocal, operacion.tipoOperacion, operacion.operationType, operacion.jornadaId, operacion.vehiculoId, operacion.medidorId, operacion.localidadId, operacion.localidadNombre, operacion.clienteNombre, operacion.syncStatus, operacion.estado]);
    });
  }
  return resultados;
}

function BusquedaGlobal({ currentUser = {}, onIrA, ...datos }) {
  const [termino, setTermino] = useState('');
  const [abierta, setAbierta] = useState(false);
  const contenedorRef = useRef(null);
  const resultados = React.useMemo(() => {
    const consulta = normalizarBusquedaGlobal(termino);
    if (consulta.length < 2) return [];
    return construirResultadosBusqueda({ currentUser, ...datos })
      .filter(resultado => normalizarBusquedaGlobal([resultado.titulo, resultado.detalle, ...resultado.valores].join(' ')).includes(consulta))
      .slice(0, 20);
  }, [termino, currentUser, datos.clientes, datos.localidades, datos.productos, datos.creditos, datos.jornadas, datos.cargasAgua, datos.vehiculos, datos.medidores, datos.tarifas, datos.servicios, datos.comprobantes, datos.notas, datos.offlineVentaResumen]);

  useEffect(() => {
    const cerrar = evento => {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target)) setAbierta(false);
    };
    const tecla = evento => {
      if (evento.key === 'Escape') setAbierta(false);
    };
    document.addEventListener('mousedown', cerrar);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', cerrar);
      document.removeEventListener('keydown', tecla);
    };
  }, []);

  const abrirResultado = resultado => {
    setAbierta(false);
    setTermino('');
    if (typeof onIrA === 'function') onIrA(resultado.tab);
  };
  const consultaActiva = termino.trim().length >= 2;
  return React.createElement('div', { ref: contenedorRef, className: 'app-global-search', role: 'search', style: { position: 'relative', flex: '1 1 280px', maxWidth: 620, minWidth: 90, margin: '0 18px' } },
    React.createElement('div', { className: 'app-global-search-control', style: { display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.22)', borderRadius: 6, padding: '0 11px', boxSizing: 'border-box' } },
      React.createElement('span', { 'aria-hidden': 'true', style: { color: 'var(--accent)', fontSize: 18, lineHeight: 1 } }, '⌕'),
      React.createElement('input', { value: termino, onChange: evento => { setTermino(evento.target.value); setAbierta(true); }, onFocus: () => { if (consultaActiva) setAbierta(true); }, placeholder: 'Buscar en Fluxora…', 'aria-label': 'Buscar en Fluxora', autoComplete: 'off', style: { width: '100%', minWidth: 0, border: 0, outline: 0, background: 'transparent', color: 'var(--rail-ink)', fontSize: 12 } }),
      consultaActiva && React.createElement('button', { type: 'button', onClick: () => { setTermino(''); setAbierta(false); }, 'aria-label': 'Limpiar búsqueda', style: { border: 0, background: 'transparent', color: 'var(--rail-ink-faint)', cursor: 'pointer', fontSize: 15, padding: 2 } }, '×')
    ),
    abierta && consultaActiva && React.createElement('div', { className: 'app-global-search-results', style: { position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, maxHeight: 420, overflowY: 'auto', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 8, boxShadow: '0 18px 38px rgba(15,23,42,.22)', zIndex: 260 } },
      resultados.length ? resultados.map(resultado => React.createElement('button', { type: 'button', key: resultado.key, onClick: () => abrirResultado(resultado), style: { display: 'block', width: '100%', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', color: 'var(--ink)', textAlign: 'left', padding: '11px 13px', cursor: 'pointer' } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' } }, React.createElement('strong', { style: { fontSize: 12 } }, resultado.titulo), React.createElement('span', { style: { fontSize: 10, color: 'var(--accent-text)' } }, resultado.tipo)),
        React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 } }, resultado.detalle)
      )) : React.createElement('div', { style: { padding: 14, color: 'var(--ink-soft)', fontSize: 12 } }, 'No hay resultados dentro de tu alcance autorizado.')
    )
  );
}

window.BusquedaGlobal = BusquedaGlobal;
window.construirResultadosBusqueda = construirResultadosBusqueda;
