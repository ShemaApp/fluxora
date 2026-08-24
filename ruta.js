function FlujoChoferRapido({
  productos = [],
  clientes = [],
  rutas = [],
  zonas = [],
  jornadas = [],
  medicion = null,
  tarifas = [],
  currentUser = {}
}) {
  const [paso, setPaso] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [cliente, setCliente] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [lecturaAntesVenta, setLecturaAntesVenta] = useState('');
  const [formaPago, setFormaPago] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [atendidos, setAtendidos] = useState({});
  const [borradorListo, setBorradorListo] = useState(false);
  const [lecturaActualRuta, setLecturaActualRuta] = useState('');
  const [aguaDisponibleRuta, setAguaDisponibleRuta] = useState('');
  const [jornadaIdRuta, setJornadaIdRuta] = useState('');
  const [tarifaSeleccionadaId, setTarifaSeleccionadaId] = useState('');
  const [mostrarTarifas, setMostrarTarifas] = useState(false);

  const ruta = (rutas || []).find(r => r.estado === 'activa' && (currentUser.role === 'admin' || r.repartidorId === currentUser.uid)) || null;
  const jornadaActiva = (jornadas || []).find(j => j.estado === 'abierta' && j.repartidorId === currentUser.uid);
  const zonasAsignadas = (zonas || []).filter(z => z.activo !== false && (z.choferId === currentUser.uid || z.repartidorId === currentUser.uid));
  const zonaDeRuta = ruta?.zonaId ? zonasAsignadas.find(z => z.id === ruta.zonaId) : zonasAsignadas.find(z => String(z.nombre || '').toLowerCase() === String(ruta?.zona || '').toLowerCase());
  const zonasDeTrabajo = zonaDeRuta ? [zonaDeRuta] : zonasAsignadas;
  const zonaIds = new Set(zonasDeTrabajo.map(z => z.id));
  const zona = zonasDeTrabajo.map(z => z.nombre).join(', ') || ruta?.zona || 'Ruta del día';
  const productosAgua = (productos || []).filter(p => p.activo !== false && /garraf|agua|20 ?l|purific/i.test(`${p.nombre || ''} ${p.unidad || ''}`));
  const producto = productosAgua[0] || productos.find(p => p.activo !== false) || { id: 'garrafones', nombre: 'Garrafones', unidad: 'garrafón', precio: 0 };
  const litrosPorUnidad = Number(jornadaActiva?.litrosPorUnidad ?? medicion?.litrosPorUnidad ?? 20);
  const incrementoContadorPorUnidad = Number(jornadaActiva?.incrementoContadorPorUnidad ?? medicion?.incrementoContadorPorUnidad ?? 2);
  const tarifaBase = { id: `medicion:${medicion?.id || 'base'}`, nombre: 'Tarifa base de medición', unidadComercial: jornadaActiva?.unidadComercial || medicion?.unidadComercial || 'Garrafón', litrosPorUnidad: Number(jornadaActiva?.litrosPorUnidad ?? medicion?.litrosPorUnidad ?? 20), incrementoContadorPorUnidad: Number(jornadaActiva?.incrementoContadorPorUnidad ?? medicion?.incrementoContadorPorUnidad ?? 2), precioUnitario: Number(jornadaActiva?.precioPorUnidad ?? medicion?.precioPorUnidad ?? producto.precio ?? 0), activo: true, origen: 'medicion' };
  const tarifasOperativas = [tarifaBase, ...(tarifas || []).filter(t => t && t.activo !== false && t.id !== tarifaBase.id)].map(t => ({ ...t, litrosPorUnidad: Number(t.litrosPorUnidad), incrementoContadorPorUnidad: Number(t.incrementoContadorPorUnidad), precioUnitario: Number(t.precioUnitario ?? t.precioPorUnidad ?? 0) }));
  const tarifaHabitual = tarifasOperativas.find(t => t.id === cliente?.tarifaHabitualId) || tarifasOperativas[0] || tarifaBase;
  const tarifaVenta = tarifasOperativas.find(t => t.id === tarifaSeleccionadaId) || tarifaHabitual;
  const litrosPorUnidadVenta = Number(tarifaVenta.litrosPorUnidad || litrosPorUnidad);
  const incrementoContadorPorUnidadVenta = Number(tarifaVenta.incrementoContadorPorUnidad || incrementoContadorPorUnidad);
  const unidadComercialVenta = tarifaVenta.unidadComercial || unidadComercial;
  const lecturaAntesNumero = Number(lecturaAntesVenta || 0);
  const cantidadNumero = Number(cantidad || 0);
  const incrementoContador = cantidadNumero > 0 ? cantidadNumero * incrementoContadorPorUnidadVenta : 0;
  const lecturaCalculadaNumero = lecturaAntesNumero + incrementoContador;
  const litrosDespachados = cantidadNumero * litrosPorUnidadVenta;
  const equivalente = incrementoContador;
  const precioUnitario = Number(tarifaVenta.precioUnitario || 0);
  const total = cantidadNumero * precioUnitario;
  const draftScope = 'chofer-rapido';
  const draftUser = currentUser.uid || 'sin_usuario';

  const mostrar = m => {
    setMensaje(m);
    setTimeout(() => setMensaje(''), 2600);
  };
  const claveAtendido = c => `${ruta?.id || 'sin-ruta'}:${c?.id || c?.nombre || ''}`;

  useEffect(() => {
    const guardado = appReadDraft(draftScope, draftUser);
    if (guardado) {
      setPaso(Number(guardado.paso || 1));
      setBusqueda(String(guardado.busqueda || ''));
      setCliente(guardado.cliente || null);
      setCantidad(guardado.cantidad === undefined ? '' : String(guardado.cantidad));
      setLecturaAntesVenta(guardado.lecturaAntesVenta === undefined ? '' : String(guardado.lecturaAntesVenta));
      setAguaDisponibleRuta(guardado.aguaDisponibleRuta === undefined ? '' : String(guardado.aguaDisponibleRuta));
      setJornadaIdRuta(String(guardado.jornadaIdRuta || ''));
      setTarifaSeleccionadaId(String(guardado.tarifaSeleccionadaId || ''));
      setFormaPago(guardado.formaPago || '');
      setAtendidos(guardado.atendidos && typeof guardado.atendidos === 'object' ? guardado.atendidos : {});
      setLecturaActualRuta(guardado.lecturaActualRuta === undefined ? String(guardado.lecturaAntesVenta || '') : String(guardado.lecturaActualRuta));
    }
    setBorradorListo(true);
  }, [draftUser]);

  useEffect(() => {
    if (!borradorListo) return;
          appWriteDraft(draftScope, draftUser, { paso, busqueda, cliente, cantidad, lecturaAntesVenta, lecturaActualRuta, aguaDisponibleRuta, jornadaIdRuta, tarifaSeleccionadaId, formaPago, atendidos });

  }, [borradorListo, draftUser, paso, busqueda, cliente, cantidad, lecturaAntesVenta, lecturaActualRuta, aguaDisponibleRuta, jornadaIdRuta, tarifaSeleccionadaId, formaPago, atendidos]);

  useEffect(() => {
    if (!borradorListo || !jornadaActiva) return;
    if (jornadaIdRuta && jornadaIdRuta !== jornadaActiva.id) {
      setPaso(1);
      setCliente(null);
      setCantidad('');
      setFormaPago('');
      setAtendidos({});
      setTarifaSeleccionadaId('');
      setMostrarTarifas(false);
      setLecturaActualRuta(String(jornadaActiva.lecturaCalculadaActual ?? jornadaActiva.lecturaActual ?? jornadaActiva.lecturaInicial ?? ''));
      setLecturaAntesVenta('');
      setAguaDisponibleRuta(String(jornadaActiva.aguaDisponibleLitros ?? jornadaActiva.aguaCargadaLitros ?? ''));
    } else {
      if (!lecturaActualRuta) setLecturaActualRuta(String(jornadaActiva.lecturaCalculadaActual ?? jornadaActiva.lecturaActual ?? jornadaActiva.lecturaInicial ?? ''));
      if (aguaDisponibleRuta === '') setAguaDisponibleRuta(String(jornadaActiva.aguaDisponibleLitros ?? jornadaActiva.aguaCargadaLitros ?? ''));
    }
    if (jornadaIdRuta !== jornadaActiva.id) setJornadaIdRuta(jornadaActiva.id);
  }, [borradorListo, jornadaActiva?.id, jornadaActiva?.lecturaActual, jornadaActiva?.lecturaCalculadaActual, jornadaActiva?.lecturaInicial, jornadaActiva?.aguaDisponibleLitros, jornadaActiva?.aguaCargadaLitros, jornadaIdRuta, lecturaActualRuta, aguaDisponibleRuta]);

  const clientesZona = (clientes || []).filter(c => c.activo !== false && zonaIds.size > 0 && zonaIds.has(c.zonaId));
  const clientesFiltrados = clientesZona.filter(c => {
    const q = busqueda.toLowerCase().trim();
    return !q || `${c.nombre || ''} ${c.identificacion || c.id || ''} ${c.domicilio || c.direccion || ''} ${c.zonaNombre || ''}`.toLowerCase().includes(q);
  });
  const seleccionarCliente = c => {
    setCliente(c);
    setTarifaSeleccionadaId(c.tarifaHabitualId || '');
    setMostrarTarifas(false);
    setLecturaAntesVenta(String(lecturaActualRuta || jornadaActiva?.lecturaActual || jornadaActiva?.lecturaInicial || ''));
    setCantidad('');
    setFormaPago('');
    setPaso(2);
  };
  const volverRuta = () => {
    setCliente(null);
    setLecturaAntesVenta('');
    setCantidad('');
    setTarifaSeleccionadaId('');
    setMostrarTarifas(false);
    setFormaPago('');
    setPaso(1);
  };
  const guardarVenta = async () => {
    const aguaDisponibleAntes = Number(aguaDisponibleRuta === '' ? (jornadaActiva?.aguaDisponibleLitros ?? jornadaActiva?.aguaCargadaLitros ?? 0) : aguaDisponibleRuta);
    if (!cliente || !jornadaActiva || !Number.isFinite(lecturaAntesNumero) || !Number.isFinite(cantidadNumero) || cantidadNumero <= 0 || !Number.isFinite(lecturaCalculadaNumero) || !formaPago) { mostrar('Captura una cantidad comercial válida y confirma la jornada activa'); return; }
    if (!Number.isFinite(aguaDisponibleAntes) || aguaDisponibleAntes <= 0 || litrosDespachados > aguaDisponibleAntes + 1e-9) { mostrar(`Agua insuficiente. Disponible: ${Math.max(0, aguaDisponibleAntes).toFixed(2)} L`); return; }
    if (medicion && (medicion.unidadActivo === false || medicion.medidorActivo === false)) { mostrar('La configuración de medición está inactiva; solicita a ADMIN que la habilite'); return; }
    setGuardando(true);
    try {
      const guardar = runtime && runtime.appGuardarVentaTransferencia;
      if (typeof guardar !== 'function') throw new Error('El módulo de ventas offline no está disponible');
      const resultado = await guardar({
        unidadComercial: unidadComercialVenta,
        tarifaId: tarifaVenta.id,
        tarifaNombre: tarifaVenta.nombre || unidadComercialVenta,
        tarifaSnapshot: { id: tarifaVenta.id, nombre: tarifaVenta.nombre || unidadComercialVenta, unidadComercial: unidadComercialVenta, litrosPorUnidad: litrosPorUnidadVenta, incrementoContadorPorUnidad: incrementoContadorPorUnidadVenta, precioUnitario, activo: tarifaVenta.activo !== false },
        transferenciaId: null,
        rutaId: null,
        jornadaId: jornadaActiva.id,
        vehiculoId: jornadaActiva.vehiculoId || jornadaActiva.vehiculo || '',
        vehiculo: jornadaActiva.vehiculo || '',
        medidorId: jornadaActiva.medidorId || '',
        localidadId: cliente.localidadId || cliente.localidad || '',
        lecturaAntesVenta: lecturaAntesNumero,
        lecturaDespuesVenta: lecturaCalculadaNumero,
        lecturaCalculadaAntes: lecturaAntesNumero,
        lecturaCalculadaDespues: lecturaCalculadaNumero,
        litrosVendidos: litrosDespachados,
        aguaDisponibleAntesLitros: aguaDisponibleAntes,
        aguaDisponibleDespuesLitros: aguaDisponibleAntes - litrosDespachados,
        garrafones: cantidadNumero,
        precioUnitario,
        importe: total,
        operacionIdempotente: `${jornadaActiva.id}:${cliente.id}:${lecturaAntesNumero}:${lecturaCalculadaNumero}`,
        repartidorUid: currentUser.uid,
        repartidorNombre: currentUser.nombre || '',
        cliente: {
          id: cliente.id,
          identificacion: cliente.identificacion || cliente.id,
          nombre: cliente.nombre || '',
          telefono: cliente.telefono || '',
          domicilio: cliente.domicilio || cliente.direccion || '',
          idTinaco: cliente.idTinaco || cliente.tinacoId || ''
        },
        items: [{ id: producto.id, nombre: producto.nombre || unidadComercialVenta || 'Agua a granel', unidad: unidadComercialVenta, precio: precioUnitario, precioUnitario, importe: total, cant: cantidadNumero, litrosVendidos: litrosDespachados, incrementoContador }],
        total,
        formaPago,
        modoOperacion: 'agua_medidor',
        tipoVenta: 'venta_agua_medidor',
        medidorEquivalente: equivalente,
        litrosPorUnidad: litrosPorUnidadVenta,
        incrementoContadorPorUnidad: incrementoContadorPorUnidadVenta,
        idTinaco: cliente.idTinaco || cliente.tinacoId || ''
      });
      setAtendidos(actual => ({ ...actual, [claveAtendido(cliente)]: { cantidad: cantidadNumero, equivalente, litrosDespachados, lecturaAntesVenta: lecturaAntesNumero, lecturaDespuesVenta: lecturaCalculadaNumero, formaPago, total, fecha: new Date().toISOString(), estado: resultado.estado } }));
      setLecturaActualRuta(String(lecturaCalculadaNumero));
      setAguaDisponibleRuta(String(aguaDisponibleAntes - litrosDespachados));
      setTarifaSeleccionadaId('');
      setMostrarTarifas(false);
      setLecturaAntesVenta(String(lecturaCalculadaNumero));
      appClearDraft(draftScope, draftUser);
      setPaso(1);
      setCliente(null);
      setCantidad('');
      setFormaPago('');
      mostrar(resultado.estado === 'pendiente_local' ? 'Venta guardada en el teléfono; queda pendiente de sincronizar' : 'Venta registrada y cliente atendido');
    } catch (e) {
      mostrar('No se pudo guardar: ' + e.message);
    }
    setGuardando(false);
  };
  const runtime = typeof window !== 'undefined' ? window : globalThis;
  const atendido = c => !!atendidos[claveAtendido(c)];
  const aguaCargadaNumero = Number(jornadaActiva?.aguaCargadaLitros || 0);
  const aguaDisponibleNumero = Math.max(0, Number(aguaDisponibleRuta === '' ? (jornadaActiva?.aguaDisponibleLitros ?? aguaCargadaNumero) : aguaDisponibleRuta) || 0);
  const porcentajeAgua = aguaCargadaNumero > 0 ? Math.max(0, Math.min(100, aguaDisponibleNumero / aguaCargadaNumero * 100)) : 0;
  const color = { ink: 'var(--ink)', soft: 'var(--ink-soft)', faint: 'var(--ink-faint)', line: 'var(--line)', surface: 'var(--surface)', accent: 'var(--accent)', ok: 'var(--ok-bg)', okText: 'var(--ok-text)' };

  return React.createElement('div', { style: { padding: '14px 12px 28px' } },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
      React.createElement('div', null, React.createElement('div', { style: { fontSize: 21, fontWeight: 800, letterSpacing: '-.02em' } }, 'Ruta del día'), React.createElement('div', { style: { fontSize: 12, color: color.soft, marginTop: 3 } }, zona)),
      React.createElement('div', { style: { fontSize: 11, color: color.soft, textAlign: 'right' } }, 'PASO ', paso, ' DE 3', React.createElement('div', { style: { marginTop: 5, height: 4, width: 72, background: color.line, borderRadius: 5, overflow: 'hidden' } }, React.createElement('div', { style: { height: '100%', width: `${paso * 33.333}%`, background: color.accent } })))
    ),
    mensaje && React.createElement('div', { style: { padding: '10px 12px', borderRadius: 10, background: color.ok, color: color.okText, fontSize: 12, fontWeight: 700, margin: '10px 0' } }, mensaje),
    jornadaActiva && React.createElement('div', { style: { background: color.surface, border: `1px solid ${color.line}`, borderRadius: 12, padding: 11, margin: '10px 0 14px' } }, React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800 } }, React.createElement('span', null, 'AGUA DISPONIBLE'), React.createElement('span', { style: { color: porcentajeAgua <= 15 ? 'var(--danger-text)' : color.okText } }, aguaDisponibleNumero.toFixed(2), ' L')), React.createElement('div', { style: { height: 8, background: color.line, borderRadius: 8, overflow: 'hidden', marginTop: 7 } }, React.createElement('div', { style: { height: '100%', width: `${porcentajeAgua}%`, background: porcentajeAgua <= 15 ? 'var(--danger-text)' : color.accent, transition: 'width .18s ease' } })), React.createElement('div', { style: { fontSize: 10, color: color.soft, marginTop: 5 } }, 'Carga inicial: ', aguaCargadaNumero.toFixed(2), ' L · Lectura calculada: ', Number(lecturaActualRuta || jornadaActiva.lecturaInicial || 0).toFixed(2), ' contador')),
    paso === 1 && React.createElement(React.Fragment, null,
      React.createElement('input', { value: busqueda, onChange: e => setBusqueda(e.target.value), placeholder: 'Buscar por nombre, ID o dirección…', style: { width: '100%', boxSizing: 'border-box', padding: '13px 14px', border: `1px solid ${color.line}`, borderRadius: 11, background: color.surface, color: color.ink, fontSize: 14, margin: '14px 0 10px' }, autoFocus: true }),
      React.createElement('div', { style: { fontSize: 11, fontWeight: 800, color: color.faint, letterSpacing: '.08em', margin: '12px 2px 8px' } }, 'CLIENTES · ', clientesFiltrados.length),
      React.createElement('div', null, clientesFiltrados.map(c => React.createElement('button', { key: c.id, onClick: () => seleccionarCliente(c), style: { width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: `1px solid ${atendido(c) ? 'var(--ok)' : color.line}`, background: atendido(c) ? color.ok : color.surface, borderRadius: 12, padding: '13px 12px', marginBottom: 8, cursor: 'pointer', color: color.ink } }, React.createElement('span', { style: { minWidth: 0 } }, React.createElement('span', { style: { display: 'block', fontWeight: 800, fontSize: 14 } }, c.nombre || 'Cliente sin nombre'), React.createElement('span', { style: { display: 'block', fontSize: 11, color: color.soft, marginTop: 3 } }, 'ID ', c.identificacion || c.id, ' · ', c.domicilio || c.direccion || 'Sin dirección', c.zonaNombre ? ' · ' + c.zonaNombre : '')), React.createElement('span', { style: { fontSize: 22, color: atendido(c) ? 'var(--ok-text)' : color.faint, fontWeight: 800 } }, atendido(c) ? '✓' : '›')))),
      clientesFiltrados.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: 28, color: color.faint, fontSize: 13 } }, 'No hay clientes para esta búsqueda o zona.')
    ),
    paso === 2 && cliente && React.createElement(React.Fragment, null,
      React.createElement('button', { onClick: volverRuta, style: { border: 0, background: 'transparent', color: color.soft, padding: '8px 0', cursor: 'pointer', fontWeight: 700 } }, '← Volver a la ruta'),
      React.createElement('div', { style: { background: color.surface, border: `1px solid ${color.line}`, borderRadius: 14, padding: 15, margin: '8px 0 14px' } }, React.createElement('div', { style: { fontSize: 18, fontWeight: 800 } }, cliente.nombre), React.createElement('div', { style: { color: color.soft, fontSize: 12, marginTop: 6 } }, cliente.domicilio || cliente.direccion || 'Dirección no capturada'), React.createElement('div', { style: { color: color.soft, fontSize: 12, marginTop: 3 } }, 'ID del tinaco: ', cliente.idTinaco || cliente.tinacoId || 'Sin ID')),
      React.createElement('div', { style: { background: color.surface, border: `1px solid ${color.line}`, borderRadius: 11, padding: 11, marginBottom: 10 } }, React.createElement('div', { style: { fontSize: 10, color: color.faint, fontWeight: 800, letterSpacing: '.08em' } }, 'TARIFA DE ESTA VENTA'), React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 4 } }, React.createElement('div', null, React.createElement('strong', { style: { fontSize: 13 } }, tarifaVenta.nombre || unidadComercialVenta), React.createElement('div', { style: { fontSize: 11, color: color.soft, marginTop: 2 } }, tarifaVenta.litrosPorUnidad.toFixed(2), ' L · $', tarifaVenta.precioUnitario.toFixed(2), ' por ', unidadComercialVenta)), React.createElement('button', { type: 'button', onClick: () => setMostrarTarifas(v => !v), style: { border: `1px solid ${color.line}`, borderRadius: 8, padding: '7px 9px', background: color.surface, color: color.ink, fontSize: 11, fontWeight: 800 } }, mostrarTarifas ? 'Cerrar' : 'Cambiar tarifa')), mostrarTarifas && React.createElement('select', { value: tarifaVenta.id, onChange: e => { setTarifaSeleccionadaId(e.target.value); setMostrarTarifas(false); }, style: { width: '100%', marginTop: 9, padding: 9, borderRadius: 8, border: `1px solid ${color.line}`, background: color.surface, color: color.ink } }, tarifasOperativas.map(t => React.createElement('option', { key: t.id, value: t.id }, t.nombre, ' · ', t.litrosPorUnidad.toFixed(2), ' L · $', t.precioUnitario.toFixed(2)))), React.createElement('div', { style: { fontSize: 10, color: color.soft, marginTop: 5 } }, 'La tarifa solo aplica a esta venta y queda guardada como snapshot. No modifica el medidor.')),
      React.createElement('div', { style: { fontSize: 11, fontWeight: 800, color: color.faint, letterSpacing: '.08em', marginBottom: 8 } }, 'CARRITO DE DESPACHO'),
      React.createElement('div', { style: { display: 'grid', gap: 8, background: color.surface, border: `1px solid ${color.line}`, borderRadius: 14, padding: 14 } }, React.createElement('label', { style: { fontSize: 11, color: color.soft, fontWeight: 700 } }, 'CANTIDAD COMERCIAL', React.createElement('input', { value: cantidad, onChange: e => setCantidad(e.target.value), inputMode: 'decimal', type: 'number', min: 0.01, step: 0.01, placeholder: 'Ej. 8', 'aria-label': `Cantidad de ${unidadComercialVenta}`, style: { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 4, padding: 11, fontSize: 22, fontWeight: 800, border: `2px solid ${color.accent}`, borderRadius: 9, color: color.ink, background: 'transparent' } })), React.createElement('div', { style: { fontSize: 12, color: color.soft } }, 'El sistema calcula automáticamente el contador físico. No captures una lectura después de este cliente.'), React.createElement('div', { style: { display: 'grid', gap: 4, fontSize: 13, fontWeight: 800 } }, React.createElement('div', null, 'Lectura antes: ', lecturaAntesNumero.toFixed(2), ' · Lectura calculada después: ', lecturaCalculadaNumero.toFixed(2)), React.createElement('div', { style: { color: litrosDespachados > 0 ? 'var(--ok-text)' : color.soft } }, 'Litros comerciales: ', litrosDespachados.toFixed(2), ' · ', unidadComercialVenta, ': ', cantidadNumero.toFixed(2), ' · +', incrementoContador.toFixed(2), ' contador físico'))),
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '15px 2px', fontSize: 14 } }, React.createElement('span', { style: { color: color.soft } }, 'Total a cobrar'), React.createElement('strong', null, fmt(total))),
      React.createElement('button', { disabled: litrosDespachados <= 0, onClick: () => setPaso(3), style: { width: '100%', padding: 17, border: 0, borderRadius: 12, background: cantidadNumero > 0 ? color.accent : color.line, color: color.ink, fontWeight: 900, fontSize: 16, cursor: cantidadNumero > 0 ? 'pointer' : 'not-allowed' } }, 'Surtir →')
    ),
    paso === 3 && cliente && React.createElement(React.Fragment, null,
      React.createElement('button', { onClick: () => setPaso(2), style: { border: 0, background: 'transparent', color: color.soft, padding: '8px 0', cursor: 'pointer', fontWeight: 700 } }, '← Revisar carrito'),
      React.createElement('div', { style: { textAlign: 'center', padding: '22px 10px 18px' } }, React.createElement('div', { style: { fontSize: 13, color: color.soft } }, cliente.nombre), React.createElement('div', { style: { fontSize: 34, fontWeight: 900, marginTop: 4 } }, fmt(total)), React.createElement('div', { style: { fontSize: 12, color: color.soft, marginTop: 4 } }, cantidadNumero.toFixed(2), ' ', unidadComercialVenta, ' · ', litrosDespachados.toFixed(2), ' L · tarifa ', tarifaVenta.nombre || unidadComercialVenta, ' · lectura calculada ', lecturaCalculadaNumero.toFixed(2), ' contador')),
      React.createElement('div', { style: { display: 'grid', gap: 12 } }, React.createElement('button', { onClick: () => setFormaPago('efectivo'), style: { minHeight: 92, border: formaPago === 'efectivo' ? '3px solid var(--ok-text)' : `1px solid ${color.line}`, borderRadius: 14, background: formaPago === 'efectivo' ? color.ok : color.surface, color: color.ink, fontSize: 21, fontWeight: 900, cursor: 'pointer' } }, 'EFECTIVO'), React.createElement('button', { onClick: () => setFormaPago('credito'), style: { minHeight: 92, border: formaPago === 'credito' ? '3px solid var(--warn-text)' : `1px solid ${color.line}`, borderRadius: 14, background: formaPago === 'credito' ? 'var(--warn-bg)' : color.surface, color: color.ink, fontSize: 21, fontWeight: 900, cursor: 'pointer' } }, 'CRÉDITO')),
      React.createElement('button', { disabled: !formaPago || guardando, onClick: guardarVenta, style: { width: '100%', marginTop: 18, padding: 17, border: 0, borderRadius: 12, background: formaPago ? color.accent : color.line, color: color.ink, fontWeight: 900, fontSize: 16, cursor: formaPago ? 'pointer' : 'not-allowed' } }, guardando ? 'Guardando…' : 'Guardar y volver a la ruta')
    )
  );
}

function RutaReparto({
  productos = [],
  clientes = [],
  rutas = [],
  zonas = [],
  pedidos = [],
  jornadas = [],
  medicion = null,
  tarifas = [],
  currentUser = {}
}) {
  // Transferencias debe seguir renderizando aunque Firestore todavía no haya
  // entregado alguna colección o un documento antiguo tenga campos incompletos.
  productos = Array.isArray(productos) ? productos : [];
  clientes = Array.isArray(clientes) ? clientes : [];
  rutas = Array.isArray(rutas) ? rutas : [];
  zonas = Array.isArray(zonas) ? zonas : [];
  pedidos = Array.isArray(pedidos) ? pedidos : [];
  currentUser = currentUser || {};
  const runtime = typeof window !== 'undefined' ? window : globalThis;
  const [scanOpen, setScanOpen] = useState(false);
  const [productoNoEncontrado, setProductoNoEncontrado] = useState('');
  const [altaProducto, setAltaProducto] = useState(null);
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [cart, setCart] = useState([]);
  const [msg, setMsg] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [entOpen, setEntOpen] = useState(false);
  const [cliMode, setCliMode] = useState('buscar');
  const [cliSearch, setCliSearch] = useState('');
  const [cliSel, setCliSel] = useState(null);
  const [nuevoC, setNuevoC] = useState({
    nombre: '',
    telefono: ''
  });
  const [entCart, setEntCart] = useState([]);
  const [pago, setPago] = useState('efectivo');
  const [saving, setSaving] = useState(false);
  const [expandId, setExpandId] = useState(null);
  const [offlineVentaResumen, setOfflineVentaResumen] = useState({ total: 0, pendientes: 0, incidencias: 0, registros: [] });
  const flash = m => {
    setMsg(m);
    setTimeout(() => setMsg(''), 2500);
  };
  const rutasVisibles = rutas.filter(r => currentUser.role === 'admin' || r.repartidorId === currentUser.uid);
  const rutaActiva = rutasVisibles.find(r => r.estado === 'activa');
  const historial = rutasVisibles.filter(r => r.id !== rutaActiva?.id);
  const pedidosEnTransferencia = (pedidos || []).filter(p => p.estado === 'transferencia_confirmada' && p.transferenciaId === rutaActiva?.id);
  const [usuarios, setUsuarios] = useState([]);
  useEffect(() => {
    if (currentUser.role !== 'admin') return;
    const unsub = db.collection('usuarios').onSnapshot(snap => setUsuarios(snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    return unsub;
  }, [currentUser.role]);
  useEffect(() => {
    const subscribe = runtime && runtime.appSuscribirVentasOffline;
    if (typeof subscribe !== 'function') return undefined;
    return subscribe(setOfflineVentaResumen);
  }, []);
  useEffect(() => {
    const borrador = appReadDraft('transferencia', currentUser?.uid);
    if (borrador) {
      const form = borrador.progForm;
      if (form && typeof form === 'object') {
        setProgForm({
          repartidorId: String(form.repartidorId || ''),
          repartidorNombre: String(form.repartidorNombre || ''),
          vehiculo: String(form.vehiculo || ''),
          zona: String(form.zona || ''),
          zonaId: String(form.zonaId || ''),
          fechaProgramada: String(form.fechaProgramada || ''),
          fechaRegresoProgramada: String(form.fechaRegresoProgramada || '')
        });
      }
      setCart(Array.isArray(borrador.cart) ? borrador.cart.filter(item => item && item.id).map(item => ({
        id: item.id, nombre: item.nombre || '', unidad: item.unidad || '', cant: item.cant
      })) : []);
      setPedidosIncluidos(Array.isArray(borrador.pedidosIncluidos) ? borrador.pedidosIncluidos.filter(id => typeof id === 'string') : []);
      setBorradorRestaurado(true);
    }
    setBorradorListo(true);
  }, [currentUser?.uid]);
  const [progForm, setProgForm] = useState(null);
  const [progSaving, setProgSaving] = useState(false);
  const [pedidosIncluidos, setPedidosIncluidos] = useState([]);
  const [borradorListo, setBorradorListo] = useState(false);
  const [borradorRestaurado, setBorradorRestaurado] = useState(false);
  const [recepcion, setRecepcion] = useState(null);
  const [pedidoEntrega, setPedidoEntrega] = useState(null);
  const transferenciasPendientes = currentUser.role === 'admin' ? rutas.filter(r => r.estado === 'pendiente_recepcion') : [];
  const abrirRecepcion = transferencia => {
    const items = {};
    Object.entries(transferencia.items || {}).forEach(([id, item]) => {
      const restante = Number(item.cantRestante || 0);
      items[id] = {
        nombre: item.nombre || '',
        unidad: item.unidad || '',
        restante,
        cantidadDevuelta: restante
      };
    });
    setRecepcion({
      transferenciaId: transferencia.id,
      responsable: transferencia.repartidorNombre || 'Sin responsable',
      items,
      motivoMerma: ''
    });
  };
  const actualizarDevolucion = (id, valor) => {
    const cantidad = Math.max(0, Number(valor) || 0);
    setRecepcion(r => r ? {
      ...r,
      items: {
        ...r.items,
        [id]: { ...r.items[id], cantidadDevuelta: Math.min(cantidad, r.items[id].restante) }
      }
    } : r);
  };
  const recibirTransferencia = async () => {
    if (!recepcion) return;
    const hayMerma = Object.values(recepcion.items).some(item => Number(item.cantidadDevuelta || 0) < Number(item.restante || 0));
    if (hayMerma && !recepcion.motivoMerma.trim()) {
      flash('⚠️ Indica el motivo de la diferencia antes de cerrar la transferencia');
      return;
    }
    setSaving(true);
    try {
      const fecha = new Date().toISOString();
      const transferenciaRef = db.collection('rutas').doc(recepcion.transferenciaId);
      const devolucionRef = db.collection('devoluciones').doc();
      await db.runTransaction(async tx => {
        const transferenciaSnap = await tx.get(transferenciaRef);
        if (!transferenciaSnap.exists) throw new Error('La transferencia ya no existe');
        const transferencia = transferenciaSnap.data();
        if (transferencia.estado !== 'pendiente_recepcion') throw new Error('La transferencia no está pendiente de recepción');
        const detalle = Object.entries(recepcion.items).map(([id, input]) => {
          const itemActual = transferencia.items && transferencia.items[id];
          if (!itemActual) throw new Error('El producto ya no existe en la transferencia');
          const restante = Number(itemActual.cantRestante || 0);
          const devuelto = Number(input.cantidadDevuelta || 0);
          if (!Number.isFinite(devuelto) || devuelto < 0 || devuelto > restante) throw new Error('Cantidad devuelta inválida para ' + input.nombre);
          return {
            id,
            nombre: itemActual.nombre || input.nombre || '',
            unidad: itemActual.unidad || input.unidad || '',
            restante,
            devuelto,
            merma: restante - devuelto
          };
        });
        const productosSnap = await Promise.all(detalle.map(item => tx.get(db.collection('productos').doc(item.id))));
        productosSnap.forEach((snap, index) => {
          if (!snap.exists) throw new Error('El producto ya no existe: ' + detalle[index].nombre);
        });
        const cambios = {
          estado: 'cerrada',
          estadoTransferencia: 'cerrada',
          fechaRegresoReal: fecha,
          fechaRecepcionAlmacen: fecha,
          recibidoPorUid: currentUser.uid,
          recibidoPorNombre: currentUser.nombre || '',
          motivoMerma: hayMerma ? recepcion.motivoMerma.trim() : '',
          conciliada: true
        };
        detalle.forEach(item => {
          cambios['items.' + item.id + '.cantRestante'] = 0;
          cambios['items.' + item.id + '.cantDevuelta'] = item.devuelto;
          cambios['items.' + item.id + '.cantMerma'] = item.merma;
          if (item.devuelto > 0) {
            tx.update(db.collection('productos').doc(item.id), {
              stock: firebase.firestore.FieldValue.increment(item.devuelto)
            });
          }
        });
        tx.update(transferenciaRef, cambios);
        tx.set(devolucionRef, {
          tipo: 'retorno_transferencia',
          transferenciaId: transferenciaRef.id,
          rutaId: transferenciaRef.id,
          fecha,
          responsableUid: transferencia.repartidorId || '',
          responsableNombre: transferencia.repartidorNombre || '',
          items: detalle.map(item => ({
            productoId: item.id,
            productoNombre: item.nombre,
            unidad: item.unidad,
            cantidadTransferidaPendiente: item.restante,
            cantidadDevuelta: item.devuelto,
            cantidadMerma: item.merma
          })),
          motivoMerma: hayMerma ? recepcion.motivoMerma.trim() : '',
          capturadoPorUid: currentUser.uid,
          capturadoPorNombre: currentUser.nombre || ''
        });
      });
      setRecepcion(null);
      flash('✅ Transferencia recibida y conciliada con almacén');
    } catch (e) {
      flash('❌ Error al recibir la transferencia: ' + e.message);
    }
    setSaving(false);
  };
  const confirmarAsignacion = () => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'repartidor') return;
    if (!progForm?.repartidorId) {
      flash('⚠️ Elige a qué repartidor se la asignas');
      return;
    }
    if (!progForm?.zonaId) {
      flash('⚠️ Elige una zona asignada a ese chofer');
      return;
    }
    const zonaAsignada = zonas.find(z => z.id === progForm.zonaId && (z.choferId === progForm.repartidorId || z.repartidorId === progForm.repartidorId));
    if (!zonaAsignada) {
      flash('⚠️ La zona no pertenece al chofer seleccionado');
      return;
    }
    flash(currentUser.role === 'repartidor'
      ? '✅ Transferencia preparada para ti. Ahora agrega el cargamento e inicia la ruta.'
      : '✅ Repartidor asignado. Ahora agrega el cargamento e inicia la ruta.');
  };
  const hayBorradorTransferencia = !!(cart.length || pedidosIncluidos.length || (progForm && (
    progForm.repartidorId || progForm.vehiculo?.trim() || progForm.zona?.trim() || progForm.zonaId || progForm.fechaProgramada || progForm.fechaRegresoProgramada
  )));
  useEffect(() => {
    if (!borradorListo) return;
    if (!hayBorradorTransferencia) {
      appClearDraft('transferencia', currentUser?.uid);
      return;
    }
    appWriteDraft('transferencia', currentUser?.uid, {
      progForm: progForm ? {
        repartidorId: progForm.repartidorId || '', repartidorNombre: progForm.repartidorNombre || '', vehiculo: progForm.vehiculo || '',
        zona: progForm.zona || '', zonaId: progForm.zonaId || '', fechaProgramada: progForm.fechaProgramada || '', fechaRegresoProgramada: progForm.fechaRegresoProgramada || ''
      } : null,
      cart: cart.map(item => ({ id: item.id, nombre: item.nombre || '', unidad: item.unidad || '', cant: item.cant })),
      pedidosIncluidos: pedidosIncluidos.slice()
    });
  }, [borradorListo, currentUser?.uid, hayBorradorTransferencia, progForm, cart, pedidosIncluidos]);
  const descartarBorradorTransferencia = () => {
    appClearDraft('transferencia', currentUser?.uid);
    setProgForm(null); setCart([]); setPedidosIncluidos([]); setManualOpen(false); setManualSearch(''); setBorradorRestaurado(false);
    flash('🗑️ Borrador local de transferencia descartado');
  };
  const pedidosPendientesRepartidor = (pedidos || []).filter(p => p.estado === 'asignado_pendiente_transferencia' && p.repartidorId === progForm?.repartidorId);
  const togglePedidoTransferencia = pedido => {
    const yaIncluido = pedidosIncluidos.includes(pedido.id);
    setPedidosIncluidos(actual => yaIncluido ? actual.filter(id => id !== pedido.id) : [...actual, pedido.id]);
    setCart(actual => {
      const factor = yaIncluido ? -1 : 1;
      const siguiente = actual.map(item => {
        const pedidoItem = (pedido.items || []).find(x => x.id === item.id);
        return pedidoItem ? { ...item, cant: Number(item.cant || 0) + factor * Number(pedidoItem.cant || 0) } : item;
      }).filter(item => Number(item.cant || 0) > 0);
      (pedido.items || []).forEach(pedidoItem => {
        if (!siguiente.some(item => item.id === pedidoItem.id) && factor > 0) siguiente.push({ id: pedidoItem.id, nombre: pedidoItem.nombre, unidad: pedidoItem.unidad || '', cant: Number(pedidoItem.cant || 0) });
      });
      return siguiente;
    });
  };
  const addToCart = p => {
    setCart(c => {
      const ex = c.find(x => x.id === p.id);
      return ex ? c.map(x => x.id === p.id ? {
        ...x,
        cant: (Number(x.cant) || 0) + 1
      } : x) : [...c, {
        id: p.id,
        nombre: p.nombre,
        unidad: p.unidad,
        cant: 1
      }];
    });
    flash('✅ ' + p.nombre + ' agregado');
  };
  const handleScan = code => {
    setScanOpen(false);
    const codigo = String(code || '').trim();
    if (!codigo) return;
    const p = productos.find(x => String(x.codigoBarras || '').trim() === codigo);
    if (p) {
      addToCart(p);
      return;
    }
    const puedeCrearProducto = currentUser.role === 'admin' || permisoEdita(currentUser).productos;
    if (!puedeCrearProducto) {
      flash('⚠️ Código no encontrado. Solicita a almacén que dé de alta el producto.');
      return;
    }
    setProductoNoEncontrado(codigo);
  };
  const abrirAltaProductoEscaneado = () => {
    setAltaProducto({
      codigoBarras: productoNoEncontrado,
      nombre: '',
      precio: '',
      stock: '1',
      unidad: '',
      motivo: 'Alta por escaneo'
    });
    setProductoNoEncontrado('');
  };
  const guardarProductoEscaneado = async () => {
    if (currentUser.role === 'repartidor') {
      flash('⚠️ El repartidor no puede dar de alta productos en el inventario general');
      return;
    }
    if (!altaProducto?.nombre?.trim() || altaProducto.precio === '') {
      flash('⚠️ Indica nombre y precio del producto');
      return;
    }
    if (!Number.isFinite(Number(altaProducto.stock)) || Number(altaProducto.stock) < 1) {
      flash('⚠️ Indica al menos una unidad disponible para la transferencia');
      return;
    }
    const codigo = String(altaProducto.codigoBarras || '').trim();
    if (!codigo) {
      flash('⚠️ El código de barras es obligatorio');
      return;
    }
    setGuardandoProducto(true);
    try {
      const item = {
        nombre: altaProducto.nombre.trim(),
        precio: Number(altaProducto.precio),
        stock: Math.max(0, Number(altaProducto.stock || 0)),
        unidad: altaProducto.unidad.trim(),
        codigoBarras: codigo
      };
      let creado = null;
      let duplicado = null;
      await db.runTransaction(async tx => {
        const coincidencias = await tx.get(db.collection('productos').where('codigoBarras', '==', codigo).limit(1));
        if (!coincidencias.empty) {
          const existente = coincidencias.docs[0];
          duplicado = { id: existente.id, ...existente.data() };
          return;
        }
        const productoRef = db.collection('productos').doc();
        const historialRef = db.collection('inventario_historial').doc();
        const fecha = new Date().toISOString();
        tx.set(productoRef, item);
        tx.set(historialRef, {
          productoId: productoRef.id,
          productoNombre: item.nombre,
          stockAnterior: 0,
          stockNuevo: item.stock,
          diferencia: item.stock,
          motivo: altaProducto.motivo.trim() || 'Alta por escaneo',
          usuarioUid: currentUser.uid,
          usuarioNombre: currentUser.nombre || '',
          usuarioEmail: currentUser.email || '',
          fecha
        });
        creado = { id: productoRef.id, ...item };
      });
      setAltaProducto(null);
      if (duplicado) {
        addToCart(duplicado);
        flash('ℹ️ El código ya existía; se agregó el producto encontrado');
      } else if (creado) {
        addToCart(creado);
        flash('✅ Producto creado y agregado a la transferencia');
      }
    } catch (e) {
      flash('❌ No se pudo guardar el producto: ' + e.message);
    }
    setGuardandoProducto(false);
  };
  const updQty = (id, v) => {
    const raw = String(v ?? '');
    // Permitir campo vacío durante la edición, pero mantener cantidades enteras.
    if (!/^\d*$/.test(raw)) return;
    setCart(c => c.map(x => x.id === id ? {
      ...x,
      cant: raw
    } : x));
  };
  const guardarRuta = async () => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'repartidor') {
      flash('⚠️ Tu rol no puede crear transferencias');
      return;
    }
    if (cart.length === 0) {
      flash('⚠️ Agrega al menos un producto a la transferencia');
      return;
    }
    const cantidadesCart = cart.map(item => ({
      ...item,
      cant: Number(item.cant)
    }));
    if (cantidadesCart.some(item => !Number.isInteger(item.cant) || item.cant < 1)) {
      flash('⚠️ Cada producto debe tener una cantidad entera mayor que cero');
      return;
    }
      const asignacion = currentUser.role === 'repartidor'
        ? { ...progForm, repartidorId: currentUser.uid, repartidorNombre: currentUser.nombre || '' }
        : progForm;
    if (!asignacion?.repartidorId) {
      flash('⚠️ Asigna la transferencia a un responsable antes de confirmar la salida');
      return;
    }
    setSaving(true);
    try {
      const fecha = new Date().toISOString();
      const pedidosSeleccionados = (pedidos || []).filter(p => pedidosIncluidos.includes(p.id));
      const itemsMap = {};
      cantidadesCart.forEach(item => {
        const reservado = pedidosSeleccionados.reduce((sum, pedido) => sum + Number((pedido.items || []).find(x => x.id === item.id)?.cant || 0), 0);
        itemsMap[item.id] = {
          nombre: item.nombre,
          unidad: item.unidad,
          cantCargada: item.cant,
          cantRestante: item.cant,
          cantReservadaPedidos: reservado
        };
      });
      await db.runTransaction(async tx => {
        const existencias = await Promise.all(cantidadesCart.map(item => tx.get(db.collection('productos').doc(item.id))));
        const pedidosSnaps = await Promise.all(pedidosSeleccionados.map(pedido => tx.get(db.collection('pedidos').doc(pedido.id))));
        pedidosSnaps.forEach((snap, index) => {
          const pedido = pedidosSeleccionados[index];
          if (!snap.exists || snap.data().estado !== 'asignado_pendiente_transferencia' || snap.data().repartidorId !== asignacion.repartidorId) throw new Error('El pedido ya no está disponible para esta transferencia: ' + pedido.clienteNombre);
        });
        existencias.forEach((snap, index) => {
          const item = cantidadesCart[index];
          if (!snap.exists || Number(snap.data().stock || 0) < item.cant) throw new Error('Stock insuficiente para ' + item.nombre);
        });
        const rutaRef = db.collection('rutas').doc();
        cantidadesCart.forEach(item => {
          const cambiosProducto = {
            stock: firebase.firestore.FieldValue.increment(-item.cant)
          };
          // El repartidor solo puede descontar stock dentro de la creación
          // atómica de su propia transferencia.
          if (currentUser.role === 'repartidor') {
            cambiosProducto.ultimaTransferenciaId = rutaRef.id;
            cambiosProducto.ultimaTransferenciaRepartidorUid = currentUser.uid;
            cambiosProducto.ultimaTransferenciaCantidad = item.cant;
            cambiosProducto.ultimaTransferenciaFecha = fecha;
          }
          tx.update(db.collection('productos').doc(item.id), cambiosProducto);
        });
        tx.set(rutaRef, {
          fecha,
          fechaSalidaReal: fecha,
          fechaProgramada: asignacion.fechaProgramada ? new Date(asignacion.fechaProgramada).toISOString() : fecha,
          fechaRegresoProgramada: asignacion.fechaRegresoProgramada ? new Date(asignacion.fechaRegresoProgramada).toISOString() : '',
          tipo: 'transferencia_almacen',
          origen: 'almacen',
          estado: 'activa',
          estadoTransferencia: 'abierta',
          repartidorId: asignacion.repartidorId,
          repartidorNombre: asignacion.repartidorNombre || '',
          vehiculo: asignacion.vehiculo || '',
          zona: asignacion.zona || '',
          zonaId: asignacion.zonaId || '',
          autocarga: !!asignacion.autocarga,
          asignadaPorUid: currentUser.uid,
          asignadaPorNombre: currentUser.nombre || '',
          items: itemsMap,
          pedidosIds: pedidosSeleccionados.map(p => p.id),
          reservasPedidos: pedidosSeleccionados.map(p => ({ pedidoId: p.id, clienteNombre: p.clienteNombre, items: p.items || [] })),
          entregas: []
        });
        pedidosSeleccionados.forEach(pedido => tx.update(db.collection('pedidos').doc(pedido.id), {
          estado: 'transferencia_confirmada', transferenciaId: rutaRef.id, fechaConfirmacionTransferencia: fecha,
          confirmadaPorUid: currentUser.uid, confirmadaPorNombre: currentUser.nombre || '', fechaActualizacion: fecha
        }));
      });
      appClearDraft('transferencia', currentUser?.uid);
      setCart([]);
      setPedidosIncluidos([]);
      setProgForm(null);
      flash('✅ Transferencia creada y disponible para ventas');
    } catch (e) {
      flash('❌ Error al crear la transferencia: ' + e.message);
    }
    setSaving(false);
  };
  const entregarPedido = async () => {
    if (!pedidoEntrega?.id || !rutaActiva) return;
    if (currentUser.role !== 'repartidor' || rutaActiva.repartidorId !== currentUser.uid) { flash('⚠️ Solo el repartidor asignado puede entregar este pedido'); return; }
    setSaving(true);
    try {
      const items = (pedidoEntrega.items || []).map(item => ({
        id: item.id,
        nombre: item.nombre || '',
        unidad: item.unidad || '',
        precio: Number(item.precio || 0),
        cant: Number(item.cant || 0)
      }));
      const total = Number(pedidoEntrega.total || items.reduce((s, item) => s + item.precio * item.cant, 0));
      const guardarVenta = runtime && runtime.appGuardarVentaTransferencia;
      if (typeof guardarVenta !== 'function') throw new Error('El módulo de ventas offline no está disponible; recarga la aplicación');
      const resultado = await guardarVenta({
        transferenciaId: rutaActiva.id,
        rutaId: rutaActiva.id,
        repartidorUid: currentUser.uid,
        repartidorNombre: currentUser.nombre || '',
        cliente: {
          id: pedidoEntrega.clienteId,
          nombre: pedidoEntrega.clienteNombre,
          telefono: pedidoEntrega.clienteTelefono || ''
        },
        items,
        total,
        formaPago: pedidoEntrega.formaPagoPrevista || 'efectivo',
        tipoVenta: 'pedido_transferencia',
        pedidoId: pedidoEntrega.id
      });
      setPedidoEntrega(null);
      if (resultado.estado === 'pendiente_local') {
        flash('📴 Entrega guardada en pendientes; se sincronizará al volver la conexión');
      } else if (resultado.estado === 'incidencia_inventario') {
        flash('⚠️ Entrega guardada con incidencia; revisa el cierre de caja');
      } else {
        flash('✅ Pedido entregado y venta registrada desde tu transferencia');
      }
    } catch (e) {
      flash('❌ No se pudo entregar el pedido: ' + e.message);
    }
    setSaving(false);
  };
  const cliFilt = clientes.filter(c => c.activo !== false && String(c.nombre || '').toLowerCase().includes(cliSearch.toLowerCase()));
  const disponibles = rutaActiva ? Object.entries(rutaActiva.items || {}).map(([id, it]) => {
    const pendientes = (offlineVentaResumen.registros || [])
      .filter(venta => venta.transferenciaId === rutaActiva.id && ['pendiente', 'reintentando'].includes(venta.estado))
      .reduce((sum, venta) => sum + (venta.items || []).filter(x => x.id === id).reduce((s, x) => s + Number(x.cant || 0), 0), 0);
    const saldoLibre = Math.max(0, Number(it.cantRestante || 0) - Number(it.cantReservadaPedidos || 0) - pendientes);
    return [id, { ...it, saldoLibre, pendientesOffline: pendientes }];
  }).filter(([, it]) => it.saldoLibre > 0) : [];
  const addEnt = (id, it) => {
    const prod = productos.find(p => p.id === id);
    setEntCart(c => {
      const ex = c.find(x => x.id === id);
      if (ex) return ex.cant < it.saldoLibre ? c.map(x => x.id === id ? {
        ...x,
        cant: x.cant + 1
      } : x) : c;
      return [...c, {
        id,
        nombre: it.nombre,
        unidad: it.unidad,
        precio: prod ? prod.precio : 0,
        cant: 1,
        max: it.saldoLibre
      }];
    });
  };
  const updEntQty = (id, v) => {
    const raw = String(v ?? '');
    if (!/^\d*$/.test(raw)) return;
    if (raw === '') {
      setEntCart(c => c.map(x => x.id === id ? { ...x, cant: '' } : x));
      return;
    }
    const cantidad = Math.min(Number(raw), Number(entCart.find(x => x.id === id)?.max || 0));
    setEntCart(c => cantidad < 1 ? c.filter(x => x.id !== id) : c.map(x => x.id === id ? {
      ...x,
      cant: cantidad
    } : x));
  };
  const clienteEnt = cliMode === 'nuevo' ? nuevoC : cliSel;
  const canSaveEnt = clienteEnt?.nombre && entCart.length > 0;
  const guardarEntrega = async () => {
    if (!canSaveEnt || !rutaActiva) return;
    if (entCart.some(item => !Number.isInteger(Number(item.cant)) || Number(item.cant) < 1 || Number(item.cant) > Number(item.max))) {
      flash('⚠️ Cada producto debe tener una cantidad entera válida para esta transferencia');
      return;
    }
    if (currentUser.role !== 'repartidor' || rutaActiva.repartidorId !== currentUser.uid) { flash('⚠️ Solo el repartidor asignado puede registrar ventas desde esta transferencia'); return; }
    setSaving(true);
    try {
      let cl = cliSel;
      if (cliMode === 'nuevo') {
        const ref = await db.collection('clientes').add({
          nombre: nuevoC.nombre,
          telefono: nuevoC.telefono || '',
          domicilio: '',
          activo: true,
          creadoPorUid: currentUser.uid
        });
        cl = { id: ref.id, nombre: nuevoC.nombre, telefono: nuevoC.telefono || '' };
      }
      const items = entCart.map(item => ({
        id: item.id,
        nombre: item.nombre,
        unidad: item.unidad || '',
        precio: Number(item.precio || 0),
        cant: Number(item.cant || 0)
      }));
      const total = items.reduce((s, x) => s + x.precio * x.cant, 0);
      const guardarVenta = runtime && runtime.appGuardarVentaTransferencia;
      if (typeof guardarVenta !== 'function') throw new Error('El módulo de ventas offline no está disponible; recarga la aplicación');
      const resultado = await guardarVenta({
        transferenciaId: rutaActiva.id,
        rutaId: rutaActiva.id,
        repartidorUid: currentUser.uid,
        repartidorNombre: currentUser.nombre || '',
        cliente: cl,
        items,
        total,
        formaPago: pago,
        tipoVenta: 'rapida_repartidor'
      });
      setEntCart([]);
      setCliSel(null);
      setNuevoC({ nombre: '', telefono: '' });
      setCliMode('buscar');
      setEntOpen(false);
      if (resultado.estado === 'pendiente_local') {
        flash('📴 Venta guardada en pendientes; se sincronizará al volver la conexión');
      } else if (resultado.estado === 'incidencia_inventario') {
        flash('⚠️ Venta guardada con incidencia; revisa el cierre de caja');
      } else {
        flash('✅ Venta desde transferencia registrada a ' + cl.nombre);
      }
    } catch (e) {
      flash('❌ Error al guardar la venta: ' + e.message);
    }
    setSaving(false);
  };
  const cerrarRuta = async () => {
    if (!rutaActiva) return;
    if (saving) {
      flash('⏳ Espera a que termine la operación actual');
      return;
    }
    const pendientesFn = runtime && runtime.appVentasPendientesRuta;
    const pendientesOffline = typeof pendientesFn === 'function' ? await pendientesFn(rutaActiva.id) : { total: 0 };
    if (pendientesOffline.total > 0) {
      flash('⚠️ Hay ' + pendientesOffline.total + ' venta(s) offline pendiente(s) de sincronizar; conecta el dispositivo antes de cerrar');
      return;
    }
    if (!confirm('¿Enviar esta transferencia a recepción de almacén? Ya no se podrán registrar más ventas hasta que se concilie.')) return;
    try {
      await db.collection('rutas').doc(rutaActiva.id).update({
        estado: 'pendiente_recepcion',
        estadoTransferencia: 'pendiente_recepcion',
        fechaSolicitudCierre: new Date().toISOString(),
        solicitadoPorUid: currentUser.uid,
        solicitadoPorNombre: currentUser.nombre || ''
      });
      flash('📦 Transferencia enviada a recepción de almacén');
    } catch (e) {
      flash('❌ No se pudo solicitar la recepción: ' + e.message);
    }
  };
  if (currentUser.role === 'repartidor') return React.createElement(FlujoChoferRapido, { productos, clientes, rutas, zonas, jornadas, medicion, tarifas, currentUser });
  return React.createElement("div", {
    style: {
      padding: '16px 12px'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      marginBottom: 12
    }
  }, "📦 Transferencias de almacén"), msg && React.createElement("div", {
    style: {
      background: 'var(--ok-bg)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 13,
      color: 'var(--ok-text)',
      marginBottom: 12
    }
  }, msg), borradorRestaurado && React.createElement("div", {
    style: {
      background: 'var(--info-bg)',
      color: 'var(--info-text)',
      borderRadius: 6,
      padding: '8px 10px',
      fontSize: 12,
      marginBottom: 10
    }
  }, React.createElement(Row, {
    style: {
      justifyContent: 'space-between',
      gap: 8
    }
  }, React.createElement("span", null, "↺ Borrador local de transferencia restaurado."), React.createElement(BOut, {
    onClick: descartarBorradorTransferencia,
    color: "var(--danger-text)",
    style: {
      padding: '4px 7px',
      fontSize: 10,
      flexShrink: 0
    }
  }, "Descartar"))), (currentUser.role === 'admin' || currentUser.role === 'repartidor') && React.createElement(Card, null, React.createElement("button", {
    onClick: () => setProgForm(f => f ? null : {
      repartidorId: currentUser.role === 'repartidor' ? currentUser.uid : '',
      repartidorNombre: currentUser.role === 'repartidor' ? currentUser.nombre || '' : '',
      vehiculo: '',
      zona: '',
      zonaId: '',
      fechaProgramada: '',
      fechaRegresoProgramada: ''
    }),
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--ink)',
      width: '100%',
      textAlign: 'left',
      cursor: 'pointer',
      padding: 0
    }
  }, React.createElement(Row, {
    style: {
      justifyContent: 'space-between'
    }
  }, React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, "📋 Crear transferencia de almacén"), progForm ? React.createElement(CUp, null) : React.createElement(CDown, null))), progForm && React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, React.createElement(Lbl, null, currentUser.role === 'repartidor' ? 'Responsable de transferencia (tú)' : 'Responsable de transferencia'), React.createElement("select", {
    value: progForm.repartidorId,
    onChange: e => {
      const u = usuarios.find(x => x.id === e.target.value);
      setProgForm(f => ({
        ...f,
        repartidorId: e.target.value,
        repartidorNombre: u ? u.nombre : '',
        zona: '',
        zonaId: ''
      }));
      setPedidosIncluidos([]);
    },
    style: {
      background: 'var(--surface-2)',
      border: '1px solid var(--line-strong)',
      borderRadius: 3,
      padding: '8px 10px',
      color: 'var(--ink)',
      fontSize: 13,
      width: '100%',
      boxSizing: 'border-box',
      marginBottom: 10
    }
  }, React.createElement("option", {
    value: ""
  }, "Selecciona…"), (currentUser.role === 'repartidor' ? [{ id: currentUser.uid, nombre: currentUser.nombre || 'Tú' }] : usuarios.filter(u => u.role === 'repartidor')).map(u => React.createElement("option", {
    key: u.id,
    value: u.id
  }, u.nombre))), currentUser.role === 'admin' && usuarios.filter(u => u.role === 'repartidor').length === 0 && React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--warn-text)',
      marginBottom: 10
    }
  }, "No hay usuarios con rol \"repartidor\" todavía — créalos en Configuración → Usuarios."), React.createElement(Lbl, null, "Vehículo"), React.createElement(Inp, {
    value: progForm.vehiculo,
    onChange: e => setProgForm(f => ({
      ...f,
      vehiculo: e.target.value
    })),
    placeholder: "Unidad o medio de distribución…",
    style: {
      marginBottom: 10
    }
  }), React.createElement(Lbl, null, "Zona operativa"), React.createElement("select", {
    value: progForm.zonaId,
    onChange: e => {
      const z = zonas.find(x => x.id === e.target.value);
      setProgForm(f => ({ ...f, zonaId: e.target.value, zona: z ? z.nombre : '' }));
    },
    style: {
      background: 'var(--surface-2)',
      border: '1px solid var(--line-strong)',
      borderRadius: 3,
      padding: '8px 10px',
      color: 'var(--ink)',
      fontSize: 13,
      width: '100%',
      boxSizing: 'border-box',
      marginBottom: 10
    }
  }, React.createElement("option", { value: "" }, "Selecciona una zona…"), zonas.filter(z => z.activo !== false && (z.choferId === progForm.repartidorId || z.repartidorId === progForm.repartidorId)).map(z => React.createElement("option", { key: z.id, value: z.id }, z.nombre)),), React.createElement(Lbl, null, "Salida programada"), React.createElement(Inp, {
    type: "datetime-local",
    value: progForm.fechaProgramada,
    onChange: e => setProgForm(f => ({
      ...f,
      fechaProgramada: e.target.value
    })),
    style: {
      marginBottom: 10
    }
  }), React.createElement(Lbl, null, "Regreso estimado (opcional)"), React.createElement(Inp, {
    type: "datetime-local",
    value: progForm.fechaRegresoProgramada,
    onChange: e => setProgForm(f => ({
      ...f,
      fechaRegresoProgramada: e.target.value
    })),
    style: {
      marginBottom: 10
    }
  }), progForm.repartidorId && React.createElement(React.Fragment, null, React.createElement(Lbl, null, 'Pedidos pendientes de este repartidor'), pedidosPendientesRepartidor.length === 0 ? React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-faint)', marginBottom: 10 } }, 'No hay pedidos asignados pendientes de cargar.') : React.createElement('div', { style: { marginBottom: 10 } }, pedidosPendientesRepartidor.map(pedido => React.createElement('label', { key: pedido.id, style: { display: 'block', padding: '8px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' } }, React.createElement('input', { type: 'checkbox', checked: pedidosIncluidos.includes(pedido.id), onChange: () => togglePedidoTransferencia(pedido), style: { marginRight: 7 } }), React.createElement('strong', { style: { fontSize: 12 } }, pedido.clienteNombre), React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', marginLeft: 22, marginTop: 2 } }, (pedido.items || []).map(item => item.nombre + ' ×' + item.cant).join(', ') + ' · ' + fmt(pedido.total || 0))))), React.createElement('div', { style: { fontSize: 11, color: 'var(--accent-text)', marginBottom: 10 } }, 'Al confirmar la carga, los pedidos seleccionados quedarán vinculados a esta transferencia.'))), React.createElement("div", {
    style: {
      borderTop: '1px solid var(--line-strong)',
      margin: '4px 0 14px'
    }
  }), React.createElement("div", {
    style: {
      borderTop: '1px solid var(--line-strong)',
      margin: '4px 0 14px',
      paddingTop: 12,
      fontSize: 12,
      color: 'var(--ink-faint)'
    }
  }, "La transferencia queda asignada a un responsable. Las ventas de distribución consumen únicamente su saldo transferido."), React.createElement(BFill, {
    onClick: confirmarAsignacion,
    style: {
      width: '100%',
      marginTop: 10
    },
    disabled: progSaving
  }, progSaving ? 'Validando…' : '✅ Confirmar asignación')), !rutaActiva && React.createElement(React.Fragment, null, React.createElement(Card, null, React.createElement(BFill, {
    onClick: () => setScanOpen(true),
    style: {
      width: '100%',
      fontSize: 14,
      padding: 12
    }
  }, "📷 Escanear producto"), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      marginTop: 8,
      textAlign: 'center'
    }
  }, "Escanea cada producto que transfieras; se descuenta del inventario disponible de almacén.")), React.createElement(Card, null, React.createElement("button", {
    onClick: () => setManualOpen(o => !o),
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--ink)',
      width: '100%',
      textAlign: 'left',
      cursor: 'pointer',
      padding: 0
    }
  }, React.createElement(Row, {
    style: {
      justifyContent: 'space-between'
    }
  }, React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, "➕ Agregar manualmente"), manualOpen ? React.createElement(CUp, null) : React.createElement(CDown, null))), manualOpen && React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, React.createElement(Inp, {
    placeholder: "🔍 Buscar producto…",
    value: manualSearch,
    onChange: e => setManualSearch(e.target.value),
    style: {
      marginBottom: 8
    }
  }), React.createElement("div", {
    style: {
      maxHeight: 220,
      overflowY: 'auto'
    }
  }, productos.filter(p => p.nombre.toLowerCase().includes(manualSearch.toLowerCase())).map(p => React.createElement(Row, {
    key: p.id,
    style: {
      justifyContent: 'space-between',
      padding: '9px 0',
      borderBottom: '1px solid var(--line)'
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, p.nombre), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)'
    }
  }, "Stock almacén: ", p.stock, " ", p.unidad)), React.createElement(BFill, {
    onClick: () => addToCart(p),
    style: {
      padding: '5px 12px',
      fontSize: 12
    }
  }, "+ Agregar")))))), cart.length > 0 && React.createElement(Card, null, React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      fontWeight: 700,
      marginBottom: 10
    }
  }, "PRODUCTOS ESCANEADOS (", cart.reduce((s, x) => s + (Number(x.cant) || 0), 0), ")"), cart.map(item => React.createElement(Row, {
    key: item.id,
    style: {
      justifyContent: 'space-between',
      marginBottom: 10
    }
  }, React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, item.nombre), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)'
    }
  }, item.unidad)), React.createElement("input", {
    type: "text",
    inputMode: "numeric",
    value: item.cant === undefined ? '' : item.cant,
    onChange: e => updQty(item.id, e.target.value),
    style: {
      width: 44,
      textAlign: 'center',
      fontWeight: 700,
      fontSize: 14,
      background: 'var(--surface-2)',
      border: '1px solid var(--line-strong)',
      borderRadius: 6,
      color: 'var(--ink)',
      padding: '4px 2px'
    }
  }))), React.createElement(BFill, {
    onClick: guardarRuta,
    style: {
      width: '100%',
      marginTop: 6
    },
    disabled: saving
  }, saving ? 'Guardando…' : '📦 Confirmar transferencia desde almacén'))), rutaActiva && React.createElement(React.Fragment, null, React.createElement(Card, {
    style: {
      borderLeft: '3px solid var(--accent-text)'
    }
  }, React.createElement(Row, {
    style: {
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 14
    }
  }, "📦 Transferencia activa"), React.createElement(Tag, {
    color: "var(--accent-text)"
  }, "Transferencia abierta")), Object.entries(rutaActiva.items).map(([id, it]) => React.createElement(Row, {
    key: id,
    style: {
      justifyContent: 'space-between',
      marginBottom: 4
    }
  }, React.createElement("span", {
    style: {
      fontSize: 13
    }
  }, it.nombre), React.createElement("span", {
    style: {
      fontSize: 12,
      color: it.cantRestante === 0 ? 'var(--ink-faint)' : 'var(--ink-soft)'
    }
  }, it.cantRestante, " / ", it.cantCargada, " ", it.unidad))), React.createElement(BOut, {
    onClick: cerrarRuta,
    color: "var(--danger-text)",
    style: {
      width: '100%',
      marginTop: 10
    }
  }, "📥 Enviar a recepción de almacén")), currentUser.role === 'repartidor' && pedidosEnTransferencia.length > 0 && React.createElement(Card, null, React.createElement('div', { style: { fontWeight: 700, marginBottom: 8 } }, '📋 Pedidos pendientes de entregar'), pedidosEnTransferencia.map(pedido => React.createElement('div', { key: pedido.id, style: { padding: '9px 0', borderBottom: '1px solid var(--line)' } }, React.createElement(Row, { style: { justifyContent: 'space-between', gap: 8 } }, React.createElement('div', null, React.createElement('div', { style: { fontSize: 13, fontWeight: 700 } }, pedido.clienteNombre), React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)' } }, (pedido.items || []).map(item => item.nombre + ' ×' + item.cant).join(', '))), React.createElement('strong', { style: { fontSize: 12, color: 'var(--accent-text)' } }, fmt(pedido.total || 0))), React.createElement(BFill, { onClick: () => setPedidoEntrega(pedido), style: { marginTop: 8, padding: '6px 10px', fontSize: 11 } }, 'Confirmar entrega')))), currentUser.role === 'repartidor' && React.createElement(Card, null, React.createElement("button", {
    onClick: () => setEntOpen(o => !o),
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--ink)',
      width: '100%',
      textAlign: 'left',
      cursor: 'pointer',
      padding: 0
    }
  }, React.createElement(Row, {
    style: {
      justifyContent: 'space-between'
    }
  }, React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, "➕ Registrar venta desde transferencia"), entOpen ? React.createElement(CUp, null) : React.createElement(CDown, null))), entOpen && React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, React.createElement(Lbl, null, "Cliente"), React.createElement(Row, {
    style: {
      gap: 6,
      marginBottom: 10
    }
  }, [['buscar', 'Existente'], ['nuevo', 'Nuevo']].map(([v, l]) => React.createElement("button", {
    key: v,
    onClick: () => setCliMode(v),
    style: {
      flex: 1,
      padding: '7px',
      borderRadius: 8,
      border: 'none',
      background: cliMode === v ? 'var(--accent)' : 'var(--surface-2)',
      color: cliMode === v ? 'var(--ink)' : 'var(--ink-soft)',
      fontSize: 12,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, l))), cliMode === 'buscar' ? React.createElement(React.Fragment, null, React.createElement(Inp, {
    placeholder: "Buscar cliente…",
    value: cliSearch,
    onChange: e => setCliSearch(e.target.value),
    style: {
      marginBottom: 8
    }
  }), React.createElement("div", {
    style: {
      maxHeight: 140,
      overflowY: 'auto',
      marginBottom: 10
    }
  }, cliFilt.map(c => React.createElement("div", {
    key: c.id,
    onClick: () => setCliSel(c),
    style: {
      padding: '9px 10px',
      borderRadius: 8,
      cursor: 'pointer',
      background: cliSel?.id === c.id ? 'var(--info-bg)' : 'transparent',
      marginBottom: 3
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, c.nombre), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-soft)'
    }
  }, "📱 ", c.telefono))))) : React.createElement(React.Fragment, null, React.createElement(Inp, {
    placeholder: "Nombre *",
    value: nuevoC.nombre,
    onChange: e => setNuevoC(x => ({
      ...x,
      nombre: e.target.value
    })),
    style: {
      marginBottom: 8
    }
  }), React.createElement(Inp, {
    placeholder: "Teléfono",
    type: "tel",
    value: nuevoC.telefono,
    onChange: e => setNuevoC(x => ({
      ...x,
      telefono: e.target.value
    })),
    style: {
      marginBottom: 10
    }
  })), React.createElement(Lbl, null, "Productos disponibles en la transferencia"), React.createElement("div", {
    style: {
      maxHeight: 180,
      overflowY: 'auto',
      marginBottom: 10
    }
  }, disponibles.length === 0 && React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--ink-faint)'
    }
  }, "Sin saldo disponible en la transferencia."), disponibles.map(([id, it]) => React.createElement(Row, {
    key: id,
    style: {
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px solid var(--line)'
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, it.nombre), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)'
    }
  }, "Disponibles: ", it.cantRestante, " ", it.unidad)), React.createElement(BFill, {
    onClick: () => addEnt(id, it),
    style: {
      padding: '5px 12px',
      fontSize: 12
    }
  }, "+ Agregar")))), entCart.length > 0 && React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      fontWeight: 700,
      marginBottom: 8
    }
  }, "PRODUCTOS DE ESTA ENTREGA"), entCart.map(item => React.createElement(Row, {
    key: item.id,
    style: {
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      fontSize: 13
    }
  }, item.nombre), React.createElement("input", {
    type: "text",
    inputMode: "numeric",
    value: item.cant === undefined ? '' : item.cant,
    onChange: e => updEntQty(item.id, e.target.value),
    style: {
      width: 40,
      textAlign: 'center',
      fontWeight: 700,
      fontSize: 13,
      background: 'var(--surface-2)',
      border: '1px solid var(--line-strong)',
      borderRadius: 6,
      color: 'var(--ink)',
      padding: '3px 2px'
    }
  })))), React.createElement(Row, {
    style: {
      gap: 8,
      marginBottom: 12
    }
  }, [['efectivo', '💵 Efectivo', 'var(--ok-bg)', 'var(--ok-text)'], ['transferencia', '🏦 Transferencia', 'var(--info-bg)', 'var(--info-text)'], ['credito', '📋 Crédito', 'var(--warn-bg)', 'var(--warn-text)']].map(([v, l, bg, col]) => React.createElement("button", {
    key: v,
    onClick: () => setPago(v),
    style: {
      flex: 1,
      padding: '9px 2px',
      borderRadius: 8,
      border: 'none',
      background: pago === v ? bg : 'var(--surface-2)',
      color: pago === v ? col : 'var(--ink-soft)',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, l))), React.createElement(BFill, {
    onClick: guardarEntrega,
    bg: canSaveEnt ? 'var(--accent)' : 'var(--line-strong)',
    color: canSaveEnt ? 'var(--ink)' : 'var(--ink-faint)',
    style: {
      width: '100%'
    },
    disabled: !canSaveEnt || saving
  }, saving ? 'Guardando…' : '💾 Guardar entrega'))), rutaActiva.entregas?.length > 0 && React.createElement(Card, null, React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      fontWeight: 700,
      marginBottom: 10
    }
  }, "VENTAS DE ESTA TRANSFERENCIA (", rutaActiva.entregas.length, ")"), rutaActiva.entregas.map((e, i) => React.createElement(Row, {
    key: i,
    style: {
      justifyContent: 'space-between',
      paddingBottom: 8,
      borderBottom: '1px solid var(--line)',
      marginBottom: 6
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, e.clienteNombre), React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)'
    }
  }, e.items.length, " prod. · ", e.formaPago)), React.createElement("span", {
    style: {
      fontWeight: 700,
      color: 'var(--accent-text)'
    }
  }, fmt(e.total)))))), currentUser.role === 'admin' && transferenciasPendientes.length > 0 && React.createElement(Card, null, React.createElement("div", {
    style: { fontSize: 11, color: 'var(--warn-text)', fontWeight: 700, marginBottom: 10 }
  }, "RECEPCIONES PENDIENTES (", transferenciasPendientes.length, ")"), transferenciasPendientes.map(t => React.createElement(Row, {
    key: t.id,
    style: { justifyContent: 'space-between', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--line)', marginBottom: 8 }
  }, React.createElement("div", null, React.createElement("div", { style: { fontSize: 13, fontWeight: 700 } }, t.repartidorNombre || 'Sin responsable'), React.createElement("div", { style: { fontSize: 11, color: 'var(--ink-faint)' } }, (t.entregas || []).length, " ventas registradas")), React.createElement(BFill, {
    onClick: () => abrirRecepcion(t),
    style: { fontSize: 12, padding: '7px 10px' }
  }, "Recibir")))), recepcion && React.createElement(Modal, {
    title: '📥 Recibir transferencia de ' + recepcion.responsable,
    onClose: () => !saving && setRecepcion(null)
  }, React.createElement("div", { style: { fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12, lineHeight: 1.45 } }, "Confirma lo recibido en almacén. Las cantidades devueltas regresan al stock general; cualquier diferencia se registra como merma."), Object.entries(recepcion.items).map(([id, item]) => React.createElement(Row, {
    key: id,
    style: { justifyContent: 'space-between', gap: 8, marginBottom: 10 }
  }, React.createElement("div", null, React.createElement("div", { style: { fontSize: 13, fontWeight: 600 } }, item.nombre), React.createElement("div", { style: { fontSize: 11, color: 'var(--ink-faint)' } }, "Pendiente en transferencia: ", item.restante, " ", item.unidad)), React.createElement(Inp, {
    type: 'number',
    min: 0,
    max: item.restante,
    value: item.cantidadDevuelta,
    onChange: e => actualizarDevolucion(id, e.target.value),
    style: { width: 84, marginBottom: 0, textAlign: 'center' }
  }))), Object.values(recepcion.items).some(item => Number(item.cantidadDevuelta || 0) < Number(item.restante || 0)) && React.createElement(React.Fragment, null, React.createElement(Lbl, null, "Motivo de merma o diferencia"), React.createElement(Inp, {
    value: recepcion.motivoMerma,
    onChange: e => setRecepcion(r => ({ ...r, motivoMerma: e.target.value })),
    placeholder: "Ej. producto dañado, faltante confirmado",
    style: { marginBottom: 12 }
  })), React.createElement(BFill, {
    onClick: recibirTransferencia,
    disabled: saving,
    style: { width: '100%' }
  }, saving ? 'Conciliando…' : '✅ Recibir y cerrar transferencia')), scanOpen && React.createElement(BarcodeScanner, {
    onDetected: handleScan,
    onClose: () => setScanOpen(false)
  }), pedidoEntrega && React.createElement(Modal, { title: 'Confirmar entrega de pedido', onClose: () => !saving && setPedidoEntrega(null) }, React.createElement('div', { style: { fontWeight: 700, marginBottom: 8 } }, pedidoEntrega.clienteNombre), React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 } }, (pedidoEntrega.items || []).map(item => item.nombre + ' ×' + item.cant).join(', ')), React.createElement('div', { style: { fontSize: 12, marginBottom: 14 } }, 'Al confirmar se registrará la venta desde tu transferencia y se aplicará el pago previsto: ', React.createElement('strong', null, pedidoEntrega.formaPagoPrevista || 'efectivo'), '.'), React.createElement(BFill, { onClick: entregarPedido, disabled: saving, style: { width: '100%' } }, saving ? 'Registrando…' : 'Confirmar entrega y venta')), productoNoEncontrado && React.createElement(Modal, {
    title: 'Producto no encontrado',
    onClose: () => setProductoNoEncontrado('')
  }, React.createElement("div", { style: { fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 16 } }, 'El código ', React.createElement("strong", null, productoNoEncontrado), ' no existe en el catálogo. ¿Quieres agregar este producto?'), React.createElement(Row, { style: { gap: 8, justifyContent: 'flex-end' } }, React.createElement(BOut, { onClick: () => setProductoNoEncontrado('') }, 'Cancelar'), React.createElement(BFill, { onClick: abrirAltaProductoEscaneado }, 'Agregar producto'))), altaProducto && React.createElement(Modal, {
    title: '➕ Agregar producto escaneado',
    onClose: () => !guardandoProducto && setAltaProducto(null)
  }, React.createElement("div", { style: { fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12, lineHeight: 1.45 } }, 'Completa los datos del producto. El código escaneado se conservará y se verificará nuevamente al guardar.'), React.createElement(Lbl, null, 'Código de barras'), React.createElement(Inp, {
    value: altaProducto.codigoBarras,
    readOnly: true,
    style: { marginBottom: 10, background: 'var(--surface-2)' }
  }), React.createElement(Lbl, null, 'Nombre del producto'), React.createElement(Inp, {
    value: altaProducto.nombre,
    onChange: e => setAltaProducto(p => ({ ...p, nombre: e.target.value })),
    placeholder: 'Ej. Agua purificada 1 L',
    style: { marginBottom: 10 }
  }), React.createElement(Row, { style: { gap: 8 } }, React.createElement("div", { style: { flex: 1 } }, React.createElement(Lbl, null, 'Precio'), React.createElement(Inp, {
    type: 'number',
    min: 0,
    step: '0.01',
    value: altaProducto.precio,
    onChange: e => setAltaProducto(p => ({ ...p, precio: e.target.value })),
    style: { marginBottom: 10 }
  })), React.createElement("div", { style: { flex: 1 } }, React.createElement(Lbl, null, 'Stock inicial'), React.createElement(Inp, {
    type: 'number',
    min: 0,
    step: '1',
    value: altaProducto.stock,
    onChange: e => setAltaProducto(p => ({ ...p, stock: e.target.value })),
    style: { marginBottom: 10 }
  }))), React.createElement(Lbl, null, 'Unidad'), React.createElement(Inp, {
    value: altaProducto.unidad,
    onChange: e => setAltaProducto(p => ({ ...p, unidad: e.target.value })),
    placeholder: 'pieza, caja, garrafón…',
    style: { marginBottom: 10 }
  }), React.createElement(Lbl, null, 'Motivo de alta'), React.createElement(Inp, {
    value: altaProducto.motivo,
    onChange: e => setAltaProducto(p => ({ ...p, motivo: e.target.value })),
    style: { marginBottom: 14 }
  }), React.createElement(BFill, {
    onClick: guardarProductoEscaneado,
    disabled: guardandoProducto,
    style: { width: '100%' }
  }, guardandoProducto ? 'Guardando…' : '💾 Guardar y agregar a transferencia')), historial.length > 0 && React.createElement(Card, null, React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      fontWeight: 700,
      marginBottom: 10
    }
  }, "HISTORIAL DE TRANSFERENCIAS"), historial.map(r => React.createElement("div", {
    key: r.id,
    style: {
      paddingBottom: 8,
      borderBottom: '1px solid var(--line)',
      marginBottom: 8
    }
  }, React.createElement("button", {
    onClick: () => setExpandId(expandId === r.id ? null : r.id),
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--ink)',
      width: '100%',
      textAlign: 'left',
      cursor: 'pointer',
      padding: 0
    }
  }, React.createElement(Row, {
    style: {
      justifyContent: 'space-between',
      marginBottom: 4
    }
  }, React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--ink-soft)'
    }
  }, fDate(r.fecha)), React.createElement(Row, {
    style: {
      gap: 6
    }
  }, React.createElement(Tag, {
    color: r.estado === 'activa' ? 'var(--accent-text)' : 'var(--ink-faint)'
  }, r.estado || 'cerrada'), React.createElement(Tag, {
    color: "var(--ok-text)"
  }, (r.entregas || []).length, " entregas")))), expandId === r.id && React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      fontWeight: 700,
      marginBottom: 4
    }
  }, "TRANSFERIDO"), Array.isArray(r.items) ? r.items.map(it => React.createElement("div", {
    key: it.id,
    style: {
      fontSize: 12,
      color: 'var(--ink-soft)'
    }
  }, "• ", it.nombre, " x", it.cant)) : Object.entries(r.items || {}).map(([id, it]) => React.createElement("div", {
    key: id,
    style: {
      fontSize: 12,
      color: 'var(--ink-soft)'
    }
  }, "• ", it.nombre, " x", it.cantCargada, " (quedan ", it.cantRestante, ")")), (r.entregas || []).length > 0 && React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--ink-faint)',
      fontWeight: 700,
      marginTop: 8,
      marginBottom: 4
    }
  }, "ENTREGAS"), r.entregas.map((e, i) => React.createElement(Row, {
    key: i,
    style: {
      justifyContent: 'space-between',
      fontSize: 12,
      marginBottom: 3
    }
  }, React.createElement("span", null, e.clienteNombre), React.createElement("span", {
    style: {
      color: 'var(--accent-text)',
      fontWeight: 700
    }
  }, fmt(e.total))))))))));
}
