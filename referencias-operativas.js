/* referencias-operativas.js — resolución visual/operativa de referencias.
   No crea ni modifica datos. Solo traduce IDs y snapshots existentes para que
   Jornada y Ruta puedan mostrar el vehículo y el medidor correctos. */
const valorReferencia = (referencia, fallback = '') => String(referencia ?? fallback ?? '').trim();
const etiquetaReferencia = (item, fallback = '') => String(item?.nombre || item?.codigo || item?.identificador || fallback || item?.id || '').trim();
const buscarReferencia = (lista, id, nombre) => {
  const items = Array.isArray(lista) ? lista : [];
  const idBuscado = valorReferencia(id);
  const nombreBuscado = valorReferencia(nombre).toLowerCase();
  return items.find(item => idBuscado && String(item.id || item.uid || item.codigo || '') === idBuscado)
    || items.find(item => nombreBuscado && [item.nombre, item.codigo, item.identificador].some(v => String(v || '').trim().toLowerCase() === nombreBuscado))
    || null;
};

function resolverVehiculoOperativo({ jornada = null, zona = null, vehiculos = [] } = {}) {
  const fuente = jornada || zona || {};
  const referencia = buscarReferencia(
    vehiculos,
    fuente.vehiculoId || zona?.vehiculoId,
    fuente.vehiculoNombre || fuente.vehiculo || zona?.vehiculoNombre || zona?.vehiculo
  );
  // Compatibilidad temporal: una zona histórica sin vehiculoId conserva su
  // identificador textual para no bloquear jornadas antiguas. Las nuevas
  // asignaciones deben entregar un ID de la colección vehiculos.
  const id = valorReferencia(jornada?.vehiculoId || zona?.vehiculoId || referencia?.id || referencia?.uid || jornada?.vehiculo || zona?.vehiculo);
  const nombre = etiquetaReferencia(referencia, jornada?.vehiculoNombre || jornada?.vehiculo || zona?.vehiculoNombre || zona?.vehiculo || id);
  return {
    id,
    nombre,
    codigo: referencia?.codigo || '',
    medidorId: valorReferencia(jornada?.medidorId || zona?.medidorId || referencia?.medidorId),
    medidorNombre: etiquetaReferencia(null, jornada?.medidorNombre || zona?.medidorNombre || referencia?.medidorNombre || ''),
    activo: referencia?.activo !== false,
    referencia
  };
}

function resolverMedidorOperativo({ jornada = null, zona = null, vehiculo = null, medidores = [], medicion = null } = {}) {
  const idBuscado = jornada?.medidorId || zona?.medidorId || vehiculo?.medidorId || '';
  const nombreBuscado = jornada?.medidorNombre || zona?.medidorNombre || vehiculo?.medidorNombre || medicion?.medidorNombre || '';
  const referencia = buscarReferencia(medidores, idBuscado, nombreBuscado);
  const id = valorReferencia(idBuscado || referencia?.id || referencia?.uid);
  const nombre = etiquetaReferencia(referencia, nombreBuscado || id);
  const digitos = Number(referencia?.digitos ?? medicion?.digitos ?? 6);
  const litrosPorIncremento = Number(referencia?.litrosPorIncremento ?? medicion?.litrosPorIncremento ?? 10);
  return {
    id,
    nombre,
    codigo: referencia?.codigo || '',
    tipo: referencia?.tipo || medicion?.tipoMedidor || 'Medidor de flujo volumétrico',
    modoLectura: referencia?.modoLectura || medicion?.modoLectura || 'acumulativa',
    unidadMostrada: referencia?.unidadMostrada || medicion?.unidadMostrada || 'Número rojo',
    digitos: Number.isInteger(digitos) && digitos > 0 ? digitos : 6,
    litrosPorIncremento: Number.isFinite(litrosPorIncremento) && litrosPorIncremento > 0 ? litrosPorIncremento : 10,
    resolucion: Number(referencia?.resolucion ?? medicion?.resolucion ?? 0.1),
    decimales: Number(referencia?.decimales ?? medicion?.decimales ?? 1),
    activo: referencia?.activo !== false && medicion?.medidorActivo !== false,
    referencia
  };
}

window.resolverVehiculoOperativo = resolverVehiculoOperativo;
window.resolverMedidorOperativo = resolverMedidorOperativo;
