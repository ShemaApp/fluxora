function GestionFlota({ currentUser = {}, medicion = null, vehiculos = [], medidores = [] }) {
  const esAdmin = currentUser.role === 'admin';
  const [vehiculoForm, setVehiculoForm] = useState(null);
  const [medidorForm, setMedidorForm] = useState(null);
  const [historialPorMedidor, setHistorialPorMedidor] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!esAdmin) return undefined;
    return db.collection(COLECCIONES.LECTURAS_MEDIDOR).onSnapshot(snap => {
      const resumen = {};
      snap.docs.forEach(doc => {
        const lectura = doc.data() || {};
        if (lectura.medidorId) resumen[lectura.medidorId] = (resumen[lectura.medidorId] || 0) + 1;
      });
      setHistorialPorMedidor(resumen);
    }, () => setHistorialPorMedidor({}));
  }, [esAdmin]);

  const mostrar = (texto, esError = false) => {
    if (esError) setError(texto); else setMensaje(texto);
    setTimeout(() => { setMensaje(''); setError(''); }, 3500);
  };
  const medidorPorId = id => (medidores || []).find(item => item.id === id);
  const nombreMedidor = id => medidorPorId(id)?.nombre || medidorPorId(id)?.codigo || id || 'Sin medidor';
  const historialMedidor = medidor => Math.max(Number(medidor?.historialLecturasCount || 0), Number(historialPorMedidor[medidor?.id] || 0));
  const estiloSeccion = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 13, marginBottom: 14 };
  const estiloBoton = { padding: '8px 10px', border: 0, borderRadius: 8, background: 'var(--accent)', color: 'var(--ink)', fontWeight: 800, fontSize: 11 };
  const iniciarVehiculo = vehiculo => setVehiculoForm(vehiculo ? { ...vehiculo, medidorId: vehiculo.medidorId || '', nuevoMedidor: false, nuevoMedidorNombre: '', nuevoMedidorCodigo: '' } : { nombre: '', codigo: '', placa: '', tipo: 'Vehículo de reparto', activo: true, medidorId: '', nuevoMedidor: false, nuevoMedidorNombre: '', nuevoMedidorCodigo: '' });
  const iniciarMedidor = medidor => setMedidorForm(medidor ? { ...medidor, nombre: medidor.nombre || '', codigo: medidor.codigo || '', digitos: 6, litrosPorIncremento: medidor.litrosPorIncremento ?? 10, tipo: medidor.tipo || medicion?.tipoMedidor || 'Medidor de flujo volumétrico', modoLectura: 'acumulativa', unidadMostrada: medidor.unidadMostrada || medicion?.unidadMostrada || 'Número rojo', resolucion: medidor.resolucion ?? medicion?.resolucion ?? 0.1, decimales: medidor.decimales ?? medicion?.decimales ?? 1, activo: medidor.activo !== false } : { nombre: '', codigo: '', digitos: 6, litrosPorIncremento: 10, tipo: medicion?.tipoMedidor || 'Medidor de flujo volumétrico', modoLectura: 'acumulativa', unidadMostrada: medicion?.unidadMostrada || 'Número rojo', resolucion: medicion?.resolucion ?? 0.1, decimales: medicion?.decimales ?? 1, activo: true });
  const campo = (label, key, form, setForm, props = {}) => React.createElement('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 9 } }, label, React.createElement('input', { ...props, value: form[key] ?? '', onChange: e => setForm(actual => ({ ...actual, [key]: e.target.value })), style: { width: '100%', boxSizing: 'border-box', marginTop: 4, padding: 9, border: '1px solid var(--line-strong)', borderRadius: 7, background: 'var(--surface)', color: 'var(--ink)' } }));

  const guardarMedidor = async () => {
    if (!esAdmin || !medidorForm) return;
    const nombre = String(medidorForm.nombre || '').trim();
    const codigo = String(medidorForm.codigo || '').trim();
    const litrosPorIncremento = Number(medidorForm.litrosPorIncremento);
    const resolucion = Number(medidorForm.resolucion);
    const decimales = Number(medidorForm.decimales);
    if (!nombre || !codigo) return mostrar('Captura nombre y código del medidor.', true);
    if (Number(medidorForm.digitos) !== 6) return mostrar('El medidor debe conservar exactamente 6 dígitos.', true);
    if (!Number.isFinite(litrosPorIncremento) || litrosPorIncremento <= 0 || !Number.isFinite(resolucion) || resolucion <= 0 || !Number.isInteger(decimales) || decimales < 0) return mostrar('Revisa la escala física del medidor.', true);
    if ((medidores || []).some(item => item.id !== medidorForm.id && String(item.codigo || '').trim().toLowerCase() === codigo.toLowerCase())) return mostrar('Ese código de medidor ya existe.', true);
    const datos = {
      nombre, codigo, digitos: 6, litrosPorIncremento,
      tipo: String(medidorForm.tipo || '').trim() || 'Medidor de flujo volumétrico',
      modoLectura: 'acumulativa', unidadMostrada: String(medidorForm.unidadMostrada || '').trim() || 'Número rojo', resolucion, decimales,
      unidadComercial: medicion?.unidadComercial || 'Garrafón', litrosPorUnidad: Number(medicion?.litrosPorUnidad || 20),
      incrementoContadorPorUnidad: Number(medicion?.incrementoContadorPorUnidad || 2), precioPorUnidad: Number(medicion?.precioPorUnidad || 0),
      activo: medidorForm.activo !== false, actualizadoPorUid: currentUser.uid, actualizadoPorNombre: currentUser.nombre || '', actualizadoEn: new Date().toISOString()
    };
    setGuardando(true);
    try {
      const ref = medidorForm.id ? db.collection(COLECCIONES.MEDIDORES).doc(medidorForm.id) : db.collection(COLECCIONES.MEDIDORES).doc();
      const batch = db.batch();
      if (medidorForm.id) batch.update(ref, datos);
      else batch.set(ref, { ...datos, historialIniciado: false, historialLecturasCount: 0, ultimaLectura: null, lecturaInicial: null, lecturaFinal: null, creadoPorUid: currentUser.uid, creadoPorNombre: currentUser.nombre || '', creadoEn: new Date().toISOString() });
      await batch.commit();
      setMedidorForm(null);
      mostrar(medidorForm.id ? 'Medidor actualizado' : 'Medidor registrado; historial vacío hasta la primera jornada');
    } catch (e) { mostrar('No se pudo guardar el medidor: ' + e.message, true); }
    setGuardando(false);
  };

  const guardarVehiculo = async () => {
    if (!esAdmin || !vehiculoForm) return;
    const nombre = String(vehiculoForm.nombre || '').trim();
    const codigo = String(vehiculoForm.codigo || '').trim();
    const placa = String(vehiculoForm.placa || '').trim();
    const medidorExistente = medidorPorId(vehiculoForm.medidorId);
    const crearMedidor = !!vehiculoForm.nuevoMedidor;
    const nuevoMedidorNombre = String(vehiculoForm.nuevoMedidorNombre || '').trim();
    const nuevoMedidorCodigo = String(vehiculoForm.nuevoMedidorCodigo || '').trim();
    if (!nombre || !codigo) return mostrar('Captura nombre y código del vehículo.', true);
    if (crearMedidor && (!nuevoMedidorNombre || !nuevoMedidorCodigo)) return mostrar('Captura nombre y código del medidor nuevo.', true);
    if (!crearMedidor && vehiculoForm.medidorId && !medidorExistente) return mostrar('Selecciona un medidor válido.', true);
    if ((vehiculos || []).some(item => item.id !== vehiculoForm.id && String(item.codigo || '').trim().toLowerCase() === codigo.toLowerCase())) return mostrar('Ese código de vehículo ya existe.', true);
    if (crearMedidor && (medidores || []).some(item => String(item.codigo || '').trim().toLowerCase() === nuevoMedidorCodigo.toLowerCase())) return mostrar('Ese código de medidor ya existe.', true);
    if (!crearMedidor && vehiculoForm.medidorId && (vehiculos || []).some(item => item.id !== vehiculoForm.id && String(item.medidorId || '') === String(vehiculoForm.medidorId))) return mostrar('Ese medidor ya está asociado a otro vehículo.', true);
    setGuardando(true);
    try {
      const batch = db.batch();
      const vehiculoRef = vehiculoForm.id ? db.collection(COLECCIONES.VEHICULOS).doc(vehiculoForm.id) : db.collection(COLECCIONES.VEHICULOS).doc();
      let medidorId = vehiculoForm.medidorId || '';
      let medidorNombre = medidorExistente?.nombre || medidorExistente?.codigo || '';
      let medidorCodigo = medidorExistente?.codigo || '';
      if (crearMedidor) {
        const medidorRef = db.collection(COLECCIONES.MEDIDORES).doc();
        medidorId = medidorRef.id;
        medidorNombre = nuevoMedidorNombre;
        medidorCodigo = nuevoMedidorCodigo;
        batch.set(medidorRef, {
          nombre: nuevoMedidorNombre, codigo: nuevoMedidorCodigo, digitos: 6, litrosPorIncremento: 10,
          tipo: medicion?.tipoMedidor || 'Medidor de flujo volumétrico', modoLectura: 'acumulativa', unidadMostrada: medicion?.unidadMostrada || 'Número rojo',
          resolucion: Number(medicion?.resolucion || 0.1), decimales: Number.isInteger(Number(medicion?.decimales)) ? Number(medicion.decimales) : 1,
          unidadComercial: medicion?.unidadComercial || 'Garrafón', litrosPorUnidad: Number(medicion?.litrosPorUnidad || 20), incrementoContadorPorUnidad: Number(medicion?.incrementoContadorPorUnidad || 2), precioPorUnidad: Number(medicion?.precioPorUnidad || 0),
          activo: true, historialIniciado: false, historialLecturasCount: 0, ultimaLectura: null, lecturaInicial: null, lecturaFinal: null,
          creadoPorUid: currentUser.uid, creadoPorNombre: currentUser.nombre || '', creadoEn: new Date().toISOString()
        });
      }
      const datos = { nombre, codigo, placa, tipo: String(vehiculoForm.tipo || '').trim() || 'Vehículo de reparto', medidorId, medidorNombre, medidorCodigo, activo: vehiculoForm.activo !== false, actualizadoPorUid: currentUser.uid, actualizadoPorNombre: currentUser.nombre || '', actualizadoEn: new Date().toISOString() };
      if (vehiculoForm.id) batch.update(vehiculoRef, datos); else batch.set(vehiculoRef, { ...datos, creadoPorUid: currentUser.uid, creadoPorNombre: currentUser.nombre || '', creadoEn: new Date().toISOString() });
      await batch.commit();
      setVehiculoForm(null);
      mostrar(vehiculoForm.id ? 'Vehículo actualizado' : crearMedidor ? 'Vehículo y medidor registrados; historial vacío hasta la primera jornada' : 'Vehículo registrado');
    } catch (e) { mostrar('No se pudo guardar el vehículo: ' + e.message, true); }
    setGuardando(false);
  };

  const cambiarActivo = async (coleccion, item) => {
    try {
      await db.collection(coleccion).doc(item.id).update({ activo: item.activo === false, actualizadoPorUid: currentUser.uid, actualizadoEn: new Date().toISOString() });
      mostrar(item.activo === false ? 'Registro activado' : 'Registro desactivado');
    } catch (e) { mostrar('No se pudo cambiar el estado: ' + e.message, true); }
  };

  const renderMedidor = medidor => {
    const historial = historialMedidor(medidor);
    return React.createElement('div', { className: 'fx-flota-item fx-flota-medidor', key: medidor.id, style: { borderTop: '1px solid var(--line)', padding: '10px 0', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', opacity: medidor.activo === false ? .55 : 1 } },
      React.createElement('div', { style: { minWidth: 0 } }, React.createElement('strong', null, medidor.nombre || 'Medidor sin nombre'), React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 } }, 'Código ', medidor.codigo || medidor.id, ' · 6 dígitos · ', medidor.litrosPorIncremento || 10, ' L por incremento'), React.createElement('div', { style: { fontSize: 11, color: historial > 0 ? 'var(--ok-text)' : 'var(--ink-faint)', marginTop: 3 } }, historial > 0 ? 'Historial iniciado · ' + historial + ' lectura(s)' : 'Historial vacío · inicia al abrir la primera jornada')),
      React.createElement('div', { style: { display: 'flex', gap: 5 } }, React.createElement('button', { type: 'button', onClick: () => iniciarMedidor(medidor), style: { padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 7, background: 'var(--surface)', color: 'var(--ink)', fontSize: 10 } }, 'Editar'), React.createElement('button', { type: 'button', onClick: () => cambiarActivo(COLECCIONES.MEDIDORES, medidor), style: { padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 7, background: 'var(--surface)', color: 'var(--ink)', fontSize: 10 } }, medidor.activo === false ? 'Activar' : 'Desactivar'))
    );
  };

  const renderVehiculo = vehiculo => React.createElement('div', { className: 'fx-flota-item fx-flota-vehiculo', key: vehiculo.id, style: { borderTop: '1px solid var(--line)', padding: '10px 0', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', opacity: vehiculo.activo === false ? .55 : 1 } },
    React.createElement('div', { style: { minWidth: 0 } }, React.createElement('strong', null, vehiculo.nombre || 'Vehículo sin nombre'), React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 } }, 'Código ', vehiculo.codigo || vehiculo.id, vehiculo.placa ? ' · Placa ' + vehiculo.placa : '', ' · Medidor ', nombreMedidor(vehiculo.medidorId)), React.createElement('div', { style: { fontSize: 11, color: vehiculo.medidorId ? 'var(--ok-text)' : 'var(--warn-text)', marginTop: 3 } }, vehiculo.medidorId ? 'Medidor asociado' : 'Pendiente de medidor')),
    React.createElement('div', { style: { display: 'flex', gap: 5 } }, React.createElement('button', { type: 'button', onClick: () => iniciarVehiculo(vehiculo), style: { padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 7, background: 'var(--surface)', color: 'var(--ink)', fontSize: 10 } }, 'Editar'), React.createElement('button', { type: 'button', onClick: () => cambiarActivo(COLECCIONES.VEHICULOS, vehiculo), style: { padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 7, background: 'var(--surface)', color: 'var(--ink)', fontSize: 10 } }, vehiculo.activo === false ? 'Activar' : 'Desactivar'))
  );

  const renderMedidorForm = () => medidorForm && React.createElement('div', { className: 'fx-flota-form fx-flota-medidor-form', style: { background: 'var(--surface-2)', borderRadius: 9, padding: 10, marginTop: 10 } },
    campo('Nombre visible', 'nombre', medidorForm, setMedidorForm), campo('Código del medidor', 'codigo', medidorForm, setMedidorForm),
    React.createElement('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 9 } }, 'Dígitos físicos', React.createElement('input', { value: 6, disabled: true, style: { width: '100%', boxSizing: 'border-box', marginTop: 4, padding: 9, border: '1px solid var(--line)', borderRadius: 7, background: 'var(--surface-2)', color: 'var(--ink-soft)' } })),
    campo('Litros por incremento del contador', 'litrosPorIncremento', medidorForm, setMedidorForm, { type: 'number', min: 0.01, step: 0.01 }), campo('Tipo de medidor', 'tipo', medidorForm, setMedidorForm),
    React.createElement('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 9 } }, 'Modo de lectura', React.createElement('input', { value: 'acumulativa', disabled: true, style: { width: '100%', boxSizing: 'border-box', marginTop: 4, padding: 9, border: '1px solid var(--line)', borderRadius: 7, background: 'var(--surface-2)', color: 'var(--ink-soft)' } })),
    campo('Unidad mostrada', 'unidadMostrada', medidorForm, setMedidorForm),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } }, campo('Resolución', 'resolucion', medidorForm, setMedidorForm, { type: 'number', min: 0.0001, step: 0.0001 }), campo('Decimales', 'decimales', medidorForm, setMedidorForm, { type: 'number', min: 0, step: 1 })),
    React.createElement('label', { style: { display: 'block', fontSize: 11, marginBottom: 9 } }, React.createElement('input', { type: 'checkbox', checked: medidorForm.activo !== false, onChange: e => setMedidorForm(actual => ({ ...actual, activo: e.target.checked })) }), ' Activo'),
    React.createElement('div', { style: { display: 'flex', gap: 8 } }, React.createElement('button', { type: 'button', onClick: guardarMedidor, disabled: guardando, style: { flex: 1, padding: 10, border: 0, borderRadius: 8, background: 'var(--accent)', fontWeight: 800 } }, guardando ? 'Guardando…' : 'Guardar medidor'), React.createElement('button', { type: 'button', onClick: () => setMedidorForm(null), style: { flex: 1, padding: 10, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)' } }, 'Cancelar'))
  );

  const renderVehiculoForm = () => vehiculoForm && React.createElement('div', { className: 'fx-flota-form fx-flota-vehiculo-form', style: { background: 'var(--surface-2)', borderRadius: 9, padding: 10, marginTop: 10 } },
    campo('Nombre visible', 'nombre', vehiculoForm, setVehiculoForm), campo('Código del vehículo', 'codigo', vehiculoForm, setVehiculoForm), campo('Placa o identificador externo (opcional)', 'placa', vehiculoForm, setVehiculoForm), campo('Tipo', 'tipo', vehiculoForm, setVehiculoForm),
    React.createElement('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 9 } }, 'Medidor asociado', React.createElement('select', { value: vehiculoForm.nuevoMedidor ? '' : vehiculoForm.medidorId, disabled: vehiculoForm.nuevoMedidor, onChange: e => setVehiculoForm(actual => ({ ...actual, medidorId: e.target.value })), style: { width: '100%', marginTop: 4, padding: 9, border: '1px solid var(--line-strong)', borderRadius: 7, background: 'var(--surface)', color: 'var(--ink)' } }, React.createElement('option', { value: '' }, 'Sin medidor'), (medidores || []).filter(medidor => medidor.activo !== false).map(medidor => React.createElement('option', { key: medidor.id, value: medidor.id }, medidor.nombre || medidor.codigo || medidor.id)))),
    React.createElement('label', { style: { display: 'block', fontSize: 11, margin: '4px 0 9px' } }, React.createElement('input', { type: 'checkbox', checked: !!vehiculoForm.nuevoMedidor, onChange: e => setVehiculoForm(actual => ({ ...actual, nuevoMedidor: e.target.checked, medidorId: e.target.checked ? '' : actual.medidorId })) }), ' Registrar medidor nuevo junto con este vehículo'),
    vehiculoForm.nuevoMedidor && React.createElement('div', { style: { borderTop: '1px solid var(--line)', paddingTop: 9, marginTop: 4 } }, campo('Nombre del medidor nuevo', 'nuevoMedidorNombre', vehiculoForm, setVehiculoForm), campo('Código del medidor nuevo', 'nuevoMedidorCodigo', vehiculoForm, setVehiculoForm), React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 10, lineHeight: 1.4, marginBottom: 9 } }, 'Se registrará con 6 dígitos, lectura acumulativa, ', medicion?.litrosPorIncremento || 10, ' L por incremento y sin historial de lecturas.')),
    React.createElement('label', { style: { display: 'block', fontSize: 11, marginBottom: 9 } }, React.createElement('input', { type: 'checkbox', checked: vehiculoForm.activo !== false, onChange: e => setVehiculoForm(actual => ({ ...actual, activo: e.target.checked })) }), ' Activo'),
    React.createElement('div', { style: { display: 'flex', gap: 8 } }, React.createElement('button', { type: 'button', onClick: guardarVehiculo, disabled: guardando, style: { flex: 1, padding: 10, border: 0, borderRadius: 8, background: 'var(--accent)', fontWeight: 800 } }, guardando ? 'Guardando…' : 'Guardar vehículo'), React.createElement('button', { type: 'button', onClick: () => setVehiculoForm(null), style: { flex: 1, padding: 10, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)' } }, 'Cancelar'))
  );

  if (!esAdmin) return null;
  const equivalencia = medicion ? `Configuración equivalente: 1 ${medicion.unidadComercial || 'unidad'} = ${Number(medicion.litrosPorUnidad || 0).toFixed(2)} L y +${Number(medicion.incrementoContadorPorUnidad || 0).toFixed(4)} contador físico.` : 'La configuración equivalente se tomará de Medición y Venta.';
  const medidoresVista = (medidores || []).length ? medidores.map(renderMedidor) : React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12, padding: '9px 0' } }, 'No hay medidores registrados todavía.');
  const vehiculosVista = (vehiculos || []).length ? vehiculos.map(renderVehiculo) : React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12, padding: '9px 0' } }, 'No hay vehículos registrados todavía.');

  return React.createElement('div', { className: 'fx-page-flota', style: { padding: '16px 12px 28px', color: 'var(--ink)' } },
    React.createElement('div', { style: { fontSize: 22, fontWeight: 900, marginBottom: 4 } }, 'Vehículos y medidores'),
    React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 12, lineHeight: 1.45, marginBottom: 12 } }, 'Registra cada vehículo y su medidor como referencias separadas. Dar de alta un medidor no escribe ninguna lectura; el historial comienza cuando un REPARTIDOR abre su primera jornada.'),
    mensaje && React.createElement('div', { style: { background: 'var(--ok-bg)', color: 'var(--ok-text)', padding: 9, borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 8 } }, mensaje),
    error && React.createElement('div', { style: { background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: 9, borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 8 } }, error),
    React.createElement('div', { className: 'fx-flota-note', style: { background: 'var(--info-bg)', border: '1px solid var(--line)', borderRadius: 9, padding: 10, fontSize: 11, lineHeight: 1.45, marginBottom: 14 } }, equivalencia, ' La lectura física inicial y final pertenece a la jornada; el incremento entre clientes es lógico y calculado.'),
    React.createElement('section', { className: 'fx-flota-section', style: estiloSeccion }, React.createElement('div', { className: 'fx-flota-section-heading', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 } }, React.createElement('h3', { style: { margin: 0, fontSize: 16 } }, 'Medidores de flujo'), React.createElement('button', { type: 'button', onClick: () => iniciarMedidor(null), style: estiloBoton }, '+ Registrar medidor')), React.createElement('div', { className: 'fx-flota-section-note', style: { fontSize: 11, color: 'var(--ink-faint)', marginBottom: 10 } }, 'La existencia del medidor se registra aquí; su historial de lecturas se crea exclusivamente desde Jornada.'), medidoresVista, renderMedidorForm()),
    React.createElement('section', { className: 'fx-flota-section', style: estiloSeccion }, React.createElement('div', { className: 'fx-flota-section-heading', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 } }, React.createElement('h3', { style: { margin: 0, fontSize: 16 } }, 'Vehículos'), React.createElement('button', { type: 'button', onClick: () => iniciarVehiculo(null), style: estiloBoton }, '+ Registrar vehículo')), vehiculosVista, renderVehiculoForm())
  );
}
window.GestionFlota = GestionFlota;
