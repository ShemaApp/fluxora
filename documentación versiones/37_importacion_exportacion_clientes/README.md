# Importación y exportación de clientes por filtros

## Objetivo

Permitir que ADMIN descargue el resultado actual de Clientes después de aplicar búsqueda y filtros, descargue una plantilla compatible con la ficha de cliente e importe altas nuevas mediante validación y vista previa.

## Alcance implementado

La función está integrada en `clientes.js` y usa el objeto global `XLSX` que ya carga `index.html` desde SheetJS. No se añadió una dependencia, backend nuevo ni una colección adicional.

Las herramientas aparecen exclusivamente para ADMIN:

```text
Importar clientes | Descargar plantilla | Exportar Excel (n) | Exportar CSV (n)
```

`n` corresponde al resultado visible después de aplicar búsqueda, estado, crédito y localidad.

## Contrato humano del archivo

Las columnas de la plantilla son:

```text
Nombre | Localidad | Método de servicio | Teléfono | Tarifa habitual | Estado
```

`Nombre`, `Localidad`, `Método de servicio` y `Tarifa habitual` son obligatorios. `Teléfono` es opcional. Si `Estado` no aparece, el sistema aplica `Activo`; si aparece, acepta `Activo` o `Inactivo`.

La hoja usa nombres reales. No acepta como fuente de negocio el ID de Firestore, `localidadId`, `tarifaId`, `tarifaHabitualId`, saldos, ventas, jornadas, vehículos, medidores, lecturas, cargas ni marcas offline. Las referencias internas se resuelven mediante el catálogo vigente.

## Exportación

La exportación toma `list`, que es el resultado ya filtrado y ordenado de Clientes. El Excel contiene dos hojas:

| Hoja | Contenido |
|---|---|
| `Clientes` | Las seis columnas humanas del contrato |
| `Filtros aplicados` | Fecha, búsqueda, estado, crédito, localidad y cantidad exportada |

La hoja `Clientes` incluye autofiltro y anchos de columna básicos para facilitar revisión. El CSV contiene únicamente la tabla humana y usa BOM UTF-8 para conservar acentos en Excel.

## Flujo de importación

El archivo no se guarda al seleccionarlo. La secuencia es:

```text
Seleccionar archivo
      ↓
Leer primera hoja
      ↓
Validar encabezados
      ↓
Normalizar nombres, método y estado
      ↓
Resolver localidad y tarifa por nombre
      ↓
Detectar duplicados
      ↓
Mostrar advertencia y vista previa
      ↓
Confirmar
      ↓
Crear solo filas listas en lotes
```

Si falta una columna obligatoria, hay encabezados duplicados, la hoja no existe o no hay filas, se muestra un error de archivo y no se generan filas importables. Las columnas desconocidas se muestran como advertencia y no se usan.

## Reglas de fila

Cada fila recibe errores y advertencias independientes. Un error deja la fila fuera de la escritura. Una advertencia por duplicado también deja la fila en estado `revisar`; ninguna coincidencia se sobrescribe automáticamente.

| Caso | Estado |
|---|---|
| Nombre vacío | Error; no importar |
| Localidad activa existente, asignada o pendiente | Válida; no se asigna repartidor desde la importación |
| Localidad inexistente | Error; no importar |
| Método distinto de Doméstica o Medido por medidor | Error; no importar |
| Tarifa inexistente o inactiva | Error; no importar |
| Estado diferente de Activo o Inactivo | Error; no importar |
| Teléfono vacío | Permitido |
| Nombre y localidad repetidos en el archivo | Advertencia; no importar automáticamente |
| Cliente ya existente con el mismo nombre y localidad | Advertencia; no sobrescribir |

## Relación con localidades

La existencia de una localidad y su asignación son conceptos independientes:

```text
Localidad → catálogo maestro
Asignación → relación posterior con repartidor desde Cobertura
Cliente → referencia a una localidad existente
```

Para ADMIN, una localidad activa puede estar pendiente de asignación y aun así puede usarse al preparar el cliente. El REPARTIDOR no participa en la importación y mantiene sus localidades restringidas por el alcance operativo existente.

## Escritura

La confirmación crea documentos nuevos en `clientes` con un ID generado por Firestore. Se guardan nombre, localidad y tarifa resueltas, método de servicio, teléfono, estado, metadatos de alta y `origenImportacion: 'clientes_excel'`. La escritura se realiza con lotes de hasta 450 filas para respetar el límite práctico de operaciones de Firestore.

No se crean localidades ni tarifas desde Excel. No se modifican clientes existentes ni se generan saldos, ventas, créditos, jornadas, cargas, lecturas o movimientos históricos.

## Fuera de alcance

Esta primera versión no actualiza clientes existentes, no importa saldos iniciales, no convierte hojas históricas en ventas, no modifica reglas remotas y no habilita importación para REPARTIDOR. Las hojas históricas de ventas y créditos seguirán requiriendo un contrato separado.
