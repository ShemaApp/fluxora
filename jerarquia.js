function JerarquiaPanel({ zonas = [], clientes = [], currentUser = {} }) {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({ nombre: '', localidades: '', choferId: '', vehiculo: '', medidorId: '', litrosPorUnidad: '20', incrementoContadorPorUnidad: '2' });
  const [busqueda, setBusqueda] = useState('');
  const [filtroZona, setFiltroZona] = useState('todas');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (currentUser.role !== 'admin') return undefined;
    return db.collection('usuarios').where('role', '==', 'repartidor').onSnapshot(
      snap => setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setUsuarios([])
    );
  }, [currentUser.role]);

  const mostrar = m => {
    setMensaje(m);
    setTimeout(() => setMensaje(''), 2800);
  };
  const zonasActivas = (zonas || []).filter(z => z.activo !== false).sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
  const choferNombre = id => usuarios.find(u => u.id === id)?.nombre || '';
  const zonaPorId = id => zonasActivas.find(z => z.id === id);

  const guardarZona = async e => {
    e.preventDefault();
    const nombre = form.nombre.trim();
    const localidades = form.localidades.split(',').map(v => v.trim()).filter(Boolean);
    if (!nombre) return mostrar('Escribe el nombre de la zona');
    if (!localidades.length) return mostrar('Agrega al menos una localidad a la zona');
    if (!form.choferId) return mostrar('Cada zona debe tener un chofer asignado');
    if (!form.vehiculo.trim()) return mostrar('Cada zona debe tener un vehículo asignado');
    if (!form.medidorId.trim()) return mostrar('Cada vehículo debe tener un medidor asociado');
    if (!Number.isFinite(Number(form.litrosPorUnidad)) || Number(form.litrosPorUnidad) <= 0) return mostrar('Captura litros por unidad válidos');
    if (!Number.isFinite(Number(form.incrementoContadorPorUnidad)) || Number(form.incrementoContadorPorUnidad) <= 0) return mostrar('Captura un incremento físico válido');
    if (zonasActivas.some(z => String(z.nombre || '').trim().toLowerCase() === nombre.toLowerCase())) return mostrar('Ya existe una zona con ese nombre');
    setGuardando(true);
    try {
      await db.collection('zonas').add({
        nombre,
        localidades,
        choferId: form.choferId,
        choferNombre: choferNombre(form.choferId),
        vehiculo: form.vehiculo.trim(),
        medidorId: form.medidorId.trim(),
        litrosPorUnidad: Number(form.litrosPorUnidad),
        incrementoContadorPorUnidad: Number(form.incrementoContadorPorUnidad),
        lecturaActual: null,
        activo: true,
        creadoPorUid: currentUser.uid,
        creadoPorNombre: currentUser.nombre || '',
        fechaCreacion: new Date().toISOString()
      });
      setForm({ nombre: '', localidades: '', choferId: '', vehiculo: '', medidorId: '', litrosPorUnidad: '20', incrementoContadorPorUnidad: '2' });
      mostrar('Zona creada y ligada al chofer');
    } catch (e2) {
      mostrar('No se pudo crear la zona: ' + e2.message);
    }
    setGuardando(false);
  };

  const actualizarVehiculo = async (zona, vehiculo) => {
    const valor = String(vehiculo || '').trim();
    if (!valor || valor === String(zona.vehiculo || '').trim()) return;
    try {
      await db.collection('zonas').doc(zona.id).update({ vehiculo: valor, actualizadoEn: new Date().toISOString(), actualizadoPorUid: currentUser.uid });
      await Promise.all((clientes || []).filter(c => c.zonaId === zona.id).map(c => db.collection('clientes').doc(c.id).update({ zonaVehiculo: valor })));
      mostrar('Vehículo de la zona actualizado');
    } catch (e) {
      mostrar('No se pudo actualizar el vehículo: ' + e.message);
    }
  };

  const cambiarChofer = async (zona, choferId) => {
    try {
      await db.collection('zonas').doc(zona.id).update({
        choferId,
        choferNombre: choferNombre(choferId),
        actualizadoEn: new Date().toISOString(),
        actualizadoPorUid: currentUser.uid
      });
      await Promise.all((clientes || []).filter(c => c.zonaId === zona.id).map(c => db.collection('clientes').doc(c.id).update({
        zonaNombre: zona.nombre,
        zonaChoferId: choferId,
        zonaChoferNombre: choferNombre(choferId),
        zonaVehiculo: zona.vehiculo || ''
      })));
      mostrar('Chofer de la zona actualizado');
    } catch (e) {
      mostrar('No se pudo actualizar la asignación: ' + e.message);
    }
  };

  const asignarCliente = async (cliente, zonaId) => {
    const zona = zonaPorId(zonaId);
    if (!zona) return;
    const localidadCliente = String(cliente.localidad || cliente.domicilio || '').trim().toLowerCase();
    const localidadesZona = (zona.localidades || []).map(v => String(v).trim().toLowerCase()).filter(Boolean);
    if (!localidadCliente || !localidadesZona.includes(localidadCliente)) {
      mostrar('La localidad del cliente no pertenece a esa zona');
      return;
    }
    try {
      await db.collection('clientes').doc(cliente.id).update({
        zonaId: zona.id,
        zonaNombre: zona.nombre,
        zonaChoferId: zona.choferId,
        zonaChoferNombre: zona.choferNombre || choferNombre(zona.choferId),
        zonaVehiculo: zona.vehiculo || ''
      });
      mostrar('Cliente ligado a ' + zona.nombre);
    } catch (e) {
      mostrar('No se pudo asignar el cliente: ' + e.message);
    }
  };

  if (currentUser.role !== 'admin') return React.createElement('div', { style: { padding: 30, textAlign: 'center', color: 'var(--ink-faint)' } }, 'Solo la Empresa Administrativa puede configurar la jerarquía.');

  const clientesFiltrados = clientes.filter(c => {
    const q = busqueda.toLowerCase().trim();
    const coincideTexto = !q || `${c.nombre || ''} ${c.identificacion || c.id || ''} ${c.localidad || c.domicilio || ''}`.toLowerCase().includes(q);
    const coincideZona = filtroZona === 'todas' ? true : filtroZona === 'sin-zona' ? !c.zonaId : c.zonaId === filtroZona;
    return c.activo !== false && coincideTexto && coincideZona;
  });

  const choferOptions = [React.createElement('option', { key: 'sin-chofer', value: '' }, 'Sin chofer')].concat(
    usuarios.map(u => React.createElement('option', { key: u.id, value: u.id }, u.nombre || u.email))
  );
  const zonaCards = zonasActivas.length ? zonasActivas.map(z => React.createElement('div', { key: z.id, style: { borderBottom: '1px solid var(--line)', padding: '5px 0 9px', marginBottom: 7 } },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' } },
      React.createElement('div', null, React.createElement('strong', null, z.nombre), React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 } }, (clientes || []).filter(c => c.zonaId === z.id).length, ' clientes')),
      React.createElement('div', { style: { display: 'grid', gap: 5, minWidth: 145 } }, React.createElement('select', { value: z.choferId || '', onChange: e => cambiarChofer(z, e.target.value), style: { maxWidth: 150, padding: 6, borderRadius: 7, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 11 } }, choferOptions), React.createElement('input', { defaultValue: z.vehiculo || '', placeholder: 'Vehículo', onBlur: e => actualizarVehiculo(z, e.target.value), style: { maxWidth: 150, padding: 6, borderRadius: 7, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 11 } }), React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 4 } }, React.createElement('input', { defaultValue: z.medidorId || '', placeholder: 'Medidor', onBlur: e => db.collection('zonas').doc(z.id).update({ medidorId: e.target.value.trim(), actualizadoEn: new Date().toISOString(), actualizadoPorUid: currentUser.uid }), style: { width: '100%', minWidth: 0, padding: 6, borderRadius: 7, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 11 } }), React.createElement('input', { defaultValue: z.litrosPorUnidad || 20, type: 'number', min: 0.01, step: 0.01, title: 'Litros por unidad comercial', placeholder: 'L/unidad', onBlur: e => db.collection('zonas').doc(z.id).update({ litrosPorUnidad: Number(e.target.value) || 20, actualizadoEn: new Date().toISOString(), actualizadoPorUid: currentUser.uid }), style: { width: '100%', minWidth: 0, padding: 6, borderRadius: 7, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 11 } }), React.createElement('input', { defaultValue: z.incrementoContadorPorUnidad || 2, type: 'number', min: 0.0001, step: 0.0001, title: 'Incremento físico del medidor por unidad comercial', placeholder: '+contador', onBlur: e => db.collection('zonas').doc(z.id).update({ incrementoContadorPorUnidad: Number(e.target.value) || 2, actualizadoEn: new Date().toISOString(), actualizadoPorUid: currentUser.uid }), style: { width: '100%', minWidth: 0, padding: 6, borderRadius: 7, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 11 } })))
    ),
    React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 } }, 'Localidades: ', (z.localidades || []).join(', ') || 'Sin localidades capturadas')
  )) : React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12 } }, 'Aún no hay zonas configuradas.');

  const zonaOptions = [React.createElement('option', { key: 'sin-zona', value: '' }, 'Asignar zona')].concat(
    zonasActivas.map(z => React.createElement('option', { key: z.id, value: z.id }, z.nombre))
  );
  const clienteRows = clientesFiltrados.slice(0, 100).map(c => React.createElement('div', { key: c.id, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--line)' } },
    React.createElement('div', { style: { minWidth: 0 } },
      React.createElement('div', { style: { fontWeight: 700, fontSize: 13 } }, c.nombre || 'Cliente sin nombre'),
      React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 11, marginTop: 3 } }, 'ID ', c.identificacion || c.id, ' · ', c.localidad || c.domicilio || 'Sin localidad')
    ),
    React.createElement('select', { value: c.zonaId || '', onChange: e => asignarCliente(c, e.target.value), style: { maxWidth: 140, padding: 7, borderRadius: 7, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 11 } }, zonaOptions)
  ));

  return React.createElement('div', { style: { padding: '14px 12px 28px' } },
    React.createElement('div', { style: { marginBottom: 16 } },
      React.createElement('div', { style: { fontSize: 21, fontWeight: 800 } }, 'Jerarquía operativa'),
      React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, lineHeight: 1.45 } }, 'La Empresa define zonas y localidades; cada zona tiene un chofer exclusivo y cada cliente fijo pertenece a una zona.')
    ),
    mensaje && React.createElement('div', { style: { background: 'var(--ok-bg)', color: 'var(--ok-text)', borderRadius: 9, padding: '10px 12px', fontSize: 12, fontWeight: 700, marginBottom: 12 } }, mensaje),
    React.createElement('div', { style: { display: 'grid', gap: 8, marginBottom: 18 } },
      React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 11, fontWeight: 800, letterSpacing: '.08em' } }, 'EMPRESA ADMINISTRATIVA'),
      React.createElement('div', { style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 13, fontSize: 13 } }, 'Reportes globales de todas las zonas y control de asignaciones.'),
      React.createElement('div', { style: { textAlign: 'center', color: 'var(--ink-faint)', fontSize: 18 } }, '↓'),
      React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 11, fontWeight: 800, letterSpacing: '.08em' } }, 'CHOFERES Y ZONAS'),
      React.createElement('div', { style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 13 } }, zonaCards),
      React.createElement('div', { style: { textAlign: 'center', color: 'var(--ink-faint)', fontSize: 18 } }, '↓'),
      React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 11, fontWeight: 800, letterSpacing: '.08em' } }, 'CLIENTES FIJOS'),
      React.createElement('div', { style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 13, fontSize: 12 } }, 'Cada cliente debe tener una zona y queda ligado automáticamente al chofer de esa zona.')
    ),
    React.createElement('form', { onSubmit: guardarZona, style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 14, marginBottom: 18 } },
      React.createElement('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 10 } }, 'Crear zona'),
      React.createElement('input', { value: form.nombre, onChange: e => setForm(f => ({ ...f, nombre: e.target.value })), placeholder: 'Nombre de zona (ej. Zona Norte)', style: { width: '100%', boxSizing: 'border-box', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }),
      React.createElement('input', { value: form.localidades, onChange: e => setForm(f => ({ ...f, localidades: e.target.value })), placeholder: 'Localidades separadas por coma', style: { width: '100%', boxSizing: 'border-box', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }),
      React.createElement('input', { value: form.vehiculo, onChange: e => setForm(f => ({ ...f, vehiculo: e.target.value })), placeholder: 'Vehículo (ej. Pipa 01)', style: { width: '100%', boxSizing: 'border-box', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }),
      React.createElement('input', { value: form.medidorId, onChange: e => setForm(f => ({ ...f, medidorId: e.target.value })), placeholder: 'ID del medidor asociado', style: { width: '100%', boxSizing: 'border-box', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }),
      React.createElement('input', { value: form.litrosPorUnidad, onChange: e => setForm(f => ({ ...f, litrosPorUnidad: e.target.value })), type: 'number', min: 0.01, step: 0.01, placeholder: 'Litros por unidad comercial', style: { width: '100%', boxSizing: 'border-box', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }),
      React.createElement('input', { value: form.incrementoContadorPorUnidad, onChange: e => setForm(f => ({ ...f, incrementoContadorPorUnidad: e.target.value })), type: 'number', min: 0.0001, step: 0.0001, placeholder: 'Incremento físico por unidad', style: { width: '100%', boxSizing: 'border-box', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }),
      React.createElement('select', { value: form.choferId, onChange: e => setForm(f => ({ ...f, choferId: e.target.value })), style: { width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }, choferOptions.slice(1)),
      React.createElement('button', { type: 'submit', disabled: guardando, style: { width: '100%', padding: 12, border: 0, borderRadius: 9, background: 'var(--accent)', color: 'var(--ink)', fontWeight: 800, cursor: 'pointer' } }, guardando ? 'Guardando…' : 'Crear zona')
    ),
    React.createElement('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 8 } }, 'Asignación de clientes fijos'),
    React.createElement('input', { value: busqueda, onChange: e => setBusqueda(e.target.value), placeholder: 'Buscar cliente, ID o localidad…', style: { width: '100%', boxSizing: 'border-box', padding: 11, borderRadius: 9, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', marginBottom: 8 } }),
    React.createElement('select', { value: filtroZona, onChange: e => setFiltroZona(e.target.value), style: { width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } },
      React.createElement('option', { value: 'todas' }, 'Todas las zonas'),
      React.createElement('option', { value: 'sin-zona' }, 'Sin zona asignada'),
      zonasActivas.map(z => React.createElement('option', { key: z.id, value: z.id }, z.nombre + ' · ' + (z.choferNombre || 'sin chofer')))
    ),
    React.createElement('div', null, clienteRows, clientesFiltrados.length === 0 && React.createElement('div', { style: { padding: 20, color: 'var(--ink-faint)', textAlign: 'center', fontSize: 12 } }, 'No hay clientes con ese filtro.'))
  );
}
