/* sincronizacion.js — estado visible de la cola local del repartidor.
   No crea una cola nueva: observa ventas-offline.js y permite lanzar su
   sincronización manual. IndexedDB sigue siendo el origen local de la venta. */
function Sincronizacion({ currentUser = {}, isOnline = false, offlineVentaResumen = {} }) {
  const estadoInicial = typeof appObtenerEstadoSincronizacion === 'function'
    ? appObtenerEstadoSincronizacion()
    : { ultimaSincronizacion: null, pendientes: 0, errores: [] };
  const [estado, setEstado] = useState(estadoInicial);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (typeof appSuscribirSincronizacion !== 'function') return undefined;
    return appSuscribirSincronizacion(siguiente => setEstado(siguiente));
  }, []);

  useEffect(() => {
    const onEstado = event => {
      if (event?.detail) setEstado(event.detail);
    };
    window.addEventListener('fluxora:sincronizacion-estado', onEstado);
    return () => window.removeEventListener('fluxora:sincronizacion-estado', onEstado);
  }, []);

  const operaciones = Array.isArray(offlineVentaResumen?.operaciones) ? offlineVentaResumen.operaciones : [];
  const pendientes = Number(offlineVentaResumen?.pendientes ?? estado.pendientes ?? 0);
  const incidencias = Number(offlineVentaResumen?.incidencias ?? 0);
  const errores = Array.isArray(estado.errores) ? estado.errores : [];
  const jornadasAgrupadas = operaciones.reduce((grupos, operacion) => {
    const jornadaId = String(operacion.jornadaId || 'sin-jornada');
    if (!grupos[jornadaId]) grupos[jornadaId] = { jornadaId, pendientes: 0, incidencias: 0, tipos: new Set() };
    grupos[jornadaId].pendientes += ['pendiente', 'reintentando'].includes(operacion.estado) ? 1 : 0;
    grupos[jornadaId].incidencias += ['requiere_revision', 'bloqueada', 'conflicto'].includes(operacion.estado) || ['error', 'blocked', 'conflict'].includes(operacion.syncStatus) ? 1 : 0;
    grupos[jornadaId].tipos.add(operacion.tipoOperacion || operacion.operationType || 'operacion');
    return grupos;
  }, {});
  const jornadasLocales = Object.values(jornadasAgrupadas).sort((a, b) => a.jornadaId.localeCompare(b.jornadaId));
  const etiquetaOperacion = tipo => ({ inicio_jornada: 'Inicio', recarga_agua: 'Recarga', venta_agua_medidor: 'Venta', cierre_jornada: 'Cierre' }[tipo] || tipo || 'Operación');
  const fechaUltima = estado.ultimaSincronizacion
    ? new Date(estado.ultimaSincronizacion).toLocaleString('es-MX')
    : 'Aún no se ha ejecutado';
  const mostrar = value => {
    setMensaje(value);
    window.setTimeout(() => setMensaje(''), 3200);
  };
  const sincronizarAhora = async () => {
    if (!isOnline) {
      mostrar('Sin conexión. La cola permanece guardada en este teléfono.');
      return;
    }
    if (typeof appSincronizarOperacionesOffline !== 'function') {
      mostrar('El módulo de sincronización no está disponible.');
      return;
    }
    setSincronizando(true);
    try {
      const resultado = await appSincronizarOperacionesOffline('manual');
      const siguiente = typeof appObtenerEstadoSincronizacion === 'function'
        ? appObtenerEstadoSincronizacion()
        : estado;
      setEstado(siguiente);
      if (resultado?.fueraDeLinea) mostrar('Sin conexión. No se enviaron registros.');
      else if (resultado?.pendientes > 0) mostrar(`Quedan ${resultado.pendientes} registro(s) pendiente(s).`);
      else if (resultado?.errores?.length) mostrar('La sincronización terminó con incidencias. Revisa el historial.');
      else mostrar('Sincronización completada.');
    } catch (error) {
      mostrar('No se pudo completar la sincronización: ' + (error?.message || 'error desconocido'));
    } finally {
      setSincronizando(false);
    }
  };

  if (currentUser.role !== 'repartidor') return null;

  return React.createElement('div', { className: 'fx-page-sync', style: { padding: '16px 12px' } },
    React.createElement('div', { style: { fontSize: 20, fontWeight: 800, marginBottom: 4 } }, 'Sincronización'),
    React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 14 } }, 'Cada operación de la jornada se guarda primero en este teléfono. Cuando hay internet, la cola se envía y se confirma en segundo plano o al solicitarlo.'),
    mensaje && React.createElement('div', { role: 'status', style: { background: 'var(--info-bg)', color: 'var(--info-text)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12, fontWeight: 700 } }, mensaje),
    React.createElement(Card, { style: { marginBottom: 12 } },
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 10, color: 'var(--ink-faint)', fontWeight: 800, letterSpacing: '.08em' } }, 'OPERACIONES PENDIENTES'),
          React.createElement('div', { style: { fontSize: 28, fontWeight: 900, marginTop: 4, color: pendientes > 0 ? 'var(--warn-text)' : 'var(--ok-text)' } }, pendientes),
          React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 } }, pendientes === 1 ? 'registro local' : 'registros locales')
        ),
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 10, color: 'var(--ink-faint)', fontWeight: 800, letterSpacing: '.08em' } }, 'CONECTIVIDAD'),
          React.createElement('div', { style: { fontSize: 17, fontWeight: 900, marginTop: 8, color: isOnline ? 'var(--ok-text)' : 'var(--danger-text)' } }, isOnline ? 'En línea' : 'Sin conexión'),
          React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 } }, isOnline ? 'Puede sincronizar ahora' : 'La cola sigue disponible')
        )
      ),
      React.createElement('div', { style: { borderTop: '1px solid var(--line)', marginTop: 12, paddingTop: 10, fontSize: 11, color: 'var(--ink-soft)' } }, 'Última sincronización: ', fechaUltima),
      React.createElement('button', { type: 'button', onClick: sincronizarAhora, disabled: sincronizando || !isOnline, style: { width: '100%', minHeight: 48, marginTop: 12, border: 0, borderRadius: 9, background: sincronizando || !isOnline ? 'var(--line)' : 'var(--accent)', color: 'var(--ink)', fontWeight: 900, cursor: sincronizando || !isOnline ? 'not-allowed' : 'pointer' } }, sincronizando ? 'Sincronizando…' : 'Sincronizar ahora')
    ),
    React.createElement(Card, { style: { marginBottom: 12 } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
        React.createElement('div', { style: { fontSize: 13, fontWeight: 800 } }, 'Indicador por jornada'),
        React.createElement('span', { style: { fontSize: 11, color: 'var(--ink-faint)' } }, jornadasLocales.length)
      ),
      jornadasLocales.length === 0
        ? React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', padding: '8px 0' } }, 'No hay operaciones locales pendientes por jornada.')
        : jornadasLocales.map((jornada, indice) => React.createElement('div', { key: jornada.jornadaId, style: { borderTop: indice ? '1px solid var(--line)' : 'none', padding: '9px 0', fontSize: 11 } },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' } },
            React.createElement('strong', null, jornada.jornadaId === 'sin-jornada' ? 'Sin jornada' : `Jornada ${jornada.jornadaId.slice(0, 12)}`),
            React.createElement('span', { style: { color: 'var(--ink-faint)', whiteSpace: 'nowrap' } }, `${jornada.pendientes} pendiente(s)`)
          ),
          React.createElement('div', { style: { color: 'var(--ink-soft)', marginTop: 3, lineHeight: 1.4 } }, Array.from(jornada.tipos).map(etiquetaOperacion).join(' · ')),
          jornada.incidencias > 0 && React.createElement('div', { style: { color: 'var(--danger-text)', marginTop: 3 } }, `${jornada.incidencias} incidencia(s) requieren revisión`)
        ))
    ),
    React.createElement(Card, null,
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
        React.createElement('div', { style: { fontSize: 13, fontWeight: 800 } }, 'Historial de errores'),
        React.createElement('span', { style: { fontSize: 11, color: 'var(--ink-faint)' } }, errores.length)
      ),
      errores.length === 0
        ? React.createElement('div', { style: { fontSize: 12, color: 'var(--ink-soft)', padding: '8px 0' } }, 'No hay errores registrados.')
        : errores.map((error, indice) => React.createElement('div', { key: `${error.idLocal || 'error'}-${error.fecha || indice}-${indice}`, style: { borderTop: indice ? '1px solid var(--line)' : 'none', padding: '9px 0', fontSize: 11 } },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' } },
            React.createElement('strong', null, error.syncStatus === 'blocked' ? 'Bloqueado' : error.syncStatus === 'synced_with_incident' ? 'Incidencia' : 'Error de sincronización'),
            React.createElement('span', { style: { color: 'var(--ink-faint)', whiteSpace: 'nowrap' } }, error.fecha ? new Date(error.fecha).toLocaleString('es-MX') : 'Sin fecha')
          ),
          error.tipoOperacion && React.createElement('div', { style: { color: 'var(--ink-soft)', marginTop: 3 } }, 'Operación: ', etiquetaOperacion(error.tipoOperacion)),
          React.createElement('div', { style: { color: 'var(--ink-soft)', marginTop: 3, lineHeight: 1.4 } }, error.mensaje || 'Sin detalle'),
          error.idLocal && React.createElement('div', { style: { color: 'var(--ink-faint)', marginTop: 3, fontFamily: 'var(--font-mono)', fontSize: 10 } }, 'idLocal: ', error.idLocal)
        ))
    )
  );
}
