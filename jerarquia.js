/* jerarquia.js — Localidad como unidad operativa.
   La localidad fija el alcance del repartidor; vehículo y medidor siguen siendo
   referencias separadas que se seleccionan desde sus catálogos. */
function JerarquiaPanel({ clientes = [], localidades = [], vehiculos = [], medidores = [], currentUser = {} }) {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({ nombre: '', repartidorId: '', vehiculoId: '', medidorId: '' });
  const [busqueda, setBusqueda] = useState('');
  const [filtroLocalidad, setFiltroLocalidad] = useState('todas');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (currentUser.role !== 'admin') return undefined;
    return db.collection(COLECCIONES.USUARIOS).where('role', '==', 'repartidor').onSnapshot(
      snap => setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'))),
      () => setUsuarios([])
    );
  }, [currentUser.role]);

  const normalizar = valor => String(valor || '').trim().replace(/\s+/g, ' ');
  const clave = valor => normalizar(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const mostrar = texto => {
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 3000);
  };
  const localidadesActivas = (localidades || []).filter(l => l.activo !== false).slice().sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
  const nombreRepartidor = id => usuarios.find(u => u.id === id)?.nombre || '';
  const localidadPorId = id => localidadesActivas.find(l => l.id === id);
  const vehiculoPorId = id => (vehiculos || []).find(v => v.id === id);
  const medidorPorId = id => (medidores || []).find(m => m.id === id);
  const localidadDeCliente = cliente => {
    const porId = localidadPorId(cliente.localidadId);
    return normalizar(porId?.nombre || cliente.localidadNombre || cliente.localidad || cliente.domicilio || '');
  };
  const clientesDeLocalidad = localidad => clientes.filter(cliente => cliente.activo !== false && (cliente.localidadId === localidad.id || (!cliente.localidadId && clave(localidadDeCliente(cliente)) === clave(localidad.nombre))));

  const guardarLocalidad = async e => {
    e.preventDefault();
    const nombre = normalizar(form.nombre);
    if (!nombre) return mostrar('Escribe el nombre de la localidad');
    if (localidadesActivas.some(l => clave(l.nombre) === clave(nombre) && l.id !== form.id)) return mostrar('Ya existe esa localidad en el catálogo');
    const vehiculo = vehiculoPorId(form.vehiculoId);
    const medidor = medidorPorId(form.medidorId || vehiculo?.medidorId);
    setGuardando(true);
    try {
      const payload = {
        nombre,
        activo: true,
        repartidorId: form.repartidorId || '',
        repartidorNombre: nombreRepartidor(form.repartidorId) || '',
        vehiculoId: form.vehiculoId || '',
        vehiculoNombre: vehiculo?.nombre || vehiculo?.codigo || '',
        medidorId: medidor?.id || form.medidorId || '',
        medidorNombre: medidor?.nombre || medidor?.codigo || '',
        actualizadoPorUid: currentUser.uid,
        actualizadoEn: new Date().toISOString()
      };
      if (form.id) await db.collection(COLECCIONES.LOCALIDADES).doc(form.id).update(payload);
      else await db.collection(COLECCIONES.LOCALIDADES).add({ ...payload, creadoPorUid: currentUser.uid, creadoPorNombre: currentUser.nombre || '', fechaCreacion: new Date().toISOString() });
      setForm({ nombre: '', repartidorId: '', vehiculoId: '', medidorId: '' });
      mostrar(form.id ? 'Localidad actualizada' : 'Localidad creada y disponible para asignación');
    } catch (e2) {
      mostrar('No se pudo guardar la localidad: ' + e2.message);
    }
    setGuardando(false);
  };

  const actualizarAsignacion = async (localidad, cambios) => {
    const siguiente = { ...cambios };
    if (Object.prototype.hasOwnProperty.call(cambios, 'repartidorId')) siguiente.repartidorNombre = nombreRepartidor(cambios.repartidorId);
    if (Object.prototype.hasOwnProperty.call(cambios, 'vehiculoId')) {
      const vehiculo = vehiculoPorId(cambios.vehiculoId);
      siguiente.vehiculoNombre = vehiculo?.nombre || vehiculo?.codigo || '';
      if (vehiculo?.medidorId && !Object.prototype.hasOwnProperty.call(cambios, 'medidorId')) {
        siguiente.medidorId = vehiculo.medidorId;
        const medidor = medidorPorId(vehiculo.medidorId);
        siguiente.medidorNombre = medidor?.nombre || medidor?.codigo || '';
      }
    }
    if (Object.prototype.hasOwnProperty.call(cambios, 'medidorId')) {
      const medidor = medidorPorId(cambios.medidorId);
      siguiente.medidorNombre = medidor?.nombre || medidor?.codigo || '';
    }
    try {
      await db.collection(COLECCIONES.LOCALIDADES).doc(localidad.id).update({ ...siguiente, actualizadoPorUid: currentUser.uid, actualizadoEn: new Date().toISOString() });
      mostrar('Asignación de localidad actualizada');
    } catch (e) {
      mostrar('No se pudo actualizar la asignación: ' + e.message);
    }
  };

  const asignarCliente = async (cliente, localidadId) => {
    const localidad = localidadPorId(localidadId);
    if (!localidad) return;
    try {
      await db.collection(COLECCIONES.CLIENTES).doc(cliente.id).update({
        localidadId: localidad.id,
        localidadNombre: localidad.nombre,
        localidad: localidad.nombre,
        zonaId: firebase.firestore.FieldValue.delete(),
        zonaNombre: firebase.firestore.FieldValue.delete(),
        zonaChoferId: firebase.firestore.FieldValue.delete(),
        zonaChoferNombre: firebase.firestore.FieldValue.delete(),
        zonaVehiculo: firebase.firestore.FieldValue.delete()
      });
      mostrar('Cliente ligado a ' + localidad.nombre);
    } catch (e) {
      mostrar('No se pudo asignar el cliente: ' + e.message);
    }
  };

  if (currentUser.role !== 'admin') return React.createElement('div', { style: { padding: 30, textAlign: 'center', color: 'var(--ink-faint)' } }, 'Solo la Empresa Administrativa puede configurar localidades y asignaciones.');

  const clientesFiltrados = clientes.filter(cliente => {
    const q = busqueda.toLowerCase().trim();
    const texto = `${cliente.nombre || ''} ${cliente.identificacion || cliente.id || ''} ${localidadDeCliente(cliente)}`.toLowerCase();
    const coincideTexto = !q || texto.includes(q);
    const coincideLocalidad = filtroLocalidad === 'todas' ? true : filtroLocalidad === 'sin-localidad' ? !cliente.localidadId && !localidadPorId(cliente.localidadId) : cliente.localidadId === filtroLocalidad || clave(localidadDeCliente(cliente)) === clave(localidadPorId(filtroLocalidad)?.nombre);
    return cliente.activo !== false && coincideTexto && coincideLocalidad;
  });
  const repartidorOptions = [React.createElement('option', { key: 'sin-repartidor', value: '' }, 'Sin repartidor')].concat(usuarios.map(u => React.createElement('option', { key: u.id, value: u.id }, u.nombre || u.email)));
  const vehiculoOptions = [React.createElement('option', { key: 'sin-vehiculo', value: '' }, 'Sin vehículo')].concat((vehiculos || []).filter(v => v.activo !== false).map(v => React.createElement('option', { key: v.id, value: v.id }, v.nombre || v.codigo || v.id)));
  const medidorOptions = [React.createElement('option', { key: 'sin-medidor', value: '' }, 'Sin medidor')].concat((medidores || []).filter(m => m.activo !== false).map(m => React.createElement('option', { key: m.id, value: m.id }, m.nombre || m.codigo || m.id)));
  const localidadCards = localidadesActivas.length ? localidadesActivas.map(localidad => {
    const vehiculo = vehiculoPorId(localidad.vehiculoId);
    const medidor = medidorPorId(localidad.medidorId);
    const clientesLocalidad = clientesDeLocalidad(localidad);
    return React.createElement('div', { key: localidad.id, className: 'fx-assignment-row', style: { borderBottom: '1px solid var(--line)', padding: '10px 0', marginBottom: 6 } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' } },
        React.createElement('div', null,
          React.createElement('strong', null, localidad.nombre),
          React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 } }, clientesLocalidad.length, ' clientes · ', localidad.repartidorNombre || 'Sin repartidor'),
          React.createElement('div', { style: { fontSize: 10, color: 'var(--ink-faint)', marginTop: 3 } }, 'ID localidad: ', localidad.id)
        ),
        React.createElement('span', { style: { color: localidad.repartidorId ? 'var(--ok-text)' : 'var(--warn-text)', fontSize: 11, fontWeight: 800 } }, localidad.repartidorId ? 'Asignada' : 'Pendiente')
      ),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 5, marginTop: 8 } },
        React.createElement('select', { value: localidad.repartidorId || '', onChange: e => actualizarAsignacion(localidad, { repartidorId: e.target.value }), style: { minWidth: 0, padding: 7, borderRadius: 7, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 10 } }, repartidorOptions),
        React.createElement('select', { value: localidad.vehiculoId || '', onChange: e => actualizarAsignacion(localidad, { vehiculoId: e.target.value }), style: { minWidth: 0, padding: 7, borderRadius: 7, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 10 } }, vehiculoOptions),
        React.createElement('select', { value: localidad.medidorId || '', onChange: e => actualizarAsignacion(localidad, { medidorId: e.target.value }), style: { minWidth: 0, padding: 7, borderRadius: 7, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 10 } }, medidorOptions)
      ),
      React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 10, marginTop: 5 } }, 'Vehículo: ', vehiculo?.nombre || localidad.vehiculoNombre || 'Sin vehículo', ' · Medidor: ', medidor?.nombre || localidad.medidorNombre || 'Sin medidor')
    );
  }) : React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12 } }, 'Aún no hay localidades configuradas.');
  const localidadOptions = [React.createElement('option', { key: 'sin-localidad', value: '' }, 'Asignar localidad')].concat(localidadesActivas.map(l => React.createElement('option', { key: l.id, value: l.id }, l.nombre + (l.repartidorNombre ? ' · ' + l.repartidorNombre : ''))));

  return React.createElement('div', { className: 'fx-page-hierarchy', style: { padding: '14px 12px 28px' } },
    React.createElement('div', { style: { marginBottom: 16 } },
      React.createElement('div', { style: { fontSize: 21, fontWeight: 800 } }, 'Localidades operativas'),
      React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, lineHeight: 1.45 } }, 'Cada cliente fijo pertenece a una localidad. Cada localidad se asigna a un solo repartidor y conserva su vehículo y medidor de operación.')
    ),
    mensaje && React.createElement('div', { style: { background: 'var(--ok-bg)', color: 'var(--ok-text)', borderRadius: 9, padding: '10px 12px', fontSize: 12, fontWeight: 700, marginBottom: 12 } }, mensaje),
    React.createElement('div', { style: { display: 'grid', gap: 8, marginBottom: 18 } },
      React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 11, fontWeight: 800, letterSpacing: '.08em' } }, 'EMPRESA ADMINISTRATIVA'),
      React.createElement('div', { style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 13, fontSize: 13 } }, 'Catálogo de localidades y asignaciones operativas.'),
      React.createElement('div', { style: { textAlign: 'center', color: 'var(--ink-faint)', fontSize: 18 } }, '↓'),
      React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 11, fontWeight: 800, letterSpacing: '.08em' } }, 'LOCALIDADES → REPARTIDORES'),
      React.createElement('div', { style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 13 } }, localidadCards),
      React.createElement('div', { style: { textAlign: 'center', color: 'var(--ink-faint)', fontSize: 18 } }, '↓'),
      React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 11, fontWeight: 800, letterSpacing: '.08em' } }, 'CLIENTES FIJOS'),
      React.createElement('div', { style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 13, fontSize: 12 } }, 'Cada cliente fijo se liga a una localidad y hereda el alcance del repartidor asignado a esa localidad.')
    ),
    React.createElement('form', { onSubmit: guardarLocalidad, style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 14, marginBottom: 18 } },
      React.createElement('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 10 } }, 'Crear localidad'),
      React.createElement('input', { value: form.nombre, onChange: e => setForm(f => ({ ...f, nombre: e.target.value })), placeholder: 'Nombre de localidad (ej. Campo Don Pedro)', style: { width: '100%', boxSizing: 'border-box', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }),
      React.createElement('select', { value: form.repartidorId, onChange: e => setForm(f => ({ ...f, repartidorId: e.target.value })), style: { width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }, repartidorOptions),
      React.createElement('select', { value: form.vehiculoId, onChange: e => { const v = vehiculoPorId(e.target.value); setForm(f => ({ ...f, vehiculoId: e.target.value, medidorId: v?.medidorId || f.medidorId })); }, style: { width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }, vehiculoOptions),
      React.createElement('select', { value: form.medidorId, onChange: e => setForm(f => ({ ...f, medidorId: e.target.value })), style: { width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }, medidorOptions),
      React.createElement('button', { type: 'submit', disabled: guardando, style: { width: '100%', padding: 12, border: 0, borderRadius: 9, background: 'var(--accent)', color: 'var(--ink)', fontWeight: 800, cursor: 'pointer' } }, guardando ? 'Guardando…' : 'Crear localidad')
    ),
    React.createElement('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 8 } }, 'Asignación de clientes fijos'),
    React.createElement('input', { value: busqueda, onChange: e => setBusqueda(e.target.value), placeholder: 'Buscar cliente, ID o localidad…', style: { width: '100%', boxSizing: 'border-box', padding: 11, borderRadius: 9, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', marginBottom: 8 } }),
    React.createElement('select', { value: filtroLocalidad, onChange: e => setFiltroLocalidad(e.target.value), style: { width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }, React.createElement('option', { value: 'todas' }, 'Todas las localidades'), React.createElement('option', { value: 'sin-localidad' }, 'Sin localidad asignada'), localidadesActivas.map(l => React.createElement('option', { key: l.id, value: l.id }, l.nombre + (l.repartidorNombre ? ' · ' + l.repartidorNombre : '')))),
    React.createElement('div', null, clientesFiltrados.slice(0, 100).map(cliente => React.createElement('div', { key: cliente.id, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--line)' } }, React.createElement('div', { style: { minWidth: 0 } }, React.createElement('div', { style: { fontWeight: 700, fontSize: 13 } }, cliente.nombre || 'Cliente sin nombre'), React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 11, marginTop: 3 } }, 'ID ', cliente.identificacion || cliente.id, ' · ', localidadDeCliente(cliente) || 'Sin localidad')), React.createElement('select', { value: cliente.localidadId || '', onChange: e => asignarCliente(cliente, e.target.value), style: { maxWidth: 175, padding: 7, borderRadius: 7, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 11 } }, localidadOptions))), clientesFiltrados.length === 0 && React.createElement('div', { style: { padding: 20, color: 'var(--ink-faint)', textAlign: 'center', fontSize: 12 } }, 'No hay clientes con ese filtro.'))
  );
}
