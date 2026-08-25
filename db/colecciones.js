/* db/colecciones.js — nombres de colecciones de Firestore, centralizados.
   Carga DESPUÉS de firebase-init.js y ANTES de db/semillas.js.

   Nota de alcance: este archivo centraliza las colecciones del modelo de agua
   medida. Localidad es la unidad de asignación; vehículos y medidores son
   referencias separadas y las ventas se vinculan a una jornada. */
const COLECCIONES = {
  PRODUCTOS: 'productos',
  CLIENTES: 'clientes',
  LOCALIDADES: 'localidades',
  NOTAS: 'notas',
  CREDITOS: 'creditos',
  JORNADAS: 'jornadas',
  CARGAS_AGUA: 'cargas_agua',
  LECTURAS_MEDIDOR: 'lecturas_medidor',
  USUARIOS: 'usuarios',
  TARIFAS: 'tarifas',
  VEHICULOS: 'vehiculos',
  MEDIDORES: 'medidores',
  INVENTARIO_HISTORIAL: 'inventario_historial',
  DEVOLUCIONES: 'devoluciones',
  CIERRES_CAJA: 'cierres_caja',
  GASTOS: 'gastos',
  META: '_meta'
};
