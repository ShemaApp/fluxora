const LOCALIDAD_SIN_CLASIFICAR = '__sin_localidad__';
const normalizarLocalidad = valor => String(valor || '').trim().replace(/\s+/g, ' ');
const claveLocalidad = valor => normalizarLocalidad(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function SelectorLocalidad({ value, localidades = [], nuevaValue, onSeleccionar, onCrear, onCambiar, disabled = false }) {
  const [texto, setTexto] = useState(value || '');
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    if (nuevaValue === undefined && claveLocalidad(value) === claveLocalidad(texto)) setTexto(value || '');
  }, [value, nuevaValue]);
  if (nuevaValue !== undefined) {
    return React.createElement('div', { style: { marginBottom: 8 } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
        React.createElement('span', { style: { fontSize: 12, fontWeight: 800, color: 'var(--accent-text)' } }, 'Nueva localidad'),
        React.createElement(BOut, { onClick: onCambiar, style: { padding: '5px 8px', fontSize: 11 } }, 'Elegir existente')),
      React.createElement(Inp, { value: nuevaValue, placeholder: 'Nombre de la nueva localidad', onChange: e => onCrear(normalizarLocalidad(e.target.value)), disabled }));
  }
  const termino = claveLocalidad(texto);
  const exacta = localidades.find(localidad => claveLocalidad(localidad) === termino);
  const sugerencias = localidades.filter(localidad => !termino || claveLocalidad(localidad).includes(termino)).slice(0, 12);
  const lista = sugerencias.length ? sugerencias.map(localidad => React.createElement('button', {
    key: localidad,
    type: 'button',
    onMouseDown: e => e.preventDefault(),
    onClick: () => { setTexto(localidad); setAbierto(false); onSeleccionar(localidad); },
    style: { display: 'block', width: '100%', padding: '9px 10px', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer', fontSize: 12 }
  }, localidad)) : React.createElement('div', { style: { padding: 10, fontSize: 12, color: 'var(--ink-faint)' } }, 'No hay coincidencias.');
  const crear = texto.trim() && !exacta ? React.createElement('button', {
    type: 'button',
    onMouseDown: e => e.preventDefault(),
    onClick: () => { setAbierto(false); onCrear(normalizarLocalidad(texto)); },
    style: { display: 'block', width: '100%', padding: 10, textAlign: 'left', border: 'none', background: 'var(--surface-2)', color: 'var(--accent-text)', cursor: 'pointer', fontSize: 12, fontWeight: 800 }
  }, '+ Crear "' + normalizarLocalidad(texto) + '"') : null;
  return React.createElement('div', { style: { position: 'relative', marginBottom: 8 } },
    React.createElement(Inp, { value: texto, placeholder: 'Escribe para buscar localidad…', onFocus: () => !disabled && setAbierto(true), onChange: e => { if (disabled) return; setTexto(e.target.value); setAbierto(true); }, onBlur: () => setTimeout(() => setAbierto(false), 150), disabled }),
    abierto && React.createElement('div', { style: { position: 'absolute', zIndex: 20, left: 0, right: 0, top: 'calc(100% + 4px)', maxHeight: 220, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 8, boxShadow: '0 8px 20px rgba(0,0,0,.12)' } }, lista, crear));
}

function FichaRapidaCliente({ cliente, saldo = 0, historial = [], puedeEditar = false, onEditar, onHistorial }) {
  const moneda = valor => '$' + Number(valor || 0).toFixed(2);
  const etiquetas = React.createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
    React.createElement(Tag, { color: cliente.activo ? 'var(--ok-text)' : 'var(--ink-soft)' }, cliente.activo ? 'Activo' : 'Inactivo'),
    React.createElement(Tag, { color: saldo > 0 ? 'var(--warn-text)' : 'var(--ink-soft)' }, saldo > 0 ? 'Crédito ' + moneda(saldo) : 'Sin crédito'),
    React.createElement(Tag, { color: 'var(--ink-soft)' }, cliente.tipo || 'Cliente fijo'));
  const datos = React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
    React.createElement('div', { style: { background: 'var(--surface-2)', borderRadius: 8, padding: 10 } }, React.createElement('div', { style: { fontSize: 10, color: 'var(--ink-faint)', fontWeight: 800 } }, 'ID FIJO'), React.createElement('div', { style: { fontWeight: 800, marginTop: 4 } }, cliente.identificacion || cliente.id)),
    React.createElement('div', { style: { background: 'var(--surface-2)', borderRadius: 8, padding: 10 } }, React.createElement('div', { style: { fontSize: 10, color: 'var(--ink-faint)', fontWeight: 800 } }, 'LOCALIDAD'), React.createElement('div', { style: { fontWeight: 800, marginTop: 4 } }, cliente.localidadNombre || cliente.localidad || 'Sin localidad')));
  const domicilio = React.createElement('div', null, React.createElement('div', { style: { fontSize: 10, color: 'var(--ink-faint)', fontWeight: 800, marginBottom: 3 } }, 'DOMICILIO'), React.createElement('div', { style: { fontSize: 13, color: 'var(--ink-soft)' } }, cliente.domicilio || cliente.direccion || 'Domicilio no registrado'));
  const acciones = React.createElement('div', { style: { display: 'flex', gap: 8 } },
    historial.length ? React.createElement(BOut, { onClick: onHistorial, style: { flex: 1 } }, 'Historial de ventas') : null,
    puedeEditar ? React.createElement(BFill, { onClick: onEditar, style: { flex: 1 } }, 'Editar cliente') : null);
  return React.createElement('div', { style: { display: 'grid', gap: 12 } }, etiquetas, datos, domicilio, acciones);
}

function FiltroClientes({ titulo, opciones, valor, onChange, contar }) {
  return React.createElement(React.Fragment, null,
    React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', fontWeight: 800, marginBottom: 6 } }, titulo),
    React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } }, opciones.map(opcion => React.createElement('button', {
      key: opcion.valor,
      type: 'button',
      onClick: () => onChange(opcion.valor),
      style: { padding: '7px 9px', borderRadius: 8, border: '1px solid ' + (valor === opcion.valor ? 'var(--accent)' : 'var(--line)'), background: valor === opcion.valor ? 'var(--accent)' : 'var(--surface)', color: valor === opcion.valor ? 'var(--ink)' : 'var(--ink-soft)', fontSize: 11, fontWeight: 700 }
    }, opcion.texto + ' ' + contar(opcion.valor)))));
}

function Clientes({ clientes = [], notas = [], creditos = [], localidades: localidadesCatalogo = [], tarifas = [], currentUser = {} }) {
  const puedeEditar = currentUser.role === 'admin' || permisoEdita(currentUser).clientes;
  const puedeCrear = currentUser.role === 'admin';
  const localidadesPermitidas = obtenerLocalidadesAsignadas({ localidades: localidadesCatalogo, currentUser, localidadIds: currentUser.localidadIds });
  const [filtroEstado, setFiltroEstado] = useState('activos');
  const [filtroCredito, setFiltroCredito] = useState('todos');
  const [filtroLocalidad, setFiltroLocalidad] = useState('todos');
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [detallesFor, setDetallesFor] = useState(null);
  const [histId, setHistId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const cmap = (creditos || []).reduce((mapa, credito) => { const saldo = Number(credito.saldo || 0); if (saldo > 0) mapa[credito.clienteId] = (mapa[credito.clienteId] || 0) + saldo; return mapa; }, {});
  const enAlcance = currentUser.role === 'repartidor' ? clientes.filter(cliente => localidadesPermitidas.some(localidad => localidad.id === cliente.localidadId)) : clientes;
  const localidadDeCliente = cliente => normalizarLocalidad(cliente.localidadNombre || cliente.localidad || '');
  const localidades = Array.from(new Set([...(localidadesCatalogo || []).map(localidad => localidad.nombre || ''), ...enAlcance.map(cliente => localidadDeCliente(cliente))].map(normalizarLocalidad).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
  const contar = condicion => enAlcance.filter(condicion).length;
  const listaBase = enAlcance.filter(cliente => filtroEstado === 'todos' || filtroEstado === 'activos' && cliente.activo !== false || filtroEstado === 'inactivos' && cliente.activo === false).filter(cliente => filtroCredito === 'todos' || filtroCredito === 'credito' && Number(cmap[cliente.id] || 0) > 0 || filtroCredito === 'sin-credito' && Number(cmap[cliente.id] || 0) <= 0).filter(cliente => filtroLocalidad === 'todos' || filtroLocalidad === LOCALIDAD_SIN_CLASIFICAR && !localidadDeCliente(cliente) || claveLocalidad(localidadDeCliente(cliente)) === claveLocalidad(filtroLocalidad));
  const list = listaBase.filter(cliente => { const termino = q.trim().toLowerCase(); return !termino || `${cliente.nombre || ''} ${cliente.identificacion || cliente.id || ''} ${cliente.domicilio || cliente.direccion || ''} ${localidadDeCliente(cliente)}`.toLowerCase().includes(termino); }).sort((a, b) => localidadDeCliente(a).localeCompare(localidadDeCliente(b), 'es') || String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
  const historialCliente = clienteId => notas.filter(nota => nota.clienteId === clienteId).slice().sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
  const nuevaFicha = () => setForm({ identificacion: '', nombre: '', domicilio: '', localidadId: '', localidad: '', tipo: 'Residencial', formaHabitual: 'Efectivo', tarifaHabitualId: '', activo: true });
  const localidadRef = valor => (localidadesCatalogo || []).find(localidad => claveLocalidad(localidad.nombre) === claveLocalidad(valor));
  const guardar = async () => {
    if (!form?.nombre || !String(form.identificacion || '').trim()) return alert('Captura el nombre y el ID fijo del cliente.');
    const identificacion = String(form.identificacion).trim();
    if (!/^\d+$/.test(identificacion)) return alert('El ID fijo debe ser numérico.');
    if (clientes.some(cliente => cliente.id !== form.id && String(cliente.identificacion || '').trim() === identificacion)) return alert('Ese ID fijo ya está asignado a otro cliente.');
    const localidadNombre = normalizarLocalidad(form.localidadNueva !== undefined ? form.localidadNueva : form.localidad || form.localidadNombre || '');
    if (!localidadNombre) return alert('Selecciona o crea una localidad.');
    let referencia = localidadRef(localidadNombre);
    if (!referencia) {
      const ref = db.collection(COLECCIONES.LOCALIDADES).doc();
      referencia = { id: ref.id, nombre: localidadNombre, activo: true };
      await ref.set({ nombre: localidadNombre, activo: true, creadoPorUid: currentUser.uid, creadoPorNombre: currentUser.nombre || '', fechaCreacion: new Date().toISOString() });
    }
    const item = { identificacion, nombre: String(form.nombre).trim(), domicilio: String(form.domicilio || '').trim(), localidadId: referencia.id, localidadNombre: referencia.nombre, tipo: form.tipo || 'Residencial', formaHabitual: form.formaHabitual || 'Efectivo', tarifaHabitualId: form.tarifaHabitualId || null, activo: form.activo !== false };
    if (form.id) await db.collection(COLECCIONES.CLIENTES).doc(form.id).update(item); else await db.collection(COLECCIONES.CLIENTES).add({ ...item, creadoPorUid: currentUser.uid, fechaAlta: new Date().toISOString() });
    setForm(null);
  };
  const localidadSeleccionada = form ? (localidadesCatalogo || []).find(localidad => String(localidad.id) === String(form.localidadId)) || localidadRef(form.localidad || form.localidadNombre) : null;
  const editor = form && React.createElement(Modal, { title: form.id ? 'Editar cliente fijo' : 'Nuevo cliente fijo', onClose: () => setForm(null) }, React.createElement('div', null,
    React.createElement(Lbl, null, 'ID fijo único'), React.createElement(Inp, { value: form.identificacion, inputMode: 'numeric', onChange: e => setForm(actual => ({ ...actual, identificacion: e.target.value })), style: { marginBottom: 10 } }),
    React.createElement(Lbl, null, 'Nombre'), React.createElement(Inp, { value: form.nombre, onChange: e => setForm(actual => ({ ...actual, nombre: e.target.value })), style: { marginBottom: 10 } }),
    React.createElement(Lbl, null, 'Domicilio'), React.createElement(Inp, { value: form.domicilio, onChange: e => setForm(actual => ({ ...actual, domicilio: e.target.value })), style: { marginBottom: 10 } }),
    React.createElement(Lbl, null, 'Localidad asignada'), React.createElement(SelectorLocalidad, { value: form.localidad || localidadSeleccionada?.nombre || '', localidades, nuevaValue: form.localidadNueva, onSeleccionar: valor => setForm(actual => ({ ...actual, localidad: valor, localidadId: localidadRef(valor)?.id || '' })), onCrear: valor => setForm(actual => ({ ...actual, localidadNueva: valor, localidad: '' })), onCambiar: () => setForm(actual => { const siguiente = { ...actual, localidad: '' }; delete siguiente.localidadNueva; return siguiente; }) }),
    localidadSeleccionada && React.createElement('div', { style: { background: 'var(--info-bg)', border: '1px solid var(--line)', borderRadius: 9, padding: 9, marginBottom: 10, fontSize: 11, lineHeight: 1.5 } }, React.createElement('strong', null, 'ASIGNACIÓN OPERATIVA'), React.createElement('div', null, 'Localidad → ', localidadSeleccionada.nombre), React.createElement('div', null, 'Repartidor → ', localidadSeleccionada.repartidorNombre || 'Pendiente'), React.createElement('div', null, 'Vehículo → ', localidadSeleccionada.vehiculoNombre || 'Pendiente'), React.createElement('div', null, 'Medidor → ', localidadSeleccionada.medidorNombre || 'Pendiente')),
    React.createElement(Lbl, null, 'Tipo'), React.createElement('select', { value: form.tipo || 'Residencial', onChange: e => setForm(actual => ({ ...actual, tipo: e.target.value })), style: { width: '100%', padding: 10, marginBottom: 10 } }, React.createElement('option', { value: 'Residencial' }, 'Residencial'), React.createElement('option', { value: 'Comercial' }, 'Comercial')),
    React.createElement(Lbl, null, 'Forma habitual'), React.createElement('select', { value: form.formaHabitual || 'Efectivo', onChange: e => setForm(actual => ({ ...actual, formaHabitual: e.target.value })), style: { width: '100%', padding: 10, marginBottom: 10 } }, React.createElement('option', { value: 'Efectivo' }, 'Efectivo'), React.createElement('option', { value: 'Crédito' }, 'Crédito')),
    React.createElement(Lbl, null, 'Tarifa habitual'), React.createElement('select', { value: form.tarifaHabitualId || '', onChange: e => setForm(actual => ({ ...actual, tarifaHabitualId: e.target.value || null })), style: { width: '100%', padding: 10, marginBottom: 12 } }, React.createElement('option', { value: '' }, 'Tarifa base de medición'), (tarifas || []).filter(tarifa => tarifa.activo !== false).map(tarifa => React.createElement('option', { key: tarifa.id, value: tarifa.id }, tarifa.nombre))),
    React.createElement(BFill, { onClick: guardar, style: { width: '100%' } }, 'Guardar cliente')));
  const detalle = detallesFor && React.createElement(Modal, { title: 'Cliente · ' + detallesFor.nombre, onClose: () => setDetallesFor(null) }, React.createElement(FichaRapidaCliente, { cliente: detallesFor, saldo: Number(cmap[detallesFor.id] || 0), historial: historialCliente(detallesFor.id), puedeEditar, onEditar: () => { setForm({ ...detallesFor, localidad: localidadDeCliente(detallesFor) }); setDetallesFor(null); }, onHistorial: () => { setHistId(detallesFor.id); setDetallesFor(null); } }));
  const tarjetas = list.map(cliente => {
    const historial = historialCliente(cliente.id);
    const expandido = expandedId === cliente.id;
    const resumen = React.createElement('div', { onClick: () => setDetallesFor(cliente), style: { padding: '12px 14px', cursor: 'pointer' } }, React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } }, React.createElement('div', { style: { minWidth: 0 } }, React.createElement('div', { style: { fontSize: 14, fontWeight: 800 } }, cliente.nombre), React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 } }, 'ID ', cliente.identificacion || cliente.id, ' · ', localidadDeCliente(cliente) || 'Sin localidad'), React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 } }, cliente.domicilio || 'Sin domicilio')), React.createElement('span', { style: { fontSize: 20, color: 'var(--ink-faint)' } }, expandido ? '⌃' : '›')));
    const acciones = expandido && React.createElement('div', { style: { borderTop: '1px solid var(--line)', padding: '10px 14px' } }, React.createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 } }, React.createElement(Tag, { color: cliente.activo === false ? 'var(--ink-soft)' : 'var(--ok-text)' }, cliente.activo === false ? 'Inactivo' : 'Activo'), React.createElement(Tag, { color: Number(cmap[cliente.id] || 0) > 0 ? 'var(--warn-text)' : 'var(--ink-soft)' }, Number(cmap[cliente.id] || 0) > 0 ? 'Crédito $' + Number(cmap[cliente.id]).toFixed(2) : 'Sin crédito')), React.createElement('div', { style: { display: 'flex', gap: 6 } }, puedeEditar && React.createElement(BOut, { onClick: e => { e.stopPropagation(); setForm({ ...cliente, localidad: localidadDeCliente(cliente) }); setExpandedId(null); }, style: { flex: 1 } }, 'Editar'), puedeCrear && React.createElement(BOut, { onClick: e => { e.stopPropagation(); db.collection(COLECCIONES.CLIENTES).doc(cliente.id).update({ activo: cliente.activo === false }); setExpandedId(null); }, style: { flex: 1 } }, cliente.activo === false ? 'Activar' : 'Desactivar'), historial.length ? React.createElement(BOut, { onClick: e => { e.stopPropagation(); setHistId(cliente.id); setExpandedId(null); }, style: { flex: 1 } }, 'Historial') : null));
    const historialVista = histId === cliente.id && React.createElement('div', { style: { padding: '0 14px 12px' } }, React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', fontWeight: 800, marginBottom: 6 } }, 'VENTAS REGISTRADAS'), historial.length ? historial.slice(0, 8).map(venta => React.createElement('div', { key: venta.id, style: { borderTop: '1px solid var(--line)', padding: '7px 0', fontSize: 11 } }, new Date(venta.fecha || 0).toLocaleString('es-MX'), ' · ', Number(venta.litrosVendidos || 0).toFixed(2), ' L · $', Number(venta.total || 0).toFixed(2), ' · ', venta.formaPago || '')) : React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12 } }, 'Sin ventas registradas.'));
    return React.createElement(Card, { key: cliente.id, style: { padding: 0, marginBottom: 8, opacity: cliente.activo === false ? .65 : 1 } }, resumen, acciones, historialVista);
  });
  return React.createElement('div', { style: { padding: '16px 12px' } },
    React.createElement(Row, { style: { justifyContent: 'space-between', marginBottom: 12 } }, React.createElement('div', { style: { fontSize: 20, fontWeight: 800 } }, 'Clientes fijos'), puedeCrear && React.createElement(BFill, { onClick: nuevaFicha }, '+ Nuevo')),
    React.createElement(Inp, { placeholder: 'Buscar cliente, ID fijo o localidad…', value: q, onChange: e => setQ(e.target.value), style: { marginBottom: 12 } }),
    React.createElement(FiltroClientes, { titulo: 'ESTADO', valor: filtroEstado, onChange: setFiltroEstado, opciones: [{ valor: 'todos', texto: 'Todos' }, { valor: 'activos', texto: 'Activos' }, { valor: 'inactivos', texto: 'Inactivos' }], contar: valor => contar(cliente => valor === 'todos' || valor === 'activos' && cliente.activo !== false || valor === 'inactivos' && cliente.activo === false) }),
    React.createElement(FiltroClientes, { titulo: 'CRÉDITO', valor: filtroCredito, onChange: setFiltroCredito, opciones: [{ valor: 'todos', texto: 'Todos' }, { valor: 'credito', texto: 'Con crédito' }, { valor: 'sin-credito', texto: 'Sin crédito' }], contar: valor => contar(cliente => valor === 'todos' || valor === 'credito' && Number(cmap[cliente.id] || 0) > 0 || valor === 'sin-credito' && Number(cmap[cliente.id] || 0) <= 0) }),
    React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', fontWeight: 800, marginBottom: 6 } }, 'LOCALIDAD'),
    React.createElement('select', { value: filtroLocalidad, onChange: e => setFiltroLocalidad(e.target.value), style: { width: '100%', padding: 9, marginBottom: 12 } }, React.createElement('option', { value: 'todos' }, 'Todas las localidades (' + contar(() => true) + ')'), React.createElement('option', { value: LOCALIDAD_SIN_CLASIFICAR }, 'Sin localidad (' + contar(cliente => !localidadDeCliente(cliente)) + ')'), localidades.map(localidad => React.createElement('option', { key: localidad, value: localidad }, localidad + ' (' + contar(cliente => claveLocalidad(localidadDeCliente(cliente)) === claveLocalidad(localidad)) + ')'))),
    React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', marginBottom: 12 } }, list.length + ' cliente(s) encontrado(s). La lista está agrupada por localidad.'),
    tarjetas,
    editor,
    detalle);
}
