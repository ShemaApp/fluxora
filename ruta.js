function FlujoChoferRapido({
  productos = [],
  clientes = [],
  localidades = [],
  jornadas = [],
  notas = [],
  offlineVentaResumen = { registros: [] },
  medicion = null,
  tarifas = [],
  vehiculos = [],
  medidores = [],
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

  const jornadaActiva = (jornadas || []).find(j => j.estado === 'abierta' && j.repartidorId === currentUser.uid);
  const localidadesAsignadas = obtenerLocalidadesAsignadas({ localidades, currentUser, localidadIds: currentUser.localidadIds });
  const localidadDeRuta = jornadaActiva?.localidadId ? localidadesAsignadas.find(l => l.id === jornadaActiva.localidadId) : null;
  const localidadesDeTrabajo = localidadDeRuta ? [localidadDeRuta] : localidadesAsignadas;
  const localidadIds = new Set(localidadesDeTrabajo.map(l => l.id));
  const localidad = localidadesDeTrabajo.map(l => l.nombre).join(', ') || jornadaActiva?.localidadNombre || 'Localidades asignadas';
  const vehiculoRuta = resolverVehiculoOperativo({ jornada: jornadaActiva, localidad: localidadDeRuta, vehiculos });
  const medidorRuta = resolverMedidorOperativo({ jornada: jornadaActiva, localidad: localidadDeRuta, vehiculo: vehiculoRuta, medidores, medicion });
  const vehiculoIdRuta = vehiculoRuta.id || jornadaActiva?.vehiculoId || '';
  const medidorIdRuta = medidorRuta.id || jornadaActiva?.medidorId || '';
  const vehiculoNombreRuta = vehiculoRuta.nombre || jornadaActiva?.vehiculoNombre || jornadaActiva?.vehiculo || vehiculoIdRuta || 'Pendiente';
  const medidorNombreRuta = medidorRuta.nombre || jornadaActiva?.medidorNombre || medidorIdRuta || 'Pendiente';
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
  const claveAtendido = c => `${jornadaActiva?.id || 'sin-jornada'}:${c?.id || c?.nombre || ''}`;

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

  const clientesLocalidad = (clientes || []).filter(c => c.activo !== false && localidadIds.size > 0 && (localidadIds.has(c.localidadId) || (!c.localidadId && localidadesDeTrabajo.some(l => String(l.nombre || '').trim().toLowerCase() === String(c.localidadNombre || c.localidad || c.domicilio || '').trim().toLowerCase()))));
  const clientesFiltrados = clientesLocalidad.filter(c => {
    const q = busqueda.toLowerCase().trim();
    return !q || `${c.nombre || ''} ${c.identificacion || c.id || ''} ${c.domicilio || c.direccion || ''} ${c.localidadNombre || c.localidad || ''}`.toLowerCase().includes(q);
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
    if (!cliente || !jornadaActiva || !vehiculoIdRuta || !medidorIdRuta || !Number.isFinite(lecturaAntesNumero) || !Number.isFinite(cantidadNumero) || cantidadNumero <= 0 || !Number.isFinite(lecturaCalculadaNumero) || !formaPago) { mostrar('Captura una cantidad comercial válida y confirma la jornada con vehículo y medidor asignados'); return; }
    if (!Number.isFinite(aguaDisponibleAntes) || aguaDisponibleAntes <= 0 || litrosDespachados > aguaDisponibleAntes + 1e-9) { mostrar(`Agua insuficiente. Disponible: ${Math.max(0, aguaDisponibleAntes).toFixed(2)} L`); return; }
    if (medicion && (medicion.unidadActivo === false || medicion.medidorActivo === false)) { mostrar('La configuración de medición está inactiva; solicita a ADMIN que la habilite'); return; }
    setGuardando(true);
    try {
      const guardar = runtime && runtime.appGuardarVentaAgua;
      if (typeof guardar !== 'function') throw new Error('El módulo de ventas offline no está disponible');
      const resultado = await guardar({
        unidadComercial: unidadComercialVenta,
        tarifaId: tarifaVenta.id,
        tarifaNombre: tarifaVenta.nombre || unidadComercialVenta,
        tarifaSnapshot: { id: tarifaVenta.id, nombre: tarifaVenta.nombre || unidadComercialVenta, unidadComercial: unidadComercialVenta, litrosPorUnidad: litrosPorUnidadVenta, incrementoContadorPorUnidad: incrementoContadorPorUnidadVenta, precioUnitario, activo: tarifaVenta.activo !== false },
        jornadaId: jornadaActiva.id,
        vehiculoId: vehiculoIdRuta,
        vehiculo: vehiculoNombreRuta,
        vehiculoNombre: vehiculoNombreRuta,
        medidorId: medidorIdRuta,
        medidorNombre: medidorNombreRuta,
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
  const estadosVentaOffline = ['pendiente', 'reintentando', 'requiere_revision', 'incidencia_inventario'];
  const ventasOfflineJornada = (offlineVentaResumen.registros || []).filter(venta => venta.jornadaId === jornadaActiva?.id && estadosVentaOffline.includes(venta.estado));
  const ventasJornada = (notas || []).filter(venta => venta.jornadaId === jornadaActiva?.id).concat(ventasOfflineJornada);
  const litrosVendidosRuta = jornadaActiva ? Math.max(Number(jornadaActiva.litrosVendidosAcumulados ?? jornadaActiva.litrosVendidos ?? 0), ventasJornada.reduce((suma, venta) => suma + Number(venta.litrosVendidos || (venta.items || []).reduce((subtotal, item) => subtotal + Number(item.litrosVendidos || item.litros || 0), 0)), 0)) : 0;
  const garrafonesVendidosRuta = ventasJornada.reduce((suma, venta) => suma + Number(venta.garrafones || (venta.items || []).reduce((subtotal, item) => subtotal + Number(item.cant || 0), 0)), 0);
  const medidorLogicoRuta = jornadaActiva ? Number(jornadaActiva.lecturaCalculadaActual ?? jornadaActiva.lecturaActual ?? jornadaActiva.lecturaInicial ?? 0) + ventasOfflineJornada.reduce((suma, venta) => suma + Number(venta.incrementoContador || 0), 0) : null;
  const color = { ink: 'var(--ink)', soft: 'var(--ink-soft)', faint: 'var(--ink-faint)', line: 'var(--line)', surface: 'var(--surface)', accent: 'var(--accent)', ok: 'var(--ok-bg)', okText: 'var(--ok-text)' };

  return React.createElement('div', { className: 'fx-page-route', style: { padding: '14px 12px 28px' } },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
      React.createElement('div', null, React.createElement('div', { style: { fontSize: 21, fontWeight: 800, letterSpacing: '-.02em' } }, 'Ruta del día'), React.createElement('div', { style: { fontSize: 12, color: color.soft, marginTop: 3 } }, localidad)), React.createElement('div', { style: { fontSize: 11, color: color.soft, textAlign: 'right' } }, 'PASO ', paso, ' DE 3', React.createElement('div', { style: { marginTop: 5, height: 4, width: 72, background: color.line, borderRadius: 5, overflow: 'hidden' } }, React.createElement('div', { style: { height: '100%', width: `${paso * 33.333}%`, background: color.accent } })))
    ),
    mensaje && React.createElement('div', { style: { padding: '10px 12px', borderRadius: 10, background: color.ok, color: color.okText, fontSize: 12, fontWeight: 700, margin: '10px 0' } }, mensaje),
    jornadaActiva && React.createElement('div', { style: { background: color.surface, border: `1px solid ${color.line}`, borderRadius: 12, padding: 11, margin: '10px 0 14px' } }, React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800 } }, React.createElement('span', null, 'AGUA DISPONIBLE'), React.createElement('span', { style: { color: porcentajeAgua <= 15 ? 'var(--danger-text)' : color.okText } }, aguaDisponibleNumero.toFixed(2), ' L')), React.createElement('div', { style: { height: 8, background: color.line, borderRadius: 8, overflow: 'hidden', marginTop: 7 } }, React.createElement('div', { style: { height: '100%', width: `${porcentajeAgua}%`, background: porcentajeAgua <= 15 ? 'var(--danger-text)' : color.accent, transition: 'width .18s ease' } })), React.createElement('div', { style: { fontSize: 10, color: color.soft, marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 } }, React.createElement('span', null, 'Litros cargados: ', aguaCargadaNumero.toFixed(2), ' L'), React.createElement('span', null, 'Litros vendidos: ', litrosVendidosRuta.toFixed(2), ' L'), React.createElement('span', null, 'Litros disponibles: ', aguaDisponibleNumero.toFixed(2), ' L'), React.createElement('span', null, 'Garrafones vendidos: ', garrafonesVendidosRuta.toFixed(2)), React.createElement('span', { style: { gridColumn: '1 / -1', fontWeight: 800, color: color.ink } }, 'Medidor lógico acumulado: ', medidorLogicoRuta === null ? '—' : medidorLogicoRuta.toFixed(2), ' contador · lectura física solo al cierre'))),
    paso === 1 && React.createElement(React.Fragment, null,
      jornadaActiva && React.createElement('div', { style: { background: color.surface, border: `1px solid ${color.line}`, borderRadius: 11, padding: 10, margin: '12px 0 10px' } }, React.createElement('div', { style: { fontSize: 10, color: color.faint, fontWeight: 800, letterSpacing: '.08em' } }, 'ASIGNACIÓN OPERATIVA'), React.createElement('div', { style: { fontSize: 13, fontWeight: 800, marginTop: 4 } }, '🚚 ', vehiculoNombreRuta), React.createElement('div', { style: { fontSize: 11, color: color.soft, marginTop: 3 } }, 'Vehículo ID: ', vehiculoIdRuta, ' · Medidor: ', medidorNombreRuta, ' · Medidor ID: ', medidorIdRuta), React.createElement('div', { style: { fontSize: 10, color: color.soft, marginTop: 4 } }, medidorRuta.digitos, ' dígitos · el sexto dígito incrementa cada ', medidorRuta.litrosPorIncremento, ' L')),
      React.createElement('input', { value: busqueda, onChange: e => setBusqueda(e.target.value), placeholder: 'Buscar por nombre, ID o dirección…', style: { width: '100%', boxSizing: 'border-box', padding: '13px 14px', border: `1px solid ${color.line}`, borderRadius: 11, background: color.surface, color: color.ink, fontSize: 14, margin: '14px 0 10px' }, autoFocus: true }),
      React.createElement('div', { style: { fontSize: 11, fontWeight: 800, color: color.faint, letterSpacing: '.08em', margin: '12px 2px 8px' } }, 'CLIENTES · ', clientesFiltrados.length),
      React.createElement('div', null, clientesFiltrados.map(c => React.createElement('button', { key: c.id, onClick: () => seleccionarCliente(c), style: { width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: `1px solid ${atendido(c) ? 'var(--ok)' : color.line}`, background: atendido(c) ? color.ok : color.surface, borderRadius: 12, padding: '13px 12px', marginBottom: 8, cursor: 'pointer', color: color.ink } }, React.createElement('span', { style: { minWidth: 0 } }, React.createElement('span', { style: { display: 'block', fontWeight: 800, fontSize: 14 } }, c.nombre || 'Cliente sin nombre'), React.createElement('span', { style: { display: 'block', fontSize: 11, color: color.soft, marginTop: 3 } }, 'ID ', c.identificacion || c.id, ' · ', c.domicilio || c.direccion || 'Sin dirección', c.localidadNombre || c.localidad ? ' · ' + (c.localidadNombre || c.localidad) : '')), React.createElement('span', { style: { fontSize: 22, color: atendido(c) ? 'var(--ok-text)' : color.faint, fontWeight: 800 } }, atendido(c) ? '✓' : '›')))),
      clientesFiltrados.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: 28, color: color.faint, fontSize: 13 } }, 'No hay clientes para esta búsqueda o localidad.')
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

function CargasPanel({ clientes = [], localidades = [], jornadas = [], vehiculos = [], medidores = [], currentUser = {} }) {
  if (currentUser.role !== 'admin') return null;
  const localidadesActivas = (localidades || []).filter(localidad => localidad.activo !== false);
  const numero = valor => Number(valor || 0).toFixed(2);
  return React.createElement('div', { style: { padding: '16px 12px', color: 'var(--ink)' } },
    React.createElement('div', { style: { fontSize: 21, fontWeight: 800, marginBottom: 4 } }, 'Cargas y jornadas'),
    React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 12, lineHeight: 1.45, marginBottom: 14 } }, 'Supervisa la carga de agua y la jornada vinculada a cada localidad. Las ventas, lecturas y conciliaciones se registran en el flujo operativo.'),
    localidadesActivas.map(localidad => {
      const jornada = (jornadas || []).find(item => item.estado === 'abierta' && item.localidadId === localidad.id);
      const clientesLocalidad = (clientes || []).filter(cliente => cliente.localidadId === localidad.id).length;
      const vehiculo = localidad.vehiculoNombre || localidad.vehiculoId || 'Sin vehículo';
      const medidor = localidad.medidorNombre || localidad.medidorId || 'Sin medidor';
      return React.createElement('div', { key: localidad.id, style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 13, marginBottom: 10 } },
        React.createElement('div', { style: { fontSize: 15, fontWeight: 800 } }, localidad.nombre || localidad.id),
        React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 } }, localidad.repartidorNombre || 'Sin repartidor', ' · ', clientesLocalidad, ' cliente(s) fijo(s)'),
        React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 5 } }, 'Vehículo: ', vehiculo, ' · Medidor: ', medidor),
        jornada ? React.createElement('div', { style: { marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--ok-text)', fontWeight: 700 } }, 'Jornada abierta · Carga: ', numero(jornada.aguaCargadaLitros), ' L · Disponible: ', numero(jornada.aguaDisponibleLitros), ' L · Vendido: ', numero(jornada.litrosVendidosAcumulados ?? jornada.litrosVendidos), ' L · Lectura lógica: ', numero(jornada.lecturaCalculadaActual ?? jornada.lecturaActual ?? jornada.lecturaInicial)) : React.createElement('div', { style: { marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-faint)' } }, 'Sin jornada abierta'));
    }),
    localidadesActivas.length === 0 ? React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12, textAlign: 'center', padding: 24 } }, 'No hay localidades activas.') : null);
}

function RutaReparto(props) {
  const { currentUser = {} } = props;
  if (currentUser.role === 'repartidor') return React.createElement(FlujoChoferRapido, props);
  return React.createElement(CargasPanel, props);
}
