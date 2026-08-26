const esVentaEfectivo = fp => fp === 'efectivo' || fp === 'contado';
const mismoDia = (isoA, isoB) => new Date(isoA).toDateString() === new Date(isoB).toDateString();
const diaLocalCaja = fecha => {
    const valor = fecha instanceof Date ? fecha : new Date(fecha);
    const pad = numero => String(numero).padStart(2, '0');
    return `${valor.getFullYear()}-${pad(valor.getMonth() + 1)}-${pad(valor.getDate())}`;
};
const etiquetaCierre = cierre => cierre.turnoNumero ? 'Cierre ' + cierre.turnoNumero : 'Cierre histórico';
function Gerencia({ currentUser, notas, creditos }) {
    const isAdmin = currentUser.role === 'admin';
    const [gastos, setGastos] = useState(null);
    const [cierres, setCierres] = useState(null);
    const [form, setForm] = useState({ pagadoA: '', monto: '', motivo: '', formaPago: 'efectivo' });
    const [saving, setSaving] = useState(false);
    const [rango, setRango] = useState('semana');
    const [expandedId, setExpandedId] = useState(null);
    const [cierreOpen, setCierreOpen] = useState(false);
    const [cierreSaving, setCierreSaving] = useState(false);
    const pressTimer = useRef(null);
    const longPressed = useRef(false);
    const startPress = id => {
        longPressed.current = false;
        clearTimeout(pressTimer.current);
        pressTimer.current = setTimeout(() => {
            longPressed.current = true;
            if (navigator.vibrate)
                navigator.vibrate(12);
            setExpandedId(eid => eid === id ? null : id);
        }, 500);
    };
    const cancelPress = () => clearTimeout(pressTimer.current);
    const onGastoTap = id => {
        if (longPressed.current) {
            longPressed.current = false;
            return;
        }
        if (expandedId === id)
            setExpandedId(null);
    };
    const [msg, setMsg] = useState('');
    const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 2500); };
    useEffect(() => {
        const query = isAdmin
            ? db.collection('gastos').orderBy('fecha', 'desc').limit(500)
            : db.collection('gastos').where('capturadoPorUid', '==', currentUser.uid).orderBy('fecha', 'desc').limit(300);
        const unsub = query.onSnapshot(snap => setGastos(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setGastos([]));
        return unsub;
    }, [isAdmin, currentUser.uid]);
    useEffect(() => {
        const query = isAdmin
            ? db.collection('cierres_caja').orderBy('fecha', 'desc').limit(200)
            : db.collection('cierres_caja').where('capturadoPorUid', '==', currentUser.uid).orderBy('fecha', 'desc').limit(100);
        const unsub = query.onSnapshot(snap => setCierres(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setCierres([]));
        return unsub;
    }, [isAdmin, currentUser.uid]);
    const guardar = async () => {
        if (!form.pagadoA || !form.monto || +form.monto <= 0) {
            alert('Completa "Pagado a" y un monto válido');
            return;
        }
        setSaving(true);
        try {
            await db.collection('gastos').add({
                fecha: new Date().toISOString(),
                pagadoA: form.pagadoA,
                monto: +form.monto,
                motivo: form.motivo || '',
                formaPago: form.formaPago,
                capturadoPorUid: currentUser.uid,
                capturadoPorNombre: currentUser.nombre,
            });
            setForm({ pagadoA: '', monto: '', motivo: '', formaPago: 'efectivo' });
            flash('Gasto registrado');
        }
        catch (e) {
            alert('Error al guardar el gasto: ' + e.message);
        }
        setSaving(false);
    };
    const eliminar = async (g) => {
        if (!confirm(`¿Eliminar el gasto de ${fmt(g.monto)} a "${g.pagadoA}"?`))
            return;
        await db.collection('gastos').doc(g.id).delete();
    };
    const ahora = new Date();
    const hoyISO = ahora.toISOString();
    const claveDiaCaja = diaLocalCaja(hoyISO);
    const cierresHoy = (cierres || []).filter(c => mismoDia(c.fecha, hoyISO));
    const ultimoCierreHoy = cierresHoy.slice().sort((a, b) => Date.parse(b.fecha || '') - Date.parse(a.fecha || ''))[0] || null;
    const inicioDiaLocal = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString();
    const inicioBloqueCaja = ultimoCierreHoy?.fecha || inicioDiaLocal;
    const enBloqueActual = valor => Number.isFinite(Date.parse(valor || '')) && Date.parse(valor) >= Date.parse(inicioBloqueCaja);
    const misGastos = gastos ? gastos.filter(g => g.capturadoPorUid === currentUser.uid) : [];
    const notasCajaHoy = (notas || []).filter(n => enBloqueActual(n.fecha) && (isAdmin || n.capturadoPorUid === currentUser.uid));
    const misNotasHoy = notasCajaHoy;
    const ventaEfectivoHoy = notasCajaHoy.filter(n => esVentaEfectivo(n.formaPago)).reduce((s, n) => s + Number(n.total || 0), 0);
    // Abonos: viven como arreglo embebido dentro de cada documento de creditos,
    // así que se aplanan primero y luego se filtran por el bloque actual.
    const misAbonosHoy = (creditos || [])
        .flatMap(c => (c.abonos || []).map(a => ({ ...a, clienteNombre: c.clienteNombre })))
        .filter(a => enBloqueActual(a.fecha) && (isAdmin || a.capturadoPorUid === currentUser.uid));
    const abonoEfectivoHoy = misAbonosHoy.filter(a => a.formaPago === 'efectivo').reduce((s, a) => s + a.monto, 0);
    const misGastosHoy = (isAdmin ? (gastos || []) : misGastos).filter(g => enBloqueActual(g.fecha));
    const gastoEfectivoHoy = misGastosHoy.filter(g => g.formaPago === 'efectivo').reduce((s, g) => s + g.monto, 0);
    const gastosTarjetaHoy = misGastosHoy.filter(g => g.formaPago === 'tarjeta');
    // Caja real: ventas efectivo + pagos de crédito - salidas autorizadas en efectivo.
    // Los créditos no forman parte del efectivo recibido; solo se suman
    // ventas y abonos con forma de pago efectivo.
    const formulaBaseHoy = ventaEfectivoHoy + abonoEfectivoHoy;
    // Se descuentan las salidas autorizadas registradas en efectivo.
    const efectivoEsperadoHoy = formulaBaseHoy - gastoEfectivoHoy;
    const incidenciasOperacionHoy = misNotasHoy.filter(n => n.requiereRevision === true || n.estado === 'incidencia_agua' || n.estado === 'incidencia_inventario').flatMap(n => {
        const detalle = n.incidenciaAgua || n.incidenciaInventario || {};
        const items = detalle.itemsFaltantes || [];
        return [{
            notaId: n.id,
            ventaOfflineId: n.ventaOfflineId || '',
            fecha: n.fecha,
            clienteNombre: n.clienteNombre || '',
            localidadId: n.localidadId || '',
            litrosVendidos: Number(n.litrosVendidos || 0),
            mensaje: detalle.mensaje || detalle.tipo || '',
            items: items.length ? items : (n.items || []).map(item => ({ ...item, cantSolicitada: item.cant, cantAplicada: 0, cantFaltante: item.cant }))
        }];
    });
    const borradorCierre = typeof appReadDraft === 'function' ? appReadDraft('cierre_caja', currentUser.uid) : null;
    const abrirCierre = () => setCierreOpen(true);
    const guardarBorradorCierre = () => {
        if (typeof appWriteDraft !== 'function') return flash('El guardado local de borradores no está disponible');
        appWriteDraft('cierre_caja', currentUser.uid, {
            fecha: new Date().toISOString(),
            diaLocal: claveDiaCaja,
            ventaEfectivo: ventaEfectivoHoy,
            abonoEfectivo: abonoEfectivoHoy,
            gastoEfectivo: gastoEfectivoHoy,
            formulaBase: formulaBaseHoy,
            efectivoAEntregar: efectivoEsperadoHoy,
            numVentas: misNotasHoy.length,
            numClientesAtendidos: new Set(misNotasHoy.map(n => n.clienteId)).size,
            numIncidenciasOperacion: incidenciasOperacionHoy.length,
            estado: 'borrador_local'
        });
        setCierreOpen(false);
        flash('Borrador de cierre guardado en este dispositivo');
    };
    const confirmarCierre = async () => {
        setCierreSaving(true);
        try {
            const sufijoCierre = typeof uid === 'function' ? uid() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
            const idCierreCaja = `caja-${claveDiaCaja}-${sufijoCierre}`;
            const datosCierre = {
                fecha: new Date().toISOString(),
                diaLocal: claveDiaCaja,
                cierreClave: idCierreCaja,
                turnoNumero: cierresHoy.length + 1,
                estado: 'cerrado',
                capturadoPorUid: currentUser.uid,
                capturadoPorNombre: currentUser.nombre,
                ventaEfectivo: ventaEfectivoHoy,
                abonoEfectivo: abonoEfectivoHoy,
                gastoEfectivo: gastoEfectivoHoy,
                formulaBase: formulaBaseHoy,
                efectivoAEntregar: efectivoEsperadoHoy,
                numVentas: misNotasHoy.length,
                numClientesAtendidos: new Set(misNotasHoy.map(n => n.clienteId)).size,
                numIncidenciasOperacion: incidenciasOperacionHoy.length,
                incidenciasOperacion: incidenciasOperacionHoy,
                gastosTarjetaPendientes: gastosTarjetaHoy.map(g => ({ pagadoA: g.pagadoA, monto: g.monto })),
            };
            await db.collection('cierres_caja').doc(idCierreCaja).set(datosCierre);
            if (typeof appClearDraft === 'function') appClearDraft('cierre_caja', currentUser.uid);
            flash(`Cierre ${datosCierre.turnoNumero} guardado en el historial`);
            setCierreOpen(false);
        }
        catch (e) {
            alert('Error al generar el cierre: ' + e.message);
        }
        setCierreSaving(false);
    };
    const now = new Date();
    const rangeStart = rango === 'semana' ? new Date(now - 7 * 86400000) : rango === 'mes' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(0);
    const filas = {};
    if (isAdmin) {
        (notas || []).filter(n => esVentaEfectivo(n.formaPago) && new Date(n.fecha) >= rangeStart).forEach(n => {
            const key = (n.capturadoPorUid || 'sin_id') + '_' + new Date(n.fecha).toDateString();
            filas[key] = filas[key] || { nombre: n.capturadoPorNombre || 'Sin identificar', fecha: n.fecha, venta: 0, abono: 0, gasto: 0, tarjeta: [] };
            filas[key].venta += n.total;
        });
        (creditos || []).forEach(c => (c.abonos || []).forEach(a => {
            if (!a.capturadoPorUid || a.formaPago !== 'efectivo' || new Date(a.fecha) < rangeStart)
                return;
            const key = a.capturadoPorUid + '_' + new Date(a.fecha).toDateString();
            filas[key] = filas[key] || { nombre: a.capturadoPorNombre || 'Sin identificar', fecha: a.fecha, venta: 0, abono: 0, gasto: 0, tarjeta: [] };
            filas[key].abono += a.monto;
        }));
        (gastos || []).filter(g => new Date(g.fecha) >= rangeStart).forEach(g => {
            const key = g.capturadoPorUid + '_' + new Date(g.fecha).toDateString();
            filas[key] = filas[key] || { nombre: g.capturadoPorNombre, fecha: g.fecha, venta: 0, abono: 0, gasto: 0, tarjeta: [] };
            if (g.formaPago === 'efectivo')
                filas[key].gasto += g.monto;
            else
                filas[key].tarjeta.push(g);
        });
    }
    const filasList = Object.values(filas).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return React.createElement("div", { className: 'fx-page-cash', style: { padding: '16px 12px' } },
        React.createElement("div", { className: 'fx-cash-heading', style: { fontSize: 20, fontWeight: 800, marginBottom: 12 } }, "Caja"),
        msg && React.createElement("div", { className: 'fx-cash-message', style: { background: 'var(--ok-bg)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--ok-text)', marginBottom: 12 } }, msg),
        React.createElement(Card, { className: 'fx-cash-summary', style: { borderLeft: '3px solid var(--accent-text)' } },
            React.createElement("div", { className: 'fx-cash-section-title', style: { fontSize: 11, color: 'var(--ink-faint)', fontWeight: 700, marginBottom: 8 } }, "CAJA DE HOY"),
            React.createElement(Row, { style: { justifyContent: 'space-between', marginBottom: 4 } },
                React.createElement("span", { style: { fontSize: 13 } }, "Venta en efectivo"),
                React.createElement("span", { style: { fontWeight: 700, color: 'var(--ok-text)' } }, fmt(ventaEfectivoHoy))),
            React.createElement(Row, { style: { justifyContent: 'space-between', marginBottom: 4 } },
                React.createElement("span", { style: { fontSize: 13 } }, "Abonos en efectivo"),
                React.createElement("span", { style: { fontWeight: 700, color: 'var(--ok-text)' } }, fmt(abonoEfectivoHoy))),
            React.createElement(Row, { style: { justifyContent: 'space-between', marginBottom: 8, paddingTop: 6, borderTop: '1px dashed var(--line)' } },
                React.createElement("span", { style: { fontSize: 12, color: 'var(--ink-faint)' } }, "= F\u00F3rmula base (modelo.md)"),
                React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' } }, fmt(formulaBaseHoy))),
            React.createElement(Row, { style: { justifyContent: 'space-between', marginBottom: 8 } },
                React.createElement("span", { style: { fontSize: 13 } }, "Gasto en efectivo"),
                React.createElement("span", { style: { fontWeight: 700, color: 'var(--danger-text)' } },
                    "-",
                    fmt(gastoEfectivoHoy))),
            React.createElement("div", { style: { borderTop: '1px solid var(--line)', paddingTop: 8 } },
                React.createElement(Row, { style: { justifyContent: 'space-between' } },
                    React.createElement("span", { style: { fontWeight: 700 } }, "Efectivo a entregar"),
                    React.createElement("span", { style: { fontSize: 20, fontWeight: 800, color: 'var(--accent-text)' } }, fmt(efectivoEsperadoHoy)))),
            gastosTarjetaHoy.length > 0 && React.createElement("div", { style: { marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line)' } },
                React.createElement("div", { style: { fontSize: 11, color: 'var(--ink-faint)', fontWeight: 700, marginBottom: 4 } }, "PAGOS CON TARJETA HOY"),
                gastosTarjetaHoy.map(g => React.createElement(Row, { key: g.id, style: { justifyContent: 'space-between', fontSize: 12, marginBottom: 3 } },
                    React.createElement("span", null, g.pagadoA),
                    React.createElement("span", { style: { fontWeight: 700 } }, fmt(g.monto))))),
            React.createElement(BFill, { className: 'fx-cash-close-action', onClick: abrirCierre, style: { width: '100%', marginTop: 12 }, disabled: cierreSaving || cierres === null }, cierres === null ? 'Cargando cierre…' : "Cerrar caja"),
            cierresHoy.length > 0 && React.createElement("div", { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 6, textAlign: 'center' } },
                "Hoy hay ", cierresHoy.length, cierresHoy.length === 1 ? " cierre guardado." : " cierres guardados.", " Este será el cierre ", cierresHoy.length + 1, "."),
            borradorCierre && React.createElement("div", { style: { fontSize: 11, color: 'var(--info-text)', marginTop: 5, textAlign: 'center' } },
                "Hay un borrador local de cierre guardado en este dispositivo."),
        React.createElement(Card, { className: 'fx-cash-expense-form' },
            React.createElement("div", { className: 'fx-cash-section-title', style: { fontSize: 11, color: 'var(--ink-faint)', fontWeight: 700, marginBottom: 10 } }, "REGISTRAR GASTO"),
            React.createElement(Lbl, null, "Pagado a"),
            React.createElement(Inp, { value: form.pagadoA, onChange: e => setForm(f => ({ ...f, pagadoA: e.target.value })), placeholder: "Ej. Pemex, Materia prima\u2026", style: { marginBottom: 10 } }),
            React.createElement(Lbl, null, "Monto"),
            React.createElement(Inp, { type: "number", value: form.monto, onChange: e => setForm(f => ({ ...f, monto: e.target.value })), placeholder: "0.00", style: { marginBottom: 10 } }),
            React.createElement(Lbl, null, "Motivo"),
            React.createElement(Inp, { value: form.motivo, onChange: e => setForm(f => ({ ...f, motivo: e.target.value })), placeholder: "Ej. gasolina para la ruta de hoy\u2026", style: { marginBottom: 10 } }),
            React.createElement(Lbl, null, "\u00BFC\u00F3mo se pag\u00F3?"),
            React.createElement(Row, { style: { gap: 8, marginBottom: 14 } }, [['efectivo', 'Efectivo', 'var(--ok-bg)', 'var(--ok-text)'], ['tarjeta', 'Tarjeta', 'var(--info-bg)', 'var(--info-text)']].map(([v, l, bg, col]) => (React.createElement("button", { key: v, onClick: () => setForm(f => ({ ...f, formaPago: v })), style: { flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: form.formaPago === v ? bg : 'var(--surface-2)', color: form.formaPago === v ? col : 'var(--ink-soft)', fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, l)))),
            React.createElement(BFill, { onClick: guardar, style: { width: '100%' }, disabled: saving }, saving ? 'Guardando…' : 'Guardar gasto')),
        isAdmin && React.createElement(Card, { className: 'fx-cash-person-report' },
            React.createElement(Row, { style: { justifyContent: 'space-between', marginBottom: 10 } },
                React.createElement("span", { style: { fontSize: 11, color: 'var(--ink-faint)', fontWeight: 700 } }, "REPORTE DE CAJA POR PERSONA")),
            React.createElement(Row, { style: { gap: 6, marginBottom: 12 } }, [['semana', 'Semana'], ['mes', 'Mes'], ['todo', 'Todo']].map(([v, l]) => (React.createElement("button", { key: v, onClick: () => setRango(v), style: { flex: 1, padding: '7px', borderRadius: 8, border: 'none', background: rango === v ? 'var(--accent)' : 'var(--surface-2)', color: rango === v ? 'var(--ink)' : 'var(--ink-soft)', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, l)))),
            filasList.length === 0 && React.createElement("div", { style: { fontSize: 13, color: 'var(--ink-faint)', textAlign: 'center', padding: '16px 0' } }, "Sin movimientos en este rango"),
            filasList.map((f, i) => React.createElement("div", { key: i, style: { paddingBottom: 10, borderBottom: '1px solid var(--line)', marginBottom: 10 } },
                React.createElement(Row, { style: { justifyContent: 'space-between', marginBottom: 4 } },
                    React.createElement("span", { style: { fontWeight: 700, fontSize: 13 } }, f.nombre),
                    React.createElement("span", { style: { fontSize: 11, color: 'var(--ink-faint)' } }, fDate(f.fecha))),
                React.createElement(Row, { style: { justifyContent: 'space-between', fontSize: 12, marginBottom: 2 } },
                    React.createElement("span", { style: { color: 'var(--ink-soft)' } }, "Venta efectivo"),
                    React.createElement("span", { style: { color: 'var(--ok-text)' } }, fmt(f.venta))),
                React.createElement(Row, { style: { justifyContent: 'space-between', fontSize: 12, marginBottom: 2 } },
                    React.createElement("span", { style: { color: 'var(--ink-soft)' } }, "Abonos efectivo"),
                    React.createElement("span", { style: { color: 'var(--ok-text)' } }, fmt(f.abono))),
                React.createElement(Row, { style: { justifyContent: 'space-between', fontSize: 12, marginBottom: 4 } },
                    React.createElement("span", { style: { color: 'var(--ink-soft)' } }, "Gasto efectivo"),
                    React.createElement("span", { style: { color: 'var(--danger-text)' } },
                        "-",
                        fmt(f.gasto))),
                React.createElement(Row, { style: { justifyContent: 'space-between' } },
                    React.createElement("span", { style: { fontWeight: 700, fontSize: 13 } }, "Esperado"),
                    React.createElement("span", { style: { fontWeight: 800, color: 'var(--accent-text)' } }, fmt(f.venta + f.abono - f.gasto))),
                f.tarjeta.length > 0 && React.createElement("div", { style: { marginTop: 6 } }, f.tarjeta.map(g => React.createElement(Row, { key: g.id, style: { justifyContent: 'space-between', fontSize: 11, color: 'var(--info-text)' } },
                    React.createElement("span", null,
                        "",
                        g.pagadoA,
                        " · Pendiente de reembolso"),
                    React.createElement("span", null, fmt(g.monto)))))))),
        React.createElement(Card, { className: 'fx-cash-history' },
            React.createElement("div", { className: 'fx-cash-section-title', style: { fontSize: 11, color: 'var(--ink-faint)', fontWeight: 700, marginBottom: 10 } }, isAdmin ? 'HISTORIAL DE CIERRES' : 'TUS CIERRES'),
            cierres === null && React.createElement("div", { style: { fontSize: 13, color: 'var(--ink-faint)', textAlign: 'center', padding: '16px 0' } }, "Cargando\u2026"),
            cierres && cierres.length === 0 && React.createElement("div", { style: { fontSize: 13, color: 'var(--ink-faint)', textAlign: 'center', padding: '16px 0' } }, "Sin cierres registrados a\u00FAn"),
            cierres && cierres.map(c => React.createElement("div", { key: c.id, style: { paddingBottom: 8, borderBottom: '1px solid var(--line)', marginBottom: 8 } },
                React.createElement(Row, { style: { justifyContent: 'space-between', marginBottom: 2 } },
                    React.createElement("span", { style: { fontWeight: 700, fontSize: 13 } }, etiquetaCierre(c)),
                    React.createElement("span", { style: { fontWeight: 800, color: 'var(--accent-text)' } }, fmt(c.efectivoAEntregar))),
                React.createElement("div", { style: { fontSize: 11, color: 'var(--ink-faint)' } },
                    isAdmin ? (c.capturadoPorNombre || 'Sin responsable') + ' · ' + fDate(c.fecha) : fDate(c.fecha),
                    " ",
                    c.numVentas ?? c.numPedidos ?? 0,
                    " ventas · ",
                    c.numClientesAtendidos,
                    " clientes",
                    c.numIncidenciasOperacion ? ' · ' + c.numIncidenciasOperacion + ' incidencias' : '')))),
        React.createElement(Card, { className: 'fx-cash-expenses' },
            React.createElement("div", { className: 'fx-cash-section-title', style: { fontSize: 11, color: 'var(--ink-faint)', fontWeight: 700, marginBottom: 10 } }, isAdmin ? 'TODOS LOS GASTOS' : 'TUS GASTOS'),
            gastos === null && React.createElement("div", { style: { fontSize: 13, color: 'var(--ink-faint)', textAlign: 'center', padding: '16px 0' } }, "Cargando\u2026"),
            gastos && (isAdmin ? gastos : misGastos).length === 0 && React.createElement("div", { style: { fontSize: 13, color: 'var(--ink-faint)', textAlign: 'center', padding: '16px 0' } }, "Sin gastos registrados a\u00FAn"),
            isAdmin && gastos && (isAdmin ? gastos : misGastos).length > 0 && React.createElement("div", { style: { fontSize: 11, color: 'var(--ink-faint)', marginBottom: 10 } }, "Mant\u00E9n presionado un gasto para eliminarlo."),
            gastos && (isAdmin ? gastos : misGastos).map(g => {
                const expanded = expandedId === g.id;
                const fila = React.createElement(React.Fragment, null,
                    React.createElement(Row, { style: { justifyContent: 'space-between', marginBottom: 3 } },
                        React.createElement("span", { style: { fontWeight: 700, fontSize: 13 } }, g.pagadoA),
                        React.createElement(Row, { style: { gap: 6 } },
                            React.createElement(Tag, { color: g.formaPago === 'tarjeta' ? 'var(--info-text)' : 'var(--ok-text)' }, g.formaPago === 'tarjeta' ? 'Tarjeta' : 'Efectivo'),
                            React.createElement("span", { style: { fontWeight: 700, color: 'var(--danger-text)' } }, fmt(g.monto)))),
                    g.motivo && React.createElement("div", { style: { fontSize: 12, color: 'var(--ink-soft)' } }, g.motivo),
                    React.createElement("div", { style: { fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 } },
                        g.capturadoPorNombre,
                        " \u00B7 ",
                        fDate(g.fecha)));
                if (!isAdmin) {
                    return React.createElement("div", { key: g.id, style: { paddingBottom: 8, borderBottom: '1px solid var(--line)', marginBottom: 8 } }, fila);
                }
                return React.createElement("div", { key: g.id, style: { borderBottom: '1px solid var(--line)', marginBottom: 8 } },
                    React.createElement("div", { onMouseDown: () => startPress(g.id), onMouseUp: cancelPress, onMouseLeave: cancelPress, onTouchStart: () => startPress(g.id), onTouchEnd: cancelPress, onTouchMove: cancelPress, onClick: () => onGastoTap(g.id), style: { paddingBottom: 8, cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' } }, fila),
                    React.createElement("div", { style: { maxHeight: expanded ? 50 : 0, overflow: 'hidden', transition: 'max-height .2s ease' } },
                        React.createElement(Row, { style: { paddingBottom: 8 } },
                            React.createElement(BOut, { onClick: () => { eliminar(g); setExpandedId(null); }, color: "var(--danger-text)", style: { flex: 1 } }, "Eliminar"))));
            })),
        cierreOpen && React.createElement(Modal, { title: "¿Confirmas que quieres cerrar caja?", onClose: () => setCierreOpen(false) },
            React.createElement("div", { style: { fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14, lineHeight: 1.5 } }, "Se guardará este bloque de trabajo como un cierre independiente. Puedes volver a trabajar y cerrar caja nuevamente más tarde; cada cierre quedará en el historial. Elige una opción para continuar."),
            React.createElement(Card, { className: 'fx-cash-close-review', style: { background: 'var(--surface-2)' } },
                React.createElement(Row, { style: { justifyContent: 'space-between', marginBottom: 4 } },
                    React.createElement("span", { style: { fontSize: 12 } }, "Venta efectivo"),
                    React.createElement("span", { style: { fontWeight: 700 } }, fmt(ventaEfectivoHoy))),
                React.createElement(Row, { style: { justifyContent: 'space-between', marginBottom: 4 } },
                    React.createElement("span", { style: { fontSize: 12 } }, "Abonos efectivo"),
                    React.createElement("span", { style: { fontWeight: 700 } }, fmt(abonoEfectivoHoy))),
                React.createElement(Row, { style: { justifyContent: 'space-between', marginBottom: 4 } },
                    React.createElement("span", { style: { fontSize: 12 } }, "Gasto efectivo"),
                    React.createElement("span", { style: { fontWeight: 700, color: 'var(--danger-text)' } },
                        "-",
                        fmt(gastoEfectivoHoy))),
                React.createElement(Row, { style: { justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTop: '1px solid var(--line-strong)' } },
                    React.createElement("span", { style: { fontWeight: 700 } }, "Efectivo a entregar"),
                    React.createElement("span", { style: { fontWeight: 800, fontSize: 18, color: 'var(--accent-text)' } }, fmt(efectivoEsperadoHoy)))),
            incidenciasOperacionHoy.length > 0 && React.createElement(Card, { className: 'fx-cash-incidents', style: { background: 'var(--warn-bg)', marginTop: 10, marginBottom: 10 } },
                React.createElement("div", { className: 'fx-cash-incidents-title', style: { fontWeight: 800, color: 'var(--warn-text)', marginBottom: 6 } }, "Incidencias"),
                incidenciasOperacionHoy.map((incidencia, index) => React.createElement("div", { key: incidencia.notaId || index, style: { fontSize: 11, color: 'var(--warn-text)', padding: '6px 0', borderBottom: index < incidenciasOperacionHoy.length - 1 ? '1px solid rgba(0,0,0,.12)' : 'none' } },
                    React.createElement("div", { style: { fontWeight: 700 } }, incidencia.clienteNombre),
                    (incidencia.items || []).map(item => React.createElement("div", { key: item.id || item.nombre }, item.nombre, " — solicitado ", item.cantSolicitada || item.cant, ", aplicado ", item.cantAplicada || 0, ", faltante ", item.cantFaltante || 0))))),
            React.createElement("div", { style: { fontSize: 11, color: 'var(--ink-faint)', margin: '10px 0 16px' } },
                misNotasHoy.length,
                " ventas · ",
                new Set(misNotasHoy.map(n => n.clienteId)).size,
                " clientes atendidos hoy",
                incidenciasOperacionHoy.length ? ' · ' + incidenciasOperacionHoy.length + ' incidencias para revisión' : ''),
            React.createElement(Row, { style: { gap: 8, flexWrap: 'wrap' } },
                React.createElement(BOut, { onClick: () => setCierreOpen(false), style: { flex: '1 1 30%', minWidth: 100 } }, 'Cancelar'),
                React.createElement(BOut, { onClick: guardarBorradorCierre, style: { flex: '1 1 30%', minWidth: 130, color: 'var(--info-text)' } }, 'Guardar borrador'),
                React.createElement(BFill, { onClick: confirmarCierre, style: { flex: '1 1 30%', minWidth: 130 }, disabled: cierreSaving }, cierreSaving ? 'Guardando…' : 'Sí, cerrar caja')))));
}
