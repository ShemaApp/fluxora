const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const contexto = { window: {} };
const raizProyecto = path.resolve(__dirname, '../..');
vm.runInNewContext(fs.readFileSync(path.join(raizProyecto, 'referencias-operativas.js'), 'utf8'), contexto);

const localidades = [{ id: 'loc-01', nombre: 'Campo Don Pedro', repartidorId: 'rep-01', vehiculoId: 'veh-01', medidorId: 'med-01', activo: true }];
const vehiculos = [{ id: 'veh-01', codigo: 'PIPA-01', nombre: 'Pipa 01', medidorId: 'med-01', medidorNombre: 'Medidor 01', activo: true }];
const medidores = [{ id: 'med-01', codigo: 'MTR-01', nombre: 'Medidor 01', digitos: 6, litrosPorIncremento: 10, activo: true }];
const asignadas = contexto.window.obtenerLocalidadesAsignadas({ localidades, currentUser: { uid: 'rep-01' } });
const localidad = contexto.window.resolverLocalidadOperativa({ localidades: asignadas, localidadId: 'loc-01' });
const vehiculo = contexto.window.resolverVehiculoOperativo({ localidad: localidad.referencia, vehiculos });
const medidor = contexto.window.resolverMedidorOperativo({ localidad: localidad.referencia, vehiculo, medidores });

assert.equal(asignadas.length, 1);
assert.equal(localidad.id, 'loc-01');
assert.equal(localidad.nombre, 'Campo Don Pedro');
assert.equal(vehiculo.id, 'veh-01');
assert.equal(vehiculo.nombre, 'Pipa 01');
assert.equal(medidor.id, 'med-01');
assert.equal(medidor.digitos, 6);
assert.equal(medidor.litrosPorIncremento, 10);
console.log('Resolución localidad → vehículo → medidor OK');
