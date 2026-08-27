function StatTile({ value, label, bg, color, onClick }) {
  const props = { className: 'fx-stat-tile', style: { background: bg || 'var(--surface)', color: color || 'var(--ink)', borderRadius: 8, padding: '12px 10px', minHeight: 74, border: 'none', textAlign: 'left', width: '100%', boxSizing: 'border-box' } };
  if (onClick) {
    props.onClick = onClick;
    props.style.cursor = 'pointer';
  }
  return React.createElement(onClick ? 'button' : 'div', props, React.createElement('div', { style: { fontSize: 21, fontWeight: 800, lineHeight: 1.05 } }, value), React.createElement('div', { style: { fontSize: 10, fontWeight: 700, marginTop: 6, opacity: .88 } }, label));
}

function Dashboard({ notas = [], productos = [], creditos = [], clientes = [], jornadas = [], currentUser = {}, offlineVentaResumen = { registros: [] }, onIrA }) {
  const isAdmin = currentUser.role === 'admin';
  const isRepartidor = currentUser.role === 'repartidor';
  const hoy = new Date().toDateString();
  const ventasHoy = (notas || []).filter(n => new Date(n.fecha).toDateString() === hoy);
  const clientesActivos = (clientes || []).filter(c => c.activo !== false).length;
  const ingresosHoy = ventasHoy.reduce((suma, venta) => suma + Number(venta.total || 0), 0);
  const creditosPendientes = (creditos || []).filter(c => Number(c.saldo || 0) > 0).reduce((suma, credito) => suma + Number(credito.saldo || 0), 0);
  const jornadaActiva = (jornadas || []).find(j => j.estado === 'abierta' && j.repartidorId === currentUser.uid);
  const irA = id => () => onIrA && onIrA(id);

  if (isRepartidor) {
    const notasJornada = jornadaActiva ? (notas || []).filter(n => n.jornadaId === jornadaActiva.id && n.capturadoPorUid === currentUser.uid) : [];
    const estadosPendientes = ['pendiente', 'reintentando', 'requiere_revision', 'incidencia_inventario'];
    const ventasOfflineJornada = jornadaActiva ? (offlineVentaResumen.registros || []).filter(v => v.tipoOperacion === 'venta_agua_medidor' && v.jornadaId === jornadaActiva.id && estadosPendientes.includes(v.estado)) : [];
    const ventasJornada = notasJornada.concat(ventasOfflineJornada);
    const litrosDeVentas = ventasJornada.reduce((suma, venta) => suma + Number(venta.litrosVendidos || (venta.items || []).reduce((subtotal, item) => subtotal + Number(item.litrosVendidos || item.litros || 0), 0)), 0);
    const litrosVendidosRemotos = Number(jornadaActiva?.litrosVendidosAcumulados ?? jornadaActiva?.litrosVendidos ?? 0);
    const litrosVendidos = jornadaActiva ? Math.max(litrosVendidosRemotos, litrosDeVentas) : 0;
    const garrafonesVendidos = ventasJornada.reduce((suma, venta) => suma + Number(venta.garrafones || (venta.items || []).reduce((subtotal, item) => subtotal + Number(item.cant || 0), 0)), 0);
    const litrosCargados = Number(jornadaActiva?.aguaCargadaLitros || 0);
    const litrosPendientesLocales = ventasOfflineJornada.reduce((suma, venta) => suma + Number(venta.litrosVendidos || 0), 0);
    const litrosDisponibles = jornadaActiva ? Math.max(0, Number(jornadaActiva.aguaDisponibleLitros ?? litrosCargados) - litrosPendientesLocales) : 0;
    const incrementoPendiente = ventasOfflineJornada.reduce((suma, venta) => suma + Number(venta.incrementoContador || 0), 0);
    const medidorRemoto = Number(jornadaActiva?.lecturaCalculadaActual ?? jornadaActiva?.lecturaActual ?? jornadaActiva?.lecturaInicial ?? 0);
    const medidorLogico = jornadaActiva ? medidorRemoto + incrementoPendiente : null;
    return React.createElement('div', { className: 'fx-page-home fx-page-home-repartidor', style: { padding: '16px 12px' } },
      React.createElement('div', { style: { fontSize: 20, fontWeight: 800, marginBottom: 4 } }, 'Jornada'),
      React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 14 } }, 'Lectura física solo al abrir y cerrar. Durante las ventas, el sistema mantiene el medidor lógico acumulado y calcula los litros según la configuración de la jornada.'),
      !jornadaActiva && React.createElement(Card, { style: { marginBottom: 14, background: 'var(--info-bg)', color: 'var(--info-text)' } }, React.createElement('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 5 } }, 'JORNADA NO INICIADA'), React.createElement('div', { style: { fontSize: 12, lineHeight: 1.4 } }, 'Selecciona la asignación vigente, registra la carga en litros y captura la lectura física inicial para comenzar.')),
      jornadaActiva && React.createElement(Card, { style: { marginBottom: 14 } },
        React.createElement('div', { style: { fontSize: 10, color: 'var(--ink-faint)', fontWeight: 800, letterSpacing: '.08em' } }, 'JORNADA ABIERTA'),
        React.createElement('div', { style: { fontSize: 17, fontWeight: 800, marginTop: 3 } }, jornadaActiva.localidadNombre || jornadaActiva.localidad || 'Localidad asignada'),
        React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', margin: '7px 0 10px' } }, 'Vehículo: ', jornadaActiva.vehiculoNombre || jornadaActiva.vehiculo || jornadaActiva.vehiculoId || '—', ' · Medidor: ', jornadaActiva.medidorNombre || jornadaActiva.medidorId || '—'),
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
          React.createElement(StatTile, { value: litrosCargados.toFixed(2) + ' L', label: 'Litros cargados', bg: 'var(--rail)', color: 'var(--rail-ink)' }),
          React.createElement(StatTile, { value: litrosVendidos.toFixed(2) + ' L', label: 'Litros vendidos', bg: 'var(--accent)', color: 'var(--accent-ink)' }),
          React.createElement(StatTile, { value: litrosDisponibles.toFixed(2) + ' L', label: 'Litros disponibles', bg: litrosDisponibles <= litrosCargados * .15 ? 'var(--danger)' : 'var(--ok)', color: '#fff' }),
          React.createElement(StatTile, { value: garrafonesVendidos.toFixed(2), label: 'Garrafones vendidos', bg: 'var(--info)', color: '#fff' }),
          React.createElement(StatTile, { value: medidorLogico === null ? '—' : medidorLogico.toFixed(2), label: 'Medidor lógico acumulado', bg: 'var(--surface-2)', color: 'var(--ink)' }))),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 } },
        React.createElement('button', { onClick: irA(jornadaActiva ? 'ruta' : 'jornada'), style: { minHeight: 58, border: 0, borderRadius: 10, background: 'var(--accent)', color: 'var(--ink)', fontWeight: 900 } }, jornadaActiva ? 'Abrir Mi ruta' : 'Iniciar jornada'),
        React.createElement('button', { onClick: irA('jornada'), style: { minHeight: 58, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', borderRadius: 10, fontWeight: 800 } }, jornadaActiva ? 'Cerrar jornada' : 'Ver asignación')),
      React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.45 } }, 'Flujo operativo: jornada → carga y lectura inicial → Mi ruta → garrafones → efectivo o crédito → siguiente cliente → lectura física final y conciliación.'));
  }

  const acciones = [
    ['', 'Cobertura', 'Relacionar localidad, repartidor, vehículo y medidor', 'jerarquia'],
    ['', 'Operación', 'Consultar cargas y jornadas por localidad', 'repartidores'],
    ['', 'Clientes', 'Consultar clientes y su localidad asignada', 'clientes'],
    ['', 'Medición', 'Configurar litros, contador físico y precio', 'config'],
    ['', 'Inventario', 'Consultar existencias y movimientos reales', 'inventario'],
    ['', 'Créditos', 'Consultar saldos y pagos registrados', 'creditos'],
    ['', 'Caja', 'Revisar efectivo esperado y cierres', 'gerencia'],
    ['', 'Reportes', 'Exportar ventas, litros y diferencias', 'reportes']
  ];
  return React.createElement('div', { className: 'fx-page-home', style: { padding: '16px 12px' } },
    React.createElement('div', { style: { fontSize: 20, fontWeight: 800, marginBottom: 4 } }, 'Inicio'),
    React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 14 } }, 'Supervisión de distribución, medición, ventas, caja, inventario y conciliación.'),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 } },
      React.createElement(StatTile, { value: ventasHoy.length, label: 'Ventas de hoy', bg: 'var(--rail)', color: 'var(--rail-ink)', onClick: irA('reportes') }),
      React.createElement(StatTile, { value: fmt(ingresosHoy), label: 'Ingresos de hoy', bg: 'var(--accent)', color: 'var(--accent-ink)', onClick: irA('gerencia') }),
      React.createElement(StatTile, { value: clientesActivos, label: 'Clientes activos', bg: 'var(--info)', color: '#fff', onClick: irA('clientes') }),
      React.createElement(StatTile, { value: fmt(creditosPendientes), label: 'Crédito pendiente', bg: 'var(--warn)', color: '#fff', onClick: irA('creditos') })),
    React.createElement(Card, null, React.createElement('div', { style: { fontSize: 13, fontWeight: 800, marginBottom: 4, fontFamily: 'var(--font-display)', textTransform: 'uppercase' } }, 'Módulos'), React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', marginBottom: 12 } }, 'Cada acceso corresponde a una relación real del sistema de agua medida.'), React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } }, acciones.filter(a => a[3] !== 'config' || isAdmin).map(([icono, titulo, detalle, tab]) => React.createElement('button', { className: 'fx-action-entry', key: tab, onClick: irA(tab), style: { background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '12px 9px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', minHeight: 104 } }, React.createElement('span', { style: { fontSize: 22 } }, icono), React.createElement('span', { style: { fontSize: 12, fontWeight: 700, textAlign: 'center', color: 'var(--ink)' } }, titulo), React.createElement('span', { style: { fontSize: 10, lineHeight: 1.25, textAlign: 'center', color: 'var(--ink-faint)' } }, detalle))))));
}
