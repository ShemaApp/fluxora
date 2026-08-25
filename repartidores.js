function RepartidoresPanel({ clientes = [], localidades = [], jornadas = [], vehiculos = [], medidores = [], currentUser = {} }) {
  if (currentUser.role !== 'admin') return null;
  const localidadesActivas = (localidades || []).filter(localidad => localidad.activo !== false);
  const repartidores = new Map();
  localidadesActivas.forEach(localidad => {
    const id = localidad.repartidorId || 'sin_repartidor';
    if (!repartidores.has(id)) repartidores.set(id, {
      id,
      nombre: localidad.repartidorNombre || (id === 'sin_repartidor' ? 'Sin repartidor asignado' : id),
      localidades: [],
      clientes: 0
    });
    const grupo = repartidores.get(id);
    grupo.localidades.push(localidad);
    grupo.clientes += (clientes || []).filter(cliente => cliente.localidadId === localidad.id).length;
  });
  const jornadasAbiertas = (jornadas || []).filter(jornada => jornada.estado === 'abierta');
  const vehiculoNombre = id => (vehiculos || []).find(vehiculo => vehiculo.id === id)?.nombre || id || 'Sin vehículo';
  const medidorNombre = id => (medidores || []).find(medidor => medidor.id === id)?.nombre || id || 'Sin medidor';
  const numero = valor => Number(valor || 0).toFixed(2);
  const tarjetas = Array.from(repartidores.values()).map(grupo => {
    const localidadesGrupo = grupo.localidades.map(localidad => {
      const jornada = jornadasAbiertas.find(item => item.localidadId === localidad.id);
      return React.createElement('div', { className: 'fx-operacion-locality', key: localidad.id, style: { borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 9, fontSize: 11 } },
        React.createElement('strong', null, localidad.nombre || localidad.id),
        React.createElement('div', { style: { color: 'var(--ink-soft)', marginTop: 3 } }, 'Vehículo: ', localidad.vehiculoNombre || vehiculoNombre(localidad.vehiculoId), ' · Medidor: ', localidad.medidorNombre || medidorNombre(localidad.medidorId)),
        jornada ? React.createElement('div', { style: { color: 'var(--ok-text)', fontWeight: 700, marginTop: 4 } }, 'Jornada abierta · ', numero(jornada.aguaDisponibleLitros), ' L disponibles · ', numero(jornada.litrosVendidosAcumulados ?? jornada.litrosVendidos), ' L vendidos') : React.createElement('div', { style: { color: 'var(--ink-faint)', marginTop: 4 } }, 'Sin jornada abierta'));
    });
    return React.createElement('div', { className: 'fx-operacion-group', key: grupo.id, style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 13, marginBottom: 10 } },
      React.createElement('div', { className: 'fx-operacion-group-heading', style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' } },
        React.createElement('div', null, React.createElement('div', { style: { fontSize: 15, fontWeight: 800 } }, grupo.nombre), React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 } }, grupo.localidades.length, ' localidades · ', grupo.clientes, ' clientes')),
        React.createElement('span', { style: { fontSize: 10, color: 'var(--ink-faint)' } }, grupo.id === 'sin_repartidor' ? 'Pendiente' : 'Asignado')),
      localidadesGrupo);
  });
  return React.createElement('div', { className: 'fx-page-operacion fx-page-operacion-admin', style: { padding: '16px 12px', color: 'var(--ink)' } },
    React.createElement('div', { className: 'fx-operacion-title', style: { fontSize: 21, fontWeight: 800, marginBottom: 4 } }, 'Operación'),
    React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 12, lineHeight: 1.45, marginBottom: 14 } }, 'Consulta administrativa de localidades asignadas, vehículos, medidores, cargas y jornadas. Las ventas se registran desde Mi Ruta.'),
    React.createElement('div', { className: 'fx-operacion-metrics', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 } },
      React.createElement('div', { className: 'fx-operacion-metric', style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 11 } }, React.createElement('div', { style: { fontSize: 10, color: 'var(--ink-faint)', fontWeight: 800 } }, 'LOCALIDADES ACTIVAS'), React.createElement('strong', { style: { display: 'block', fontSize: 22, marginTop: 4 } }, localidadesActivas.length)),
      React.createElement('div', { className: 'fx-operacion-metric', style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 11 } }, React.createElement('div', { style: { fontSize: 10, color: 'var(--ink-faint)', fontWeight: 800 } }, 'JORNADAS ABIERTAS'), React.createElement('strong', { style: { display: 'block', fontSize: 22, marginTop: 4 } }, jornadasAbiertas.length))),
    tarjetas,
    repartidores.size === 0 ? React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12, textAlign: 'center', padding: 24 } }, 'No hay localidades asignadas todavía.') : null);
}
