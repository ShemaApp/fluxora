/* hooks/useSesion.js — auth, perfil, sembrado inicial, suscripciones a
   Firestore. app.js llama a useSesion() para saber quién es el usuario y
   qué datos hay, y solo se encarga de pintar pestañas.
   Carga DESPUÉS de db/semillas.js y de sesion.js (usa pinKey, ya global)
   y ANTES de app.js (que consume useSesion()). */
function useSesion() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [firestoreError, setFirestoreError] = useState(null);
  const [locked, setLocked] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [notas, setNotas] = useState([]);
  const [creditos, setCreditos] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [medicion, setMedicion] = useState(null);
  const [tarifas, setTarifas] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [medidores, setMedidores] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [pendCounts, setPendCounts] = useState({
    productos: 0,
    clientes: 0,
    localidades: 0,
    notas: 0,
    creditos: 0,
    rutas: 0,
    jornadas: 0,
    pedidos: 0,
    tarifas: 0,
    vehiculos: 0,
    medidores: 0
  });
  const totalPendientes = Object.values(pendCounts).reduce((s, n) => s + n, 0);
  const notificacionesTransferencias = (() => {
    if (!currentUser) return [];
    const avisos = [];
    const fechaAviso = valor => valor || new Date().toISOString();
    if (currentUser.role === 'admin') {
      (rutas || []).filter(r => r.estado === 'pendiente_recepcion').forEach(r => avisos.push({
        id: 'recepcion-' + r.id,
        tipo: 'recepcion',
        titulo: 'Transferencia pendiente de recepción',
        detalle: `${r.repartidorNombre || 'Repartidor'} tiene mercancía pendiente de conciliar`,
        fecha: fechaAviso(r.fechaRegresoReal || r.fecha),
        rutaId: r.id
      }));
      (pedidos || []).filter(p => p.estado === 'asignado_pendiente_transferencia').forEach(p => avisos.push({
        id: 'carga-pedido-' + p.id,
        tipo: 'carga',
        titulo: 'Pedido esperando confirmación de transferencia',
        detalle: `${p.clienteNombre || 'Cliente'} · ${p.repartidorNombre || 'sin repartidor'}`,
        fecha: fechaAviso(p.fechaActualizacion || p.fechaCreacion),
        rutaId: null
      }));
    }
    if (currentUser.role === 'repartidor') {
      (pedidos || []).filter(p => p.estado === 'transferencia_confirmada' && p.repartidorId === currentUser.uid).forEach(p => avisos.push({
        id: 'entrega-pedido-' + p.id,
        tipo: 'entrega',
        titulo: 'Pedido pendiente de entrega',
        detalle: `${p.clienteNombre || 'Cliente'} · transferencia confirmada`,
        fecha: fechaAviso(p.fechaConfirmacionTransferencia || p.fechaActualizacion),
        rutaId: p.transferenciaId || null
      }));
    }
    return avisos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  })();

  useEffect(() => {
    const on = () => setIsOnline(true),
      off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    setLocked(currentUser ? !!localStorage.getItem(pinKey(currentUser.uid)) : false);
  }, [currentUser?.uid]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async fbUser => {
      if (!fbUser) {
        setCurrentUser(null);
        setAuthChecked(true);
        return;
      }

      const cacheKey = `perfil_sesion_v1_${fbUser.uid}`;
      let perfilCache = null;
      try {
        perfilCache = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }

      // La pantalla no queda detenida por la lectura remota cuando ya existe
      // una sesión conocida. Firestore sigue refrescando el perfil en segundo
      // plano y prevalece sobre la copia local en cuanto responde.
      if (perfilCache && perfilCache.email === fbUser.email && perfilCache.role) {
        setCurrentUser({ uid: fbUser.uid, ...perfilCache });
        setAuthChecked(true);
      }

      try {
        const ref = db.collection(COLECCIONES.USUARIOS).doc(fbUser.uid);
        const snap = await ref.get();
        let perfil;
        if (snap.exists) {
          perfil = snap.data();
        } else {
          // Primer inicio de sesión sin perfil: se crea como admin (útil
          // para la primera cuenta del sistema).
          perfil = {
            nombre: fbUser.email.split('@')[0],
            email: fbUser.email,
            role: 'admin'
          };
          await ref.set(perfil);
        }
        localStorage.setItem(cacheKey, JSON.stringify(perfil));
        setCurrentUser({ uid: fbUser.uid, ...perfil });
      } catch (e) {
        if (!perfilCache) {
          setCurrentUser({
            uid: fbUser.uid,
            nombre: fbUser.email,
            email: fbUser.email,
            role: null,
            accesoBloqueado: true
          });
        }
      } finally {
        setAuthChecked(true);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    sembrarDatosInicialesSiVacio(db).catch(e => console.error('Error al sembrar datos iniciales', e));

    const errorHandler = err => {
      console.error('Firestore error:', err);
      setFirestoreError('⚠️ Error de conexión con la base de datos. Revisa tus permisos.');
    };
    const referenciaErrorHandler = err => {
      console.warn('Referencias de vehículo/medidor no disponibles todavía:', err);
    };
    const pend = (col, snap) => setPendCounts(p => ({
      ...p,
      [col]: snap.docs.filter(d => d.metadata.hasPendingWrites).length
    }));
    const rutasQuery = currentUser.role === 'repartidor'
      ? db.collection(COLECCIONES.RUTAS).where('repartidorId', '==', currentUser.uid)
      : currentUser.role === 'admin'
        ? db.collection(COLECCIONES.RUTAS).orderBy('fecha', 'desc').limit(100)
        : null;
    const pedidosQuery = currentUser.role === 'repartidor'
      ? db.collection(COLECCIONES.PEDIDOS).where('repartidorId', '==', currentUser.uid)
      : db.collection(COLECCIONES.PEDIDOS).orderBy('fechaCreacion', 'desc').limit(500);
    // La localidad es ahora el alcance operativo. Se carga el catálogo y los
    // clientes para filtrar por las localidades asignadas al repartidor en UI;
    // las reglas específicas de localidad se habilitarán en su iteración propia.
    const clientesQuery = db.collection(COLECCIONES.CLIENTES);
    const jornadasQuery = currentUser.role === 'repartidor'
      ? db.collection(COLECCIONES.JORNADAS).where('repartidorId', '==', currentUser.uid)
      : currentUser.role === 'admin'
        ? db.collection(COLECCIONES.JORNADAS).orderBy('fechaInicio', 'desc').limit(200)
        : null;
    const unsubs = [db.collection('_meta').doc('medicion_venta').onSnapshot(snap => {
      setMedicion(snap.exists ? { id: snap.id, ...snap.data() } : null);
    }, errorHandler), db.collection(COLECCIONES.TARIFAS).onSnapshot({
      includeMetadataChanges: true
    }, snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => String(a.nombre || a.codigo || '').localeCompare(String(b.nombre || b.codigo || ''), 'es'));
      setTarifas(lista);
      pend('tarifas', snap);
    }, errorHandler), db.collection(COLECCIONES.VEHICULOS).onSnapshot({
      includeMetadataChanges: true
    }, snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => String(a.nombre || a.codigo || '').localeCompare(String(b.nombre || b.codigo || ''), 'es'));
      setVehiculos(lista);
      pend('vehiculos', snap);
    }, referenciaErrorHandler), db.collection(COLECCIONES.MEDIDORES).onSnapshot({
      includeMetadataChanges: true
    }, snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => String(a.nombre || a.codigo || '').localeCompare(String(b.nombre || b.codigo || ''), 'es'));
      setMedidores(lista);
      pend('medidores', snap);
    }, referenciaErrorHandler), db.collection(COLECCIONES.PRODUCTOS).onSnapshot({
      includeMetadataChanges: true
    }, snap => {
      setProductos(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      pend('productos', snap);
    }, errorHandler), clientesQuery.onSnapshot({
      includeMetadataChanges: true
    }, snap => {
      setClientes(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      pend('clientes', snap);
    }, errorHandler), db.collection(COLECCIONES.LOCALIDADES).onSnapshot({
      includeMetadataChanges: true
    }, snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
      setLocalidades(lista);
      pend('localidades', snap);
    }, errorHandler), db.collection(COLECCIONES.NOTAS).orderBy('fecha', 'desc').limit(500).onSnapshot({
      includeMetadataChanges: true
    }, snap => {
      setNotas(snap.docs.map(d => {
        const datos = d.data();
        const { ubicacionVenta, ...notaSinUbicacion } = datos;
        return { id: d.id, ...notaSinUbicacion };
      }));
      pend('notas', snap);
    }, errorHandler), db.collection(COLECCIONES.CREDITOS).onSnapshot({
      includeMetadataChanges: true
    }, snap => {
      setCreditos(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      pend('creditos', snap);
    }, errorHandler), pedidosQuery.onSnapshot({
      includeMetadataChanges: true
    }, snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0));
      setPedidos(lista);
      pend('pedidos', snap);
    }, errorHandler), ...(jornadasQuery ? [jornadasQuery.onSnapshot({
      includeMetadataChanges: true
    }, snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => new Date(b.fechaInicio || 0) - new Date(a.fechaInicio || 0));
      setJornadas(lista);
      pend('jornadas', snap);
    }, errorHandler)] : [() => setJornadas([])]), ...(rutasQuery ? [rutasQuery.onSnapshot({
      includeMetadataChanges: true
    }, snap => {
      const transferencias = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      transferencias.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
      setRutas(transferencias.slice(0, 100));
      pend('rutas', snap);
    }, errorHandler)] : [() => setRutas([])])];
    return () => unsubs.forEach(u => u());
  }, [currentUser]);

  return {
    currentUser, authChecked, firestoreError,
    locked, setLocked,
    isOnline,
    productos, clientes, localidades, notas, creditos, rutas, jornadas, medicion, tarifas, vehiculos, medidores, pedidos,
    pendCounts, totalPendientes, notificacionesTransferencias,
  };
}
