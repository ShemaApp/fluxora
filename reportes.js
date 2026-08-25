function Reportes({ notas = [], creditos = [], jornadas = [], localidades = [], servicios = [], currentUser = {} }) {
  if (currentUser.role !== 'admin') return null;
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const moneda = valor => '$' + Number(valor || 0).toFixed(2);
  const fecha = valor => valor ? new Date(valor).toLocaleString('es-MX') : '—';
  const localidadesPorId = new Map((localidades || []).map(localidad => [String(localidad.id), localidad]));
  const jornadasPorId = new Map((jornadas || []).map(jornada => [String(jornada.id), jornada]));
  const pareceIdentificadorTecnico = valor => {
    const texto = String(valor || '').trim();
    return !texto || (!/[\sáéíóúñ]/i.test(texto) && /^[A-Za-z0-9_-]{16,}$/.test(texto));
  };
  const localidadVisible = registro => {
    const catalogo = registro?.localidadId ? localidadesPorId.get(String(registro.localidadId)) : null;
    const nombreCatalogo = catalogo?.nombre || catalogo?.nombreLocalidad;
    if (nombreCatalogo && !pareceIdentificadorTecnico(nombreCatalogo)) return nombreCatalogo;
    const nombreGuardado = registro?.localidadNombre || registro?.localidad;
    return nombreGuardado && !pareceIdentificadorTecnico(nombreGuardado) ? nombreGuardado : 'Localidad no disponible';
  };
  const jornadaVisible = venta => {
    const jornada = venta?.jornadaId ? jornadasPorId.get(String(venta.jornadaId)) : null;
    const nombre = venta?.jornadaNombre || jornada?.nombre;
    if (nombre && !pareceIdentificadorTecnico(nombre)) return nombre;
    const fechaJornada = venta?.fecha || jornada?.fechaInicio || jornada?.fechaCierre;
    return fechaJornada ? 'Jornada ' + new Date(fechaJornada).toLocaleDateString('es-MX') : 'Jornada sin fecha';
  };
  const vehiculoVisible = venta => venta?.vehiculoNombre || 'Vehículo no disponible';
  const medidorVisible = venta => venta?.medidorNombre || 'Medidor no disponible';
  const dentroDelPeriodo = valor => {
    const tiempo = Date.parse(valor || '');
    if (!Number.isFinite(tiempo)) return true;
    if (desde && tiempo < new Date(desde + 'T00:00:00').getTime()) return false;
    if (hasta && tiempo > new Date(hasta + 'T23:59:59').getTime()) return false;
    return true;
  };
  const serviciosPeriodo = (servicios || []).filter(servicio => dentroDelPeriodo(servicio.createdAt || servicio.creadoEn)).map(servicio => ({
    ...servicio,
    fecha: servicio.createdAt || servicio.creadoEn,
    clienteNombre: servicio.clienteNombre || '',
    localidadNombre: servicio.localidadNombre || '',
    jornadaNombre: servicio.jornadaNombre || '',
    vehiculoNombre: servicio.vehiculoNombre || '',
    medidorNombre: servicio.medidorNombre || '',
    tarifaId: servicio.venta?.tarifaId || '',
    tarifaNombre: servicio.venta?.tarifaNombre || '',
    tarifaSnapshot: servicio.venta?.tarifaSnapshot || null,
    garrafones: Number(servicio.venta?.garrafonesCobrables || servicio.medicion?.garrafonesEquivalentes || 0),
    litrosVendidos: Number(servicio.medicion?.litrosRellenados || 0),
    precioUnitario: Number(servicio.venta?.precioUnitarioAplicado || 0),
    total: Number(servicio.venta?.total || 0),
    formaPago: 'facturado',
    tipoOperacion: 'relleno_por_medicion',
    estadoServicio: servicio.estado || 'completado'
  }));
  const ventas = notas.filter(venta => dentroDelPeriodo(venta.fecha));
  const operaciones = ventas.concat(serviciosPeriodo);
  const litros = operaciones.reduce((suma, venta) => suma + Number(venta.litrosVendidos || (venta.items || []).reduce((subtotal, item) => subtotal + Number(item.litrosVendidos || item.litros || 0), 0)), 0);
  const unidades = operaciones.reduce((suma, venta) => suma + Number(venta.garrafones || (venta.items || []).reduce((subtotal, item) => subtotal + Number(item.cant || 0), 0)), 0);
  const total = operaciones.reduce((suma, venta) => suma + Number(venta.total || 0), 0);
  const efectivo = operaciones.filter(venta => venta.formaPago === 'efectivo' || venta.formaPago === 'contado').reduce((suma, venta) => suma + Number(venta.total || 0), 0);
  const credito = operaciones.filter(venta => venta.formaPago === 'credito').reduce((suma, venta) => suma + Number(venta.total || 0), 0);
  const facturado = operaciones.filter(venta => venta.formaPago === 'facturado').reduce((suma, venta) => suma + Number(venta.total || 0), 0);
  const tarifas = operaciones.reduce((mapa, venta) => {
    const snapshot = venta.tarifaSnapshot || {};
    const clave = venta.tarifaId || snapshot.id || venta.tarifaNombre || venta.unidadComercial || 'sin_tarifa';
    const fila = mapa[clave] || (mapa[clave] = { nombre: venta.tarifaNombre || snapshot.nombre || venta.unidadComercial || 'Sin tarifa', unidades: 0, litros: 0, precioUnitario: Number(venta.precioUnitario ?? snapshot.precioUnitario ?? 0), subtotal: 0, efectivo: 0, credito: 0, facturado: 0 });
    fila.unidades += Number(venta.garrafones || 0);
    fila.litros += Number(venta.litrosVendidos || 0);
    fila.subtotal += Number(venta.total || 0);
    if (venta.formaPago === 'credito') fila.credito += Number(venta.total || 0);
    else if (venta.formaPago === 'facturado') fila.facturado += Number(venta.total || 0);
    else fila.efectivo += Number(venta.total || 0);
    return mapa;
  }, {});
  const descargar = (nombre, contenido, tipo) => {
    const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const filasVenta = () => [['Fecha', 'Cliente', 'Localidad', 'Jornada', 'Vehículo', 'Medidor', 'Tipo de servicio', 'Tarifa', 'Unidades', 'Litros', 'Precio unitario', 'Subtotal', 'Forma de pago', 'Estado'], ...operaciones.map(venta => [fecha(venta.fecha), venta.clienteNombre || '', localidadVisible(venta), jornadaVisible(venta), vehiculoVisible(venta), medidorVisible(venta), venta.tipoOperacion === 'relleno_por_medicion' ? 'Relleno por medición' : 'Venta por cantidad', venta.tarifaNombre || venta.tarifaSnapshot?.nombre || '', venta.garrafones || '', venta.litrosVendidos || '', venta.precioUnitario || venta.tarifaSnapshot?.precioUnitario || '', venta.total || 0, venta.formaPago || '', venta.estadoServicio || venta.estado || 'confirmada'])];
  const exportarCSV = () => descargar('fluxora-ventas-' + Date.now() + '.csv', '\uFEFF' + filasVenta().map(fila => fila.map(valor => '"' + String(valor ?? '').replace(/"/g, '""') + '"').join(',')).join('\n'), 'text/csv;charset=utf-8');
  const exportarExcel = () => {
    if (typeof XLSX === 'undefined') return exportarCSV();
    const libro = XLSX.utils.book_new();
    const ventasHoja = filasVenta();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(ventasHoja), 'Ventas');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(Object.values(tarifas)), 'Resumen tarifas');
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(jornadas.filter(jornada => jornada.estado === 'cerrada').map(jornada => ({ Localidad: localidadVisible(jornada), Jornada: jornadaVisible(jornada), Repartidor: jornada.repartidorNombre || 'Sin repartidor', Vehículo: jornada.vehiculoNombre || 'Vehículo no disponible', Medidor: jornada.medidorNombre || 'Medidor no disponible', Inicial: jornada.lecturaInicial ?? '', 'Final físico': jornada.lecturaFinal ?? '', 'Litros medidos': Number(jornada.litrosMedidos || 0), 'Litros vendidos': Number(jornada.litrosVendidosAcumulados ?? jornada.litrosVendidos ?? 0), 'Servicios medidos': serviciosPeriodo.filter(servicio => servicio.jornadaId === jornada.id).length, 'Litros por relleno medido': serviciosPeriodo.filter(servicio => servicio.jornadaId === jornada.id).reduce((total, servicio) => total + Number(servicio.litrosVendidos || 0), 0), 'Diferencia litros': Number(jornada.diferenciaLitros || 0) }))), 'Conciliación');
    XLSX.writeFile(libro, 'fluxora-reporte-' + Date.now() + '.xlsx');
  };
  const jornadaCerrada = jornadas.filter(jornada => jornada.estado === 'cerrada' && dentroDelPeriodo(jornada.fechaCierre || jornada.fechaInicio));
  return React.createElement('div', { style: { padding: '16px 12px', color: 'var(--ink)' } },
    React.createElement('div', { style: { fontSize: 21, fontWeight: 800, marginBottom: 4 } }, 'Reportes de operación'),
    React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 12, lineHeight: 1.45, marginBottom: 14 } }, 'Ventas por cantidad y rellenos por medición, litros, garrafones, tarifas, formas de pago, jornadas y diferencias de conciliación.'),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 } }, React.createElement('label', { style: { fontSize: 11, color: 'var(--ink-soft)' } }, 'Desde', React.createElement('input', { type: 'date', value: desde, onChange: e => setDesde(e.target.value), style: { display: 'block', width: '100%', marginTop: 4, padding: 9 } })), React.createElement('label', { style: { fontSize: 11, color: 'var(--ink-soft)' } }, 'Hasta', React.createElement('input', { type: 'date', value: hasta, onChange: e => setHasta(e.target.value), style: { display: 'block', width: '100%', marginTop: 4, padding: 9 } }))),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 } }, React.createElement(StatTile, { value: operaciones.length, label: 'Operaciones', bg: 'var(--rail)', color: 'var(--rail-ink)' }), React.createElement(StatTile, { value: litros.toFixed(2) + ' L', label: 'Litros atendidos', bg: 'var(--accent)', color: 'var(--accent-ink)' }), React.createElement(StatTile, { value: unidades.toFixed(2), label: 'Garrafones', bg: 'var(--info)', color: '#fff' }), React.createElement(StatTile, { value: moneda(total), label: 'Total operativo', bg: 'var(--ok)', color: '#fff' })),
    React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginBottom: 12 } }, 'Efectivo registrado: ', moneda(efectivo), ' · Crédito generado: ', moneda(credito), ' · Facturado por relleno: ', moneda(facturado), ' · Créditos pendientes: ', moneda(creditos.reduce((suma, item) => suma + Number(item.saldo || 0), 0))),
    React.createElement('div', { style: { display: 'flex', gap: 8, marginBottom: 14 } }, React.createElement('button', { onClick: exportarExcel, style: { flex: 1, padding: 11, border: 0, borderRadius: 8, background: 'var(--accent)', color: 'var(--ink)', fontWeight: 800 } }, 'Exportar Excel'), React.createElement('button', { onClick: exportarCSV, style: { flex: 1, padding: 11, border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)', fontWeight: 800 } }, 'Exportar CSV')),
    React.createElement(Card, null, React.createElement('div', { style: { fontWeight: 800, marginBottom: 8 } }, 'Resumen por tarifa'), Object.values(tarifas).map((fila, indice) => React.createElement('div', { key: indice, style: { borderTop: indice ? '1px solid var(--line)' : 'none', padding: '8px 0', fontSize: 11 } }, React.createElement('strong', null, fila.nombre), ' · ', fila.unidades.toFixed(2), ' unidades · ', fila.litros.toFixed(2), ' L · ', moneda(fila.subtotal), ' · Efectivo ', moneda(fila.efectivo), ' · Crédito ', moneda(fila.credito), ' · Facturado ', moneda(fila.facturado))), Object.keys(tarifas).length === 0 ? React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12 } }, 'No hay ventas en el periodo seleccionado.') : null),
    React.createElement(Card, null, React.createElement('div', { style: { fontWeight: 800, marginBottom: 8 } }, 'Jornadas cerradas y conciliación'), jornadaCerrada.slice(0, 40).map(jornada => React.createElement('div', { key: jornada.id, style: { borderTop: '1px solid var(--line)', padding: '8px 0', fontSize: 11 } }, React.createElement('strong', null, localidadVisible(jornada)), ' · ', jornada.repartidorNombre || 'Sin repartidor', React.createElement('div', { style: { color: 'var(--ink-soft)', marginTop: 3 } }, 'Inicial ', jornada.lecturaInicial ?? '—', ' → Final físico ', jornada.lecturaFinal ?? '—', ' · ', Number(jornada.litrosMedidos || 0).toFixed(2), ' L medidos · ', Number(jornada.litrosVendidosAcumulados ?? jornada.litrosVendidos ?? 0).toFixed(2), ' L vendidos · Diferencia ', Number(jornada.diferenciaLitros || 0).toFixed(2), ' L'))), jornadaCerrada.length === 0 ? React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12 } }, 'No hay jornadas cerradas todavía.') : null));
}
