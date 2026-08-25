/* servicios-relleno.js — flujo independiente de relleno por medición.
   No reemplaza la venta normal ni escribe lecturas físicas del medidor.
   El servicio usa la lectura calculada del camión solo como trazabilidad lógica. */
(function (global) {
  'use strict';

  const RELLENO_DRAFT_VERSION = 1;
  const RELLENO_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const METODO_RELLENO = 'relleno_por_medicion';
  const listeners = new Set();

  const crearId = prefijo => `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const numero = valor => Number.isFinite(Number(valor)) ? Number(valor) : 0;
  const texto = valor => String(valor == null ? '' : valor).trim();
  const moneda = valor => '$' + numero(valor).toFixed(2);
  const esRelleno = cliente => cliente?.metodoServicio === METODO_RELLENO;

  const claveBorradores = uid => `fluxora_relleno_borradores_v${RELLENO_DRAFT_VERSION}_${uid || 'sin_usuario'}`;
  const leerBorradores = uid => {
    if (!uid || typeof localStorage === 'undefined') return [];
    try {
      const datos = JSON.parse(localStorage.getItem(claveBorradores(uid)) || '[]');
      if (!Array.isArray(datos)) return [];
      const ahora = Date.now();
      const vigentes = datos.filter(item => item && item.version === RELLENO_DRAFT_VERSION && item.guardadoEn && ahora - Number(item.guardadoEn) <= RELLENO_DRAFT_MAX_AGE_MS);
      if (vigentes.length !== datos.length) localStorage.setItem(claveBorradores(uid), JSON.stringify(vigentes));
      return vigentes;
    } catch (e) {
      try { localStorage.removeItem(claveBorradores(uid)); } catch (ignore) {}
      return [];
    }
  };
  const notificarBorradores = uid => listeners.forEach(fn => { try { fn(leerBorradores(uid)); } catch (e) {} });
  const suscribirBorradores = (uid, callback) => {
    listeners.add(callback);
    callback(leerBorradores(uid));
    return () => listeners.delete(callback);
  };
  const guardarBorrador = (uid, draft) => {
    if (!uid || typeof localStorage === 'undefined') throw new Error('No hay usuario para guardar el borrador');
    const existente = leerBorradores(uid).filter(item => item.id !== draft.id);
    const nuevo = { ...draft, id: draft.id || crearId('BORR'), version: RELLENO_DRAFT_VERSION, guardadoEn: Date.now() };
    localStorage.setItem(claveBorradores(uid), JSON.stringify([...existente, nuevo]));
    notificarBorradores(uid);
    return nuevo;
  };
  const eliminarBorrador = (uid, id) => {
    const nuevos = leerBorradores(uid).filter(item => item.id !== id);
    try { localStorage.setItem(claveBorradores(uid), JSON.stringify(nuevos)); } catch (e) {}
    notificarBorradores(uid);
  };

  const fallbackTarifa = medicion => ({
    id: 'medicion:base',
    nombre: 'Tarifa base de Medición y Venta',
    unidadComercial: medicion?.unidadComercial || 'Garrafón',
    litrosPorUnidad: numero(medicion?.litrosPorUnidad || 20),
    incrementoContadorPorUnidad: numero(medicion?.incrementoContadorPorUnidad || 2),
    precioUnitario: numero(medicion?.precioPorUnidad || 0),
    activo: true
  });
  const normalizarTarifa = (tarifa, medicion) => {
    const base = tarifa || fallbackTarifa(medicion);
    return {
      id: texto(base.id) || 'medicion:base',
      nombre: texto(base.nombre) || 'Tarifa base de Medición y Venta',
      unidadComercial: texto(base.unidadComercial) || 'Garrafón',
      litrosPorUnidad: numero(base.litrosPorUnidad || 20),
      incrementoContadorPorUnidad: numero(base.incrementoContadorPorUnidad || 2),
      precioUnitario: numero(base.precioUnitario ?? base.precioPorUnidad ?? 0),
      activo: base.activo !== false
    };
  };
  const calcularRelleno = ({ marcadorInicial, marcadorFinal, litrosPorIncremento, tarifa, medidorAntes = 0, aguaDisponible = Infinity }) => {
    const inicial = Number(marcadorInicial), final = Number(marcadorFinal);
    const litrosIncremento = numero(litrosPorIncremento || 10);
    const aguaAntes = Number.isFinite(Number(aguaDisponible)) ? Number(aguaDisponible) : Infinity;
    const tarifaNormalizada = normalizarTarifa(tarifa, null);
    if (!Number.isInteger(inicial) || !Number.isInteger(final) || inicial < 0 || final < 0 || final < inicial || litrosIncremento <= 0) return { valido: false, inicial, final };
    const diferenciaMarcador = final - inicial;
    const litrosRellenados = diferenciaMarcador * litrosIncremento;
    const litrosPorGarrafon = tarifaNormalizada.litrosPorUnidad > 0 ? tarifaNormalizada.litrosPorUnidad : 20;
    const garrafonesEquivalentes = litrosRellenados / litrosPorGarrafon;
    const incrementoContador = garrafonesEquivalentes * tarifaNormalizada.incrementoContadorPorUnidad;
    const lecturaCamionDespues = numero(medidorAntes) + incrementoContador;
    const total = garrafonesEquivalentes * tarifaNormalizada.precioUnitario;
    return {
      valido: Number.isFinite(litrosRellenados) && litrosRellenados >= 0,
      inicial,
      final,
      diferenciaMarcador,
      litrosPorIncremento: litrosIncremento,
      litrosRellenados,
      litrosPorGarrafon,
      garrafonesEquivalentes,
      incrementoContador,
      lecturaCamionAntes: numero(medidorAntes),
      lecturaCamionDespues,
      precioUnitarioAplicado: tarifaNormalizada.precioUnitario,
      total,
      aguaDisponibleAntesLitros: aguaAntes,
      aguaDisponibleDespuesLitros: aguaAntes === Infinity ? Infinity : aguaAntes - litrosRellenados,
      tarifaSnapshot: tarifaNormalizada
    };
  };

  const construirServicio = ({ draft, cliente, jornada, localidad, vehiculo, medidor, currentUser, calculo, firmaDataUrl }) => {
    const fecha = new Date().toISOString();
    const serviceId = draft?.servicioId || draft?.id || crearId('SERV');
    const comprobanteId = draft?.comprobanteId || crearId('CMP');
    return {
      id: serviceId,
      comprobanteId,
      clienteId: cliente.id,
      clienteNombre: texto(cliente.nombre),
      localidadId: texto(cliente.localidadId || jornada?.localidadId || localidad?.id),
      localidadNombre: texto(cliente.localidadNombre || cliente.localidad || jornada?.localidadNombre || localidad?.nombre),
      jornadaId: texto(jornada?.id),
      repartidorUid: texto(currentUser?.uid),
      repartidorNombre: texto(currentUser?.nombre),
      vehiculoId: texto(vehiculo?.id || jornada?.vehiculoId),
      vehiculoNombre: texto(vehiculo?.nombre || jornada?.vehiculoNombre || jornada?.vehiculo),
      medidorId: texto(medidor?.id || jornada?.medidorId),
      medidorNombre: texto(medidor?.nombre || jornada?.medidorNombre),
      tipo: METODO_RELLENO,
      estado: 'completado',
      medicion: {
        requiereMedicion: true,
        marcadorInicial: calculo.inicial,
        marcadorFinal: calculo.final,
        diferenciaMarcador: calculo.diferenciaMarcador,
        litrosPorIncremento: calculo.litrosPorIncremento,
        litrosRellenados: calculo.litrosRellenados,
        litrosPorGarrafon: calculo.litrosPorGarrafon,
        garrafonesEquivalentes: calculo.garrafonesEquivalentes
      },
      venta: {
        tarifaId: calculo.tarifaSnapshot.id,
        tarifaNombre: calculo.tarifaSnapshot.nombre,
        tarifaSnapshot: calculo.tarifaSnapshot,
        precioUnitarioAplicado: calculo.precioUnitarioAplicado,
        garrafonesCobrables: calculo.garrafonesEquivalentes,
        total: calculo.total
      },
      lecturaCamion: {
        lecturaCalculadaAntes: calculo.lecturaCamionAntes,
        lecturaCalculadaDespues: calculo.lecturaCamionDespues,
        incrementoContador: calculo.incrementoContador,
        noEsLecturaFisica: true
      },
      stockMovil: {
        aguaDisponibleAntesLitros: calculo.aguaDisponibleAntesLitros,
        aguaDisponibleDespuesLitros: calculo.aguaDisponibleDespuesLitros,
        noModificaLecturaInicial: true,
        noModificaLecturaFinal: true
      },
      firmaDataUrl: firmaDataUrl || '',
      firmaCapturada: !!firmaDataUrl,
      pdfPath: '',
      pdfUrl: '',
      creadoEn: fecha,
      createdAt: fecha,
      createdByUid: texto(currentUser?.uid),
      createdByNombre: texto(currentUser?.nombre),
      actualizadoEn: fecha
    };
  };

  const obtenerDb = () => global.db || (typeof db !== 'undefined' ? db : null);
  const obtenerFirebase = () => global.firebase || (typeof firebase !== 'undefined' ? firebase : null);

  const generarPdfServicio = (servicio, firmaDataUrl) => {
    const sdk = global.jspdf?.jsPDF || global.jsPDF;
    if (!sdk) throw new Error('La librería PDF no está disponible');
    const doc = new sdk({ unit: 'mm', format: 'a4' });
    const izquierda = 20;
    let y = 22;
    const linea = texto => { doc.text(String(texto), izquierda, y); y += 7; };
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    linea('FLUXORA');
    doc.setFontSize(15);
    linea('NOTA DE SERVICIO');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    linea(`Folio: ${servicio.id}`);
    linea(`Fecha: ${new Date(servicio.createdAt).toLocaleString('es-MX')}`);
    y += 4;
    doc.setFont('helvetica', 'bold');
    linea('CLIENTE');
    doc.setFont('helvetica', 'normal');
    linea(servicio.clienteNombre || 'Sin nombre');
    linea(`Localidad: ${servicio.localidadNombre || 'Sin localidad'}`);
    y += 3;
    doc.setFont('helvetica', 'bold');
    linea('SERVICIO: Relleno por medición');
    doc.setFont('helvetica', 'normal');
    linea(`Marcador inicial: ${servicio.medicion.marcadorInicial}`);
    linea(`Marcador final: ${servicio.medicion.marcadorFinal}`);
    linea(`Diferencia: ${servicio.medicion.diferenciaMarcador}`);
    linea(`Litros rellenados: ${servicio.medicion.litrosRellenados.toFixed(2)} L`);
    linea(`Garrafones cobrables: ${servicio.medicion.garrafonesEquivalentes.toFixed(2)}`);
    linea(`Tarifa: ${servicio.venta.tarifaNombre}`);
    linea(`Precio unitario: ${moneda(servicio.venta.precioUnitarioAplicado)}`);
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    linea(`TOTAL: ${moneda(servicio.venta.total)}`);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    y += 6;
    linea('Firma del cliente');
    if (firmaDataUrl) {
      try { doc.addImage(firmaDataUrl, 'PNG', izquierda, y, 75, 28); y += 34; } catch (e) { linea('Firma capturada'); }
    } else linea('Firma capturada');
    linea(`Atendido por: ${servicio.repartidorNombre || 'Repartidor'}`);
    linea(`Folio: ${servicio.id}`);
    return doc.output('blob');
  };

  const guardarServicio = async ({ draft, cliente, jornada, localidad, vehiculo, medidor, currentUser, calculo, firmaDataUrl }) => {
    const firestore = obtenerDb();
    const firebaseSdk = obtenerFirebase();
    if (!firestore || !firebaseSdk) throw new Error('Firebase aún no está inicializado');
    if (!firebaseSdk.storage) throw new Error('Storage no está disponible');
    if (!global.jspdf?.jsPDF && !global.jsPDF) throw new Error('La librería PDF no está disponible');
    if (!currentUser?.uid || !cliente?.id || !jornada?.id) throw new Error('Faltan referencias para guardar el servicio');
    if (!firmaDataUrl) throw new Error('Captura y confirma la firma del cliente');
    if (firmaDataUrl.length > 350000) throw new Error('La firma es demasiado grande; límpiala y vuelve a capturarla');
    if (!calculo?.valido || calculo.litrosRellenados <= 0) throw new Error('La medición no es válida');
    const identidad = { ...(draft || {}), servicioId: draft?.servicioId || draft?.id || crearId('SERV'), comprobanteId: draft?.comprobanteId || crearId('CMP') };
    const servicioBase = construirServicio({ draft: identidad, cliente, jornada, localidad, vehiculo, medidor, currentUser, calculo, firmaDataUrl });
    const servicioRef = firestore.collection(COLECCIONES.SERVICIOS).doc(servicioBase.id);
    const comprobanteRef = firestore.collection(COLECCIONES.COMPROBANTES).doc(servicioBase.comprobanteId);
    const jornadaRef = firestore.collection(COLECCIONES.JORNADAS).doc(jornada.id);
    const jornadaPreviaSnap = await jornadaRef.get();
    if (!jornadaPreviaSnap.exists) throw new Error('La jornada ya no existe');
    const jornadaPrevia = jornadaPreviaSnap.data();
    if (jornadaPrevia.estado !== 'abierta' || jornadaPrevia.repartidorId !== currentUser.uid || String(jornadaPrevia.localidadId || '') !== String(servicioBase.localidadId) || String(jornadaPrevia.vehiculoId || '') !== String(servicioBase.vehiculoId) || String(jornadaPrevia.medidorId || '') !== String(servicioBase.medidorId)) throw new Error('La jornada, localidad, vehículo o medidor no corresponde al servicio');
    const disponiblePrevia = numero(jornadaPrevia.aguaDisponibleLitros);
    const lecturaPrevia = numero(jornadaPrevia.lecturaCalculadaActual ?? jornadaPrevia.lecturaActual ?? jornadaPrevia.lecturaInicial);
    if (calculo.litrosRellenados <= 0 || calculo.litrosRellenados > disponiblePrevia + 1e-9) throw new Error(`Agua insuficiente. Disponible: ${disponiblePrevia.toFixed(2)} L`);
    const calculoPreflight = { ...calculo, lecturaCamionAntes: lecturaPrevia, lecturaCamionDespues: lecturaPrevia + calculo.incrementoContador, aguaDisponibleAntesLitros: disponiblePrevia, aguaDisponibleDespuesLitros: Math.max(0, disponiblePrevia - calculo.litrosRellenados) };
    const servicioPdf = construirServicio({ draft: identidad, cliente, jornada: jornadaPrevia, localidad, vehiculo, medidor, currentUser, calculo: calculoPreflight, firmaDataUrl });
    const nombrePdf = `${servicioBase.id}-${Date.now().toString(36)}.pdf`;
    const storageRef = firebaseSdk.storage().ref(`comprobantes/${currentUser.uid}/${nombrePdf}`);
    const pdfBlob = generarPdfServicio(servicioPdf, firmaDataUrl);
    let pdfSnapshot;
    try {
      pdfSnapshot = await storageRef.put(pdfBlob, { contentType: 'application/pdf', customMetadata: { servicioId: servicioBase.id, clienteId: cliente.id, tipo: METODO_RELLENO } });
      const pdfUrl = await pdfSnapshot.ref.getDownloadURL();
      await firestore.runTransaction(async tx => {
        const [jornadaSnap, servicioSnap] = await Promise.all([tx.get(jornadaRef), tx.get(servicioRef)]);
        if (servicioSnap.exists) throw new Error('Este borrador ya fue finalizado');
        if (!jornadaSnap.exists) throw new Error('La jornada ya no existe');
        const jornadaActual = jornadaSnap.data();
        if (jornadaActual.estado !== 'abierta' || jornadaActual.repartidorId !== currentUser.uid || String(jornadaActual.localidadId || '') !== String(servicioBase.localidadId) || String(jornadaActual.vehiculoId || '') !== String(servicioBase.vehiculoId) || String(jornadaActual.medidorId || '') !== String(servicioBase.medidorId)) throw new Error('La jornada, localidad, vehículo o medidor no corresponde al servicio');
        const disponible = numero(jornadaActual.aguaDisponibleLitros);
        const lecturaActual = numero(jornadaActual.lecturaCalculadaActual ?? jornadaActual.lecturaActual ?? jornadaActual.lecturaInicial);
        if (calculoPreflight.litrosRellenados <= 0 || calculoPreflight.litrosRellenados > disponible + 1e-9) throw new Error(`Agua insuficiente. Disponible: ${disponible.toFixed(2)} L`);
        if (Math.abs(disponible - calculoPreflight.aguaDisponibleAntesLitros) > 1e-9 || Math.abs(lecturaActual - calculoPreflight.lecturaCamionAntes) > 1e-9) throw new Error('El saldo de agua o la lectura lógica cambiaron; vuelve a abrir el borrador para recalcular');
        const calculoAplicado = { ...calculoPreflight, lecturaCamionAntes: lecturaActual, lecturaCamionDespues: lecturaActual + calculoPreflight.incrementoContador, aguaDisponibleAntesLitros: disponible, aguaDisponibleDespuesLitros: Math.max(0, disponible - calculoPreflight.litrosRellenados) };
        const servicio = construirServicio({ draft: servicioBase, cliente, jornada: jornadaActual, localidad, vehiculo, medidor, currentUser, calculo: calculoAplicado, firmaDataUrl });
        servicio.pdfPath = pdfSnapshot.ref.fullPath;
        servicio.pdfUrl = pdfUrl;
        servicio.estado = 'completado';
        tx.set(servicioRef, servicio);
        tx.set(comprobanteRef, {
          comprobanteId: servicio.comprobanteId,
          servicioId: servicio.id,
          clienteId: servicio.clienteId,
          clienteNombre: servicio.clienteNombre,
          tipo: 'nota_servicio',
          folio: servicio.id,
          pdfPath: servicio.pdfPath,
          pdfUrl: servicio.pdfUrl,
          firmaCapturada: true,
          createdAt: servicio.createdAt,
          createdByUid: servicio.createdByUid,
          createdByNombre: servicio.createdByNombre,
          estado: 'completado'
        });
        tx.update(jornadaRef, {
          aguaDisponibleLitros: calculoAplicado.aguaDisponibleDespuesLitros,
          lecturaCalculadaActual: calculoAplicado.lecturaCamionDespues,
          lecturaActual: calculoAplicado.lecturaCamionDespues,
          litrosVendidosAcumulados: numero(jornadaActual.litrosVendidosAcumulados || jornadaActual.litrosVendidos) + calculoAplicado.litrosRellenados,
          ultimaOperacionRellenoId: servicio.id,
          actualizadoEn: new Date().toISOString()
        });
        servicioBase.__final = servicio;
      });
      const servicioFinal = servicioBase.__final || servicioBase;
      delete servicioBase.__final;
      return { estado: 'completado', servicioId: servicioFinal.id, comprobanteId: servicioFinal.comprobanteId, pdfUrl: servicioFinal.pdfUrl, servicio: servicioFinal };
    } catch (error) {
      try { await storageRef.delete(); } catch (ignore) {}
      throw error;
    }
  };

  function FirmaCanvas({ value, onChange }) {
    const canvasRef = React.useRef(null);
    const dibujando = React.useRef(false);
    const punto = evento => {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const origen = evento.touches?.[0] || evento;
      return { x: (origen.clientX - rect.left) * (canvas.width / rect.width), y: (origen.clientY - rect.top) * (canvas.height / rect.height) };
    };
    const iniciar = evento => { evento.preventDefault(); const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); const p = punto(evento); dibujando.current = true; ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const mover = evento => { if (!dibujando.current) return; evento.preventDefault(); const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); const p = punto(evento); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const terminar = () => { if (!dibujando.current) return; dibujando.current = false; onChange(canvasRef.current.toDataURL('image/png')); };
    React.useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1B1D19';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (value) {
        const image = new Image();
        image.onload = () => ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        image.src = value;
      }
    }, []);
    const limpiar = () => { const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height); onChange(''); };
    return React.createElement('div', { className: 'fx-relleno-signature' },
      React.createElement('canvas', { ref: canvasRef, width: 620, height: 220, onPointerDown: iniciar, onPointerMove: mover, onPointerUp: terminar, onPointerLeave: terminar, onTouchStart: iniciar, onTouchMove: mover, onTouchEnd: terminar, style: { width: '100%', height: 170, background: '#fff', border: '1px solid var(--line-strong)', borderRadius: 8, touchAction: 'none', display: 'block' } }),
      React.createElement('button', { type: 'button', onClick: limpiar, style: { marginTop: 7, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 7, background: 'var(--surface)', color: 'var(--ink)', fontSize: 11, fontWeight: 700 } }, 'Limpiar firma'));
  }

  function ServicioRelleno({ cliente, jornada, localidad, vehiculo, medidor, tarifas = [], medicion = null, currentUser = {}, draft = null, modoLote = false, onClose, onCompletado }) {
    const tarifaBase = React.useMemo(() => {
      const id = draft?.tarifaSnapshot?.id || cliente?.tarifaId || cliente?.tarifaHabitualId;
      const encontrada = (tarifas || []).find(t => String(t.id) === String(id) && t.activo !== false);
      return normalizarTarifa(draft?.tarifaSnapshot || encontrada, medicion);
    }, [draft?.id, draft?.tarifaSnapshot, cliente?.tarifaId, cliente?.tarifaHabitualId, tarifas, medicion]);
    const [marcadorInicial, setMarcadorInicial] = React.useState(draft?.marcadorInicial == null ? '' : String(draft.marcadorInicial));
    const [marcadorFinal, setMarcadorFinal] = React.useState(draft?.marcadorFinal == null ? '' : String(draft.marcadorFinal));
    const [tarifaId, setTarifaId] = React.useState(draft?.tarifaSnapshot?.id || tarifaBase.id);
    const [firma, setFirma] = React.useState(draft?.firmaDataUrl || '');
    const [vista, setVista] = React.useState(modoLote ? 'firma' : 'captura');
    const [guardando, setGuardando] = React.useState(false);
    const [mensaje, setMensaje] = React.useState('');
    const mostrar = textoMensaje => { setMensaje(textoMensaje); setTimeout(() => setMensaje(''), 3500); };
    const tarifa = normalizarTarifa((tarifas || []).find(t => String(t.id) === String(tarifaId)) || tarifaBase, medicion);
    const litrosPorIncremento = numero(medidor?.litrosPorIncremento || medicion?.litrosPorIncremento || 10);
    const medidorAntes = numero(jornada?.lecturaCalculadaActual ?? jornada?.lecturaActual ?? jornada?.lecturaInicial);
    const aguaDisponible = numero(jornada?.aguaDisponibleLitros);
    const calculo = calcularRelleno({ marcadorInicial, marcadorFinal, litrosPorIncremento, tarifa, medidorAntes, aguaDisponible });
    const opcionesTarifa = (tarifas || []).filter(t => t.activo !== false).map(t => normalizarTarifa(t, medicion));
    const draftActual = () => ({
      id: draft?.id || crearId('BORR'),
      servicioId: draft?.servicioId || crearId('SERV'),
      clienteId: cliente.id,
      clienteNombre: cliente.nombre || '',
      localidadId: cliente.localidadId || jornada?.localidadId || localidad?.id || '',
      localidadNombre: cliente.localidadNombre || cliente.localidad || jornada?.localidadNombre || localidad?.nombre || '',
      jornadaId: jornada?.id || '',
      vehiculoId: vehiculo?.id || jornada?.vehiculoId || '',
      medidorId: medidor?.id || jornada?.medidorId || '',
      marcadorInicial: calculo.inicial,
      marcadorFinal: calculo.final,
      diferenciaMarcador: calculo.diferenciaMarcador,
      litrosRellenados: calculo.litrosRellenados,
      garrafonesEquivalentes: calculo.garrafonesEquivalentes,
      lecturaCamionAntes: calculo.lecturaCamionAntes,
      aguaDisponibleAntesLitros: calculo.aguaDisponibleAntesLitros,
      tarifaSnapshot: calculo.tarifaSnapshot,
      firmaDataUrl: firma
    });
    const validarMedicion = () => {
      if (!(draft?.tarifaSnapshot || (tarifas || []).some(t => t && t.activo !== false))) return 'No hay una tarifa activa existente para este servicio';
      if (!Number.isFinite(Number(marcadorInicial)) || marcadorInicial === '') return 'Captura el marcador inicial';
      if (!Number.isInteger(Number(marcadorInicial)) || Number(marcadorInicial) < 0) return 'El marcador inicial debe ser un entero no negativo';
      if (!Number.isFinite(Number(marcadorFinal)) || marcadorFinal === '') return 'Captura el marcador final';
      if (!Number.isInteger(Number(marcadorFinal)) || Number(marcadorFinal) < 0) return 'El marcador final debe ser un entero no negativo';
      if (Number(marcadorFinal) < Number(marcadorInicial)) return 'El marcador final no puede ser menor que el marcador inicial';
      if (!calculo.valido || calculo.litrosRellenados <= 0) return 'La diferencia debe producir litros rellenados';
      return '';
    };
    const validarCaptura = () => {
      const errorMedicion = validarMedicion();
      if (errorMedicion) return errorMedicion;
      if (calculo.litrosRellenados > aguaDisponible + 1e-9) return `Agua insuficiente. Disponible: ${aguaDisponible.toFixed(2)} L`;
      return '';
    };
    const guardarComoBorrador = () => {
      const error = validarMedicion();
      if (error) return mostrar(error);
      try {
        guardarBorrador(currentUser.uid, draftActual());
        mostrar('Borrador guardado para firmar después');
        if (onClose) setTimeout(onClose, 350);
      } catch (e) { mostrar('No se pudo guardar el borrador: ' + e.message); }
    };
    const pasarAFirma = () => { const error = validarCaptura(); if (error) return mostrar(error); setVista('firma'); };
    const confirmar = async () => {
      const error = validarCaptura();
      if (error) return mostrar(error);
      if (!firma) return mostrar('Captura y confirma la firma del cliente');
      setGuardando(true);
      try {
        const resultado = await guardarServicio({ draft, cliente, jornada, localidad, vehiculo, medidor, currentUser, calculo, firmaDataUrl: firma });
        if (draft) eliminarBorrador(currentUser.uid, draft.id);
        mostrar('Nota firmada, PDF guardado y servicio completado');
        if (onCompletado) setTimeout(() => onCompletado(resultado), 500);
        else if (onClose) setTimeout(onClose, 500);
      } catch (e) { mostrar('No se pudo completar el servicio: ' + e.message); }
      setGuardando(false);
    };
    const resumen = React.createElement('div', { className: 'fx-relleno-summary', style: { background: 'var(--surface-2)', borderRadius: 9, padding: 11, marginTop: 10, fontSize: 12 } },
      React.createElement('div', { style: { display: 'grid', gap: 5 } },
        React.createElement('div', null, 'Diferencia: ', calculo.valido ? calculo.diferenciaMarcador : '—'),
        React.createElement('div', null, 'Litros rellenados: ', calculo.valido ? calculo.litrosRellenados.toFixed(2) + ' L' : '—'),
        React.createElement('div', null, 'Garrafones equivalentes: ', calculo.valido ? calculo.garrafonesEquivalentes.toFixed(2) : '—'),
        React.createElement('div', null, 'Medidor lógico del camión: ', calculo.valido ? `${calculo.lecturaCamionAntes.toFixed(2)} → ${calculo.lecturaCamionDespues.toFixed(2)} (+${calculo.incrementoContador.toFixed(2)})` : '—'),
        React.createElement('div', { style: { fontWeight: 800, color: 'var(--accent-text)' } }, 'Total: ', calculo.valido ? moneda(calculo.total) : '—'),
        React.createElement('div', { style: { color: calculo.valido && calculo.litrosRellenados > aguaDisponible ? 'var(--danger-text)' : 'var(--ink-soft)' } }, 'Agua disponible después: ', calculo.valido ? Math.max(0, calculo.aguaDisponibleDespuesLitros).toFixed(2) + ' L' : '—')));
    return React.createElement('div', { className: 'fx-page-relleno', style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 14, marginTop: 10 } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' } }, React.createElement('div', null, React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', fontWeight: 800, letterSpacing: '.07em' } }, 'RELLENO POR MEDICIÓN'), React.createElement('div', { style: { fontSize: 18, fontWeight: 800, marginTop: 4 } }, cliente.nombre || 'Cliente')), !modoLote && React.createElement('button', { type: 'button', onClick: onClose, style: { border: 0, background: 'transparent', color: 'var(--ink-soft)', fontWeight: 800 } }, '← Volver')),
      React.createElement('div', { style: { color: 'var(--ink-soft)', fontSize: 11, marginTop: 5 } }, 'Tarifa: ', tarifa.nombre, ' · ', moneda(tarifa.precioUnitario), ' / ', tarifa.unidadComercial),
      mensaje && React.createElement('div', { style: { background: 'var(--warn-bg)', color: 'var(--warn-text)', padding: 9, borderRadius: 8, fontSize: 11, fontWeight: 700, marginTop: 10 } }, mensaje),
      vista === 'captura' && React.createElement(React.Fragment, null,
        React.createElement('label', { style: { display: 'block', fontSize: 11, color: 'var(--ink-soft)', fontWeight: 700, marginTop: 13 } }, 'MARCADOR INICIAL', React.createElement('input', { value: marcadorInicial, onChange: e => setMarcadorInicial(e.target.value), inputMode: 'numeric', type: 'number', min: 0, step: 1, style: { width: '100%', boxSizing: 'border-box', marginTop: 5, padding: 12, fontSize: 18, fontWeight: 800, border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)' } })),
        React.createElement('label', { style: { display: 'block', fontSize: 11, color: 'var(--ink-soft)', fontWeight: 700, marginTop: 10 } }, 'MARCADOR FINAL', React.createElement('input', { value: marcadorFinal, onChange: e => setMarcadorFinal(e.target.value), inputMode: 'numeric', type: 'number', min: 0, step: 1, style: { width: '100%', boxSizing: 'border-box', marginTop: 5, padding: 12, fontSize: 18, fontWeight: 800, border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)' } })),
        opcionesTarifa.length > 0 && React.createElement('label', { style: { display: 'block', fontSize: 11, color: 'var(--ink-soft)', fontWeight: 700, marginTop: 10 } }, 'TARIFA', React.createElement('select', { value: tarifaId, onChange: e => setTarifaId(e.target.value), style: { width: '100%', boxSizing: 'border-box', marginTop: 5, padding: 11, border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)' } }, opcionesTarifa.map(t => React.createElement('option', { key: t.id, value: t.id }, t.nombre, ' · ', moneda(t.precioUnitario), ' / ', t.unidadComercial)))),
        resumen,
        React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 } }, React.createElement('button', { type: 'button', onClick: guardarComoBorrador, style: { flex: '1 1 45%', minWidth: 140, padding: 12, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)', fontWeight: 800 } }, 'Guardar como borrador'), React.createElement('button', { type: 'button', onClick: pasarAFirma, style: { flex: '1 1 45%', minWidth: 140, padding: 12, border: 0, borderRadius: 8, background: 'var(--accent)', color: 'var(--ink)', fontWeight: 800 } }, 'Continuar a firma'))),
      vista === 'firma' && React.createElement(React.Fragment, null,
        React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 12, lineHeight: 1.45 } }, 'Revisa la nota. La firma pertenece a este servicio y no al cliente. Al confirmar se generará el PDF y se guardará en Storage.'),
        resumen,
        React.createElement('div', { style: { marginTop: 12, fontSize: 11, fontWeight: 800 } }, 'FIRMA DEL CLIENTE'),
        React.createElement(FirmaCanvas, { value: firma, onChange: setFirma }),
        React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 } }, !modoLote && React.createElement('button', { type: 'button', onClick: () => setVista('captura'), style: { flex: '1 1 30%', minWidth: 105, padding: 11, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)', fontWeight: 700 } }, 'Revisar medición'), React.createElement('button', { type: 'button', onClick: guardarComoBorrador, style: { flex: '1 1 30%', minWidth: 125, padding: 11, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface)', color: 'var(--info-text)', fontWeight: 800 } }, 'Guardar borrador'), React.createElement('button', { type: 'button', onClick: confirmar, disabled: guardando, style: { flex: '1 1 30%', minWidth: 150, padding: 11, border: 0, borderRadius: 8, background: 'var(--accent)', color: 'var(--ink)', fontWeight: 900 } }, guardando ? 'Guardando…' : 'Confirmar y generar PDF'))));
  }

  function BorradoresRelleno({ currentUser = {}, jornada = null, localidad = null, vehiculo = null, medidor = null, tarifas = [], medicion = null, onAbrir }) {
    const [borradores, setBorradores] = React.useState([]);
    const [seleccionados, setSeleccionados] = React.useState([]);
    const [indice, setIndice] = React.useState(null);
    React.useEffect(() => suscribirBorradores(currentUser.uid, setBorradores), [currentUser.uid]);
    React.useEffect(() => setSeleccionados(ids => ids.filter(id => borradores.some(item => item.id === id))), [borradores]);
    const actual = indice == null ? null : borradores.filter(item => seleccionados.includes(item.id))[indice] || null;
    if (!jornada || !borradores.length) return null;
    if (actual) return React.createElement(ServicioRelleno, { cliente: { id: actual.clienteId, nombre: actual.clienteNombre, localidadId: actual.localidadId, localidadNombre: actual.localidadNombre, metodoServicio: METODO_RELLENO, tarifaId: actual.tarifaSnapshot?.id }, jornada, localidad, vehiculo, medidor, tarifas, medicion, currentUser, draft: actual, modoLote: true, onCompletado: () => { const nuevos = seleccionados.filter(id => id !== actual.id); setSeleccionados(nuevos); setIndice(nuevos.length ? 0 : null); } });
    return React.createElement('section', { className: 'fx-relleno-drafts', style: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 12, margin: '10px 0' } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } }, React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-faint)', fontWeight: 800, letterSpacing: '.06em' } }, 'BORRADORES DE RELLENO · ', borradores.length), React.createElement('button', { type: 'button', onClick: () => setSeleccionados(seleccionados.length === borradores.length ? [] : borradores.map(item => item.id)), style: { border: 0, background: 'transparent', color: 'var(--info-text)', fontSize: 11, fontWeight: 800 } }, seleccionados.length === borradores.length ? 'Quitar selección' : 'Seleccionar todos')),
      React.createElement('div', { style: { fontSize: 11, color: 'var(--ink-soft)', margin: '5px 0 8px' } }, 'Selecciona varias notas y fírmarlas una por una en el mismo recorrido.'),
      borradores.map(item => React.createElement('label', { key: item.id, style: { display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: 12 } }, React.createElement('input', { type: 'checkbox', checked: seleccionados.includes(item.id), onChange: e => setSeleccionados(actualIds => e.target.checked ? [...actualIds, item.id] : actualIds.filter(id => id !== item.id)) }), React.createElement('span', { style: { flex: 1 } }, React.createElement('strong', null, item.clienteNombre), React.createElement('span', { style: { display: 'block', color: 'var(--ink-soft)', fontSize: 10 } }, Number(item.litrosRellenados || 0).toFixed(2), ' L · ', Number(item.garrafonesEquivalentes || 0).toFixed(2), ' garrafones · ', moneda(item.tarifaSnapshot?.precioUnitario * item.garrafonesEquivalentes))), React.createElement('button', { type: 'button', onClick: e => { e.preventDefault(); eliminarBorrador(currentUser.uid, item.id); }, style: { border: 0, background: 'transparent', color: 'var(--danger-text)', fontSize: 10, fontWeight: 800 } }, 'Eliminar'))),
      React.createElement('button', { type: 'button', disabled: !seleccionados.length, onClick: () => setIndice(0), style: { width: '100%', marginTop: 10, padding: 12, border: 0, borderRadius: 8, background: seleccionados.length ? 'var(--accent)' : 'var(--line)', color: 'var(--ink)', fontWeight: 900 } }, seleccionados.length ? `Firmar seleccionados (${seleccionados.length})` : 'Selecciona borradores para firmar'));
  }

  const compartirPdfServicio = async (servicio, comprobante = null) => {
    const url = texto(comprobante?.pdfUrl || servicio?.pdfUrl);
    if (!url || !/^https:\/\//i.test(url)) throw new Error('Este servicio todavía no tiene un PDF disponible');
    const nombreArchivo = `nota-servicio-${texto(servicio?.id || comprobante?.servicioId || 'fluxora')}.pdf`;
    if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && typeof File !== 'undefined') {
      try {
        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error('No se pudo descargar el PDF');
        const blob = await respuesta.blob();
        const archivo = new File([blob], nombreArchivo, { type: 'application/pdf' });
        if (navigator.canShare({ files: [archivo] })) {
          await navigator.share({ files: [archivo], title: 'Nota de servicio', text: 'Nota de servicio FLUXORA' });
          return { modo: 'archivo' };
        }
      } catch (error) {
        if (error?.name === 'AbortError') return { modo: 'cancelado' };
      }
    }
    const waUrl = `https://wa.me/?text=${encodeURIComponent(`Nota de servicio FLUXORA ${servicio?.id || ''}: ${url}`)}`;
    global.open(waUrl, '_blank', 'noopener,noreferrer');
    return { modo: 'enlace' };
  };

  global.appGuardarServicioRelleno = guardarServicio;
  global.appCalcularRelleno = calcularRelleno;
  global.appCompartirPdfServicio = compartirPdfServicio;
  global.appGuardarBorradorRelleno = guardarBorrador;
  global.appLeerBorradoresRelleno = leerBorradores;
  global.ServicioRelleno = ServicioRelleno;
  global.BorradoresRelleno = BorradoresRelleno;
})(window);
