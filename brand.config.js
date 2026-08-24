// brand.config.js
// Único archivo que define el nombre/identidad visible del negocio dentro
// de la app (React). Se carga ANTES de app-core.js.
//
// Los archivos HTML estáticos (index.html, offline.html,
// confidencialidad-movil.html) e instrucciones.md NO leen este archivo
// -- sus textos van directo en el HTML/Markdown y hay que editarlos ahí
// a mano (están marcados con "EDITAR:" en cada línea que lo necesita).

const NEGOCIO = {
  nombre: 'Mi Negocio',
  nombreCorto: 'Mi Negocio', // para apple-mobile-web-app-title / manifest short_name
  emoji: '🚚',
  eslogan: 'Sistema de ventas y reparto'
};
