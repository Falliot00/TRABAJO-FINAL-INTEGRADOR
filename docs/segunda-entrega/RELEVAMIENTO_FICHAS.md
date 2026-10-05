# Relevamiento de fichas técnicas de CILGAS

**Entrega:** segunda entrega — Diseño y Módulos.

**Fecha de análisis:** 27/09/2026.

**Última precisión operativa:** 05/10/2026, respuestas explícitas del equipo en la conversación de trabajo.

**Estado:** evidencia relevada; etapa 2 aprobada según [APROBACION.md](APROBACION.md). Los pendientes técnicos y regulatorios mantienen su validación con el propietario y los responsables correspondientes.

## Objetivo y tratamiento de las fuentes

Se analizaron visualmente las cinco fotografías aportadas por el equipo para reconocer la estructura de la ficha utilizada en el taller y trasladar sus campos al diseño de datos. Se complementó esta lectura con el vocabulario de [CONTEXT.md](../../CONTEXT.md), la propuesta del [README](../../README.md) y el [ADR 0003](../adr/0003-preservar-fichas-confirmadas-como-snapshots.md).

Las fotografías contienen datos personales, dominios, documentos, firmas y sellos. **No se incorporan las imágenes ni la transcripción de esos datos al repositorio público.** Los identificadores F01–F05 permiten al equipo cotejar privadamente la evidencia. Este documento describe etiquetas y estructura, no casos reales identificables.

| Fuente | Nombre del archivo aportado | Evidencia útil y límites |
| --- | --- | --- |
| F01 | WhatsApp Image 2026-09-14 at 10.19.14.jpeg | Ficha completa. Se distingue revisión anual marcada y la anotación manuscrita `PH`. Según la aclaración del equipo, corresponden dos cilindros y dos válvulas; se corrige la lectura anterior de un cilindro y dos válvulas. |
| F02 | WhatsApp Image 2026-09-14 at 10.24.09.jpeg | Ficha completa. Se distingue revisión anual y dos filas de cilindros ocupadas. Las firmas y anotaciones no se transcriben. |
| F03 | WhatsApp Image 2026-09-14 at 10.35.01.jpeg | Ficha completa con varios campos aún vacíos. La combinación C + PH corresponde al circuito de conversión explicado por el equipo el 05/10/2026; no se presume que sus demás datos estén completos. |
| F04 | WhatsApp Image 2026-09-15 at 14.22.26.jpeg | Ficha completa fotografiada con inclinación y parte del encabezado tapada. Se distingue revisión anual. Se analizó solamente la hoja principal. |
| F05 | WhatsApp Image 2026-09-15 at 15.22.56.jpeg | Ficha parcialmente recortada en el borde inferior. Permite reconocer los campos de oblea anterior y nueva con valores cargados. |

La fecha del nombre de archivo identifica la fotografía; **no se utiliza como fecha del servicio**. Por sí sola, una casilla vacía no demuestra opcionalidad: puede tratarse de una ficha incompleta. En la segunda ronda del 05/10/2026 el equipo adoptó expresamente como criterio del proyecto exigir los campos completados en todas las imágenes y permitir opcionales los restantes, con prioridad para sus requisitos explícitos —por ejemplo, teléfono y oblea nueva— y para las condiciones del trabajo realizado. Las marcas manuscritas no establecen por sí solas una regla normativa.

El 02/10/2026 el equipo volvió a aportar estas mismas cinco fotografías. En ese momento ninguna resolvía cómo documentar cuatro recambios de válvula ni la matriz de operación y PH de F03. RF-02 y RF-03 quedaron pendientes. Las respuestas del 05/10/2026 resuelven la matriz de los casos descritos a continuación y la asociación de una fila con un cilindro y su respectiva válvula; queda precisar la representación de la válvula saliente en un recambio.

## Definiciones operativas confirmadas el 05/10/2026

La fuente de estas precisiones es la explicación explícita del equipo, acompañada por una captura de una conversación sobre MSDB y el recambio de una válvula. Se registra su contenido funcional sin incorporar la captura, datos personales, firmas ni sellos al repositorio público. Son reglas del circuito informado para CILGAS, no una afirmación de obligatoriedad normativa general.

| Tema | Definición confirmada | Alcance |
| --- | --- | --- |
| MSDB por componente | M = se monta; S = sigue instalado; D = se desmonta; B = se da de baja. | M no significa modificación: esa es la operación general de la ficha. Una S no debe producir una instalación nueva ficticia. |
| Número de oblea nueva | Se conocerá y debe pedirse en el sistema y registrarse en la base de datos. En modificación también se coloca una nueva con nuevo vencimiento. | El dato pertenece a la preparación y al resultado histórico; los blancos de las fotos no autorizan omitirlo. No se extrapola emisión a desmontaje o baja. |
| PH | La anotación PH significa que se realizó una prueba hidráulica. | Se conserva el ensayo por cilindro además de la operación de la ficha; no se infiere un resultado aprobado ni un recambio de cilindro. |
| Firmas y sellos | Se conservan los espacios y se completan manualmente después de generar e imprimir. | No se exige firma digital, imagen de firma ni sello o aclaración manuscrita ya completados para generar el PDF. Esto no elimina los datos de identificación del taller y PEC en el encabezado. |
| Desmontaje y baja | En desmontaje se retira el equipo y puede volver a montarse; en baja deja de ser reutilizable. | Debe distinguirse el retiro físico de la baja definitiva. |
| Válvula reemplazada | La captura ilustra una válvula anterior marcada B y el montaje de una nueva. | No transforma todo recambio en baja ni convierte el recambio en obligatorio para toda PH. Sigue vigente la composición ajustable acordada el 02/10/2026. |
| Fila cilindro–válvula | Una fila representa un cilindro y su respectiva válvula. En recambio se imprime la pareja resultante y se conserva la historia de ambas válvulas. | Se documenta la pareja explícita y se conserva la identidad de ambas piezas. Queda por precisar dónde se imprime la válvula saliente y su D/B. |
| Fechas y duración | Habilitación es la fecha del trabajo; la oblea dura un año y la PH cinco años; «Revisado mes/año» muestra la última PH. | Fabricación y PH son hechos distintos. Se conserva la precisión disponible, mes/año o día conocido, sin inventar días; falta definir el límite de vigencia. |
| Resultado y certificado PH | Para confirmar una PH se exige su resultado real conocido. El número de certificado puede quedar vacío si no está disponible. | Recomendaciones aceptadas por el equipo. Sin resultado, el servicio permanece en borrador; la ausencia del certificado no autoriza omitir la identificación del CRPC exigida por el modelo. |

| Trabajo | Operación general de ficha | PH | Oblea nueva |
| --- | --- | --- | --- |
| Renovación de oblea sin PH | R — revisión anual | No por el solo hecho de renovar | Sí |
| Servicio de PH por sí solo o revisión quinquenal del circuito documentado | R — revisión anual | Sí, con indicación PH y ensayos individuales | Sí, incluida en el servicio |
| Conversión: instalación del equipo desde cero en el vehículo | C — conversión | Sí: el equipo confirmó que se realiza siempre en este circuito | Registrar el número cuando se emite; habilitación = fecha del trabajo y duración de oblea = un año |
| Modificación con oblea aún vigente: cambio de válvula, dominio o corrección del trabajo | M — modificación | Si se hace PH junto con un cambio antes del vencimiento, el equipo indicó M; PH motivada por vencimiento usa R. Falta precisar a qué vencimiento refiere la condición. | Sí, oblea nueva con nuevo vencimiento; no se conserva automáticamente el plazo anterior |
| Desmontaje reutilizable | D — desmontaje | No se presume un ensayo | No se presume una emisión |
| Baja definitiva | B — baja | No se presume un ensayo | No se presume una emisión |

La inclusión de revisión anual y oblea nueva en la revisión quinquenal **ya estaba documentada** en el glosario y en las reglas del 02/10/2026. Las respuestas actuales precisan la leyenda MSDB y hacen explícita la correspondencia R + PH para el servicio de PH y C + PH para la conversión. No hace falta volver a preguntar esas definiciones.

### Respuestas a la ronda documental Q1–Q7

El equipo respondió la ronda y corrigió la propuesta de teléfono opcional: **teléfono es obligatorio**. Se registran las respuestas sin mantener abiertas las decisiones ya tomadas. Los datos pueden seguir incompletos en borrador; estos requisitos se refieren a confirmar y generar la ficha del trabajo.

| Pregunta | Respuesta del equipo | Consecuencia y límite |
| --- | --- | --- |
| Q1 — Datos base | Exigir marca, modelo, año, dominio, inyección y tipo de vehículo; nombre, tipo/número de documento, calle, altura, CPA, localidad, provincia y teléfono del titular. Piso/depto y observaciones opcionales; contemplar domicilio sin número. | Definición resuelta. Domicilio sin número es una condición explícita, no un número ficticio ni un dato olvidado. |
| Q2 — Fechas | Habilitación = fecha del trabajo; oblea un año; PH cinco años; «Revisado mes/año» = última PH. | Definidos significado y duración. La aceptación de Q8 conserva la precisión disponible y distingue fabricación de ensayo; Q9 mantiene pendiente el límite de vigencia. |
| Q3 — Accesorios | Exigir código/serie cuando corresponda documentarlos. Campos escritos en todas las fotos obligatorios; restantes pueden ser opcionales. Un blanco no significa que el accesorio no exista. | Criterio de opcionalidad adoptado por el equipo para el proyecto, con prioridad de requisitos expresos como teléfono y oblea nueva. No exigir accesorios no informados en la plantilla como si fueran inexistentes. |
| Q4 — Firmas y sellos | Conservar los espacios y completarlos a mano. | Resuelto el circuito: no exigir aclaraciones/matrículas impresas en los espacios que se completarán con firmas/sellos. Los maestros y el encabezado conservan su identificación propia. |
| Q5 — Resultado PH | Registrar valores del servicio y el resultado real disponible; algunos datos pueden ser opcionales. Nunca asumir aprobado porque el servicio diga PH. El equipo preguntó si fecha de ensayo era fabricación. | Son fechas distintas. La aceptación posterior de Q8 exige resultado real para confirmar y permite número de certificado ausente; ya no queda abierto el tratamiento del resultado desconocido. |
| Q6 — Fila | Una fila representa un cilindro y su respectiva válvula. | Asociación resuelta. La aceptación posterior de Q10 toma la pareja resultante para la fila; falta dónde se documenta la saliente. No se da por aprobado un anexo. |
| Q7 — Modificación | Se coloca oblea nueva con nuevo vencimiento. Con PH y cambio antes de vencer se marca M; si el servicio de PH es por vencimiento se marca R. | No conservar la oblea/plazo anterior por defecto. Precisar si «no venció» refiere a oblea o a PH para expresar la condición sin ambigüedad. |

### Aceptación de recomendaciones Q8–Q11 y precisiones restantes

El equipo aceptó las recomendaciones de la ronda y corrigió F01: **dos cilindros y dos válvulas**. La corrección se registra por su aclaración; se retira la lectura anterior como fundamento de un supuesto recambio. La aceptación resuelve las decisiones concretas propuestas, pero no selecciona entre alternativas que la recomendación todavía no había elegido.

| ID | Acuerdo registrado | Dato que todavía falta |
| --- | --- | --- |
| Q8 — Fecha y datos del ensayo | Conservar mes/año o fecha completa según la precisión conocida, sin inventar días. Exigir resultado real conocido para confirmar PH; número de certificado opcional si no está disponible. Fabricación y ensayo son distintos. | Ninguna selección adicional para esas recomendaciones. Se mantiene el CRPC requerido en el modelo vigente: no se propuso ni aceptó volverlo opcional. Adaptar el almacenamiento que actualmente exige día es trabajo de implementación. |
| Q9 — Vencimiento | Conservar la precisión real y usar un mismo criterio en alertas y validaciones; las duraciones de un año y cinco años ya están definidas. | Elegir el límite operativo: fin del mes indicado o aniversario exacto. La recomendación aceptada no había elegido entre ambos. |
| Q10 — Válvula reemplazada | Conservar ambas identidades y acciones en la historia e imprimir la pareja resultante en la fila. F01 representa dos parejas según su aclaración, no prueba la ubicación de una válvula saliente. | Definir dónde se consigna la saliente con D/B. No se aprobó un anexo ni una ubicación concreta para ella. |
| Q11 — M/R con PH | Determinar la operación según motivo y vigencia pertinente, no sólo por la presencia de una PH. | Identificar si «no venció» refiere a oblea, última PH o ambas. Aceptar ese criterio general no selecciona el antecedente. |

El circuito externo de rectificación y el formato SICGNC mantienen su alcance previo; no se reabre su relevamiento ni se usan como bloqueo general para estos casos.

## Campos observados y trazabilidad al modelo

Los nombres de la columna «Destino conceptual» designan conceptos del dominio. El diccionario de datos y el esquema SQL de esta entrega establecen sus nombres físicos, tipos y restricciones. Todos los valores impresos en una ficha confirmada deben quedar también dentro de su snapshot histórico, aunque provengan de una entidad maestra.

| Sector / etiqueta impresa | Destino conceptual | Criterio de diseño |
| --- | --- | --- |
| Taller de Montaje: razón social, domicilio, N.º CUIT y código | Actor regulatorio — TdM | Identificar la organización y el rol que cumple; conservar sus datos históricos en la ficha. El sello no determina por sí solo las responsabilidades jurídicas. |
| Código de PEC y datos del encabezado | Actor regulatorio — PEC | Mantener identidad y código separados del proveedor comercial. No suponer que todo PEC es proveedor o que CILGAS cumple todos los roles. |
| Fecha: habilitación y vencimiento | Servicio realizado / oblea / ficha técnica | Habilitación coincide con fecha del trabajo. Duraciones informadas: oblea un año y PH cinco años. Conservar precisión disponible sin inventar días (Q8); pendiente concretar límite de vigencia (Q9). |
| N.º oblea: anterior / nueva | Oblea y antecedente documental | Guardar identificadores como texto. El número nuevo será conocido y se solicita cuando se emite otra oblea, según respuesta del 05/10/2026. La oblea previa puede existir antes de la fecha de corte sin cargar un servicio histórico ficticio. |
| Tipo de operación: conversión C, modificación M, revisión anual R, desmontaje D, baja B | Servicio realizado / ficha técnica | Distinguir la operación documental del servicio del catálogo y de los ensayos efectuados. Conservar el código y su significado histórico. |
| Vehículo: marca, modelo, año y dominio | Vehículo | Recuperar datos actuales para preparar la ficha, sin que cambios posteriores alteren las fichas confirmadas. El dominio no debe ser la PK técnica. |
| Inyección: Sí / No | Vehículo | Dato lógico cuando se conoce; falta de dato no equivale automáticamente a No. |
| Tipo vehículo: taxi, pick-up, particular, bus, oficial, otros | Vehículo / ficha técnica | Usar clasificación controlada y conservar la descripción para Otros cuando corresponda. Confirmar si las opciones son excluyentes. |
| Propietario: apellido y nombres; tipo y N.º documento | Persona relacionada con el servicio, en rol de titular | Una persona relacionada no es un usuario del sistema. Conservar tipo y número documental por separado, como identificadores textuales. |
| Calle, N.º, piso/depto, CPA, localidad y provincia | Persona / domicilio histórico de la ficha | Mantener componentes independientes del domicilio. Altura, piso/depto y CPA no son cantidades para cálculos. |
| Teléfono | Persona / contacto histórico de la ficha | Obligatorio por decisión del equipo en Q1; texto para conservar prefijos y formato. Si falta, completarlo antes de confirmar, sin inventarlo. |
| Regulador: montaje, desmontaje, baja; código y N.º serie | Componente individual e intervención del servicio | El papel prevé registrar el componente según su intervención. No reducirlo a un único regulador sobrescrito en el vehículo. |
| Regulador: nuevo / usado | Intervención del servicio y snapshot | La condición se registra en el contexto del trabajo. No representa necesariamente el estado actual de disponibilidad. |
| Cilindros: código, N.º serie, nuevo / usado | Componente individual — cilindro / intervención | Una fila identifica un componente involucrado. No usar columnas `cilindro1` a `cilindro4`. |
| Cilindros: fabricado mes/año | Componente individual — cilindro | Preservar la precisión mes/año; no inventar día. La ficha no aporta por sí sola todos los atributos técnicos del cilindro. |
| Cilindros: revisado mes/año y CRPC | Revisión de cilindro / actor regulatorio — CRPC | «Revisado» muestra la última PH; puede ser un antecedente y no acredita por sí solo una PH del servicio actual. Fabricación y ensayo se conservan separados. |
| Cilindros y válvulas: indicar MSDB | Intervención del componente / ficha técnica | Leyenda confirmada: M se monta, S sigue instalado, D se desmonta, B se da de baja. Contrastar cada marca con las acciones reales; no deducir posiciones ni asociaciones a partir de la letra. |
| Válvula del cilindro: código y N.º serie | Componente individual — válvula / intervención / configuración del equipo | Una fila representa el cilindro y su válvula, según Q6. En recambio imprime la pareja resultante y conserva ambas válvulas en la historia; resta dónde se imprime la saliente (Q10). |
| Manómetro; accesorio para tubería; tubería de alta presión | Componente / intervención y ficha técnica | Cada sector contiene código y N.º serie. Registrar los componentes efectivamente involucrados según su tipo. |
| Dispositivo de sujeción del cilindro; electroválvula de nafta; electroválvula GNC; dosificador/mezclador; sistema de venteo; llave conmutadora | Componente / intervención y ficha técnica | La plantilla contempla código y N.º serie por sector. Una casilla en blanco no equivale a componente retirado ni a inexistencia confirmada. |
| Válvula de carga interna; válvula de carga externa; manguera de baja presión; caño de alta presión | Componente / intervención y ficha técnica | La ficha diferencia tubería y caño de alta presión; no fusionarlos sin consultar al responsable técnico. |
| Observaciones | Servicio realizado / ficha técnica | Texto libre complementario. No reemplaza campos estructurados como PH, resultado, fecha o intervención. |
| Firma y aclaración del titular del TdM | Ficha técnica / datos del firmante | Preparar el espacio correspondiente y los datos conocidos. La generación del PDF no constituye una firma. |
| Firma, aclaración y matrícula del responsable técnico del TdM y del PEC | Actor / responsable técnico y snapshot documental | Conservar los espacios para firmas y sellos manuales. Los datos conocidos del actor pueden conservarse históricamente sin exigir que el sello ya esté completado al generar. |
| Firma, aclaración y documento del propietario | Persona titular / snapshot documental | Preparar los datos y espacio de firma. El archivo firmado digitalizado permanece fuera del MVP, conforme al alcance previo. |
| Leyendas preimpresas, declaraciones y advertencia de habilitación | Plantilla documental versionada | Reproducir únicamente la plantilla validada por el taller. La ficha no debe presentarse como autorización autónoma para cargar GNC. |

## Oblea, revisión quinquenal y prueba hidráulica

Las cinco fotografías muestran la misma estructura general de ficha técnica. No se observa un formulario independiente con columnas específicas para presión de ensayo, duración, mediciones o dictamen detallado de PH.

La ficha tiene campos de oblea anterior/nueva y una casilla «REVISIÓN ANUAL». En F01 la anotación `PH` se agrega a mano. Por lo tanto, el sistema debe registrar explícitamente el servicio y sus resultados técnicos: **buscar la palabra PH en observaciones o inferirla únicamente de la casilla de revisión anual sería insuficiente**.

La combinación de F03 se corresponde con C + PH, según la explicación del equipo del 05/10/2026. Esta regla se registra por esa explicación y no como deducción universal de una fotografía aislada. El diseño conserva por separado:

1. el servicio del catálogo utilizado como punto de partida;
2. el servicio realizado y su operación documental;
3. cada revisión o ensayo de cilindro efectivamente realizado;
4. las intervenciones sobre componentes;
5. la oblea y demás resultados del servicio;
6. la ficha confirmada con la versión de plantilla correspondiente.

El [glosario](../../CONTEXT.md) distingue prueba hidráulica de revisión quinquenal. La revisión anual y la oblea incluidas en la revisión quinquenal provienen del relevamiento operativo. El equipo precisó el 02/10/2026 que el reemplazo de válvulas se propone por defecto y puede ajustarse por cilindro según el trabajo realizado; **las fotografías no prueban por sí solas una obligación normativa general**. Tampoco prueban que realizar PH obligue a cambiar el cilindro.

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
| Cilindro — válvula | Asociación explícita en la configuración; una pareja por fila según Q6 | El equipo aclaró que F01 representa dos cilindros y dos válvulas. La pareja resultante por fila está definida; la ubicación documental de la saliente en un recambio sigue siendo una pregunta independiente (Q10). |
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

## Estado de las validaciones

Se conservan los identificadores originales para mantener trazabilidad. Un cierre de definición no acredita que su regla ya esté implementada. Q1–Q7 registran las respuestas recibidas; la aceptación de Q8–Q11 resuelve resultado, certificado, precisión conocida e historia de válvulas. Sólo Q9–Q11 conservan las selecciones concretas indicadas en su tabla.

| ID | Pregunta | Efecto en el diseño / criterio de cierre |
| --- | --- | --- |
| RF-01 | Leyenda MSDB confirmada el 05/10/2026. | **Definición resuelta:** M monta, S sigue instalado, D desmonta, B baja. Pendiente implementar coherencia con acciones, configuración y baja irreversible; eso es trabajo técnico, no una duda sobre la leyenda. |
| RF-02 | Asociación por fila y pareja resultante en recambio resueltas; ubicación de la saliente todavía pendiente. | Conservar todas las identidades y acciones reales; Q10 precisa dónde se imprime la saliente, especialmente con cuatro recambios. No reiterar la pregunta de asociación ya respondida. |
| RF-03 | Operación para servicio de PH, revisión quinquenal y conversión confirmada el 05/10/2026; modificación con PH precisada en Q7. | R + PH con oblea nueva para servicio de PH/quinquenal; C + PH para conversión. Q7 indica M ante cambio con vigencia previa y R si PH es por vencimiento; Q11 precisa qué vigencia distingue esos casos. Registrar los ensayos por separado sin volver a preguntar F03. |
| RF-04 | Habilitación = fecha del trabajo; oblea un año; PH cinco años; «Revisado» = última PH. Se conserva la precisión conocida. | Definidos significado, duración y tratamiento de fechas parciales. Q9 conserva pendiente el límite de vigencia; no confundir fabricación con ensayo ni repetir los plazos ya informados. |
| RF-05 | Resultado real obligatorio para confirmar PH; número de certificado opcional si no está disponible. | Q8 resuelto: sin resultado no se confirma; no deducir aprobado ni inventar mediciones o certificados. Se mantiene la identificación de CRPC requerida por el modelo. |
| RF-06 | ¿Qué combinación identifica inequívocamente un componente y cómo se tratan piezas sin serie? | Validar restricciones de unicidad y manejo de faltantes; nunca fabricar números de serie. |
| RF-07 | Matriz base, teléfono obligatorio, piso/depto y observaciones opcionales, domicilio sin número, accesorios condicionales y firmas/sellos manuales definidos. Resultado PH conocido y certificado opcional según Q8. | Oblea nueva también en modificación. Los pendientes de esta ronda se reducen al límite de vigencia, representación del recambio y antecedente de M/R (Q9–Q11), sin exigir firmas o sellos previos a generar. |
| RF-08 | Identidad de TdM, PEC y CRPC separada de firma/sello manual. | La identificación del encabezado y los actores se conserva desde maestros. El circuito de firmas/sellos ya está resuelto; la vigencia de valores reales se verifica al configurarlos, no se infiere de las fotos ni obliga a digitalizar sellos. |
| RF-09 | ¿Qué representa y qué formato tiene el identificador devuelto por SICGNC? | Definir referencia externa y trazabilidad sin automatizar el sistema externo. |
| RF-10 | ¿Cómo se corrige una ficha ya presentada y se vincula su oblea? | Confirmar el circuito externo de rectificación, preservando siempre la versión previa según ADR 0003. |
| RF-11 | ¿Las categorías de vehículo son excluyentes y qué diferencia técnica hay entre tubería y caño de alta presión? | Cerrar catálogos y evitar fusionar conceptos diferentes de la plantilla. |

La aprobación académica registrada habilita avanzar al desarrollo. Las definiciones operativas aportadas por el equipo se registran como tales y sólo quedan abiertas las preguntas no respondidas. Las fotografías y estas precisiones no certifican por sí mismas habilitaciones jurídicas; tampoco corresponde mantener como desconocidas la leyenda MSDB, la matriz C/R + PH o la firma posterior en papel.
