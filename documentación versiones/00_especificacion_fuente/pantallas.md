
analiza 
La estructura administrativa y chofer definida 
compatibilidad con esta skill

FLUXORA — UI VISUAL SKILL

1. REGLA VISUAL GLOBAL

Toda nueva pantalla de FLUXORA DEBE conservar exactamente el mismo lenguaje visual.

Identidad

Marca: FLUXORA
Concepto: medición, distribución y control.
Estilo: Industrial SaaS / Utility Management UI / Operational Dashboard.

No utilizar estética de aplicación bancaria, red social, CRM genérico ni app de mapas.

No utilizar:

- mapas
- GPS
- tracking
- geolocalización
- pines
- rutas geográficas
- WhatsApp
- llamadas
- QR como función principal
- elementos decorativos innecesarios

El sistema debe sentirse como una herramienta profesional para controlar operaciones físicas.

---

2. PALETA FIJA

Primarios

Deep Navy       #063B5C
Petroleum Blue  #075985
Cyan            #06B6D4
Cyan Light      #67E8F9

Neutros

Graphite        #0F172A
Slate           #64748B
Background      #F8FAFC
White           #FFFFFF
Border          #E2E8F0

Estados

Success         #16A34A
Warning         #F59E0B
Error           #DC2626
Info            #0284C7

No introducir nuevos colores de marca sin autorización.

---

3. LENGUAJE VISUAL

Utilizar:

- tarjetas compactas;
- bordes ligeramente redondeados;
- sombras muy discretas;
- iconografía lineal;
- números grandes para mediciones;
- etiquetas de estado;
- switches;
- segmented controls;
- botones de acción rápida;
- listas densas;
- tablas adaptables;
- indicadores de progreso;
- barras de consumo;
- divisores técnicos;
- jerarquía visual clara.

Evitar:

- tarjetas gigantes;
- exceso de gradientes;
- ilustraciones decorativas;
- glassmorphism;
- botones flotantes excesivos;
- animaciones exageradas;
- interfaces infantiles;
- exceso de texto.

---

4. SISTEMA DE BOTONES

Primary

Acción principal de la pantalla.

Ejemplos:

+ Nuevo vehículo
Guardar configuración
Iniciar jornada
Registrar venta
Cerrar jornada
Asignar

Color:
"#06B6D4"

---

Secondary

Acción secundaria.

Ejemplos:

Cancelar
Ver detalle
Historial
Configurar

Fondo blanco, borde "#075985".

---

Destructive

Únicamente operaciones peligrosas:

Desactivar
Dar de baja
Rechazar

Color "#DC2626".

---

Switch

Utilizar para configuraciones binarias:

Medidor activo       [ ON ]
Ventas offline       [ ON ]
Crédito permitido    [ OFF ]
Conciliación activa  [ ON ]

Nunca utilizar un botón de acción para representar una configuración permanente.

---

5. NAVEGACIÓN ADMINISTRATIVA

Sidebar:

FLUXORA

Inicio

**OPERACIÓN
  Asignaciones / Zonas
  Clientes
  Cargas
  Inventario
  Créditos
  Caja
  Conciliaciones

**CATÁLOGOS
  Productos / Tarifas
  Vehículos
  Medidores

**CONTROL
  Reportes

**CONFIGURACIÓN
  Configuración

En móvil convertir el sidebar en navegación compacta.

No mostrar módulos administrativos al repartidor.

---

6. JERARQUÍA VISUAL DE ASIGNACIONES


La relación debe visualizarse siempre:

EMPRESA
   ↓
LOCALIDAD / ZONA
   ↓
REPARTIDOR
   ↓
VEHÍCULO
   ↓
MEDIDOR
   ↓
CLIENTES

Esta pantalla debe comportarse como una Assignment Management UI, no como un CRUD tradicional.

---

PANTALLA 01 — CONFIGURACIÓN GENERAL
Objetivo

Permitir al administrador activar y configurar las variables que posteriormente controlarán la operación del repartidor.

Estructura visual

Header:

Configuración

Control operativo de FLUXORA

Debajo, tarjetas agrupadas.

Card — Operación

Operación de agua
Descripción breve

Medidor de flujo             [ ON ]
Ventas por unidad            [ ON ]
Conciliación de jornada      [ ON ]
Cierre obligatorio           [ ON ]

Card — Unidad comercial

Unidad comercial

Garrafón

Litros por unidad
[ 20.00 L ]

Incremento automático
[ ON ]

Card — Cobro

Métodos de pago

Efectivo                     [ ON ]
Crédito                      [ ON ]
Abonos                       [ ON ]

Card — Operación offline

Operación sin conexión

Ventas offline               [ ON ]
Borradores locales            [ ON ]
Sincronización automática     [ ON ]

Card — Apariencia

Estilo operativo

Densidad
( ) Compacta
(●) Normal
( ) Amplia

Modo
(●) Claro
( ) Oscuro

Regla visual

Esta pantalla configura comportamiento.

No mostrar aquí ventas, clientes ni estadísticas.

---

PANTALLA 02 — VEHÍCULOS

Objetivo

Administrar los vehículos disponibles para las jornadas.

Header:

Vehículos

Vehículos operativos de FLUXORA

[ + Nuevo vehículo ]

Lista/tablet:

VEHÍCULO        CAPACIDAD       MEDIDOR       REPARTIDOR      ESTADO
PIPA-01         5,000 L         MED-001       Juan            ACTIVO
PIPA-02         5,000 L         MED-002       Pedro           ACTIVO

Cada fila:

[ Ver ]
[ Configurar ]
[ Asignar ]

Estado mediante badge:

ACTIVO
INACTIVO
EN MANTENIMIENTO

No permitir eliminar físicamente vehículos que tengan historial operativo.

---

PANTALLA 03 — NUEVO VEHÍCULO

Modal o pantalla dedicada.

Título:

Nuevo vehículo

Campos:

Nombre / identificación
[ PIPA-03 ]

Capacidad
[ 5000 ] L

Medidor
[ Seleccionar medidor ▼ ]

Estado
[ Activo ● ]

Botones:

Cancelar
Guardar vehículo

Después de guardar:

Vehículo creado correctamente

No mezclar creación del vehículo con creación del medidor.

---

PANTALLA 04 — CONFIGURACIÓN DEL MEDIDOR

Esta pantalla debe ser especialmente técnica.

Header:

Configuración del medidor

MED-001
Vehículo: PIPA-01

Tipo de medidor

Tipo
[ Medidor de flujo de agua ▼ ]

Unidad física
[ Litros / m³ ]

Lectura física

Mostrar explicación visual mínima:

LECTURA DEL MEDIDOR

123456.7

Lectura utilizada por FLUXORA
↑
Números registrables del contador

No utilizar la aguja como entrada de datos.

La parte decimal/aguja puede considerarse fuera del registro operativo y, cuando corresponda, como merma o diferencia de medición.

Conversión comercial

UNIDAD COMERCIAL

Garrafón

Contenido
[ 20.00 L ]

Litros por unidad
20.00 L

Incremento automático

INCREMENTO DEL MEDIDOR

Cada 10 L
= +1 unidad del contador rojo

Cada 20 L
= +2 unidades del contador rojo

Mostrar una demostración:

Venta
8 garrafones

8 × 20 L
= 160 L

Incremento lógico
+16.0

Lectura anterior
123456.7

Lectura calculada
123472.7

Merma / tolerancia

Tolerancia de conciliación
[ configurable ]

Permitir diferencia
[ ON ]

No permitir que el administrador modifique manualmente la lectura calculada de una venta.

---

PANTALLA 05 — ASIGNACIONES / ZONAS

Objetivo

Controlar las relaciones operativas.

Utilizar diseño tipo Assignment Management UI.

Header:

Asignaciones

Organización operativa

Mostrar una estructura jerárquica:

LOCALIDAD / ZONA

Mochomera
│
├── Repartidor
│     Juan Pérez
│
├── Vehículo
│     PIPA-01
│
├── Medidor
│     MED-001
│
└── Clientes
      ├── Cliente 001
      ├── Cliente 002
      ├── Cliente 003
      └── Cliente 004

Acciones:

[ + Asignar localidad ]

[ Asignar repartidor ]

[ Asignar vehículo ]

[ Asignar medidor ]

[ + Asignar clientes ]

Cada asignación debe mostrar:

Asignado
Fecha
Responsable
Estado

No utilizar campos aislados tipo:

zonaId
choferId
vehiculoId

como única representación visual.

La interfaz debe mostrar claramente la relación entre ellos.

---

PANTALLA 06 — ASIGNAR REPARTIDOR

Modal:

Asignar repartidor

Localidad
Mochomera

Repartidor
[ Seleccionar ▼ ]

Vehículo
[ Seleccionar ▼ ]

Medidor
[ MED-001 ]

Estado
[ Activo ]

Antes de confirmar:

LOCALIDAD
Mochomera

↓

REPARTIDOR
Juan Pérez

↓

VEHÍCULO
PIPA-01

↓

MEDIDOR
MED-001

Botones:

Cancelar
Confirmar asignación

Si el repartidor ya tiene otra localidad/vehículo incompatible:

⚠ Asignación incompatible

Este repartidor ya tiene una asignación activa.

No guardar silenciosamente.

---

PANTALLA 07 — ASIGNAR CLIENTES

Header:

Clientes de la localidad

Mochomera
Repartidor: Juan Pérez
Vehículo: PIPA-01

Lista:

☑ Cliente 001
☑ Cliente 002
☐ Cliente 003
☐ Cliente 004

Filtros:

Buscar cliente
Tipo
Estado
Asignado / No asignado

Botón:

[ Asignar seleccionados ]

Después:

4 clientes asignados

No permitir seleccionar clientes fuera de la localidad si la regla operativa exige pertenencia fija.

---

PANTALLA 08 — MI JORNADA / REPARTIDOR

Esta es la interfaz operacional principal.

Header:

MI JORNADA

PIPA-01
Juan Pérez

Lectura anterior

LECTURA ANTERIOR

123456.7

SOLO LECTURA

Inicio

LECTURA INICIAL

123456.7

Carga

CARGA DE AGUA

4,500 L

DISPONIBLE

4,500 L

Botón:

[ Iniciar jornada ]

---

PANTALLA 09 — VENTA DEL REPARTIDOR

Diseñada para captura rápida.

CLIENTE 001

Garrafones

[-]     8     [+]

20 L / unidad

TOTAL
160 L

Preferentemente permitir entrada directa del número mediante teclado numérico, no obligar a utilizar +/-.

Resultado automático

MEDIDOR

123456.7
       ↓
+160 L
       ↓
123472.7

Agua restante

CARGA

4,500 L
  ↓
-160 L
  ↓
4,340 L

Cobro

[ EFECTIVO ] [ CRÉDITO ]

Botón principal:

[ CONFIRMAR VENTA ]

No pedir una segunda lectura física después de cada cliente.

La lectura intermedia es calculada.

---

PANTALLA 10 — RESUMEN DE JORNADA

Durante la jornada mostrar:

JORNADA ACTIVA

Clientes atendidos       18
Garrafones vendidos      74
Litros vendidos          1,480 L

Carga inicial            4,500 L
Disponible               3,020 L

Medidor inicial          123456.7
Medidor calculado        123604.7

Utilizar una barra visual:

AGUA DISPONIBLE

██████████████░░░░░░

3,020 L / 4,500 L

---

PANTALLA 11 — CIERRE DE JORNADA

El cierre debe ser una pantalla de conciliación.

CIERRE DE JORNADA

Lectura inicial
123456.7

Lectura final
[ 123604.9 ]

Diferencia física
148.2 L

Litros vendidos
148.0 L

Diferencia
0.2 L

Después:

EFECTIVO

Ventas efectivo
$2,450

Crédito
$850

Abonos
$300

Total efectivo esperado
$2,750

Mostrar diferencia:

Conciliación
✓ Dentro de tolerancia

o:

⚠ Diferencia detectada

Medidor físico: 148.2 L
Ventas registradas: 148.0 L

Diferencia: 0.2 L

Botón:

[ CERRAR JORNADA ]

---

12. RESPONSIVE

Desktop

Usar:

Sidebar
+
Header
+
Contenido en tarjetas / tablas

Tablet

Reducir:

- padding;
- columnas;
- tamaño de tarjetas.

Móvil

Convertir:

Sidebar
↓
Bottom navigation / menú compacto

Las pantallas operativas deben priorizar:

Número grande
Estado
Acción principal

Nunca convertir una pantalla móvil en una versión miniatura de escritorio.

---

13. REGLA DE CONSISTENCIA

Cada nueva pantalla debe responder visualmente a estas preguntas:

¿Dónde estoy?
¿Qué estoy viendo?
¿Cuál es el dato principal?
¿Qué puedo hacer?
¿Qué acción es primaria?
¿Qué acción es peligrosa?
¿Qué estado tiene la operación?

Mantener siempre:

Header
↓
Contexto
↓
Dato principal
↓
Contenido
↓
Acción primaria

---

14. REGLA FUNCIONAL

La interfaz nunca debe inventar operaciones.

La cadena operativa de FLUXORA es:

MEDIDOR
   ↓
AGUA DISPENSADA
   ↓
UNIDAD COMERCIAL
   ↓
CLIENTE
   ↓
EFECTIVO / CRÉDITO
   ↓
INVENTARIO / CARGA
   ↓
CAJA
   ↓
CONCILIACIÓN
   ↓
CIERRE

Esta cadena es el criterio para decidir si un componente pertenece a la aplicación.

Las funciones de mapas, GPS, tracking, contacto telefónico, WhatsApp, QR y rutas geográficas quedan fuera del diseño operacional actual.

---

15. REGLA PARA MANUS

Antes de crear una pantalla nueva:

1. Mantener la paleta FLUXORA.
2. Mantener la misma tipografía y jerarquía.
3. Reutilizar componentes existentes.
4. Reutilizar botones existentes.
5. Reutilizar badges, switches, inputs y cards.
6. No crear un estilo visual alternativo.
7. No introducir gradientes o colores nuevos.
8. No crear una navegación paralela.
9. No crear CRUD duplicados.
10. No agregar funciones fuera de la cadena operacional.
11. Mantener responsive móvil, tablet y escritorio.
12. Mantener separación estricta entre ADMIN y REPARTIDOR.
13. No mostrar al repartidor configuraciones administrativas.
14. No crear mapas, GPS ni tracking.
15. Si una pantalla necesita una función nueva, primero documentar la función y su relación con el flujo antes de implementarla.

Resultado esperado: todas las pantallas deben parecer partes del mismo producto FLUXORA, aunque pertenezcan a módulos diferentes.