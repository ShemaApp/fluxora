/* medicion.js — configuración administrativa de medición y venta. */
function ConfiguracionMedicion({ currentUser = {}, medicion = null, tarifas = [] }) {
  const esAdmin = currentUser?.role === 'admin';
  const [form, setForm] = useState(() => ({
    unidadComercial: medicion?.unidadComercial || 'Garrafón',
    litrosPorUnidad: String(medicion?.litrosPorUnidad ?? 20),
    incrementoContadorPorUnidad: String(medicion?.incrementoContadorPorUnidad ?? 2),
    precioPorUnidad: String(medicion?.precioPorUnidad ?? 15),
    unidadActivo: medicion?.unidadActivo !== false,
    medidorNombre: medicion?.medidorNombre || 'Medidor Pipa 01',
    tipoMedidor: medicion?.tipoMedidor || 'Medidor de flujo volumétrico',
    modoLectura: medicion?.modoLectura || 'acumulativa',
    unidadMostrada: medicion?.unidadMostrada || 'Número rojo',
    resolucion: String(medicion?.resolucion ?? 0.1),
    decimales: String(medicion?.decimales ?? 1),
    medidorActivo: medicion?.medidorActivo !== false
  }));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  useEffect(() => {
    if (!medicion) return;
    setForm(f => ({ ...f, ...medicion, unidadMostrada: medicion.unidadMostrada || 'Número rojo', litrosPorUnidad: String(medicion.litrosPorUnidad ?? 20), incrementoContadorPorUnidad: String(medicion.incrementoContadorPorUnidad ?? 2), precioPorUnidad: String(medicion.precioPorUnidad ?? 15), resolucion: String(medicion.resolucion ?? 0.1), decimales: String(medicion.decimales ?? 1) }));
  }, [medicion]);
  const mostrar = m => { setMensaje(m); setTimeout(() => setMensaje(''), 3000); };
  const guardar = async () => {
    const litros = Number(form.litrosPorUnidad), incremento = Number(form.incrementoContadorPorUnidad), precio = Number(form.precioPorUnidad), resolucion = Number(form.resolucion), decimales = Number(form.decimales);
    if (!esAdmin) return;
    if (!form.unidadComercial.trim() || litros <= 0 || incremento <= 0 || precio < 0 || resolucion <= 0 || !Number.isInteger(decimales) || decimales < 0) return mostrar('Revisa los valores de medición y venta');
    setGuardando(true);
    try {
      await db.collection('_meta').doc('medicion_venta').set({
        unidadComercial: form.unidadComercial.trim(), litrosPorUnidad: litros, incrementoContadorPorUnidad: incremento, precioPorUnidad: precio,
        unidadActivo: !!form.unidadActivo, medidorNombre: form.medidorNombre.trim(), tipoMedidor: form.tipoMedidor, modoLectura: form.modoLectura,
        unidadMostrada: form.unidadMostrada.trim(), resolucion, decimales, medidorActivo: !!form.medidorActivo,
        actualizadoPorUid: currentUser.uid, actualizadoPorNombre: currentUser.nombre || '', actualizadoEn: new Date().toISOString()
      }, { merge: true });
      mostrar('Configuración de medición guardada');
    } catch (e) { mostrar('No se pudo guardar: ' + e.message); }
    setGuardando(false);
  };
  if (!esAdmin) return React.createElement('div', { style: { padding: 16, color: 'var(--ink-soft)' } }, 'Solo ADMIN puede configurar Medición.');
  const litros = Number(form.litrosPorUnidad) || 0, incremento = Number(form.incrementoContadorPorUnidad) || 0, precio = Number(form.precioPorUnidad) || 0;
  return React.createElement('div', { style: { padding: '16px 12px 30px', maxWidth: 760, margin: '0 auto' } },
    React.createElement('div', { style: { fontSize: 22, fontWeight: 900, marginBottom: 4 } }, 'Medición'),
    React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 12, lineHeight: 1.45, marginBottom: 14 } }, 'Configuración administrativa de la unidad comercial y del contador físico. Las escalas se conservan por separado.'),
    mensaje && React.createElement('div', { style: { padding: 10, background: 'var(--ok-bg)', color: 'var(--ok-text)', borderRadius: 8, marginBottom: 12, fontSize: 12, fontWeight: 700 } }, mensaje),
    React.createElement('section', { style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 14, marginBottom: 12 } }, React.createElement('h3', { style: { margin: '0 0 12px' } }, 'A · Unidad comercial'), React.createElement('label', null, 'Unidad comercial', React.createElement('input', { value: form.unidadComercial, onChange: e => setForm(f => ({ ...f, unidadComercial: e.target.value })), style: { width: '100%', boxSizing: 'border-box', margin: '5px 0 10px', padding: 10 } })), React.createElement('label', null, 'Litros por unidad', React.createElement('input', { type: 'number', min: 0.01, step: 0.01, value: form.litrosPorUnidad, onChange: e => setForm(f => ({ ...f, litrosPorUnidad: e.target.value })), style: { width: '100%', boxSizing: 'border-box', margin: '5px 0 10px', padding: 10 } })), React.createElement('label', null, 'Precio por unidad', React.createElement('input', { type: 'number', min: 0, step: 0.01, value: form.precioPorUnidad, onChange: e => setForm(f => ({ ...f, precioPorUnidad: e.target.value })), style: { width: '100%', boxSizing: 'border-box', margin: '5px 0 10px', padding: 10 } })), React.createElement('label', null, React.createElement('input', { type: 'checkbox', checked: !!form.unidadActivo, onChange: e => setForm(f => ({ ...f, unidadActivo: e.target.checked })) }), ' Activo')),
    React.createElement('section', { style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 14, marginBottom: 12 } }, React.createElement('h3', { style: { margin: '0 0 12px' } }, 'B · Medidor físico'), React.createElement('label', null, 'Nombre', React.createElement('input', { value: form.medidorNombre, onChange: e => setForm(f => ({ ...f, medidorNombre: e.target.value })), style: { width: '100%', boxSizing: 'border-box', margin: '5px 0 10px', padding: 10 } })), React.createElement('label', null, 'Tipo', React.createElement('input', { value: form.tipoMedidor, onChange: e => setForm(f => ({ ...f, tipoMedidor: e.target.value })), style: { width: '100%', boxSizing: 'border-box', margin: '5px 0 10px', padding: 10 } })), React.createElement('label', null, 'Modo de lectura', React.createElement('select', { value: form.modoLectura, onChange: e => setForm(f => ({ ...f, modoLectura: e.target.value })), style: { width: '100%', boxSizing: 'border-box', margin: '5px 0 10px', padding: 10 } }, React.createElement('option', { value: 'acumulativa' }, 'Acumulativa'))), React.createElement('label', null, 'Unidad mostrada (ej. Número rojo)', React.createElement('input', { value: form.unidadMostrada, onChange: e => setForm(f => ({ ...f, unidadMostrada: e.target.value })), style: { width: '100%', boxSizing: 'border-box', margin: '5px 0 10px', padding: 10 } })), React.createElement('div', { style: { display: 'flex', gap: 8 } }, React.createElement('label', { style: { flex: 1 } }, 'Resolución', React.createElement('input', { type: 'number', min: 0.0001, step: 0.0001, value: form.resolucion, onChange: e => setForm(f => ({ ...f, resolucion: e.target.value })), style: { width: '100%', boxSizing: 'border-box', margin: '5px 0 10px', padding: 10 } })), React.createElement('label', { style: { flex: 1 } }, 'Decimales', React.createElement('input', { type: 'number', min: 0, step: 1, value: form.decimales, onChange: e => setForm(f => ({ ...f, decimales: e.target.value })), style: { width: '100%', boxSizing: 'border-box', margin: '5px 0 10px', padding: 10 } }))), React.createElement('label', null, React.createElement('input', { type: 'checkbox', checked: !!form.medidorActivo, onChange: e => setForm(f => ({ ...f, medidorActivo: e.target.checked })) }), ' Activo')),
    React.createElement('section', { style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 14, marginBottom: 12 } }, React.createElement('h3', { style: { margin: '0 0 12px' } }, 'C · Conversión del medidor físico'), React.createElement('label', null, 'Incremento del medidor por unidad comercial', React.createElement('input', { type: 'number', min: 0.0001, step: 0.0001, value: form.incrementoContadorPorUnidad, onChange: e => setForm(f => ({ ...f, incrementoContadorPorUnidad: e.target.value })), style: { width: '100%', boxSizing: 'border-box', margin: '5px 0 10px', padding: 10 } })), React.createElement('div', { style: { fontSize: 13, fontWeight: 800 } }, '1 ', form.unidadComercial, ' = +', incremento.toFixed(4), ' ', form.unidadMostrada, ' del medidor físico')),
    React.createElement('section', { style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 14, marginBottom: 12 } }, React.createElement('h3', { style: { margin: '0 0 12px' } }, 'D · Conversión comercial'), React.createElement('div', { style: { fontSize: 14, lineHeight: 1.7 } }, React.createElement('strong', null, '1 ', form.unidadComercial), ' = ', litros.toFixed(2), ' L', React.createElement('br'), 'Precio = $', precio.toFixed(2), ' por unidad'), React.createElement('div', { style: { marginTop: 12, padding: 12, background: 'var(--surface-2)', borderRadius: 9, textAlign: 'center', fontWeight: 800 } }, '1 ', form.unidadComercial, React.createElement('br'), '↓', React.createElement('br'), litros.toFixed(2), ' L comerciales  +  ', incremento.toFixed(4), ' contador físico')),
    React.createElement(ConfiguracionTarifas, { currentUser, tarifas }),
    React.createElement('button', { onClick: guardar, disabled: guardando, style: { width: '100%', padding: 14, border: 0, borderRadius: 10, background: 'var(--accent)', fontWeight: 900 } }, guardando ? 'Guardando…' : 'Guardar configuración')
  );
}

function ConfiguracionTarifas({ currentUser = {}, tarifas = [] }) {
  const [form, setForm] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const esAdmin = currentUser?.role === 'admin';
  const flash = texto => { setMensaje(texto); setTimeout(() => setMensaje(''), 3000); };
  const nueva = () => setForm({ nombre: '', unidadComercial: 'Garrafón', litrosPorUnidad: '20', incrementoContadorPorUnidad: '2', precioUnitario: '15', activo: true });
  const guardarTarifa = async () => {
    if (!esAdmin || !form) return;
    const nombre = String(form.nombre || '').trim();
    const unidadComercial = String(form.unidadComercial || '').trim();
    const litrosPorUnidad = Number(form.litrosPorUnidad);
    const incrementoContadorPorUnidad = Number(form.incrementoContadorPorUnidad);
    const precioUnitario = Number(form.precioUnitario);
    if (!nombre || !unidadComercial || !Number.isFinite(litrosPorUnidad) || litrosPorUnidad <= 0 || !Number.isFinite(incrementoContadorPorUnidad) || incrementoContadorPorUnidad <= 0 || !Number.isFinite(precioUnitario) || precioUnitario < 0) return flash('Completa valores válidos para la tarifa');
    const datos = { nombre, unidadComercial, litrosPorUnidad, incrementoContadorPorUnidad, precioUnitario, precioPorUnidad: precioUnitario, activo: form.activo !== false, actualizadoPorUid: currentUser.uid, actualizadoEn: new Date().toISOString() };
    try {
      if (form.id) await db.collection('tarifas').doc(form.id).update(datos);
      else await db.collection('tarifas').add({ ...datos, creadoPorUid: currentUser.uid, creadoEn: new Date().toISOString() });
      setForm(null);
      flash('Tarifa guardada');
    } catch (e) { flash('No se pudo guardar la tarifa: ' + e.message); }
  };
  const cambiarActivo = async tarifa => {
    try { await db.collection('tarifas').doc(tarifa.id).update({ activo: tarifa.activo === false, actualizadoPorUid: currentUser.uid, actualizadoEn: new Date().toISOString() }); } catch (e) { flash('No se pudo cambiar el estado: ' + e.message); }
  };
  if (!esAdmin) return null;
  const input = (label, key, type = 'text', step) => React.createElement('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 8 } }, label, React.createElement('input', { type, value: form?.[key] ?? '', min: type === 'number' ? 0 : undefined, step, onChange: e => setForm(f => ({ ...f, [key]: e.target.value })), style: { width: '100%', boxSizing: 'border-box', marginTop: 4, padding: 9, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }));
  return React.createElement('section', { style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 14, marginBottom: 12 } },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 5 } }, React.createElement('h3', { style: { margin: 0 } }, 'E · Tarifas configurables'), React.createElement('button', { type: 'button', onClick: nueva, style: { border: 0, borderRadius: 8, padding: '8px 10px', background: 'var(--accent)', color: 'var(--ink)', fontWeight: 800, fontSize: 11 } }, '+ Nueva tarifa')),
    React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 11, lineHeight: 1.45, marginBottom: 10 } }, 'Cada tarifa configura volumen y valor. El precio nunca modifica el medidor; el medidor determina volumen y la tarifa determina dinero.'),
    mensaje && React.createElement('div', { style: { background: 'var(--ok-bg)', color: 'var(--ok-text)', padding: 8, borderRadius: 8, fontSize: 11, marginBottom: 8 } }, mensaje),
    form && React.createElement('div', { style: { background: 'var(--surface-2)', borderRadius: 9, padding: 10, marginBottom: 10 } }, input('Nombre de tarifa', 'nombre'), input('Unidad comercial', 'unidadComercial'), input('Litros por unidad', 'litrosPorUnidad', 'number', 0.01), input('Incremento físico por unidad', 'incrementoContadorPorUnidad', 'number', 0.0001), input('Precio unitario', 'precioUnitario', 'number', 0.01), React.createElement('label', { style: { display: 'block', fontSize: 11, marginBottom: 8 } }, React.createElement('input', { type: 'checkbox', checked: form.activo !== false, onChange: e => setForm(f => ({ ...f, activo: e.target.checked })) }), ' Activa'), React.createElement('div', { style: { display: 'flex', gap: 8 } }, React.createElement('button', { type: 'button', onClick: guardarTarifa, style: { flex: 1, border: 0, borderRadius: 8, padding: 10, background: 'var(--accent)', fontWeight: 800 } }, 'Guardar tarifa'), React.createElement('button', { type: 'button', onClick: () => setForm(null), style: { flex: 1, border: '1px solid var(--line)', borderRadius: 8, padding: 10, background: 'var(--surface)', color: 'var(--ink)' } }, 'Cancelar'))),
    tarifas.length ? tarifas.map(t => React.createElement('div', { key: t.id, style: { borderTop: '1px solid var(--line)', padding: '10px 0', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', opacity: t.activo === false ? .55 : 1 } }, React.createElement('div', null, React.createElement('strong', { style: { fontSize: 13 } }, t.nombre), React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 } }, t.unidadComercial, ' · ', Number(t.litrosPorUnidad || 0).toFixed(2), ' L · +', Number(t.incrementoContadorPorUnidad || 0).toFixed(4), ' contador · $', Number(t.precioUnitario ?? t.precioPorUnidad ?? 0).toFixed(2))), React.createElement('div', { style: { display: 'flex', gap: 5 } }, React.createElement('button', { type: 'button', onClick: () => setForm({ ...t, precioUnitario: String(t.precioUnitario ?? t.precioPorUnidad ?? 0), litrosPorUnidad: String(t.litrosPorUnidad ?? 0), incrementoContadorPorUnidad: String(t.incrementoContadorPorUnidad ?? 0) }), style: { border: '1px solid var(--line)', borderRadius: 7, padding: '6px 7px', background: 'var(--surface)', color: 'var(--ink)', fontSize: 10 } }, 'Editar'), React.createElement('button', { type: 'button', onClick: () => cambiarActivo(t), style: { border: '1px solid var(--line)', borderRadius: 7, padding: '6px 7px', background: 'var(--surface)', color: 'var(--ink)', fontSize: 10 } }, t.activo === false ? 'Activar' : 'Desactivar')))) : React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 11, padding: '10px 0' } }, 'No hay tarifas adicionales. La ruta usa la tarifa base de Medición.'));
}

window.ConfiguracionMedicion = ConfiguracionMedicion;
