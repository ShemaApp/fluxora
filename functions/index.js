'use strict';

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const {
  CONCILIACIONES_COLLECTION,
  debeCrearSnapshot,
  construirSnapshotConciliacion
} = require('./snapshot');

admin.initializeApp();
const firestore = admin.firestore();

/**
 * Crea una sola conciliación administrativa por jornada al confirmarse el
 * cambio estado: abierta -> cerrada. El ID de la conciliación es el jornadaId;
 * así un reintento del evento nunca crea un segundo snapshot.
 */
exports.crearSnapshotConciliacionAlCerrarJornada = functions.firestore
  .document('jornadas/{jornadaId}')
  .onUpdate(async (change, context) => {
    const antes = change.before.data() || {};
    const despues = change.after.data() || {};
    const jornadaId = String(context.params.jornadaId || '');

    if (!debeCrearSnapshot({ jornadaId, antes, despues })) return null;

    const snapshotRef = firestore.collection(CONCILIACIONES_COLLECTION).doc(jornadaId);
    const snapshot = construirSnapshotConciliacion({
      jornadaId,
      jornada: despues,
      eventId: context.eventId,
      generadoEn: despues.fechaCierre || new Date().toISOString()
    });

    try {
      await snapshotRef.create(snapshot);
      console.log(`Snapshot de conciliación creado para jornada ${jornadaId}`);
    } catch (error) {
      const codigoError = String(error && error.code !== undefined ? error.code : '').toLowerCase();
      if (codigoError === '6' || codigoError === 'already-exists' || codigoError === 'already_exists') {
        console.log(`Snapshot ya existente para jornada ${jornadaId}; se omite el duplicado`);
        return null;
      }
      console.error(`No se pudo crear el snapshot de jornada ${jornadaId}`, error);
      throw error;
    }

    return null;
  });
