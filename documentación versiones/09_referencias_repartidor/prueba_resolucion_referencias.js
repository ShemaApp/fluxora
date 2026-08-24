const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const contexto = { window: {} };
const raizProyecto = path.resolve(__dirname, '../..');
vm.runInNewContext(fs.readFileSync(path.join(raizProyecto, 'referencias-operativas.js'), 'utf8'), contexto);

const vehiculos = [{ id: 'veh-01', codigo: 'PIPA-01', nombre: 'Pipa 01', medidorId: 'med-01', medidorNombre: 'Medidor 01', activo: true }];
const medidores = [{ id: 'med-01', codigo: 'MTR-01', nombre: 'Medidor 01', digitos: 6, litrosPorIncremento: 10, activo: true }];
const vehiculo = contexto.window.resolverVehiculoOperativo({ zona: { vehiculoId: 'veh-01' }, vehiculos });
const medidor = contexto.window.resolverMedidorOperativo({ zona: { medidorId: vehiculo.medidorId }, vehiculo, medidores });

assert.equal(vehiculo.id, 'veh-01');
assert.equal(vehiculo.nombre, 'Pipa 01');
assert.equal(medidor.id, 'med-01');
assert.equal(medidor.digitos, 6);
assert.equal(medidor.litrosPorIncremento, 10);
const legado = contexto.window.resolverVehiculoOperativo({ zona: { vehiculo: 'Pipa histórica', medidorId: 'med-01' }, vehiculos: [] });
assert.equal(legado.id, 'Pipa histórica');
assert.equal(legado.nombre, 'Pipa histórica');
console.log('Resolución de referencias y fallback heredado OK');
