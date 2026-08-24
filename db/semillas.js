/* db/semillas.js — datos semilla + función de sembrado inicial.
   Carga DESPUÉS de db/colecciones.js y ANTES de hooks/useSesion.js.

   Deja SOLO 1 registro de ejemplo por colección, para que sirva de
   referencia de estructura. Reemplázalos por tus productos/clientes/
   localidades reales antes de usar la app en producción, o simplemente
   captúralos desde la propia app una vez conectada a tu Firebase. */

const S_PROD = [{
  identificación: 'p1',
  nombre: 'EJEMPLO — Producto de muestra',
  precio: 0,
  existencias: 0,
  unidad: 'pieza',
  código: '000000000000'
}];

const S_CLI = [{
  identificación: 'c1',
  nombre: 'EJEMPLO — Cliente de muestra',
  dirección: 'EJEMPLO — Dirección de muestra'
}];

const S_LOC = [{
  identificación: 'l1',
  nombre: 'EJEMPLO — Localidad de muestra'
}];

// Las zonas reales las define la Empresa desde la pantalla Jerarquía.
// No se insertan zonas ni choferes ficticios durante la inicialización.
const S_ZONAS = [];

/* Siembra cada colección UNA sola vez (marca el avance en _meta/seed para
   no repetirlo). Se llama desde hooks/useSesion.js apenas hay un usuario
   autenticado. */
async function sembrarDatosInicialesSiVacio(db) {
  const seedRef = db.collection(COLECCIONES.META).doc('seed');
  const seedSnap = await seedRef.get();
  const seeded = seedSnap.exists ? seedSnap.data() : {};

  const sembrarColeccion = async (clave, coleccion, datos) => {
    if (seeded[clave]) return;
    const batch = db.batch();
    datos.forEach(item => {
      const { id, ...resto } = item;
      batch.set(db.collection(coleccion).doc(), resto);
    });
    batch.set(seedRef, { [clave]: true }, { merge: true });
    await batch.commit();
  };

  await sembrarColeccion('productos', COLECCIONES.PRODUCTOS, S_PROD);
  await sembrarColeccion('clientes', COLECCIONES.CLIENTES, S_CLI);
  await sembrarColeccion('localidades', COLECCIONES.LOCALIDADES, S_LOC);
  await sembrarColeccion('zonas', COLECCIONES.ZONAS, S_ZONAS);
}
