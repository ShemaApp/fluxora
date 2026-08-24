/* db/colecciones.js — nombres de colecciones de Firestore, centralizados.
   Carga DESPUÉS de firebase-init.js y ANTES de db/semillas.js.

   Nota de alcance: este archivo centraliza las colecciones consumidas por
   los módulos nuevos y por el contexto operativo. Las colecciones de
   vehículos y medidores son referencias separadas; el resto de los módulos
   legacy todavía usa algunos nombres literales (db.collection('productos'),
   etc.) para conservar compatibilidad. */
const COLECCIONES = {
  PRODUCTOS: 'productos',
  CLIENTES: 'clientes',
  LOCALIDADES: 'localidades',
  ZONAS: 'zonas',
  NOTAS: 'notas',
  PEDIDOS: 'pedidos',
  CREDITOS: 'creditos',
  RUTAS: 'rutas',
  JORNADAS: 'jornadas',
  LECTURAS_MEDIDOR: 'lecturas_medidor',
  USUARIOS: 'usuarios',
  TARIFAS: 'tarifas',
  VEHICULOS: 'vehiculos',
  MEDIDORES: 'medidores',
  INVENTARIO_HISTORIAL: 'inventario_historial',
  DEVOLUCIONES: 'devoluciones',
  CIERRES_CAJA: 'cierres_caja',
  GASTOS: 'gastos',
  UBICACION_AUDITORIA: 'ubicacion_auditoria',
  META: '_meta'
};
