# Validación de importación de clientes en Excel

## Objetivo

La importación debe convertir una hoja Excel en una lista de clientes candidatos sin escribir directamente en Firebase. La aplicación debe leer, normalizar, validar, clasificar y mostrar una vista previa. Solo después de una confirmación explícita se deben guardar las filas válidas.

> **Regla principal:** leer el archivo no modifica datos. La escritura comienza únicamente después de validar y confirmar la vista previa.

El diseño se alinea con el formulario actual de Clientes, que guarda `nombre`, la referencia de `localidadId`, los nombres visibles de localidad, `telefono`, `metodoServicio`, `tarifaId`, `tarifaHabitualId` y `activo`. La pantalla exige una localidad existente asignada a un repartidor y una tarifa activa [1]. La exportación actual de Reportes es independiente y corresponde a ventas, tarifas y conciliación, no al catálogo maestro de clientes [2].

## Contrato de columnas

La importación debe aceptar una plantilla oficial, no una hoja arbitraria. La fila de encabezados esperada es:

```text
Nombre | Localidad | Método de servicio | Teléfono | Tarifa habitual | Estado
```

La aplicación debe mantener un mapa de encabezados humanos a claves internas. No conviene usar directamente el texto de Excel como nombre de propiedad de Firestore.

```js
const IMPORT_HEADERS = {
  required: ['Nombre', 'Localidad', 'Método de servicio', 'Tarifa habitual'],
  optional: ['Teléfono', 'Estado'],
  allowed: ['Nombre', 'Localidad', 'Método de servicio', 'Teléfono', 'Tarifa habitual', 'Estado']
};

const HEADER_TO_FIELD = {
  'Nombre': 'nombre',
  'Localidad': 'localidadNombreImportada',
  'Método de servicio': 'metodoServicioImportado',
  'Teléfono': 'telefono',
  'Tarifa habitual': 'tarifaNombreImportada',
  'Estado': 'estadoImportado'
};
```

Los nombres de columnas deben compararse después de quitar espacios sobrantes, convertir espacios repetidos en uno y normalizar mayúsculas/minúsculas para la comparación. El texto original puede conservarse para mostrarlo en el error, pero las claves internas deben ser controladas por el código.

## Modelo de resultado por fila

Cada fila debe producir un resultado independiente. Esto permite mostrar 50 filas, aceptar las válidas y señalar exactamente cuáles requieren corrección.

```js
{
  rowNumber: 2,
  raw: {
    nombre: 'Cliente A',
    localidadNombreImportada: 'Zona Norte',
    metodoServicioImportado: 'Doméstica',
    telefono: '5512345678',
    tarifaNombreImportada: 'Garrafón doméstico',
    estadoImportado: 'Activo'
  },
  normalized: {
    nombre: 'Cliente A',
    localidadNombre: 'Zona Norte',
    metodoServicio: 'venta_por_cantidad',
    telefono: '5512345678',
    tarifaNombre: 'Garrafón doméstico',
    activo: true
  },
  status: 'valid',
  errors: [],
  warnings: [],
  resolved: {
    localidadId: 'id-interno-resuelto',
    tarifaId: 'id-interno-resuelto'
  },
  payload: null
}
```

`resolved` y `payload` deben mantenerse fuera de la hoja y fuera de la interfaz administrativa. Son datos internos preparados para la escritura. Antes de guardar, `payload` se construye con el mismo contrato que utiliza el formulario actual.

## Tres capas de validación

### Capa 1: estructura del archivo

Esta capa determina si el archivo puede leerse. Si falla, no se debe procesar ninguna fila.

```js
function validarEstructura(headers) {
  const recibidos = headers.map(normalizarEncabezado);
  const esperados = IMPORT_HEADERS.allowed.map(normalizarEncabezado);
  const faltantes = IMPORT_HEADERS.required.filter(header =>
    !recibidos.includes(normalizarEncabezado(header))
  );
  const desconocidos = headers.filter(header =>
    !esperados.includes(normalizarEncabezado(header))
  );
  const duplicados = recibidos.filter((header, index) => recibidos.indexOf(header) !== index);

  return {
    ok: faltantes.length === 0 && duplicados.length === 0,
    faltantes,
    desconocidos,
    duplicados
  };
}
```

La interfaz debe mostrar una advertencia de encabezado desconocido, pero no debe mapearlo silenciosamente. Si falta cualquiera de los cuatro campos obligatorios, el archivo debe detenerse antes de validar filas. Si se incluye dos veces el mismo encabezado, también debe detenerse, porque no se puede decidir cuál valor es correcto.

La función `normalizarEncabezado` debe ser conservadora:

```js
function normalizarEncabezado(valor) {
  return String(valor ?? '')
    .replace(/\uFEFF/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
```

Para mostrar el mensaje al usuario se recomienda conservar una tabla de nombres oficiales. Por ejemplo, `Metodo de servicio` puede reconocerse como equivalente técnico de `Método de servicio`, pero `Tipo`, `Precio`, `UID` o `Localidad ID` no deben aceptarse como sustitutos ambiguos.

### Capa 2: campos y valores de cada fila

Esta capa se ejecuta únicamente si la estructura es válida. Cada fila recibe errores propios, sin interrumpir las demás.

```js
const METODO_IMPORTACION = {
  'domestica': 'venta_por_cantidad',
  'medido por medidor': 'relleno_por_medicion'
};

function validarFila(raw, rowNumber, contexto) {
  const errors = [];
  const warnings = [];
  const nombre = texto(raw.nombre);
  const localidadNombre = texto(raw.localidadNombreImportada);
  const metodoTexto = claveTexto(raw.metodoServicioImportado);
  const tarifaNombre = texto(raw.tarifaNombreImportada);
  const telefono = texto(raw.telefono);
  const estadoTexto = claveTexto(raw.estadoImportado);

  if (!nombre) errors.push({ field: 'Nombre', code: 'required', message: 'El nombre es obligatorio.' });
  if (!localidadNombre) errors.push({ field: 'Localidad', code: 'required', message: 'La localidad es obligatoria.' });
  if (!tarifaNombre) errors.push({ field: 'Tarifa habitual', code: 'required', message: 'La tarifa habitual es obligatoria.' });
  if (!METODO_IMPORTACION[metodoTexto]) {
    errors.push({ field: 'Método de servicio', code: 'invalid_value', message: 'Usa Doméstica o Medido por medidor.' });
  }

  const localidad = resolverLocalidad(localidadNombre, contexto.localidades);
  if (localidad && localidad.activo === false) {
    errors.push({ field: 'Localidad', code: 'inactive', message: 'La localidad está inactiva.' });
  } else if (!localidad) {
    errors.push({ field: 'Localidad', code: 'not_found', message: 'La localidad no existe en el catálogo.' });
  } else if (!localidad.repartidorId && !(Array.isArray(localidad.repartidorIds) && localidad.repartidorIds.length)) {
    errors.push({ field: 'Localidad', code: 'unassigned', message: 'La localidad no tiene repartidor asignado.' });
  }

  const tarifa = resolverTarifa(tarifaNombre, contexto.tarifas);
  if (!tarifa) {
    errors.push({ field: 'Tarifa habitual', code: 'not_found', message: 'La tarifa no existe.' });
  } else if (tarifa.activo === false) {
    errors.push({ field: 'Tarifa habitual', code: 'inactive', message: 'La tarifa está inactiva.' });
  }

  if (estadoTexto && !['activo', 'inactivo'].includes(estadoTexto)) {
    errors.push({ field: 'Estado', code: 'invalid_value', message: 'Usa Activo o Inactivo.' });
  }

  const posibleDuplicado = buscarDuplicado(nombre, localidad, contexto.clientes);
  if (posibleDuplicado) {
    warnings.push({ field: 'Nombre', code: 'possible_duplicate', message: 'Posible duplicado por nombre y localidad.' });
  }

  return {
    rowNumber,
    raw,
    normalized: {
      nombre,
      localidadNombre,
      metodoServicio: METODO_IMPORTACION[metodoTexto] || null,
      telefono,
      activo: estadoTexto ? estadoTexto === 'activo' : true
    },
    resolved: {
      localidadId: localidad?.id || null,
      tarifaId: tarifa?.id || null
    },
    status: errors.length ? 'error' : warnings.length ? 'warning' : 'valid',
    errors,
    warnings,
    payload: null
  };
}
```

`texto` debe convertir celdas vacías, `null` y `undefined` en cadena vacía, pero no debe convertir números de teléfono a número porque eso podría quitar ceros iniciales. El teléfono debe tratarse como texto desde la lectura del Excel.

### Capa 3: consistencia del conjunto

Además de validar cada fila individualmente, hay que revisar errores entre filas del mismo archivo.

```js
function validarConjunto(filas, clientesExistentes) {
  const vistos = new Map();

  filas.forEach(fila => {
    if (fila.errors.length) return;
    const clave = claveDuplicado(fila.normalized.nombre, fila.resolved.localidadId);
    if (vistos.has(clave)) {
      fila.warnings.push({
        field: 'Nombre',
        code: 'duplicate_in_file',
        message: 'La misma combinación Nombre + Localidad aparece más de una vez en el archivo.'
      });
      fila.status = 'warning';
    } else {
      vistos.set(clave, fila.rowNumber);
    }
  });

  return filas;
}
```

La primera versión debe trabajar en modo **solo altas nuevas**. Una fila con posible duplicado existente o repetida dentro del archivo no debe escribirse automáticamente. El administrador puede corregir el archivo y volver a importarlo, o revisar el caso manualmente en Clientes.

## Resolver nombres visibles a referencias internas

El Excel debe usar nombres humanos, pero el payload final debe usar IDs internos. Esa resolución debe ocurrir en memoria después de validar la estructura.

```js
function resolverLocalidad(nombre, localidades) {
  const clave = claveTexto(nombre);
  return localidades.find(item => claveTexto(item.nombre) === clave) || null;
}

function resolverTarifa(nombre, tarifas) {
  const clave = claveTexto(nombre);
  return tarifas.find(item => item.activo !== false && claveTexto(item.nombre) === clave) || null;
}

function construirPayload(resultado, currentUser) {
  if (resultado.errors.length || resultado.warnings.some(w => w.code.includes('duplicate'))) return null;
  return {
    nombre: resultado.normalized.nombre,
    localidadId: resultado.resolved.localidadId,
    localidadNombre: resultado.normalized.localidadNombre,
    localidad: resultado.normalized.localidadNombre,
    telefono: resultado.normalized.telefono,
    metodoServicio: resultado.normalized.metodoServicio,
    tarifaId: resultado.resolved.tarifaId,
    tarifaHabitualId: resultado.resolved.tarifaId,
    activo: resultado.normalized.activo,
    creadoPorUid: currentUser.uid,
    creadoPorNombre: currentUser.nombre || '',
    fechaAlta: new Date().toISOString()
  };
}
```

La función no debe aceptar `localidadId`, `tarifaId`, `tarifaHabitualId`, un ID de documento ni metadatos provenientes del Excel. Los IDs se resuelven únicamente contra los catálogos cargados por la aplicación.

## Estados de la vista previa

La vista previa debe presentar contadores y una tabla de filas. Los estados recomendados son:

| Estado | Significado | Acción |
|---|---|---|
| `valid` | La fila tiene campos correctos y referencias resueltas | Puede quedar seleccionada para importar |
| `warning` | Hay una advertencia, por ejemplo posible duplicado | No importar automáticamente; requiere revisión |
| `error` | Falta un campo, hay un valor inválido o la referencia no existe | No importable hasta corregir el Excel |
| `skipped` | La fila fue excluida por decisión del usuario o por duplicado | No escribir |

La interfaz debe mostrar, como mínimo, `Total de filas`, `Válidas`, `Advertencias` y `Errores`. El botón principal debe indicar el alcance real, por ejemplo **Importar 47 clientes válidos**. Si no hay filas válidas, el botón debe estar deshabilitado.

## Advertencia antes de la escritura

Antes de ejecutar el batch se debe mostrar una confirmación explícita:

> Se crearán **N clientes nuevos** usando localidades y tarifas existentes. No se generarán IDs manuales, no se modificarán clientes actuales y no se alterarán saldos, ventas, jornadas ni historiales. Las filas con errores o posibles duplicados quedarán fuera. ¿Confirmas la importación?

La confirmación no debe aparecer al seleccionar el archivo, sino después de que el usuario revise la vista previa. Cancelar debe descartar el lote en memoria sin escribir.

## Escritura controlada

La escritura debe recibir exclusivamente resultados `valid` y construir un batch. Si una fila no tiene `payload`, se excluye. No se deben actualizar documentos existentes en esta primera versión.

```js
async function guardarImportacion(resultados, currentUser) {
  const candidatos = resultados
    .filter(resultado => resultado.status === 'valid')
    .map(resultado => ({
      resultado,
      payload: construirPayload(resultado, currentUser)
    }))
    .filter(item => item.payload);

  if (!candidatos.length) throw new Error('No hay filas válidas para importar.');

  const batch = db.batch();
  candidatos.forEach(({ payload }) => {
    const ref = db.collection(COLECCIONES.CLIENTES).doc();
    batch.set(ref, payload);
  });
  await batch.commit();
  return candidatos.length;
}
```

Si se desea importar cientos de filas, el código debe dividir el conjunto en lotes conforme al límite operativo de Firestore. Ese límite no debe inventarse en la interfaz; debe quedar como una constante técnica documentada y probarse antes de liberar la función. Para la primera prueba con 50 clientes, un solo batch es suficiente si el equipo confirma la estrategia y se mantiene el alcance de altas nuevas.

## Cómo evitar errores de campos faltantes

La protección debe existir en cuatro puntos: el archivo se rechaza si faltan encabezados obligatorios; cada fila se rechaza si falta un valor obligatorio; las referencias se rechazan si localidad o tarifa no existen; y el botón de escritura se deshabilita si no hay filas válidas. Nunca se debe completar silenciosamente un campo obligatorio con `''`, `null`, una localidad por defecto o una tarifa arbitraria.

La única excepción recomendada es `Estado`: si el equipo decide no mostrarlo todavía en la ficha, la importación debe omitirlo de la plantilla y crear todos los registros como activos con una advertencia visible. No conviene tener una columna que el formulario no pueda mantener de forma coherente.

## Pruebas que debe tener la implementación

| Caso | Resultado esperado |
|---|---|
| Archivo sin `Nombre` | Rechazo estructural antes de validar filas |
| Archivo sin `Localidad` | Rechazo estructural |
| Archivo sin `Método de servicio` | Rechazo estructural |
| Archivo sin `Tarifa habitual` | Rechazo estructural |
| Encabezado duplicado | Rechazo estructural |
| Encabezado técnico `localidadId` | Advertencia; no se usa como referencia |
| Nombre vacío en una fila | Error de fila |
| Localidad inexistente | Error de fila |
| Localidad sin repartidor | Error de fila |
| Tarifa inactiva | Error de fila |
| Método desconocido | Error de fila |
| Teléfono vacío | Fila permitida |
| Teléfono con ceros iniciales | Se conserva como texto |
| Duplicado dentro del archivo | Advertencia; no se importa automáticamente |
| Coincidencia con cliente existente | Advertencia; no se sobrescribe |
| 50 filas, 47 válidas | Vista previa muestra 47 importables y 3 excluidas |
| Confirmación cancelada | Cero escrituras |
| Error durante `batch.commit()` | Se informa el error y no se presenta la operación como completada |

## Referencias

[1]: https://github.com/ShemaApp/fluxora/blob/main/clientes.js "Formulario y contrato actual de Clientes"
[2]: https://github.com/ShemaApp/fluxora/blob/main/reportes.js "Exportación actual de Reportes"
[3]: https://firebase.google.com/docs/firestore/manage-data/transactions "Documentación oficial de operaciones de escritura de Firestore"
