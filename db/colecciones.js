/* db/colecciones.js — nombres de colecciones de Firestore, centralizados.
   Carga DESPUÉS de firebase-init.js y ANTES de db/semillas.js.

   Nota de alcance: este archivo lo usan los módulos nuevos de esta limpieza
   (db/semillas.js, hooks/useSesion.js). El resto de los archivos del
   proyecto (productos.js, clientes.js, pedidos.js, creditos.js, ruta.js,
   rutas-repartidores.js, inventario.js, reportes.js, gerencia.js,
   permisos.js, config.js) todavía usan el nombre de colección como texto
   literal (db.collection('productos'), etc.) — no se tocó esa parte para
   no arriesgar romper esos módulos sin poder probarlos en un navegador
   real. Si más adelante quieres migrarlos a COLECCIONES.X, es un
   find-and-replace por archivo. */
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
  INVENTARIO_HISTORIAL: 'inventario_historial',
  DEVOLUCIONES: 'devoluciones',
  CIERRES_CAJA: 'cierres_caja',
  GASTOS: 'gastos',
  UBICACION_AUDITORIA: 'ubicacion_auditoria',
  META: '_meta'
};
