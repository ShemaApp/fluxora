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
  const [storageStatus, setStorageStatus] = useState(() => typeof appObtenerEstadoAlmacenamiento === 'function' ? appObtenerEstadoAlmacenamiento() : { verificado: false, soportado: false, persistente: false });
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [notas, setNotas] = useState([]);
  const [creditos, setCreditos] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [cargasAgua, setCargasAgua] = useState([]);
  const [medicion, setMedicion] = useState(null);
  const [tarifas, setTarifas] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [medidores, setMedidores] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [comprobantes, setComprobantes] = useState([]);
  const [pendCounts, setPendCounts] = useState({
    productos: 0,
    clientes: 0,
    localidades: 0,
    notas: 0,
    creditos: 0,
    jornadas: 0,
    cargasAgua: 0,
    tarifas: 0,
    vehiculos: 0,
    medidores: 0,
    servicios: 0,
    comprobantes: 0
  });
  const totalPendientes = Object.values(pendCounts).reduce((s, n) => s + n, 0);
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
    if (!currentUser) return undefined;
    let activo = true;
    const recibirEstado = event => {
      if (activo && event?.detail) setStorageStatus(event.detail);
    };
    window.addEventListener('fluxora:almacenamiento-estado', recibirEstado);
    const prepararSesionLocal = async () => {
      try {
        if (typeof appSolicitarAlmacenamientoPersistente === 'function') {
          const resultado = await appSolicitarAlmacenamientoPersistente();
          if (activo) setStorageStatus(resultado);
        }
      } catch (error) {
        if (activo) setStorageStatus(previous => ({ ...previous, verificado: true, persistente: false, error: error?.message || 'No se pudo preparar el almacenamiento local' }));
      }
      if (activo && navigator.onLine && typeof appSincronizarVentasOffline === 'function') {
        setTimeout(() => appSincronizarVentasOffline().catch(() => {}), 250);
      }
    };
    prepararSesionLocal();
    return () => {
      activo = false;
      window.removeEventListener('fluxora:almacenamiento-estado', recibirEstado);
    };
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
      setFirestoreError('Error de conexión con la base de datos. Revisa tus permisos.');
    };
    const referenciaErrorHandler = err => {
      console.warn('Referencias de vehículo/medidor no disponibles todavía:', err);
    };
    const pend = (col, snap) => setPendCounts(p => ({
      ...p,
      [col]: snap.docs.filter(d => d.metadata.hasPendingWrites).length
    }));
    const localidadesQuery = currentUser.role === 'repartidor'
      ? db.collection(COLECCIONES.LOCALIDADES).where('repartidorId', '==', currentUser.uid)
      : db.collection(COLECCIONES.LOCALIDADES);
    // La localidad es ahora el alcance operativo. La suscripción de clientes
    // se resuelve en el efecto específico inferior para poder usar los IDs de
    // localidades asignados al repartidor.
    const jornadasQuery = currentUser.role === 'repartidor'
      ? db.collection(COLECCIONES.JORNADAS).where('repartidorId', '==', currentUser.uid)
      : currentUser.role === 'admin'
        ? db.collection(COLECCIONES.JORNADAS).orderBy('fechaInicio', 'desc').limit(200)
        : null;
    const cargasAguaQuery = currentUser.role === 'repartidor'
      ? db.collection(COLECCIONES.CARGAS_AGUA).where('repartidorId', '==', currentUser.uid).limit(300)
      : currentUser.role === 'admin'
        ? db.collection(COLECCIONES.CARGAS_AGUA).orderBy('fechaHora', 'desc').limit(300)
        : null;
    const serviciosQuery = currentUser.role === 'repartidor'
      ? db.collection(COLECCIONES.SERVICIOS).where('repartidorUid', '==', currentUser.uid).limit(300)
      : currentUser.role === 'admin'
        ? db.collection(COLECCIONES.SERVICIOS).orderBy('createdAt', 'desc').limit(500)
        : null;
    const comprobantesQuery = currentUser.role === 'repartidor'
      ? db.collection(COLECCIONES.COMPROBANTES).where('createdByUid', '==', currentUser.uid).limit(300)
      : currentUser.role === 'admin'
        ? db.collection(COLECCIONES.COMPROBANTES).orderBy('createdAt', 'desc').limit(500)
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
    }, errorHandler), localidadesQuery.onSnapshot({
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
    }, errorHandler), ...(jornadasQuery ? [jornadasQuery.onSnapshot({
      includeMetadataChanges: true
    }, snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => new Date(b.fechaInicio || 0) - new Date(a.fechaInicio || 0));
      setJornadas(lista);
      pend('jornadas', snap);
    }, errorHandler)] : [() => setJornadas([])]), ...(cargasAguaQuery ? [cargasAguaQuery.onSnapshot({
      includeMetadataChanges: true
    }, snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => new Date(b.fechaHora || 0) - new Date(a.fechaHora || 0));
      setCargasAgua(lista);
      pend('cargasAgua', snap);
    }, errorHandler)] : [() => setCargasAgua([])]), ...(serviciosQuery ? [serviciosQuery.onSnapshot({ includeMetadataChanges: true }, snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => new Date(b.createdAt || b.creadoEn || 0) - new Date(a.createdAt || a.creadoEn || 0));
      setServicios(lista);
      pend('servicios', snap);
    }, errorHandler)] : [() => setServicios([])]), ...(comprobantesQuery ? [comprobantesQuery.onSnapshot({ includeMetadataChanges: true }, snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setComprobantes(lista);
      pend('comprobantes', snap);
    }, errorHandler)] : [() => setComprobantes([])])];
    return () => unsubs.forEach(u => u());
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return undefined;
    const uid = currentUser.uid;
    const role = currentUser.role;
    if (role !== 'repartidor') {
      if (role !== 'admin') {
        setClientes([]);
        return undefined;
      }
      return db.collection(COLECCIONES.CLIENTES).onSnapshot({ includeMetadataChanges: true }, snap => {
        setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        const pendientesClientes = snap.docs.filter(d => d.metadata.hasPendingWrites).length;
        setPendCounts(p => ({ ...p, clientes: pendientesClientes }));
      }, err => {
        console.error('Firestore error clientes:', err);
        setFirestoreError('Error de conexión con clientes. Revisa tus permisos.');
      });
    }

    const localidadIds = localidades
      .filter(localidad => localidad.activo !== false && (localidad.repartidorId === uid || (Array.isArray(localidad.repartidorIds) && localidad.repartidorIds.includes(uid))))
      .map(localidad => localidad.id)
      .filter(Boolean);
    if (!localidadIds.length) {
      setClientes([]);
      setPendCounts(p => ({ ...p, clientes: 0 }));
      return undefined;
    }

    const grupos = [];
    for (let i = 0; i < localidadIds.length; i += 10) grupos.push(localidadIds.slice(i, i + 10));
    const acumulados = new Map();
    const actualizarClientes = () => {
      setClientes(Array.from(acumulados.values()));
      setPendCounts(p => ({ ...p, clientes: Array.from(acumulados.values()).filter(item => item.__pending).length }));
    };
    const unsubs = grupos.map(grupo => db.collection(COLECCIONES.CLIENTES).where('localidadId', 'in', grupo).onSnapshot({ includeMetadataChanges: true }, snap => {
      snap.docs.forEach(d => acumulados.set(d.id, { id: d.id, ...d.data(), __pending: d.metadata.hasPendingWrites }));
      actualizarClientes();
    }, err => {
      console.error('Firestore error clientes por localidad:', err);
      setFirestoreError('No se pudieron cargar los clientes de tus localidades. Revisa tus permisos.');
    }));
    return () => unsubs.forEach(unsub => unsub());
  }, [currentUser?.uid, currentUser?.role, localidades.map(localidad => `${localidad.id}:${localidad.repartidorId || ''}:${Array.isArray(localidad.repartidorIds) ? localidad.repartidorIds.join(',') : ''}:${localidad.activo === false ? '0' : '1'}`).join('|')]);

  return {
    currentUser, authChecked, firestoreError,
    locked, setLocked,
    isOnline, storageStatus,
    productos, clientes, localidades, notas, creditos, jornadas, cargasAgua, medicion, tarifas, vehiculos, medidores, servicios, comprobantes,
    pendCounts, totalPendientes,
  };
}
