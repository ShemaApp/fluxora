'use strict';

const SNAPSHOT_VERSION = 1;
const CONCILIACIONES_COLLECTION = 'conciliaciones_jornada';

function numero(valor, predeterminado = null) {
  if (valor === null || valor === undefined || valor === '') return predeterminado;
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : predeterminado;
}

function texto(valor, predeterminado = '') {
  return valor === null || valor === undefined ? predeterminado : String(valor);
}

function copiarValor(valor) {
  if (Array.isArray(valor)) return valor.map(copiarValor);
  if (valor && typeof valor === 'object') {
    return Object.keys(valor).reduce((resultado, clave) => {
      if (valor[clave] !== undefined) resultado[clave] = copiarValor(valor[clave]);
      return resultado;
    }, {});
  }
  return valor;
}

/**
 * Construye un registro de conciliación inmutable a partir del documento de
 * jornada YA CERRADO. Este módulo no consulta la configuración actual y no
 * recalcula ventas, tarifas, medidores ni historiales.
 */
function debeCrearSnapshot({ jornadaId, antes, despues }) {
  return Boolean(jornadaId) && antes?.estado === 'abierta' && despues?.estado === 'cerrada';
}

function construirSnapshotConciliacion({ jornadaId, jornada, eventId, generadoEn }) {
  if (!jornadaId) throw new Error('jornadaId es obligatorio');
  if (!jornada || jornada.estado !== 'cerrada') throw new Error('El snapshot solo puede generarse para una jornada cerrada');

  const snapshot = {
    snapshotVersion: SNAPSHOT_VERSION,
    tipo: 'conciliacion_jornada',
    inmutable: true,
    origen: 'trigger_cierre_jornada',
    jornadaId: texto(jornadaId),
    jornadaPath: `jornadas/${jornadaId}`,
    estadoJornada: 'cerrada',
    fechaInicio: jornada.fechaInicio || null,
    fechaCierre: jornada.fechaCierre || null,
    referencias: {
      repartidorId: texto(jornada.repartidorId),
      repartidorNombre: texto(jornada.repartidorNombre),
      localidadId: texto(jornada.localidadId),
      localidadNombre: texto(jornada.localidadNombre || jornada.localidad),
      vehiculoId: texto(jornada.vehiculoId),
      vehiculoNombre: texto(jornada.vehiculoNombre || jornada.vehiculo),
      medidorId: texto(jornada.medidorId),
      medidorNombre: texto(jornada.medidorNombre)
    },
    lecturas: {
      lecturaAnterior: numero(jornada.lecturaAnterior),
      lecturaInicial: numero(jornada.lecturaInicial),
      lecturaFinalFisica: numero(jornada.lecturaFinal),
      lecturaFinalCalculada: numero(jornada.lecturaCalculadaFinal),
      incrementoContadorMedido: numero(jornada.incrementoContadorMedido),
      incrementoContadorCalculado: numero(jornada.incrementoContadorCalculado),
      diferenciaContador: numero(jornada.diferenciaContador)
    },
    volumen: {
      litrosMedidos: numero(jornada.litrosMedidos, 0),
      litrosCalculadosPorVentas: numero(jornada.litrosCalculadosPorVentas, 0),
      litrosVendidos: numero(jornada.litrosVendidos, 0),
      ventasRegistradas: numero(jornada.ventasRegistradas, 0),
      serviciosMedidos: numero(jornada.serviciosMedidos, 0),
      otrasSalidasLitros: numero(jornada.otrasSalidasLitros, 0)
    },
    agua: {
      capacidadTanqueLitros: numero(jornada.capacidadTanqueLitros),
      aguaCargadaLitros: numero(jornada.aguaCargadaLitros, 0),
      litrosRecargadosAcumulados: numero(jornada.litrosRecargadosAcumulados, 0),
      aguaDisponibleLitros: numero(jornada.aguaDisponibleLitros, 0)
    },
    escalaUsada: {
      unidadComercial: texto(jornada.unidadComercial),
      litrosPorUnidad: numero(jornada.litrosPorUnidad),
      incrementoContadorPorUnidad: numero(jornada.incrementoContadorPorUnidad),
      precioPorUnidad: numero(jornada.precioPorUnidad),
      medidorDigitos: numero(jornada.medidorDigitos),
      medidorLitrosPorIncremento: numero(jornada.medidorLitrosPorIncremento)
    },
    conciliacion: {
      diferenciaLitrosFisicaContraCalculada: numero(jornada.diferenciaLitrosFisicaContraCalculada),
      diferenciaLitros: numero(jornada.diferenciaLitros),
      diferenciaGarrafones: numero(jornada.diferenciaGarrafones),
      tipoDiferencia: texto(jornada.tipoDiferencia, 'sin_clasificar'),
      explicacionDiferencia: texto(jornada.explicacionDiferencia)
    },
    resumenTarifas: copiarValor(jornada.resumenTarifas || []),
    auditoria: {
      eventoId: texto(eventId),
      generadoEn: generadoEn || new Date().toISOString(),
      generadoPor: 'firebase_function:crearSnapshotConciliacionAlCerrarJornada'
    }
  };

  return copiarValor(snapshot);
}

module.exports = {
  SNAPSHOT_VERSION,
  CONCILIACIONES_COLLECTION,
  debeCrearSnapshot,
  construirSnapshotConciliacion
};
