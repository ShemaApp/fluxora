'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { debeCrearSnapshot, construirSnapshotConciliacion } = require('../snapshot');

test('solo dispara el snapshot al cerrar una jornada abierta', () => {
  assert.equal(debeCrearSnapshot({ jornadaId: 'jornada-1', antes: { estado: 'abierta' }, despues: { estado: 'cerrada' } }), true);
  assert.equal(debeCrearSnapshot({ jornadaId: 'jornada-1', antes: { estado: 'cerrada' }, despues: { estado: 'cerrada' } }), false);
  assert.equal(debeCrearSnapshot({ jornadaId: 'jornada-1', antes: { estado: 'abierta' }, despues: { estado: 'abierta' } }), false);
  assert.equal(debeCrearSnapshot({ jornadaId: '', antes: { estado: 'abierta' }, despues: { estado: 'cerrada' } }), false);
});

test('construye un snapshot administrativo desde la jornada cerrada', () => {
  const jornada = {
    estado: 'cerrada',
    fechaInicio: '2026-08-26T06:00:00.000Z',
    fechaCierre: '2026-08-26T14:30:00.000Z',
    repartidorId: 'rep-1',
    repartidorNombre: 'Juan Pérez',
    localidadId: 'loc-1',
    localidadNombre: 'Zona Norte',
    vehiculoId: 'veh-1',
    vehiculoNombre: 'Pipa 01',
    medidorId: 'mtr-1',
    medidorNombre: 'Medidor 01',
    lecturaAnterior: 13247.9,
    lecturaInicial: 13249.9,
    lecturaFinal: 13347.9,
    lecturaCalculadaFinal: 13345.9,
    incrementoContadorMedido: 98,
    incrementoContadorCalculado: 96,
    diferenciaContador: 2,
    litrosMedidos: 980,
    litrosCalculadosPorVentas: 960,
    litrosVendidos: 960,
    ventasRegistradas: 48,
    serviciosMedidos: 0,
    otrasSalidasLitros: 0,
    capacidadTanqueLitros: 5000,
    aguaCargadaLitros: 5000,
    litrosRecargadosAcumulados: 0,
    aguaDisponibleLitros: 4040,
    unidadComercial: 'Garrafón',
    litrosPorUnidad: 20,
    incrementoContadorPorUnidad: 2,
    precioPorUnidad: 15,
    medidorDigitos: 6,
    medidorLitrosPorIncremento: 10,
    diferenciaLitrosFisicaContraCalculada: 20,
    diferenciaLitros: 20,
    diferenciaGarrafones: 1,
    tipoDiferencia: 'diferencia_merma_revision',
    explicacionDiferencia: '',
    resumenTarifas: [{ tarifaId: 'tarifa-1', unidades: 48, litros: 960, subtotal: 720 }]
  };

  const snapshot = construirSnapshotConciliacion({
    jornadaId: 'jornada-1',
    jornada,
    eventId: 'event-1',
    generadoEn: '2026-08-26T14:30:00.000Z'
  });

  assert.equal(snapshot.tipo, 'conciliacion_jornada');
  assert.equal(snapshot.inmutable, true);
  assert.equal(snapshot.jornadaId, 'jornada-1');
  assert.equal(snapshot.referencias.vehiculoId, 'veh-1');
  assert.equal(snapshot.referencias.medidorId, 'mtr-1');
  assert.equal(snapshot.lecturas.lecturaFinalFisica, 13347.9);
  assert.equal(snapshot.lecturas.lecturaFinalCalculada, 13345.9);
  assert.equal(snapshot.volumen.litrosMedidos, 980);
  assert.equal(snapshot.conciliacion.diferenciaLitros, 20);
  assert.deepEqual(snapshot.resumenTarifas, jornada.resumenTarifas);

  jornada.resumenTarifas[0].subtotal = 0;
  assert.equal(snapshot.resumenTarifas[0].subtotal, 720);
});

test('rechaza una jornada abierta o sin jornadaId', () => {
  assert.throws(
    () => construirSnapshotConciliacion({ jornadaId: 'jornada-1', jornada: { estado: 'abierta' } }),
    /jornada cerrada/
  );
  assert.throws(
    () => construirSnapshotConciliacion({ jornadaId: '', jornada: { estado: 'cerrada' } }),
    /jornadaId es obligatorio/
  );
});
