# Relevamiento de fichas técnicas de CILGAS

**Entrega:** segunda entrega — Diseño y Módulos.

**Fecha de análisis:** 27/09/2026.

**Estado:** evidencia relevada y decisiones de diseño propuestas; pendiente de validación del propietario, responsables técnicos y tutora según su competencia.

## Objetivo y tratamiento de las fuentes

Se analizaron visualmente las cinco fotografías aportadas por el equipo para reconocer la estructura de la ficha utilizada en el taller y trasladar sus campos al diseño de datos. Se complementó esta lectura con el vocabulario de [CONTEXT.md](../../CONTEXT.md), la propuesta del [README](../../README.md) y el [ADR 0003](../adr/0003-preservar-fichas-confirmadas-como-snapshots.md).

Las fotografías contienen datos personales, dominios, documentos, firmas y sellos. **No se incorporan las imágenes ni la transcripción de esos datos al repositorio público.** Los identificadores F01–F05 permiten al equipo cotejar privadamente la evidencia. Este documento describe etiquetas y estructura, no casos reales identificables.

| Fuente | Nombre del archivo aportado | Evidencia útil y límites |
| --- | --- | --- |
| F01 | WhatsApp Image 2026-09-14 at 10.19.14.jpeg | Ficha completa. Se distingue revisión anual marcada y la anotación manuscrita `PH`. Hay una fila de cilindro y dos filas de válvulas ocupadas. |
| F02 | WhatsApp Image 2026-09-14 at 10.24.09.jpeg | Ficha completa. Se distingue revisión anual y dos filas de cilindros ocupadas. Las firmas y anotaciones no se transcriben. |
| F03 | WhatsApp Image 2026-09-14 at 10.35.01.jpeg | Ficha completa con varios campos aún vacíos. La marca parece corresponder a conversión y hay una anotación que parece `PH`; requiere confirmación. |
| F04 | WhatsApp Image 2026-09-15 at 14.22.26.jpeg | Ficha completa fotografiada con inclinación y parte del encabezado tapada. Se distingue revisión anual. Se analizó solamente la hoja principal. |
| F05 | WhatsApp Image 2026-09-15 at 15.22.56.jpeg | Ficha parcialmente recortada en el borde inferior. Permite reconocer los campos de oblea anterior y nueva con valores cargados. |

La fecha del nombre de archivo identifica la fotografía; **no se utiliza como fecha del servicio**. Una casilla vacía no demuestra que el dato sea opcional para confirmar una operación: puede tratarse de una ficha incompleta. Tampoco las marcas manuscritas establecen por sí solas una regla normativa.

## Campos observados y trazabilidad al modelo

Los nombres de la columna «Destino conceptual» designan conceptos del dominio. El diccionario de datos y el esquema SQL de esta entrega establecen sus nombres físicos, tipos y restricciones. Todos los valores impresos en una ficha confirmada deben quedar también dentro de su snapshot histórico, aunque provengan de una entidad maestra.

| Sector / etiqueta impresa | Destino conceptual | Criterio de diseño |
| --- | --- | --- |
| Taller de Montaje: razón social, domicilio, N.º CUIT y código | Actor regulatorio — TdM | Identificar la organización y el rol que cumple; conservar sus datos históricos en la ficha. El sello no determina por sí solo las responsabilidades jurídicas. |
| Código de PEC y datos del encabezado | Actor regulatorio — PEC | Mantener identidad y código separados del proveedor comercial. No suponer que todo PEC es proveedor o que CILGAS cumple todos los roles. |
| Fecha: habilitación y vencimiento | Servicio realizado / oblea / ficha técnica | La fecha de servicio y las fechas documentales son conceptos distintos. Confirmar significado y precisión antes de fijar validaciones. |
| N.º oblea: anterior / nueva | Oblea y antecedente documental | Guardar identificadores como texto. La oblea previa puede existir antes de la fecha de corte y debe poder referenciarse sin cargar un servicio histórico ficticio. |
| Tipo de operación: conversión C, modificación M, revisión anual R, desmontaje D, baja B | Servicio realizado / ficha técnica | Distinguir la operación documental del servicio del catálogo y de los ensayos efectuados. Conservar el código y su significado histórico. |
| Vehículo: marca, modelo, año y dominio | Vehículo | Recuperar datos actuales para preparar la ficha, sin que cambios posteriores alteren las fichas confirmadas. El dominio no debe ser la PK técnica. |
| Inyección: Sí / No | Vehículo | Dato lógico cuando se conoce; falta de dato no equivale automáticamente a No. |
| Tipo vehículo: taxi, pick-up, particular, bus, oficial, otros | Vehículo / ficha técnica | Usar clasificación controlada y conservar la descripción para Otros cuando corresponda. Confirmar si las opciones son excluyentes. |
| Propietario: apellido y nombres; tipo y N.º documento | Persona relacionada con el servicio, en rol de titular | Una persona relacionada no es un usuario del sistema. Conservar tipo y número documental por separado, como identificadores textuales. |
| Calle, N.º, piso/depto, CPA, localidad y provincia | Persona / domicilio histórico de la ficha | Mantener componentes independientes del domicilio. Altura, piso/depto y CPA no son cantidades para cálculos. |
| Teléfono | Persona / contacto histórico de la ficha | Texto para conservar prefijos y formato; no inventar un número cuando está vacío. |
| Regulador: montaje, desmontaje, baja; código y N.º serie | Componente individual e intervención del servicio | El papel prevé registrar el componente según su intervención. No reducirlo a un único regulador sobrescrito en el vehículo. |
| Regulador: nuevo / usado | Intervención del servicio y snapshot | La condición se registra en el contexto del trabajo. No representa necesariamente el estado actual de disponibilidad. |
| Cilindros: código, N.º serie, nuevo / usado | Componente individual — cilindro / intervención | Una fila identifica un componente involucrado. No usar columnas `cilindro1` a `cilindro4`. |
| Cilindros: fabricado mes/año | Componente individual — cilindro | Preservar la precisión mes/año; no inventar día. La ficha no aporta por sí sola todos los atributos técnicos del cilindro. |
| Cilindros: revisado mes/año y CRPC | Revisión de cilindro / actor regulatorio — CRPC | Separar el cilindro de sus revisiones sucesivas. Una fecha anotada puede ser un antecedente; no asumir que acredita un ensayo realizado en el servicio actual. |
| Cilindros y válvulas: indicar MSDB | Intervención del componente / ficha técnica | Conservar el código documental. La leyenda y la semántica exacta deben validarse; no expandir siglas por conjetura. |
| Válvula del cilindro: código y N.º serie | Componente individual — válvula / intervención / configuración del equipo | Conservar identidad e historial propios. Confirmar la relación de cada válvula con su cilindro; la ubicación del renglón no prueba la asociación. |
| Manómetro; accesorio para tubería; tubería de alta presión | Componente / intervención y ficha técnica | Cada sector contiene código y N.º serie. Registrar los componentes efectivamente involucrados según su tipo. |
| Dispositivo de sujeción del cilindro; electroválvula de nafta; electroválvula GNC; dosificador/mezclador; sistema de venteo; llave conmutadora | Componente / intervención y ficha técnica | La plantilla contempla código y N.º serie por sector. Una casilla en blanco no equivale a componente retirado ni a inexistencia confirmada. |
| Válvula de carga interna; válvula de carga externa; manguera de baja presión; caño de alta presión | Componente / intervención y ficha técnica | La ficha diferencia tubería y caño de alta presión; no fusionarlos sin consultar al responsable técnico. |
| Observaciones | Servicio realizado / ficha técnica | Texto libre complementario. No reemplaza campos estructurados como PH, resultado, fecha o intervención. |
| Firma y aclaración del titular del TdM | Ficha técnica / datos del firmante | Preparar el espacio correspondiente y los datos conocidos. La generación del PDF no constituye una firma. |
| Firma, aclaración y matrícula del responsable técnico del TdM y del PEC | Actor / responsable técnico y snapshot documental | Conservar rol y matrícula según corresponda. No generar firmas ni convertir un sello fotografiado en firma digital. |
| Firma, aclaración y documento del propietario | Persona titular / snapshot documental | Preparar los datos y espacio de firma. El archivo firmado digitalizado permanece fuera del MVP, conforme al alcance previo. |
| Leyendas preimpresas, declaraciones y advertencia de habilitación | Plantilla documental versionada | Reproducir únicamente la plantilla validada por el taller. La ficha no debe presentarse como autorización autónoma para cargar GNC. |

## Oblea, revisión quinquenal y prueba hidráulica

Las cinco fotografías muestran la misma estructura general de ficha técnica. No se observa un formulario independiente con columnas específicas para presión de ensayo, duración, mediciones o dictamen detallado de PH.

La ficha tiene campos de oblea anterior/nueva y una casilla «REVISIÓN ANUAL». En F01 la anotación `PH` se agrega a mano. Por lo tanto, el sistema debe registrar explícitamente el servicio y sus resultados técnicos: **buscar la palabra PH en observaciones o inferirla únicamente de la casilla de revisión anual sería insuficiente**.

En F03 la combinación de marcas parece distinta y necesita confirmación. No se establece una regla universal de impresión a partir de este caso aislado. El diseño conserva por separado:

1. el servicio del catálogo utilizado como punto de partida;
2. el servicio realizado y su operación documental;
3. cada revisión o ensayo de cilindro efectivamente realizado;
4. las intervenciones sobre componentes;
5. la oblea y demás resultados del servicio;
6. la ficha confirmada con la versión de plantilla correspondiente.

El [glosario](../../CONTEXT.md) ya distingue prueba hidráulica de revisión quinquenal. La inclusión de revisión anual, oblea y reemplazo de válvulas en la revisión quinquenal proviene del relevamiento operativo previo del proyecto; **las fotografías no prueban por sí solas una obligación normativa general**. Tampoco prueban que realizar PH obligue a cambiar el cilindro.

## Relaciones y cardinalidades propuestas

| Relación | Diseño propuesto | Fundamento y límite |
| --- | --- | --- |
| Vehículo — servicios realizados | 1 a muchos | Cada ficha principal describe un vehículo. La historia de servicios proviene del objetivo de trazabilidad del proyecto. |
| Servicio — personas relacionadas | Muchos vínculos mediante roles | La ficha identifica al titular. Los roles contacto y pagador proceden del alcance ya documentado, no de una casilla observada. |
| Vehículo — configuraciones | 1 a muchas históricas; como máximo una vigente | Regla del proyecto para reconstruir el equipo. La ficha describe una operación, no es una lista maestra editable. |
| Servicio — intervenciones de componentes | 1 a muchas | Un trabajo puede involucrar regulador, cilindros, válvulas y otros elementos. Cada intervención identifica al componente y la acción documentada. |
| Componente — intervenciones históricas | 1 a muchas | Identidad estable del componente, con participación sucesiva en trabajos distintos. |
| Cilindro — revisiones | 1 a muchas | La identidad del cilindro se conserva entre ensayos. Un servicio puede revisar varios cilindros. |
| Servicio / ficha — renglones de cilindro | Hasta cuatro renglones en la plantilla relevada | El máximo visible coincide con el alcance previo de hasta cuatro cilindros por revisión quinquenal. No se extrapola como máximo universal de cualquier vehículo o formato. |
| Cilindro — válvula | Asociación explícita en la configuración; cambios por intervención | F01 tiene una fila de cilindro y dos filas de válvulas ocupadas. No se deduce una pareja por posición de fila ni que ambas válvulas permanezcan instaladas. |
| Servicio — ficha y rectificaciones | Una ficha inicial y versiones posteriores enlazadas | ADR 0003: cada confirmación documental conserva un snapshot inmutable; la rectificación no sobrescribe la versión anterior. |
| Servicio — oblea / ensayo / otros resultados | Registros diferenciados según corresponda | No todo campo de salida está completado en las fotografías. La obligatoriedad final depende del tipo de trabajo validado. |

Los componentes retirados o dados de baja pueden figurar en una ficha aunque no integren la configuración resultante. Por esa razón, **composición del trabajo, configuración vigente y contenido de la ficha son conceptos relacionados, pero diferentes**.

## Información no demostrada por las imágenes

- No hay importes, costos, medios de pago, cupones, convenios ni movimientos financieros. Su diseño debe justificarse mediante la propuesta y reglas comerciales previas.
- No se puede identificar de manera confiable el significado de todas las anotaciones libres ni un campo oficial del identificador retornado por SICGNC.
- No se ven parámetros de ensayo ni el certificado detallado emitido por un CRPC. Sus campos, formato y obligatoriedad requieren otra fuente.
- Las fotografías no determinan unicidad global de números de serie, códigos de componentes, números de oblea o códigos regulatorios.
- No establecen las reglas actuales de habilitación, validez, rectificación ni las competencias legales de cada participante.
- No prueban que las cinco fichas estén terminadas, aprobadas o correctamente cargadas. No se usan sus vacíos como excepciones de validación.

## Pendientes concretos de validación

| ID | Pregunta | Efecto en el diseño / criterio de cierre |
| --- | --- | --- |
| RF-01 | ¿Cuál es la leyenda exacta de MSDB y cómo se aplica a cilindros y válvulas? | Confirmar catálogo de intervenciones y correspondencia con impresión, sin inferirlo de letras manuscritas. |
| RF-02 | ¿Cómo se relaciona cada válvula retirada o montada con el cilindro intervenido y qué debe imprimirse al reemplazar cuatro válvulas? | Validar asociación y ocho acciones (cuatro retiros y cuatro instalaciones) frente a cuatro casillas. Conservar todas las acciones en ítems/movimientos, sin emparejamientos automáticos ni omisiones documentales no autorizadas. Resolver el formato antes de emitir ese caso. |
| RF-03 | ¿Qué operación documental y anotación corresponden a PH y revisión quinquenal? ¿Qué representa F03? | Acordar una matriz servicio–operación–resultados–plantilla con el propietario y responsable técnico. |
| RF-04 | ¿Cuáles son la precisión y el significado de habilitación, vencimiento, fabricación y revisión? | Determinar qué campos usan fecha completa y cuáles mes/año; confirmar cálculo de vencimientos. |
| RF-05 | ¿Qué datos debe contener el resultado/certificado de PH y quién los emite? | Contrastar con certificado o modelo en blanco del CRPC antes de implementar esos campos. |
| RF-06 | ¿Qué combinación identifica inequívocamente un componente y cómo se tratan piezas sin serie? | Validar restricciones de unicidad y manejo de faltantes; nunca fabricar números de serie. |
| RF-07 | ¿Qué datos y firmas exige cada operación y qué sucede cuando falta alguno? | Definir validaciones de confirmación y mantener el borrador editable mientras se completa. |
| RF-08 | ¿Cuáles son los datos legales y responsables vigentes del TdM, PEC y CRPC? | Validar maestros y firmantes; conservarlos en cada snapshot para no reescribir documentos históricos. |
| RF-09 | ¿Qué representa y qué formato tiene el identificador devuelto por SICGNC? | Definir referencia externa y trazabilidad sin automatizar el sistema externo. |
| RF-10 | ¿Cómo se corrige una ficha ya presentada y se vincula su oblea? | Confirmar el circuito externo de rectificación, preservando siempre la versión previa según ADR 0003. |
| RF-11 | ¿Las categorías de vehículo son excluyentes y qué diferencia técnica hay entre tubería y caño de alta presión? | Cerrar catálogos y evitar fusionar conceptos diferentes de la plantilla. |

Estos pendientes no equivalen a aprobaciones. El diseño presentado debe revisarse explícitamente con la tutora y, posteriormente, con el comité antes de iniciar la implementación. Los controles técnicos y regulatorios se validarán con quienes tienen competencia sobre ellos.
