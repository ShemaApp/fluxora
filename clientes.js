const LOCALIDAD_SIN_CLASIFICAR = '__sin_localidad__';
const normalizarLocalidad = valor => String(valor || '').trim().replace(/\s+/g, ' ');
const claveLocalidad = valor => normalizarLocalidad(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const METODO_VENTA_CANTIDAD = 'venta_por_cantidad';
const METODO_RELLENO_MEDIDO = 'relleno_por_medicion';
const etiquetaMetodoServicio = valor => valor === METODO_RELLENO_MEDIDO ? 'Medido por medidor' : 'Doméstica';
const claveImportacionCliente = valor => normalizarLocalidad(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const encabezadoImportacionCliente = valor => claveImportacionCliente(valor).replace(/[^a-z0-9]+/g, ' ').trim();
const HEADER_IMPORTACION_CLIENTES = {
  nombre: 'nombre',
  localidad: 'localidad',
  'metodo de servicio': 'metodoServicio',
  telefono: 'telefono',
  'tarifa habitual': 'tarifaHabitual',
  estado: 'estado'
};
const metodoImportacionCliente = valor => {
  const clave = encabezadoImportacionCliente(valor);
  if (clave === 'domestica' || clave === 'venta por cantidad') return METODO_VENTA_CANTIDAD;
  if (clave === 'medido por medidor' || clave === 'relleno por medicion' || clave === 'medido') return METODO_RELLENO_MEDIDO;
  return '';
};
const estadoImportacionCliente = valor => {
  const clave = encabezadoImportacionCliente(valor);
  if (!clave || clave === 'activo' || clave === 'activa') return true;
  if (clave === 'inactivo' || clave === 'inactiva') return false;
  return null;
};
const csvImportacionCliente = filas => '\uFEFF' + filas.map(fila => fila.map(valor => '"' + String(valor ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');

function FichaRapidaCliente({ cliente, saldo = 0, historial = [], tarifa = null, puedeEditar = false, onEditar, onHistorial }) {
  const moneda = valor => '$' + Number(valor || 0).toFixed(2);
  return React.createElement('div', { className: 'fx-client-detail', style: { display: 'grid', gap: 12 } },
    React.createElement('div', { className: 'fx-client-detail-status', style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
      React.createElement(Tag, { color: cliente.activo === false ? 'var(--ink-soft)' : 'var(--ok-text)' }, cliente.activo === false ? 'Inactivo' : 'Activo'),
      React.createElement(Tag, { color: saldo > 0 ? 'var(--warn-text)' : 'var(--ink-soft)' }, saldo > 0 ? 'Crédito ' + moneda(saldo) : 'Sin crédito')),
    React.createElement('div', { className: 'fx-client-detail-localidad', style: { background: 'var(--surface-2)', borderRadius: 8, padding: 10 } },
      React.createElement('div', { style: { fontSize: 10, color: 'var(--ink-faint)', fontWeight: 800 } }, 'LOCALIDAD ASIGNADA'),
      React.createElement('div', { style: { fontWeight: 800, marginTop: 4 } }, cliente.localidadNombre || cliente.localidad || 'Sin localidad')),
    React.createElement('div', { className: 'fx-client-detail-service', style: { background: 'var(--surface-2)', borderRadius: 8, padding: 10 } },
      React.createElement('div', { style: { fontSize: 10, color: 'var(--ink-faint)', fontWeight: 800 } }, 'MÉTODO DE SERVICIO'),
      React.createElement('div', { style: { fontWeight: 800, marginTop: 4 } }, etiquetaMetodoServicio(cliente.metodoServicio)),
      tarifa && React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 11, marginTop: 3 } }, 'Tarifa: ', tarifa.nombre || 'Tarifa existente')),
    React.createElement('div', { className: 'fx-client-detail-actions', style: { display: 'flex', gap: 8 } },
      historial.length ? React.createElement(BOut, { onClick: onHistorial, style: { flex: 1 } }, 'Historial de operaciones') : null,
      puedeEditar ? React.createElement(BFill, { onClick: onEditar, style: { flex: 1 } }, 'Editar cliente') : null)
  );
}

function FiltroClientes({ titulo, opciones, valor, onChange, contar }) {
  return React.createElement('label', { className: 'fx-client-filter' },
    React.createElement('span', { className: 'fx-client-filter-label' }, titulo),
    React.createElement('span', { className: 'fx-client-filter-control' },
      React.createElement('select', {
        value: valor,
        onChange: e => onChange(e.target.value),
        'aria-label': titulo,
        className: 'fx-client-filter-select'
      }, opciones.map(opcion => React.createElement('option', { key: opcion.valor, value: opcion.valor }, opcion.texto + ' (' + contar(opcion.valor) + ')'))),
      React.createElement('span', { className: 'fx-client-filter-chevron', 'aria-hidden': 'true' }, '⌄'))
  );
}

function Clientes({ clientes = [], notas = [], creditos = [], localidades: localidadesCatalogo = [], tarifas = [], servicios = [], comprobantes = [], currentUser = {} }) {
  const puedeEditar = currentUser.role === 'admin' || permisoEdita(currentUser).clientes;
  const puedeCrear = currentUser.role === 'admin';
  const localidadesActivas = (localidadesCatalogo || []).filter(localidad => localidad.activo !== false);
  const localidadesPermitidas = currentUser.role === 'repartidor' ? obtenerLocalidadesAsignadas({ localidades: localidadesActivas, currentUser, localidadIds: currentUser.localidadIds }) : localidadesActivas;
  const localidadesForm = currentUser.role === 'repartidor' ? localidadesPermitidas : localidadesActivas;
  const idsAlcance = new Set(localidadesPermitidas.map(localidad => localidad.id));
  const [filtroEstado, setFiltroEstado] = useState('activos');
  const [filtroCredito, setFiltroCredito] = useState('todos');
  const [filtroLocalidad, setFiltroLocalidad] = useState('todos');
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [detallesFor, setDetallesFor] = useState(null);
  const [histId, setHistId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [servicioDetalle, setServicioDetalle] = useState(null);
  const [mostrarNuevaLocalidad, setMostrarNuevaLocalidad] = useState(false);
  const [nombreLocalidadNueva, setNombreLocalidadNueva] = useState('');
  const [guardandoLocalidad, setGuardandoLocalidad] = useState(false);
  const [importacion, setImportacion] = useState(null);
  const [importando, setImportando] = useState(false);
  const archivoImportacionRef = React.useRef(null);
  const cmap = (creditos || []).reduce((mapa, credito) => { const saldo = Number(credito.saldo || 0); if (saldo > 0) mapa[credito.clienteId] = (mapa[credito.clienteId] || 0) + saldo; return mapa; }, {});
  const enAlcance = currentUser.role === 'repartidor' ? clientes.filter(cliente => idsAlcance.has(cliente.localidadId)) : clientes;
  const localidadDeCliente = cliente => normalizarLocalidad(cliente.localidadNombre || cliente.localidad || '');
  const localidadesVisibles = Array.from(new Set(enAlcance.map(localidadDeCliente).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
  const contar = condicion => enAlcance.filter(condicion).length;
  const listaBase = enAlcance
    .filter(cliente => filtroEstado === 'todos' || filtroEstado === 'activos' && cliente.activo !== false || filtroEstado === 'inactivos' && cliente.activo === false)
    .filter(cliente => filtroCredito === 'todos' || filtroCredito === 'credito' && Number(cmap[cliente.id] || 0) > 0 || filtroCredito === 'sin-credito' && Number(cmap[cliente.id] || 0) <= 0)
    .filter(cliente => filtroLocalidad === 'todos' || filtroLocalidad === LOCALIDAD_SIN_CLASIFICAR && !localidadDeCliente(cliente) || claveLocalidad(localidadDeCliente(cliente)) === claveLocalidad(filtroLocalidad));
  const list = listaBase.filter(cliente => { const termino = q.trim().toLowerCase(); return !termino || `${cliente.nombre || ''} ${localidadDeCliente(cliente)}`.toLowerCase().includes(termino); }).sort((a, b) => localidadDeCliente(a).localeCompare(localidadDeCliente(b), 'es') || String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
  const comprobanteDeServicio = servicio => (comprobantes || []).find(comprobante => comprobante.servicioId === servicio.id || comprobante.comprobanteId === servicio.comprobanteId) || null;
  const historialCliente = clienteId => {
    const ventas = (notas || []).filter(nota => nota.clienteId === clienteId).map(nota => ({ ...nota, tipoRegistro: 'venta', fechaRegistro: nota.fecha }));
    const serviciosCliente = (servicios || []).filter(servicio => servicio.clienteId === clienteId && servicio.estado === 'completado').map(servicio => ({ ...servicio, tipoRegistro: 'servicio', fechaRegistro: servicio.createdAt || servicio.creadoEn, comprobante: comprobanteDeServicio(servicio) }));
    return ventas.concat(serviciosCliente).sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0));
  };
  const localidadPorId = id => localidadesForm.find(localidad => String(localidad.id) === String(id));
  const nuevaFicha = () => setForm({ nombre: '', localidadId: '', telefono: '', metodoServicio: METODO_VENTA_CANTIDAD, tarifaId: '', activo: true });
  const guardar = async () => {
    if (!form?.nombre || !String(form.nombre).trim()) return alert('Captura el nombre del cliente.');
    const localidad = localidadPorId(form.localidadId);
    if (!localidad) return alert('Selecciona una localidad existente.');
    if (currentUser.role === 'repartidor' && !localidad.repartidorId && !(Array.isArray(localidad.repartidorIds) && localidad.repartidorIds.length)) return alert('Selecciona una localidad asignada a tu alcance operativo.');
    const metodoServicio = form.metodoServicio === METODO_RELLENO_MEDIDO ? METODO_RELLENO_MEDIDO : METODO_VENTA_CANTIDAD;
    const tarifaId = String(form.tarifaId || '').trim();
    const tarifa = (tarifas || []).find(item => String(item.id) === tarifaId && item.activo !== false);
    if (!tarifa) return alert('Selecciona una tarifa activa existente.');
    const item = { nombre: String(form.nombre).trim(), localidadId: localidad.id, localidadNombre: localidad.nombre, localidad: localidad.nombre, telefono: String(form.telefono || '').trim(), metodoServicio, tarifaId, tarifaHabitualId: tarifaId, activo: form.activo !== false };
    try {
      if (form.id) await db.collection(COLECCIONES.CLIENTES).doc(form.id).update(item);
      else await db.collection(COLECCIONES.CLIENTES).add({ ...item, creadoPorUid: currentUser.uid, creadoPorNombre: currentUser.nombre || '', fechaAlta: new Date().toISOString() });
      setForm(null);
    } catch (e) { alert('No se pudo guardar el cliente: ' + e.message); }
  };
  const guardarNuevaLocalidad = async () => {
    if (currentUser.role !== 'admin' || guardandoLocalidad) return;
    const nombre = normalizarLocalidad(nombreLocalidadNueva);
    if (!nombre) return alert('Captura el nombre de la localidad.');
    if ((localidadesCatalogo || []).some(localidad => localidad.activo !== false && claveLocalidad(localidad.nombre) === claveLocalidad(nombre))) return alert('Ya existe una localidad con ese nombre.');
    setGuardandoLocalidad(true);
    try {
      await db.collection(COLECCIONES.LOCALIDADES).add({
        nombre,
        activo: true,
        creadoPorUid: currentUser.uid,
        creadoPorNombre: currentUser.nombre || '',
        fechaCreacion: new Date().toISOString(),
        actualizadoPorUid: currentUser.uid,
        actualizadoEn: new Date().toISOString()
      });
      setNombreLocalidadNueva('');
      setMostrarNuevaLocalidad(false);
      alert('Localidad agregada al catálogo. Queda pendiente de asignación.');
    } catch (e) {
      alert('No se pudo guardar la localidad: ' + e.message);
    }
    setGuardandoLocalidad(false);
  };
  const descargarArchivoClientes = (nombre, contenido, tipo) => {
    const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const nombreLocalidadCliente = cliente => {
    const localidad = (localidadesCatalogo || []).find(item => String(item.id) === String(cliente.localidadId || ''));
    return localidad?.nombre || cliente.localidadNombre || cliente.localidad || '';
  };
  const nombreTarifaCliente = cliente => {
    const tarifa = (tarifas || []).find(item => String(item.id) === String(cliente.tarifaId || cliente.tarifaHabitualId || ''));
    return tarifa?.nombre || cliente.tarifaNombre || '';
  };
  const filasExportacionClientes = () => [
    ['Nombre', 'Localidad', 'Método de servicio', 'Teléfono', 'Tarifa habitual', 'Estado'],
    ...list.map(cliente => [
      cliente.nombre || '',
      nombreLocalidadCliente(cliente),
      etiquetaMetodoServicio(cliente.metodoServicio),
      cliente.telefono || '',
      nombreTarifaCliente(cliente),
      cliente.activo === false ? 'Inactivo' : 'Activo'
    ])
  ];
  const contextoExportacionClientes = () => [
    ['Fecha de exportación', new Date().toLocaleString('es-MX')],
    ['Búsqueda', q.trim() || 'Todas'],
    ['Estado', filtroEstado === 'todos' ? 'Todos' : filtroEstado === 'activos' ? 'Activos' : 'Inactivos'],
    ['Crédito', filtroCredito === 'todos' ? 'Todos' : filtroCredito === 'credito' ? 'Con crédito' : 'Sin crédito'],
    ['Localidad', filtroLocalidad === 'todos' ? 'Todas las localidades' : filtroLocalidad],
    ['Registros exportados', list.length]
  ];
  const exportarClientesCSV = () => descargarArchivoClientes('fluxora-clientes-' + Date.now() + '.csv', csvImportacionCliente(filasExportacionClientes()), 'text/csv;charset=utf-8');
  const exportarClientesExcel = () => {
    if (typeof XLSX === 'undefined') return exportarClientesCSV();
    const libro = XLSX.utils.book_new();
    const clientesHoja = XLSX.utils.aoa_to_sheet(filasExportacionClientes());
    clientesHoja['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 24 }, { wch: 12 }];
    clientesHoja['!autofilter'] = { ref: 'A1:F' + Math.max(1, list.length + 1) };
    XLSX.utils.book_append_sheet(libro, clientesHoja, 'Clientes');
    const filtrosHoja = XLSX.utils.aoa_to_sheet([['Filtros aplicados', 'Valor'], ...contextoExportacionClientes()]);
    XLSX.utils.book_append_sheet(libro, filtrosHoja, 'Filtros aplicados');
    XLSX.writeFile(libro, 'fluxora-clientes-' + Date.now() + '.xlsx');
  };
  const descargarPlantillaClientes = () => {
    const filas = [
      ['Nombre', 'Localidad', 'Método de servicio', 'Teléfono', 'Tarifa habitual', 'Estado']
    ];
    if (typeof XLSX === 'undefined') return descargarArchivoClientes('plantilla-clientes.csv', csvImportacionCliente(filas), 'text/csv;charset=utf-8');
    const libro = XLSX.utils.book_new();
    const hoja = XLSX.utils.aoa_to_sheet(filas);
    hoja['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 24 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(libro, hoja, 'Clientes');
    XLSX.writeFile(libro, 'plantilla-clientes.xlsx');
  };
  const leerArchivoClientes = async event => {
    const archivo = event.target.files?.[0];
    event.target.value = '';
    if (!archivo) return;
    if (typeof XLSX === 'undefined') return alert('No se pudo leer el archivo porque la librería de Excel no está disponible.');
    try {
      const libro = XLSX.read(await archivo.arrayBuffer(), { type: 'array' });
      const primeraHoja = libro.SheetNames?.[0];
      const hoja = primeraHoja ? libro.Sheets[primeraHoja] : null;
      const matriz = hoja ? XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '', raw: false }) : [];
      const encabezados = (matriz[0] || []).map(valor => String(valor ?? '').trim());
      const indices = {};
      const encabezadosDesconocidos = [];
      const encabezadosDuplicados = [];
      encabezados.forEach((valor, indice) => {
        const campo = HEADER_IMPORTACION_CLIENTES[encabezadoImportacionCliente(valor)];
        if (!campo) {
          if (valor) encabezadosDesconocidos.push(valor);
          return;
        }
        if (Object.prototype.hasOwnProperty.call(indices, campo)) encabezadosDuplicados.push(valor);
        else indices[campo] = indice;
      });
      const camposObligatorios = ['nombre', 'localidad', 'metodoServicio', 'tarifaHabitual'];
      const camposFaltantes = camposObligatorios.filter(campo => !Object.prototype.hasOwnProperty.call(indices, campo));
      const filasDatos = matriz.slice(1).filter(fila => fila.some(valor => String(valor ?? '').trim()));
      const erroresArchivo = [];
      if (!primeraHoja) erroresArchivo.push('El archivo no contiene hojas.');
      if (!encabezados.length) erroresArchivo.push('La primera fila debe contener los encabezados.');
      if (camposFaltantes.length) erroresArchivo.push('Faltan columnas obligatorias: ' + camposFaltantes.map(campo => campo === 'metodoServicio' ? 'Método de servicio' : campo === 'tarifaHabitual' ? 'Tarifa habitual' : campo === 'nombre' ? 'Nombre' : 'Localidad').join(', ') + '.');
      if (encabezadosDuplicados.length) erroresArchivo.push('Hay encabezados duplicados: ' + encabezadosDuplicados.join(', ') + '.');
      if (!filasDatos.length && !erroresArchivo.length) erroresArchivo.push('El archivo no contiene filas de clientes.');
      const filas = [];
      const clavesArchivo = new Set();
      if (!erroresArchivo.length) filasDatos.forEach((fila, indice) => {
        const valor = campo => Object.prototype.hasOwnProperty.call(indices, campo) ? String(fila[indices[campo]] ?? '').trim() : '';
        const nombre = normalizarLocalidad(valor('nombre'));
        const localidadTexto = normalizarLocalidad(valor('localidad'));
        const metodoServicio = metodoImportacionCliente(valor('metodoServicio'));
        const tarifaTexto = normalizarLocalidad(valor('tarifaHabitual'));
        const telefono = valor('telefono');
        const estado = Object.prototype.hasOwnProperty.call(indices, 'estado') ? estadoImportacionCliente(valor('estado')) : true;
        const errores = [];
        const advertencias = [];
        if (!nombre) errores.push('Nombre vacío.');
        const localidad = localidadesActivas.find(item => claveLocalidad(item.nombre) === claveLocalidad(localidadTexto));
        if (!localidad) errores.push('Localidad inexistente: ' + (localidadTexto || 'sin valor') + '.');
        if (!metodoServicio) errores.push('Método de servicio inválido. Usa Doméstica o Medido por medidor.');
        const tarifa = (tarifas || []).find(item => item.activo !== false && claveImportacionCliente(item.nombre) === claveImportacionCliente(tarifaTexto));
        if (!tarifa) errores.push('Tarifa activa inexistente: ' + (tarifaTexto || 'sin valor') + '.');
        if (estado === null) errores.push('Estado inválido. Usa Activo o Inactivo.');
        const claveFila = claveImportacionCliente(nombre) + '|' + claveLocalidad(localidadTexto);
        if (clavesArchivo.has(claveFila)) advertencias.push('Duplicado dentro del archivo.');
        clavesArchivo.add(claveFila);
        if (localidad) {
          const existente = (clientes || []).find(cliente => claveImportacionCliente(cliente.nombre) === claveImportacionCliente(nombre) && (String(cliente.localidadId || '') === String(localidad.id) || claveLocalidad(cliente.localidadNombre || cliente.localidad) === claveLocalidad(localidad.nombre)));
          if (existente) advertencias.push('Posible duplicado de cliente existente.');
        }
        filas.push({ numero: indice + 2, nombre, localidadTexto, metodoServicio, telefono, tarifaTexto, estado, errores, advertencias, localidad, tarifa, estadoFila: errores.length || advertencias.length ? 'revisar' : 'lista' });
      });
      const conteoClaves = filas.reduce((conteo, fila) => {
        const clave = claveImportacionCliente(fila.nombre) + '|' + claveLocalidad(fila.localidadTexto);
        conteo[clave] = (conteo[clave] || 0) + 1;
        return conteo;
      }, {});
      filas.forEach(fila => {
        const clave = claveImportacionCliente(fila.nombre) + '|' + claveLocalidad(fila.localidadTexto);
        if (conteoClaves[clave] > 1 && !fila.advertencias.includes('Duplicado dentro del archivo.')) fila.advertencias.push('Duplicado dentro del archivo.');
        if (!fila.errores.length && fila.advertencias.length) fila.estadoFila = 'revisar';
      });
      setImportacion({ archivo: archivo.name, erroresArchivo, encabezadosDesconocidos, encabezadosDuplicados, filas, totalFilas: filasDatos.length });
    } catch (error) {
      setImportacion({ archivo: archivo.name, erroresArchivo: ['No se pudo leer el archivo: ' + (error.message || 'formato no reconocido') + '.'], encabezadosDesconocidos: [], encabezadosDuplicados: [], filas: [], totalFilas: 0 });
    }
  };
  const filasImportables = importacion?.filas?.filter(fila => fila.estadoFila === 'lista') || [];
  const importarClientesValidados = async () => {
    if (!filasImportables.length || importando) return;
    setImportando(true);
    try {
      for (let inicio = 0; inicio < filasImportables.length; inicio += 450) {
        const grupo = filasImportables.slice(inicio, inicio + 450);
        const lote = db.batch();
        grupo.forEach(fila => {
          const referencia = db.collection(COLECCIONES.CLIENTES).doc();
          lote.set(referencia, { nombre: fila.nombre, localidadId: fila.localidad.id, localidadNombre: fila.localidad.nombre, localidad: fila.localidad.nombre, telefono: fila.telefono, metodoServicio: fila.metodoServicio, tarifaId: fila.tarifa.id, tarifaHabitualId: fila.tarifa.id, activo: fila.estado !== false, creadoPorUid: currentUser.uid, creadoPorNombre: currentUser.nombre || '', fechaAlta: new Date().toISOString(), origenImportacion: 'clientes_excel' });
        });
        await lote.commit();
      }
      setImportacion(null);
      alert(filasImportables.length + ' cliente(s) importado(s). Las filas con errores o advertencias no se guardaron.');
    } catch (error) {
      alert('No se pudo completar la importación: ' + (error.message || 'error desconocido'));
    } finally {
      setImportando(false);
    }
  };
  const filasConError = importacion?.filas?.filter(fila => fila.errores.length) || [];
  const filasConAdvertencia = importacion?.filas?.filter(fila => !fila.errores.length && fila.advertencias.length) || [];
  const importacionEditor = puedeCrear && importacion && React.createElement(Modal, { title: 'Revisar importación', onClose: () => { if (!importando) setImportacion(null); } }, React.createElement('div', { className: 'fx-import-review' },
    React.createElement('div', { className: 'fx-import-warning', role: 'alert' }, React.createElement('strong', null, 'Antes de importar: '), 'se crearán solo clientes nuevos con localidades y tarifas existentes. No se generarán IDs manuales ni se sobrescribirán clientes, saldos, ventas o historiales. Revisa las filas antes de confirmar.'),
    React.createElement('div', { className: 'fx-import-file-name' }, importacion.archivo || 'Archivo seleccionado'),
    importacion.erroresArchivo?.length ? React.createElement('div', { className: 'fx-import-file-errors' }, importacion.erroresArchivo.map((error, indice) => React.createElement('div', { key: indice }, error))) : null,
    importacion.encabezadosDesconocidos?.length ? React.createElement('div', { className: 'fx-import-file-warning' }, 'Columnas no reconocidas; no se importarán: ', importacion.encabezadosDesconocidos.join(', '), '.') : null,
    React.createElement('div', { className: 'fx-import-summary' }, React.createElement('span', null, 'Filas: ', importacion.totalFilas || 0), React.createElement('span', { className: 'fx-import-summary-ok' }, 'Listas: ', filasImportables.length), React.createElement('span', { className: 'fx-import-summary-warning' }, 'Revisar: ', filasConError.length + filasConAdvertencia.length)),
    importacion.filas?.length ? React.createElement('div', { className: 'fx-import-preview-list' }, importacion.filas.slice(0, 20).map(fila => React.createElement('div', { key: fila.numero, className: 'fx-import-preview-row' }, React.createElement('div', { className: 'fx-import-preview-main' }, React.createElement('strong', null, 'Fila ', fila.numero, ' · ', fila.nombre || 'Sin nombre'), React.createElement('span', null, fila.localidadTexto || 'Sin localidad', ' · ', fila.tarifaTexto || 'Sin tarifa')), React.createElement('div', { className: fila.errores.length ? 'fx-import-row-error' : fila.advertencias.length ? 'fx-import-row-warning' : 'fx-import-row-ok' }, fila.errores.length ? fila.errores.join(' ') : fila.advertencias.length ? fila.advertencias.join(' ') : 'Lista para crear')))) : null,
    (importacion.filas?.length || 0) > 20 ? React.createElement('div', { className: 'fx-import-more' }, 'Se muestran las primeras 20 filas. La confirmación aplicará todas las filas listas.') : null,
    React.createElement('div', { className: 'fx-import-actions' }, React.createElement(BOut, { onClick: () => { if (!importando) setImportacion(null); }, style: { flex: 1 } }, 'Cancelar'), React.createElement(BFill, { onClick: importarClientesValidados, disabled: importando || !filasImportables.length, style: { flex: 1 } }, importando ? 'Importando…' : 'Importar ' + filasImportables.length + ' lista(s)'))
  ));
  const localidadSeleccionada = form ? localidadPorId(form.localidadId) : null;
  const opcionesLocalidad = [React.createElement('option', { key: 'sin-localidad', value: '' }, 'Selecciona una localidad')].concat(localidadesForm.map(localidad => React.createElement('option', { key: localidad.id, value: localidad.id }, localidad.nombre)));
  const localidadEditor = puedeCrear && mostrarNuevaLocalidad && React.createElement(Modal, { title: 'Nueva localidad', onClose: () => { setNombreLocalidadNueva(''); setMostrarNuevaLocalidad(false); } }, React.createElement('div', { className: 'fx-locality-editor' },
    React.createElement(Lbl, null, 'Nombre de localidad'),
    React.createElement(Inp, { value: nombreLocalidadNueva, autoFocus: true, onChange: e => setNombreLocalidadNueva(e.target.value), placeholder: 'Ej. La Morena', onKeyDown: e => { if (e.key === 'Enter') guardarNuevaLocalidad(); } }),
    React.createElement('div', { className: 'fx-locality-editor-note' }, 'Se agregará al catálogo sin asignarla a un repartidor.'),
    React.createElement('div', { className: 'fx-locality-editor-actions' }, React.createElement(BOut, { onClick: () => { setNombreLocalidadNueva(''); setMostrarNuevaLocalidad(false); }, style: { flex: 1 } }, 'Cancelar'), React.createElement(BFill, { onClick: guardarNuevaLocalidad, disabled: guardandoLocalidad, style: { flex: 1 } }, guardandoLocalidad ? 'Guardando…' : 'Guardar localidad'))
  ));
  const editor = form && React.createElement(Modal, { title: form.id ? 'Editar cliente fijo' : 'Nuevo cliente fijo', onClose: () => setForm(null) }, React.createElement('div', { className: 'fx-client-editor' },
    React.createElement(Lbl, null, 'Nombre'),
    React.createElement(Inp, { value: form.nombre || '', autoFocus: true, onChange: e => setForm(actual => ({ ...actual, nombre: e.target.value })), placeholder: 'Nombre del cliente', style: { marginBottom: 10 } }),
    React.createElement(Lbl, null, 'Localidad'),
    React.createElement('select', { value: form.localidadId || '', onChange: e => setForm(actual => ({ ...actual, localidadId: e.target.value })), className: 'fx-client-editor-select', style: { width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }, opcionesLocalidad),
    localidadSeleccionada && React.createElement('div', { className: 'fx-client-editor-assignment', style: { background: 'var(--info-bg)', border: '1px solid var(--line)', borderRadius: 8, padding: 9, marginBottom: 12, fontSize: 11 } }, localidadSeleccionada.repartidorNombre ? 'Localidad asignada al repartidor: ' + localidadSeleccionada.repartidorNombre : 'Localidad disponible; queda pendiente de asignación.'),
    React.createElement(Lbl, null, 'Método de servicio'),
    React.createElement('select', { value: form.metodoServicio || METODO_VENTA_CANTIDAD, onChange: e => setForm(actual => ({ ...actual, metodoServicio: e.target.value })), className: 'fx-client-editor-select', style: { width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }, React.createElement('option', { value: METODO_VENTA_CANTIDAD }, 'Doméstica'), React.createElement('option', { value: METODO_RELLENO_MEDIDO }, 'Medido por medidor')),
    form.metodoServicio === METODO_RELLENO_MEDIDO && React.createElement('div', { className: 'fx-client-editor-service-note', style: { background: 'var(--info-bg)', color: 'var(--info-text)', borderRadius: 8, padding: 9, marginBottom: 10, fontSize: 11, lineHeight: 1.4 } }, 'Este cliente facturará por relleno medido: se capturarán marcador inicial y marcador final en cada servicio.'),
    React.createElement(Lbl, null, 'Teléfono'),
    React.createElement(Inp, { value: form.telefono || '', inputMode: 'tel', onChange: e => setForm(actual => ({ ...actual, telefono: e.target.value })), placeholder: 'Teléfono del cliente', style: { marginBottom: 10 } }),
    React.createElement(Lbl, null, 'Tarifa'),
    React.createElement('select', { value: form.tarifaId || '', onChange: e => setForm(actual => ({ ...actual, tarifaId: e.target.value })), className: 'fx-client-editor-select', style: { width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }, React.createElement('option', { value: '' }, tarifas.length ? 'Selecciona una tarifa existente' : 'No hay tarifas activas'), (tarifas || []).filter(tarifa => tarifa.activo !== false).map(tarifa => React.createElement('option', { key: tarifa.id, value: tarifa.id }, tarifa.nombre, ' · $', Number(tarifa.precioUnitario ?? tarifa.precioPorUnidad ?? 0).toFixed(2), ' / ', tarifa.unidadComercial || 'unidad'))),
    React.createElement(Lbl, null, 'Estado'),
    React.createElement('select', { value: form.activo === false ? 'inactivo' : 'activo', onChange: e => setForm(actual => ({ ...actual, activo: e.target.value !== 'inactivo' })), className: 'fx-client-editor-select', style: { width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)' } }, React.createElement('option', { value: 'activo' }, 'Activo'), React.createElement('option', { value: 'inactivo' }, 'Inactivo')),
    localidadesForm.length === 0 && React.createElement('div', { className: 'fx-client-editor-empty', style: { color: 'var(--warn-text)', fontSize: 11, marginBottom: 12 } }, 'No hay localidades activas en el catálogo.'),
    React.createElement(BFill, { onClick: guardar, style: { width: '100%' } }, 'Guardar cliente')));
  const detalle = detallesFor && React.createElement(Modal, { title: detallesFor.nombre || 'Cliente fijo', onClose: () => setDetallesFor(null) }, React.createElement(FichaRapidaCliente, { cliente: detallesFor, saldo: Number(cmap[detallesFor.id] || 0), historial: historialCliente(detallesFor.id), tarifa: (tarifas || []).find(tarifa => String(tarifa.id) === String(detallesFor.tarifaId || detallesFor.tarifaHabitualId)), puedeEditar, onEditar: () => { setForm({ id: detallesFor.id, nombre: detallesFor.nombre || '', localidadId: detallesFor.localidadId || '', telefono: detallesFor.telefono || '', metodoServicio: detallesFor.metodoServicio || METODO_VENTA_CANTIDAD, tarifaId: detallesFor.tarifaId || detallesFor.tarifaHabitualId || '', activo: detallesFor.activo !== false }); setDetallesFor(null); }, onHistorial: () => { setHistId(detallesFor.id); setDetallesFor(null); } }));
  const abrirPdfServicio = item => { const url = item?.comprobante?.pdfUrl || item?.pdfUrl; if (!url) return alert('Este servicio todavía no tiene un PDF disponible.'); window.open(url, '_blank', 'noopener,noreferrer'); };
  const compartirServicio = async item => { try { if (typeof appCompartirPdfServicio !== 'function') throw new Error('La función de compartir PDF no está disponible'); const resultado = await appCompartirPdfServicio(item, item.comprobante); if (resultado?.modo === 'enlace') alert('WhatsApp se abrió con un enlace al PDF. El navegador no permite adjuntar automáticamente el archivo en este dispositivo.'); } catch (error) { if (error?.name !== 'AbortError') alert(error.message || 'No se pudo compartir el PDF.'); } };
  const servicioDetalleModal = servicioDetalle && React.createElement(Modal, { title: 'Servicio de relleno medido', onClose: () => setServicioDetalle(null) }, React.createElement('div', { style: { display: 'grid', gap: 9, fontSize: 12 } }, React.createElement('strong', null, servicioDetalle.clienteNombre || 'Cliente'), React.createElement('div', null, new Date(servicioDetalle.fechaRegistro || 0).toLocaleString('es-MX')), React.createElement('div', null, 'Marcador inicial: ', servicioDetalle.medicion?.marcadorInicial ?? '—'), React.createElement('div', null, 'Marcador final: ', servicioDetalle.medicion?.marcadorFinal ?? '—'), React.createElement('div', null, 'Litros rellenados: ', Number(servicioDetalle.medicion?.litrosRellenados || 0).toFixed(2), ' L'), React.createElement('div', null, 'Garrafones equivalentes: ', Number(servicioDetalle.medicion?.garrafonesEquivalentes || 0).toFixed(2)), React.createElement('div', null, 'Tarifa: ', servicioDetalle.venta?.tarifaNombre || servicioDetalle.venta?.tarifaSnapshot?.nombre || '—'), React.createElement('div', { style: { fontWeight: 800 } }, 'Total facturado: $', Number(servicioDetalle.venta?.total || 0).toFixed(2)), React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 } }, React.createElement(BOut, { onClick: () => abrirPdfServicio(servicioDetalle), style: { flex: 1 } }, 'Abrir nota/PDF'), React.createElement(BFill, { onClick: () => compartirServicio(servicioDetalle), style: { flex: 1 } }, 'Compartir PDF'))));
  const tarjetas = list.map(cliente => {
    const historial = historialCliente(cliente.id);
    const expandido = expandedId === cliente.id;
    const activo = cliente.activo !== false;
    const resumen = React.createElement('div', { className: 'fx-client-card-summary', onClick: () => setDetallesFor(cliente), role: 'button', tabIndex: 0, onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') setDetallesFor(cliente); } },
      React.createElement('div', { className: 'fx-client-card-copy' },
        React.createElement('div', { className: 'fx-client-card-name' }, cliente.nombre || 'Cliente sin nombre'),
        React.createElement('div', { className: 'fx-client-card-location' }, localidadDeCliente(cliente) || 'Sin localidad'),
        React.createElement('div', { className: 'fx-client-card-service' }, etiquetaMetodoServicio(cliente.metodoServicio)),
        React.createElement('div', { className: 'fx-client-card-balance' }, 'Saldo ', Number(cmap[cliente.id] || 0) > 0 ? '$' + Number(cmap[cliente.id]).toFixed(2) : '$0.00'),
        React.createElement('div', { className: 'fx-client-status', 'aria-label': 'Estado del cliente' }, React.createElement('span', { className: 'fx-client-status-label' }, 'Estado'), React.createElement('span', { className: activo ? 'fx-client-status-value fx-client-status-active' : 'fx-client-status-value fx-client-status-inactive' }, activo ? 'Activo' : 'Inactivo'))),
      React.createElement('span', { className: 'fx-client-card-chevron', 'aria-hidden': 'true' }, expandido ? '⌃' : '›'));
    const acciones = expandido && React.createElement('div', { className: 'fx-client-card-actions', style: { borderTop: '1px solid var(--line)', padding: '10px 14px' } }, React.createElement('div', { className: 'fx-client-card-tags', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 } }, React.createElement(Tag, { color: activo ? 'var(--ok-text)' : 'var(--ink-soft)' }, activo ? 'Activo' : 'Inactivo'), React.createElement(Tag, { color: Number(cmap[cliente.id] || 0) > 0 ? 'var(--warn-text)' : 'var(--ink-soft)' }, Number(cmap[cliente.id] || 0) > 0 ? 'Crédito $' + Number(cmap[cliente.id]).toFixed(2) : 'Sin crédito')), React.createElement('div', { className: 'fx-client-action-row', style: { display: 'flex', gap: 6 } }, puedeEditar && React.createElement(BOut, { onClick: e => { e.stopPropagation(); setForm({ id: cliente.id, nombre: cliente.nombre || '', localidadId: cliente.localidadId || '', telefono: cliente.telefono || '', metodoServicio: cliente.metodoServicio || METODO_VENTA_CANTIDAD, tarifaId: cliente.tarifaId || cliente.tarifaHabitualId || '', activo }); setExpandedId(null); }, style: { flex: 1 } }, 'Editar'), puedeCrear && React.createElement(BOut, { onClick: e => { e.stopPropagation(); db.collection(COLECCIONES.CLIENTES).doc(cliente.id).update({ activo: !activo }); setExpandedId(null); }, style: { flex: 1 } }, activo ? 'Desactivar' : 'Activar'), historial.length ? React.createElement(BOut, { onClick: e => { e.stopPropagation(); setHistId(cliente.id); setExpandedId(null); }, style: { flex: 1 } }, 'Historial') : null));
    const historialVista = histId === cliente.id && React.createElement('div', { className: 'fx-client-history', style: { padding: '0 14px 12px' } }, React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', fontWeight: 800, marginBottom: 6 } }, 'HISTORIAL DE OPERACIONES'), historial.length ? historial.slice(0, 8).map(item => item.tipoRegistro === 'servicio' ? React.createElement('div', { key: item.id, style: { borderTop: '1px solid var(--line)', padding: '8px 0', fontSize: 11 } }, React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' } }, React.createElement('div', null, React.createElement('strong', null, 'Relleno por medición'), React.createElement('div', { style: { color: 'var(--ink-soft)', marginTop: 2 } }, new Date(item.fechaRegistro || 0).toLocaleString('es-MX'), ' · ', Number(item.medicion?.litrosRellenados || 0).toFixed(2), ' L · $', Number(item.venta?.total || 0).toFixed(2), ' · Facturado')), React.createElement(BOut, { onClick: () => setServicioDetalle(item), style: { padding: '6px 8px', fontSize: 10 } }, 'Ver servicio')), React.createElement('div', { style: { display: 'flex', gap: 6, marginTop: 6 } }, item.comprobante?.pdfUrl || item.pdfUrl ? React.createElement(BOut, { onClick: () => abrirPdfServicio(item), style: { flex: 1, padding: '6px 8px', fontSize: 10 } }, 'Abrir nota/PDF') : null, React.createElement(BFill, { onClick: () => compartirServicio(item), style: { flex: 1, padding: '6px 8px', fontSize: 10 } }, 'Compartir PDF'))) : React.createElement('div', { key: item.id, style: { borderTop: '1px solid var(--line)', padding: '7px 0', fontSize: 11 } }, new Date(item.fechaRegistro || 0).toLocaleString('es-MX'), ' · ', Number(item.litrosVendidos || 0).toFixed(2), ' L · $', Number(item.total || 0).toFixed(2), ' · ', item.formaPago || '')) : React.createElement('div', { style: { color: 'var(--ink-faint)', fontSize: 12 } }, 'Sin operaciones registradas.'));
    return React.createElement('div', { key: cliente.id, className: 'fx-client-card-shell' }, React.createElement(Card, { style: { padding: 0, marginBottom: 8, opacity: activo ? 1 : .65 } }, resumen, acciones, historialVista));
  });
  const opcionesLocalidadFiltro = [{ valor: 'todos', texto: 'Todas las localidades' }, { valor: LOCALIDAD_SIN_CLASIFICAR, texto: 'Sin localidad' }].concat(localidadesVisibles.map(localidad => ({ valor: localidad, texto: localidad })));
  const contarLocalidad = valor => contar(cliente => valor === 'todos' || valor === LOCALIDAD_SIN_CLASIFICAR && !localidadDeCliente(cliente) || claveLocalidad(localidadDeCliente(cliente)) === claveLocalidad(valor));
  return React.createElement('div', { className: 'fx-page-clients' },
    React.createElement('div', { className: 'fx-clients-heading' }, React.createElement('div', { className: 'fx-clients-title' }, 'Clientes'), puedeCrear && React.createElement('div', { className: 'fx-clients-heading-actions' }, React.createElement(BFill, { onClick: nuevaFicha }, '+ Nuevo cliente'), React.createElement(BOut, { onClick: () => setMostrarNuevaLocalidad(true) }, '+ Nueva localidad'))),
    puedeCrear && React.createElement('div', { className: 'fx-client-data-tools', 'aria-label': 'Importación y exportación de clientes' },
      React.createElement('input', { ref: archivoImportacionRef, type: 'file', accept: '.xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel', onChange: leerArchivoClientes, className: 'fx-client-file-input', 'aria-label': 'Seleccionar archivo de clientes' }),
      React.createElement(BOut, { onClick: () => archivoImportacionRef.current?.click() }, 'Importar clientes'),
      React.createElement(BOut, { onClick: descargarPlantillaClientes }, 'Descargar plantilla'),
      React.createElement(BOut, { onClick: exportarClientesExcel }, 'Exportar Excel (', list.length, ')'),
      React.createElement(BOut, { onClick: exportarClientesCSV }, 'Exportar CSV (', list.length, ')')
    ),
    React.createElement(Inp, { className: 'fx-clientes-search-input', placeholder: 'Buscar cliente o localidad…', value: q, onChange: e => setQ(e.target.value), 'aria-label': 'Buscar cliente o localidad', style: { marginBottom: 14 } }),
    React.createElement('div', { className: 'fx-client-filters', role: 'group', 'aria-label': 'Filtros de clientes' },
      React.createElement(FiltroClientes, { titulo: 'Estado', valor: filtroEstado, onChange: setFiltroEstado, opciones: [{ valor: 'todos', texto: 'Todos' }, { valor: 'activos', texto: 'Activos' }, { valor: 'inactivos', texto: 'Inactivos' }], contar: valor => contar(cliente => valor === 'todos' || valor === 'activos' && cliente.activo !== false || valor === 'inactivos' && cliente.activo === false) }),
      React.createElement(FiltroClientes, { titulo: 'Crédito', valor: filtroCredito, onChange: setFiltroCredito, opciones: [{ valor: 'todos', texto: 'Todos' }, { valor: 'credito', texto: 'Con crédito' }, { valor: 'sin-credito', texto: 'Sin crédito' }], contar: valor => contar(cliente => valor === 'todos' || valor === 'credito' && Number(cmap[cliente.id] || 0) > 0 || valor === 'sin-credito' && Number(cmap[cliente.id] || 0) <= 0) }),
      React.createElement(FiltroClientes, { titulo: 'Localidad', valor: filtroLocalidad, onChange: setFiltroLocalidad, opciones: opcionesLocalidadFiltro, contar: contarLocalidad })),
    React.createElement('div', { className: 'fx-client-results-count' }, list.length + ' cliente(s) encontrado(s).'), tarjetas, localidadEditor, importacionEditor, editor, detalle, servicioDetalleModal);
}
