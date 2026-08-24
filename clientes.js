const LOCALIDAD_SIN_CLASIFICAR = '__sin_localidad__';
const normalizarLocalidad = valor => String(valor || '').trim().replace(/\s+/g, ' ');
const claveLocalidad = valor => normalizarLocalidad(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function FichaRapidaCliente({ cliente, saldo = 0, historial = [], puedeEditar = false, onEditar, onHistorial }) {
  const moneda = valor => '$' + Number(valor || 0).toFixed(2);
  return React.createElement('div', { className: 'fx-client-detail', style: { display: 'grid', gap: 12 } },
    React.createElement('div', { className: 'fx-client-detail-status', style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
      React.createElement(Tag, { color: cliente.activo === false ? 'var(--ink-soft)' : 'var(--ok-text)' }, cliente.activo === false ? 'Inactivo' : 'Activo'),
      React.createElement(Tag, { color: saldo > 0 ? 'var(--warn-text)' : 'var(--ink-soft)' }, saldo > 0 ? 'Crédito ' + moneda(saldo) : 'Sin crédito')),
    React.createElement('div', { className: 'fx-client-detail-localidad', style: { background: 'var(--surface-2)', borderRadius: 8, padding: 10 } },
      React.createElement('div', { style: { fontSize: 10, color: 'var(--ink-faint)', fontWeight: 800 } }, 'LOCALIDAD ASIGNADA'),
      React.createElement('div', { style: { fontWeight: 800, marginTop: 4 } }, cliente.localidadNombre || cliente.localidad || 'Sin localidad')),
    React.createElement('div', { className: 'fx-client-detail-actions', style: { display: 'flex', gap: 8 } },
      historial.length ? React.createElement(BOut, { onClick: onHistorial, style: { flex: 1 } }, 'Historial de ventas') : null,
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

function Clientes({ clientes = [], notas = [], creditos = [], localidades: localidadesCatalogo = [], currentUser = {} }) {
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
  const historialCliente = clienteId => notas.filter(nota => nota.clienteId === clienteId).slice().sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
  const localidadPorId = id => localidadesForm.find(localidad => String(localidad.id) === String(id));
  const nuevaFicha = () => setForm({ nombre: '', localidadId: '', activo: true });
  const guardar = async () => {
    if (!form?.nombre || !String(form.nombre).trim()) return alert('Captura el nombre del cliente.');
    const localidad = localidadPorId(form.localidadId);
    if (!localidad || !localidad.repartidorId) return alert('Selecciona una localidad que ya esté asignada a un repartidor.');
    const item = { nombre: String(form.nombre).trim(), localidadId: localidad.id, localidadNombre: localidad.nombre, localidad: localidad.nombre, activo: form.activo !== false };
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
    localidadesForm.length === 0 && React.createElement('div', { className: 'fx-client-editor-empty', style: { color: 'var(--warn-text)', fontSize: 11, marginBottom: 12 } }, 'No hay localidades con repartidor asignado disponibles.'),
    React.createElement(BFill, { onClick: guardar, style: { width: '100%' } }, 'Guardar cliente')));
  const detalle = detallesFor && React.createElement(Modal, { title: detallesFor.nombre || 'Cliente fijo', onClose: () => setDetallesFor(null) }, React.createElement(FichaRapidaCliente, { cliente: detallesFor, saldo: Number(cmap[detallesFor.id] || 0), historial: historialCliente(detallesFor.id), puedeEditar, onEditar: () => { setForm({ id: detallesFor.id, nombre: detallesFor.nombre || '', localidadId: detallesFor.localidadId || '', activo: detallesFor.activo !== false }); setDetallesFor(null); }, onHistorial: () => { setHistId(detallesFor.id); setDetallesFor(null); } }));
  const tarjetas = list.map(cliente => {
    const historial = historialCliente(cliente.id);
    const expandido = expandedId === cliente.id;
    const activo = cliente.activo !== false;
    const resumen = React.createElement('div', { className: 'fx-client-card-summary', onClick: () => setDetallesFor(cliente), role: 'button', tabIndex: 0, onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') setDetallesFor(cliente); } },
      React.createElement('div', { className: 'fx-client-card-copy' },
        React.createElement('div', { className: 'fx-client-card-name' }, cliente.nombre || 'Cliente sin nombre'),
        React.createElement('div', { className: 'fx-client-card-location' }, localidadDeCliente(cliente) || 'Sin localidad'),
        React.createElement('div', { className: 'fx-client-status', 'aria-label': 'Estado del cliente' }, React.createElement('span', { className: 'fx-client-status-label' }, 'Estado'), React.createElement('span', { className: activo ? 'fx-client-status-value fx-client-status-active' : 'fx-client-status-value fx-client-status-inactive' }, activo ? 'Activo' : 'Inactivo'))),
      React.createElement('span', { className: 'fx-client-card-chevron', 'aria-hidden': 'true' }, expandido ? '⌃' : '›'));
    const acciones = expandido && React.createElement('div', { className: 'fx-client-card-actions', style: { borderTop: '1px solid var(--line)', padding: '10px 14px' } }, React.createElement('div', { className: 'fx-client-card-tags', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 } }, React.createElement(Tag, { color: activo ? 'var(--ok-text)' : 'var(--ink-soft)' }, activo ? 'Activo' : 'Inactivo'), React.createElement(Tag, { color: Number(cmap[cliente.id] || 0) > 0 ? 'var(--warn-text)' : 'var(--ink-soft)' }, Number(cmap[cliente.id] || 0) > 0 ? 'Crédito $' + Number(cmap[cliente.id]).toFixed(2) : 'Sin crédito')), React.createElement('div', { className: 'fx-client-action-row', style: { display: 'flex', gap: 6 } }, puedeEditar && React.createElement(BOut, { onClick: e => { e.stopPropagation(); setForm({ id: cliente.id, nombre: cliente.nombre || '', localidadId: cliente.localidadId || '', activo }); setExpandedId(null); }, style: { flex: 1 } }, 'Editar'), puedeCrear && React.createElement(BOut, { onClick: e => { e.stopPropagation(); db.collection(COLECCIONES.CLIENTES).doc(cliente.id).update({ activo: !activo }); setExpandedId(null); }, style: { flex: 1 } }, activo ? 'Desactivar' : 'Activar'), historial.length ? React.createElement(BOut, { onClick: e => { e.stopPropagation(); setHistId(cliente.id); setExpandedId(null); }, style: { flex: 1 } }, 'Historial') : null));
    const historialVista = histId === cliente.id && React.createElement('div', { className: 'fx-client-history', style: { padding: '0 14px 12px' } }, React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', fontWeight: 800, marginBottom: 6 } }, 'VENTAS REGISTRADAS'), historial.length ? historial.slice(0, 8).map(venta => React.createElement('div', { key: venta.id, style: { borderTop: '1px solid var(--line)', padding: '7px 0', fontSize: 11 } }, new Date(venta.fecha || 0).toLocaleString('es-MX'), ' · ', Number(venta.litrosVendidos || 0).toFixed(2), ' L · $', Number(venta.total || 0).toFixed(2), ' · ', venta.formaPago || '')) : React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12 } }, 'Sin ventas registradas.'));
    return React.createElement('div', { key: cliente.id, className: 'fx-client-card-shell' }, React.createElement(Card, { style: { padding: 0, marginBottom: 8, opacity: activo ? 1 : .65 } }, resumen, acciones, historialVista));
  });
  const opcionesLocalidadFiltro = [{ valor: 'todos', texto: 'Todas las localidades' }, { valor: LOCALIDAD_SIN_CLASIFICAR, texto: 'Sin localidad' }].concat(localidadesVisibles.map(localidad => ({ valor: localidad, texto: localidad })));
  const contarLocalidad = valor => contar(cliente => valor === 'todos' || valor === LOCALIDAD_SIN_CLASIFICAR && !localidadDeCliente(cliente) || claveLocalidad(localidadDeCliente(cliente)) === claveLocalidad(valor));
  return React.createElement('div', { className: 'fx-page-clients' },
    React.createElement('div', { className: 'fx-clients-heading' }, React.createElement('div', { className: 'fx-clients-title' }, 'Clientes fijos'), puedeCrear && React.createElement(BFill, { onClick: nuevaFicha }, '+ Nuevo')),
    React.createElement(Inp, { className: 'fx-clientes-search-input', placeholder: 'Buscar cliente o localidad…', value: q, onChange: e => setQ(e.target.value), 'aria-label': 'Buscar cliente o localidad', style: { marginBottom: 14 } }),
    React.createElement('div', { className: 'fx-client-filters', role: 'group', 'aria-label': 'Filtros de clientes' },
      React.createElement(FiltroClientes, { titulo: 'Estado', valor: filtroEstado, onChange: setFiltroEstado, opciones: [{ valor: 'todos', texto: 'Todos' }, { valor: 'activos', texto: 'Activos' }, { valor: 'inactivos', texto: 'Inactivos' }], contar: valor => contar(cliente => valor === 'todos' || valor === 'activos' && cliente.activo !== false || valor === 'inactivos' && cliente.activo === false) }),
      React.createElement(FiltroClientes, { titulo: 'Crédito', valor: filtroCredito, onChange: setFiltroCredito, opciones: [{ valor: 'todos', texto: 'Todos' }, { valor: 'credito', texto: 'Con crédito' }, { valor: 'sin-credito', texto: 'Sin crédito' }], contar: valor => contar(cliente => valor === 'todos' || valor === 'credito' && Number(cmap[cliente.id] || 0) > 0 || valor === 'sin-credito' && Number(cmap[cliente.id] || 0) <= 0) }),
      React.createElement(FiltroClientes, { titulo: 'Localidad', valor: filtroLocalidad, onChange: setFiltroLocalidad, opciones: opcionesLocalidadFiltro, contar: contarLocalidad })),
    React.createElement('div', { className: 'fx-client-results-count' }, list.length + ' cliente(s) encontrado(s).'), tarjetas, editor, detalle);
}
