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

function obtenerLocalidadesAsignadas({ localidades = [], currentUser = null, localidadIds = [] } = {}) {
  const idsPerfil = Array.isArray(localidadIds) ? localidadIds.map(valorReferencia) : [];
  const uid = valorReferencia(currentUser?.uid);
  return (Array.isArray(localidades) ? localidades : []).filter(localidad => {
    if (localidad?.activo === false) return false;
    if (!uid) return true;
    const ids = Array.isArray(localidad?.repartidorIds) ? localidad.repartidorIds.map(valorReferencia) : [];
    return idsPerfil.includes(String(localidad?.id || '')) || ids.includes(uid) || valorReferencia(localidad?.repartidorId || localidad?.choferId) === uid;
  });
}
function buscarLocalidadOperativa({ localidades = [], localidadId = '', localidadNombre = '', id = '' } = {}) {
  const objetivoId = valorReferencia(localidadId || id);
  const objetivoNombre = valorReferencia(localidadNombre).toLowerCase();
  const lista = Array.isArray(localidades) ? localidades : [];
  return lista.find(localidad => objetivoId && String(localidad.id || localidad.uid || '') === objetivoId)
    || lista.find(localidad => objetivoNombre && String(localidad.nombre || '').trim().toLowerCase() === objetivoNombre)
    || null;
}
function resolverLocalidadOperativa({ jornada = null, localidad = null, localidades = [], localidadId = '', localidadNombre = '' } = {}) {
  const fuente = jornada || localidad || {};
  const referencia = buscarLocalidadOperativa({
    localidades,
    localidadId: localidadId || fuente.localidadId,
    localidadNombre: localidadNombre || fuente.localidadNombre || fuente.localidad
  });
  const id = valorReferencia(fuente.localidadId || localidadId || referencia?.id || referencia?.uid);
  const nombre = etiquetaReferencia(referencia, fuente.localidadNombre || fuente.localidad || id);
  return { id, nombre, activo: referencia?.activo !== false, referencia };
}
function resolverVehiculoOperativo({ jornada = null, localidad = null, vehiculos = [] } = {}) {
  const fuente = jornada || localidad || {};
  const referencia = buscarReferencia(
    vehiculos,
    fuente.vehiculoId || localidad?.vehiculoId,
    fuente.vehiculoNombre || fuente.vehiculo || localidad?.vehiculoNombre || localidad?.vehiculo
  );
  const id = valorReferencia(jornada?.vehiculoId || localidad?.vehiculoId || referencia?.id || referencia?.uid);
  const nombre = etiquetaReferencia(referencia, jornada?.vehiculoNombre || jornada?.vehiculo || localidad?.vehiculoNombre || localidad?.vehiculo || id);
  return {
    id,
    nombre,
    codigo: referencia?.codigo || '',
    medidorId: valorReferencia(jornada?.medidorId || localidad?.medidorId || referencia?.medidorId),
    medidorNombre: etiquetaReferencia(null, jornada?.medidorNombre || localidad?.medidorNombre || referencia?.medidorNombre || ''),
    activo: referencia?.activo !== false,
    referencia
  };
}

function resolverMedidorOperativo({ jornada = null, localidad = null, vehiculo = null, medidores = [], medicion = null } = {}) {
  const idBuscado = jornada?.medidorId || localidad?.medidorId || vehiculo?.medidorId || '';
  const nombreBuscado = jornada?.medidorNombre || localidad?.medidorNombre || vehiculo?.medidorNombre || medicion?.medidorNombre || '';
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

window.obtenerLocalidadesAsignadas = obtenerLocalidadesAsignadas;
window.buscarLocalidadOperativa = buscarLocalidadOperativa;
window.resolverLocalidadOperativa = resolverLocalidadOperativa;
window.resolverVehiculoOperativo = resolverVehiculoOperativo;
window.resolverMedidorOperativo = resolverMedidorOperativo;
