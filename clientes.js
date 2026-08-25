const LOCALIDAD_SIN_CLASIFICAR = '__sin_localidad__';
const normalizarLocalidad = valor => String(valor || '').trim().replace(/\s+/g, ' ');
const claveLocalidad = valor => normalizarLocalidad(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const METODO_VENTA_CANTIDAD = 'venta_por_cantidad';
const METODO_RELLENO_MEDIDO = 'relleno_por_medicion';
const etiquetaMetodoServicio = valor => valor === METODO_RELLENO_MEDIDO ? 'Medido por medidor' : 'Doméstica';

function FichaRapidaCliente({ cliente, saldo = 0, historial = [], tarifa = null, puedeEditar = false, onEditar, onHistorial }) {
  const moneda = valor => '$' + Number(valor || 0).toFixed(2);
  return React.createElement('div', { className: 'fx-client-detail', style: { display: 'grid', gap: 12 } },
    React.createElement('div', { className: 'fx-client-detail-status', style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
      React.createElement(Tag, { color: cliente.activo === false ? 'var(--ink-soft)' : 'var(--ok-text)' }, cliente.activo === false ? 'Inactivo' : 'Activo'),
      React.createElement(Tag, { color: saldo > 0 ? 'var(--warn-text)' : 'var(--ink-soft)' }, saldo > 0 ? 'Crédito ' + moneda(saldo) : 'Sin crédito')),
    React.createElement('div', { className: 'fx-client-detail-localidad', style: { background: 'var(--surface-2)', borderRadius: 8, padding: 10 } },
      React.createElement('div', { style: { fontSize: 10, color: 'var(--ink-faint)', fontWeight: 800 } }, 'LOCALIDAD ASIGNADA'),
      React.createElement('div', { style: { fontWeight: 800, marginTop: 4 } }, cliente.localidadNombre || cliente.localidad || 'Sin localidad')),
    React.createElement('div', { className: 'fx-client-detail-service', style: { background: 'var(--surface-2)', borderRadius: 8, padding: 10 } },
      React.createElement('div', { style: { fontSize: 10, color: 'var(--ink-faint)', fontWeight: 800 } }, 'MÉTODO DE SERVICIO'),
      React.createElement('div', { style: { fontWeight: 800, marginTop: 4 } }, etiquetaMetodoServicio(cliente.metodoServicio)),
      tarifa && React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 11, marginTop: 3 } }, 'Tarifa: ', tarifa.nombre || 'Tarifa existente')),
    React.createElement('div', { className: 'fx-client-detail-actions', style: { display: 'flex', gap: 8 } },
      historial.length ? React.createElement(BOut, { onClick: onHistorial, style: { flex: 1 } }, 'Historial de operaciones') : null,
      puedeEditar ? React.createElement(BFill, { onClick: onEditar, style: { flex: 1 } }, 'Editar cliente') : null)
  );
}

function FiltroClientes({ titulo, opciones, valor, onChange, contar }) {
  return React.createElement('label', { className: 'fx-client-filter' },
    React.createElement('span', { className: 'fx-client-filter-label' }, titulo),
    React.createElement('span', { className: 'fx-client-filter-control' },
      React.createElement('select', {
        value: valor,
        onChange: e => onChange(e.target.value),
        'aria-label': titulo,
        className: 'fx-client-filter-select'
      }, opciones.map(opcion => React.createElement('option', { key: opcion.valor, value: opcion.valor }, opcion.texto + ' (' + contar(opcion.valor) + ')'))),
      React.createElement('span', { className: 'fx-client-filter-chevron', 'aria-hidden': 'true' }, '⌄'))
  );
}

function Clientes({ clientes = [], notas = [], creditos = [], localidades: localidadesCatalogo = [], tarifas = [], servicios = [], comprobantes = [], currentUser = {} }) {
  const puedeEditar = currentUser.role === 'admin' || permisoEdita(currentUser).clientes;
  const puedeCrear = currentUser.role === 'admin';
  const localidadesAsignadas = (localidadesCatalogo || []).filter(localidad => localidad.activo !== false && String(localidad.repartidorId || '').trim());
  const localidadesPermitidas = currentUser.role === 'repartidor' ? obtenerLocalidadesAsignadas({ localidades: localidadesAsignadas, currentUser, localidadIds: currentUser.localidadIds }) : localidadesAsignadas;
  const localidadesForm = currentUser.role === 'repartidor' ? localidadesPermitidas : localidadesAsignadas;
  const idsAlcance = new Set(localidadesPermitidas.map(localidad => localidad.id));
  const [filtroEstado, setFiltroEstado] = useState('activos');
  const [filtroCredito, setFiltroCredito] = useState('todos');
  const [filtroLocalidad, setFiltroLocalidad] = useState('todos');
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [detallesFor, setDetallesFor] = useState(null);
  const [histId, setHistId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [servicioDetalle, setServicioDetalle] = useState(null);
  const cmap = (creditos || []).reduce((mapa, credito) => { const saldo = Number(credito.saldo || 0); if (saldo > 0) mapa[credito.clienteId] = (mapa[credito.clienteId] || 0) + saldo; return mapa; }, {});
  const enAlcance = currentUser.role === 'repartidor' ? clientes.filter(cliente => idsAlcance.has(cliente.localidadId)) : clientes;
  const localidadDeCliente = cliente => normalizarLocalidad(cliente.localidadNombre || cliente.localidad || '');
  const localidadesVisibles = Array.from(new Set(enAlcance.map(localidadDeCliente).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
  const contar = condicion => enAlcance.filter(condicion).length;
  const listaBase = enAlcance
    .filter(cliente => filtroEstado === 'todos' || filtroEstado === 'activos' && cliente.activo !== false || filtroEstado === 'inactivos' && cliente.activo === false)
    .filter(cliente => filtroCredito === 'todos' || filtroCredito === 'credito' && Number(cmap[cliente.id] || 0) > 0 || filtroCredito === 'sin-credito' && Number(cmap[cliente.id] || 0) <= 0)
    .filter(cliente => filtroLocalidad === 'todos' || filtroLocalidad === LOCALIDAD_SIN_CLASIFICAR && !localidadDeCliente(cliente) || claveLocalidad(localidadDeCliente(cliente)) === claveLocalidad(filtroLocalidad));
  const list = listaBase.filter(cliente => { const termino = q.trim().toLowerCase(); return !termino || `${cliente.nombre || ''} ${localidadDeCliente(cliente)}`.toLowerCase().includes(termino); }).sort((a, b) => localidadDeCliente(a).localeCompare(localidadDeCliente(b), 'es') || String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
  const comprobanteDeServicio = servicio => (comprobantes || []).find(comprobante => comprobante.servicioId === servicio.id || comprobante.comprobanteId === servicio.comprobanteId) || null;
  const historialCliente = clienteId => {
    const ventas = (notas || []).filter(nota => nota.clienteId === clienteId).map(nota => ({ ...nota, tipoRegistro: 'venta', fechaRegistro: nota.fecha }));
    const serviciosCliente = (servicios || []).filter(servicio => servicio.clienteId === clienteId && servicio.estado === 'completado').map(servicio => ({ ...servicio, tipoRegistro: 'servicio', fechaRegistro: servicio.createdAt || servicio.creadoEn, comprobante: comprobanteDeServicio(servicio) }));
    return ventas.concat(serviciosCliente).sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0));
  };
  const localidadPorId = id => localidadesForm.find(localidad => String(localidad.id) === String(id));
  const nuevaFicha = () => setForm({ nombre: '', localidadId: '', telefono: '', metodoServicio: METODO_VENTA_CANTIDAD, tarifaId: '', activo: true });
  const guardar = async () => {
    if (!form?.nombre || !String(form.nombre).trim()) return alert('Captura el nombre del cliente.');
    const localidad = localidadPorId(form.localidadId);
    if (!localidad || !localidad.repartidorId) return alert('Selecciona una localidad que ya esté asignada a un repartidor.');
    const metodoServicio = form.metodoServicio === METODO_RELLENO_MEDIDO ? METODO_RELLENO_MEDIDO : METODO_VENTA_CANTIDAD;
    const tarifaId = String(form.tarifaId || '').trim();
    const tarifa = (tarifas || []).find(item => String(item.id) === tarifaId && item.activo !== false);
    if (!tarifa) return alert('Selecciona una tarifa activa existente.');
    const item = { nombre: String(form.nombre).trim(), localidadId: localidad.id, localidadNombre: localidad.nombre, localidad: localidad.nombre, telefono: String(form.telefono || '').trim(), metodoServicio, tarifaId, tarifaHabitualId: tarifaId, activo: form.activo !== false };
    try {
      if (form.id) await db.collection(COLECCIONES.CLIENTES).doc(form.id).update(item);
      else await db.collection(COLECCIONES.CLIENTES).add({ ...item, creadoPorUid: currentUser.uid, creadoPorNombre: currentUser.nombre || '', fechaAlta: new Date().toISOString() });
      setForm(null);
    } catch (e) { alert('No se pudo guardar el cliente: ' + e.message); }
  };
  const localidadSeleccionada = form ? localidadPorId(form.localidadId) : null;
  const opcionesLocalidad = [React.createElement('option', { key: 'sin-localidad', value: '' }, 'Selecciona una localidad asignada')].concat(localidadesForm.map(localidad => React.createElement('option', { key: localidad.id, value: localidad.id }, localidad.nombre)));
  const editor = form && React.createElement(Modal, { title: form.id ? 'Editar cliente fijo' : 'Nuevo cliente fijo', onClose: () => setForm(null) }, React.createElement('div', { className: 'fx-client-editor' },
    React.createElement(Lbl, null, 'Nombre'),
    React.createElement(Inp, { value: form.nombre || '', autoFocus: true, onChange: e => setForm(actual => ({ ...actual, nombre: e.target.value })), placeholder: 'Nombre del cliente', style: { marginBottom: 10 } }),
    React.createElement(Lbl, null, 'Localidad asignada'),
    React.createElement('select', { value: form.localidadId || '', onChange: e => setForm(actual => ({ ...actual, localidadId: e.target.value })), className: 'fx-client-editor-select', style: { width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }, opcionesLocalidad),
    localidadSeleccionada && React.createElement('div', { className: 'fx-client-editor-assignment', style: { background: 'var(--info-bg)', border: '1px solid var(--line)', borderRadius: 8, padding: 9, marginBottom: 12, fontSize: 11 } }, 'Localidad asignada al repartidor: ', localidadSeleccionada.repartidorNombre || 'Repartidor asignado'),
    React.createElement(Lbl, null, 'Método de servicio'),
    React.createElement('select', { value: form.metodoServicio || METODO_VENTA_CANTIDAD, onChange: e => setForm(actual => ({ ...actual, metodoServicio: e.target.value })), className: 'fx-client-editor-select', style: { width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }, React.createElement('option', { value: METODO_VENTA_CANTIDAD }, 'Doméstica'), React.createElement('option', { value: METODO_RELLENO_MEDIDO }, 'Medido por medidor')),
    form.metodoServicio === METODO_RELLENO_MEDIDO && React.createElement('div', { className: 'fx-client-editor-service-note', style: { background: 'var(--info-bg)', color: 'var(--info-text)', borderRadius: 8, padding: 9, marginBottom: 10, fontSize: 11, lineHeight: 1.4 } }, 'Este cliente facturará por relleno medido: se capturarán marcador inicial y marcador final en cada servicio.'),
    React.createElement(Lbl, null, 'Teléfono'),
    React.createElement(Inp, { value: form.telefono || '', inputMode: 'tel', onChange: e => setForm(actual => ({ ...actual, telefono: e.target.value })), placeholder: 'Teléfono del cliente', style: { marginBottom: 10 } }),
    React.createElement(Lbl, null, 'Tarifa'),
    React.createElement('select', { value: form.tarifaId || '', onChange: e => setForm(actual => ({ ...actual, tarifaId: e.target.value })), className: 'fx-client-editor-select', style: { width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }, React.createElement('option', { value: '' }, tarifas.length ? 'Selecciona una tarifa existente' : 'No hay tarifas activas'), (tarifas || []).filter(tarifa => tarifa.activo !== false).map(tarifa => React.createElement('option', { key: tarifa.id, value: tarifa.id }, tarifa.nombre, ' · $', Number(tarifa.precioUnitario ?? tarifa.precioPorUnidad ?? 0).toFixed(2), ' / ', tarifa.unidadComercial || 'unidad'))),
    localidadesForm.length === 0 && React.createElement('div', { className: 'fx-client-editor-empty', style: { color: 'var(--warn-text)', fontSize: 11, marginBottom: 12 } }, 'No hay localidades con repartidor asignado disponibles.'),
    React.createElement(BFill, { onClick: guardar, style: { width: '100%' } }, 'Guardar cliente')));
  const detalle = detallesFor && React.createElement(Modal, { title: detallesFor.nombre || 'Cliente fijo', onClose: () => setDetallesFor(null) }, React.createElement(FichaRapidaCliente, { cliente: detallesFor, saldo: Number(cmap[detallesFor.id] || 0), historial: historialCliente(detallesFor.id), tarifa: (tarifas || []).find(tarifa => String(tarifa.id) === String(detallesFor.tarifaId || detallesFor.tarifaHabitualId)), puedeEditar, onEditar: () => { setForm({ id: detallesFor.id, nombre: detallesFor.nombre || '', localidadId: detallesFor.localidadId || '', telefono: detallesFor.telefono || '', metodoServicio: detallesFor.metodoServicio || METODO_VENTA_CANTIDAD, tarifaId: detallesFor.tarifaId || detallesFor.tarifaHabitualId || '', activo: detallesFor.activo !== false }); setDetallesFor(null); }, onHistorial: () => { setHistId(detallesFor.id); setDetallesFor(null); } }));
  const abrirPdfServicio = item => { const url = item?.comprobante?.pdfUrl || item?.pdfUrl; if (!url) return alert('Este servicio todavía no tiene un PDF disponible.'); window.open(url, '_blank', 'noopener,noreferrer'); };
  const compartirServicio = async item => { try { if (typeof appCompartirPdfServicio !== 'function') throw new Error('La función de compartir PDF no está disponible'); const resultado = await appCompartirPdfServicio(item, item.comprobante); if (resultado?.modo === 'enlace') alert('WhatsApp se abrió con un enlace al PDF. El navegador no permite adjuntar automáticamente el archivo en este dispositivo.'); } catch (error) { if (error?.name !== 'AbortError') alert(error.message || 'No se pudo compartir el PDF.'); } };
  const servicioDetalleModal = servicioDetalle && React.createElement(Modal, { title: 'Servicio de relleno medido', onClose: () => setServicioDetalle(null) }, React.createElement('div', { style: { display: 'grid', gap: 9, fontSize: 12 } }, React.createElement('strong', null, servicioDetalle.clienteNombre || 'Cliente'), React.createElement('div', null, new Date(servicioDetalle.fechaRegistro || 0).toLocaleString('es-MX')), React.createElement('div', null, 'Marcador inicial: ', servicioDetalle.medicion?.marcadorInicial ?? '—'), React.createElement('div', null, 'Marcador final: ', servicioDetalle.medicion?.marcadorFinal ?? '—'), React.createElement('div', null, 'Litros rellenados: ', Number(servicioDetalle.medicion?.litrosRellenados || 0).toFixed(2), ' L'), React.createElement('div', null, 'Garrafones equivalentes: ', Number(servicioDetalle.medicion?.garrafonesEquivalentes || 0).toFixed(2)), React.createElement('div', null, 'Tarifa: ', servicioDetalle.venta?.tarifaNombre || servicioDetalle.venta?.tarifaSnapshot?.nombre || '—'), React.createElement('div', { style: { fontWeight: 800 } }, 'Total facturado: $', Number(servicioDetalle.venta?.total || 0).toFixed(2)), React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 } }, React.createElement(BOut, { onClick: () => abrirPdfServicio(servicioDetalle), style: { flex: 1 } }, 'Abrir nota/PDF'), React.createElement(BFill, { onClick: () => compartirServicio(servicioDetalle), style: { flex: 1 } }, 'Compartir PDF'))));
  const tarjetas = list.map(cliente => {
    const historial = historialCliente(cliente.id);
    const expandido = expandedId === cliente.id;
    const activo = cliente.activo !== false;
    const resumen = React.createElement('div', { className: 'fx-client-card-summary', onClick: () => setDetallesFor(cliente), role: 'button', tabIndex: 0, onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') setDetallesFor(cliente); } },
      React.createElement('div', { className: 'fx-client-card-copy' },
        React.createElement('div', { className: 'fx-client-card-name' }, cliente.nombre || 'Cliente sin nombre'),
        React.createElement('div', { className: 'fx-client-card-location' }, localidadDeCliente(cliente) || 'Sin localidad'),
        React.createElement('div', { className: 'fx-client-card-service' }, etiquetaMetodoServicio(cliente.metodoServicio)),
        React.createElement('div', { className: 'fx-client-card-balance' }, 'Saldo ', Number(cmap[cliente.id] || 0) > 0 ? '$' + Number(cmap[cliente.id]).toFixed(2) : '$0.00'),
        React.createElement('div', { className: 'fx-client-status', 'aria-label': 'Estado del cliente' }, React.createElement('span', { className: 'fx-client-status-label' }, 'Estado'), React.createElement('span', { className: activo ? 'fx-client-status-value fx-client-status-active' : 'fx-client-status-value fx-client-status-inactive' }, activo ? 'Activo' : 'Inactivo'))),
      React.createElement('span', { className: 'fx-client-card-chevron', 'aria-hidden': 'true' }, expandido ? '⌃' : '›'));
    const acciones = expandido && React.createElement('div', { className: 'fx-client-card-actions', style: { borderTop: '1px solid var(--line)', padding: '10px 14px' } }, React.createElement('div', { className: 'fx-client-card-tags', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 } }, React.createElement(Tag, { color: activo ? 'var(--ok-text)' : 'var(--ink-soft)' }, activo ? 'Activo' : 'Inactivo'), React.createElement(Tag, { color: Number(cmap[cliente.id] || 0) > 0 ? 'var(--warn-text)' : 'var(--ink-soft)' }, Number(cmap[cliente.id] || 0) > 0 ? 'Crédito $' + Number(cmap[cliente.id]).toFixed(2) : 'Sin crédito')), React.createElement('div', { className: 'fx-client-action-row', style: { display: 'flex', gap: 6 } }, puedeEditar && React.createElement(BOut, { onClick: e => { e.stopPropagation(); setForm({ id: cliente.id, nombre: cliente.nombre || '', localidadId: cliente.localidadId || '', telefono: cliente.telefono || '', metodoServicio: cliente.metodoServicio || METODO_VENTA_CANTIDAD, tarifaId: cliente.tarifaId || cliente.tarifaHabitualId || '', activo }); setExpandedId(null); }, style: { flex: 1 } }, 'Editar'), puedeCrear && React.createElement(BOut, { onClick: e => { e.stopPropagation(); db.collection(COLECCIONES.CLIENTES).doc(cliente.id).update({ activo: !activo }); setExpandedId(null); }, style: { flex: 1 } }, activo ? 'Desactivar' : 'Activar'), historial.length ? React.createElement(BOut, { onClick: e => { e.stopPropagation(); setHistId(cliente.id); setExpandedId(null); }, style: { flex: 1 } }, 'Historial') : null));
    const historialVista = histId === cliente.id && React.createElement('div', { className: 'fx-client-history', style: { padding: '0 14px 12px' } }, React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', fontWeight: 800, marginBottom: 6 } }, 'HISTORIAL DE OPERACIONES'), historial.length ? historial.slice(0, 8).map(item => item.tipoRegistro === 'servicio' ? React.createElement('div', { key: item.id, style: { borderTop: '1px solid var(--line)', padding: '8px 0', fontSize: 11 } }, React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' } }, React.createElement('div', null, React.createElement('strong', null, 'Relleno por medición'), React.createElement('div', { style: { color: 'var(--ink-soft)', marginTop: 2 } }, new Date(item.fechaRegistro || 0).toLocaleString('es-MX'), ' · ', Number(item.medicion?.litrosRellenados || 0).toFixed(2), ' L · $', Number(item.venta?.total || 0).toFixed(2), ' · Facturado')), React.createElement(BOut, { onClick: () => setServicioDetalle(item), style: { padding: '6px 8px', fontSize: 10 } }, 'Ver servicio')), React.createElement('div', { style: { display: 'flex', gap: 6, marginTop: 6 } }, item.comprobante?.pdfUrl || item.pdfUrl ? React.createElement(BOut, { onClick: () => abrirPdfServicio(item), style: { flex: 1, padding: '6px 8px', fontSize: 10 } }, 'Abrir nota/PDF') : null, React.createElement(BFill, { onClick: () => compartirServicio(item), style: { flex: 1, padding: '6px 8px', fontSize: 10 } }, 'Compartir PDF'))) : React.createElement('div', { key: item.id, style: { borderTop: '1px solid var(--line)', padding: '7px 0', fontSize: 11 } }, new Date(item.fechaRegistro || 0).toLocaleString('es-MX'), ' · ', Number(item.litrosVendidos || 0).toFixed(2), ' L · $', Number(item.total || 0).toFixed(2), ' · ', item.formaPago || '')) : React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12 } }, 'Sin operaciones registradas.'));
    return React.createElement('div', { key: cliente.id, className: 'fx-client-card-shell' }, React.createElement(Card, { style: { padding: 0, marginBottom: 8, opacity: activo ? 1 : .65 } }, resumen, acciones, historialVista));
  });
  const opcionesLocalidadFiltro = [{ valor: 'todos', texto: 'Todas las localidades' }, { valor: LOCALIDAD_SIN_CLASIFICAR, texto: 'Sin localidad' }].concat(localidadesVisibles.map(localidad => ({ valor: localidad, texto: localidad })));
  const contarLocalidad = valor => contar(cliente => valor === 'todos' || valor === LOCALIDAD_SIN_CLASIFICAR && !localidadDeCliente(cliente) || claveLocalidad(localidadDeCliente(cliente)) === claveLocalidad(valor));
  return React.createElement('div', { className: 'fx-page-clients' },
    React.createElement('div', { className: 'fx-clients-heading' }, React.createElement('div', { className: 'fx-clients-title' }, 'Clientes'), puedeCrear && React.createElement(BFill, { onClick: nuevaFicha }, '+ Nuevo')),
    React.createElement(Inp, { className: 'fx-clientes-search-input', placeholder: 'Buscar cliente o localidad…', value: q, onChange: e => setQ(e.target.value), 'aria-label': 'Buscar cliente o localidad', style: { marginBottom: 14 } }),
    React.createElement('div', { className: 'fx-client-filters', role: 'group', 'aria-label': 'Filtros de clientes' },
      React.createElement(FiltroClientes, { titulo: 'Estado', valor: filtroEstado, onChange: setFiltroEstado, opciones: [{ valor: 'todos', texto: 'Todos' }, { valor: 'activos', texto: 'Activos' }, { valor: 'inactivos', texto: 'Inactivos' }], contar: valor => contar(cliente => valor === 'todos' || valor === 'activos' && cliente.activo !== false || valor === 'inactivos' && cliente.activo === false) }),
      React.createElement(FiltroClientes, { titulo: 'Crédito', valor: filtroCredito, onChange: setFiltroCredito, opciones: [{ valor: 'todos', texto: 'Todos' }, { valor: 'credito', texto: 'Con crédito' }, { valor: 'sin-credito', texto: 'Sin crédito' }], contar: valor => contar(cliente => valor === 'todos' || valor === 'credito' && Number(cmap[cliente.id] || 0) > 0 || valor === 'sin-credito' && Number(cmap[cliente.id] || 0) <= 0) }),
      React.createElement(FiltroClientes, { titulo: 'Localidad', valor: filtroLocalidad, onChange: setFiltroLocalidad, opciones: opcionesLocalidadFiltro, contar: contarLocalidad })),
    React.createElement('div', { className: 'fx-client-results-count' }, list.length + ' cliente(s) encontrado(s).'), tarjetas, editor, detalle, servicioDetalleModal);
}
