import { createHash } from "node:crypto";

import { TOKENS_LEGALES } from "@/lib/legal-data";

/**
 * Registro de los documentos legales: version, fecha y contenido (RF-6).
 *
 * Modulo puro en cuanto a datos: sin React, sin base de datos y sin DOM. Lo
 * único que **no** es puro, a proposito, es {@link serializarParaHuella}, que
 * usa `node:crypto` porque la huella **es** un hash. `node:crypto` viene con
 * Node: no es una dependencia nueva.
 *
 * ## EL CRITERIO DE REDACCION, y es lo único que importa al leer este fichero
 *
 * Los documentos legales de {{NOMBRE_COMERCIAL}} son un **entregable**, no un
 * borrador. Decidido por el propietario: **no hay ninguna marca de "pendiente"
 * de revisión legal**, porque un sitio lleno de marcas de "esto falta" se ve
 * inacabado, y es el propietario quien decide su propia exposicion legal.
 *
 * El criterio con el que esta escrito cada parrafo es uno solo, y conviene
 * tenerlo presente al tocar cualquier texto de aqui:
 *
 *  - **Un compromiso, no una declaracion.** No se escribe "se cumple la
 *    LFPDPPP" ni "100% conforme": eso no se puede comprobar y no lo firma
 *    nadie. Se escribe **lo que el negocio hace, con numero**: "responde en un
 *    plazo máximo de 20 dias habiles", "conserva la solicitud 12 meses".
 *  - **Un compromiso se puede cumplir y se puede auditar.** Un "se cumple la
 *    norma" no lo puede cumplir nadie porque no dice nada concreto.
 *  - **La honestidad con el codigo no se negocia.** Estos textos describen lo
 *    que el sistema **realmente** hace: no hay proveedor de correo, ni
 *    analitica, ni pasarela de pago, porque no existen. Donde el sistema no
 *    puede cumplir algo, **no se promete**: es preferible un texto honesto y
 *    corto a uno que comprometa lo que el software no controla.
 *  - **Ni un dato inventado.** Los huecos de los datos del propietario no se
 *    rellenan aqui: el texto usa el token `{{RFC}}` y quien lo pinte lo resuelve
 *    con `interpolar()` de `legal-data.ts`, que sale con su marcador si el dato
 *    no esta. Escribir el dato a mano en un texto seria justo lo que RF-2
 *    prohibe.
 */

/** Una seccion de un documento legal. */
export type Seccion = {
  titulo: string;
  /** Un parrafo por elemento. Se renderizan como parrafos, no como HTML. */
  cuerpo: string[];
};

/** Un documento legal con su version y su fecha. */
export type Documento = {
  slug: string;
  titulo: string;
  /** Version semantica corta: `1.0`, `1.1`. Sube al cambiar el texto. */
  version: string;
  /** Fecha de la ultima actualizacion, en `AAAA-MM-DD`. */
  actualizadoEn: string;
  /** Primeros 12 hex del sha256 del contenido. Ver {@link serializarParaHuella}. */
  huella: string;
  contenido: Seccion[];
};

/** Tipo de `LegalDocType` en Prisma: los tres que se aceptan al cotizar. */
export type TipoLegalDoc = "TERMINOS" | "PRIVACIDAD" | "COOKIES";

/**
 * Los siete documentos de RF-5.
 *
 * El orden es el de la spec y se comprueba con un test: siete, ni seis ni ocho.
 * Anadir un documento legal sin actualizar RF-5 debe dejar el test en rojo.
 */
export const DOCUMENTOS: readonly Documento[] = [
  {
    slug: "terminos-y-condiciones",
    titulo: "Términos y condiciones",
    version: "1.0",
    actualizadoEn: "2026-10-06",
    huella: "22ef2bac4011",
    contenido: [
      {
        titulo: "Quiénes somos y qué es este sitio",
        cuerpo: [
          "Este sitio pertenece a {{NOMBRE_COMERCIAL}} y muestra un catálogo de productos: Pines, llaveros y productos de impresión 3D. La denominación comercial del negocio es {{NOMBRE_COMERCIAL}} y su razón social es {{RAZON_SOCIAL}}.",
          "Lo que aparece en el sitio es un catálogo. No hay carrito de compra con pago: hay un formulario de solicitud de cotización. Enviar ese formulario **no compra nada**, es el paso inicial de una conversación comercial.",
        ],
      },
      {
        titulo: "Qué pasa cuando envías una solicitud de cotización",
        cuerpo: [
          "Al enviar el formulario se crea una solicitud de cotización a la que queda asociada la información que escribiste: nombre, correo, teléfono, dirección de entrega, productos y cantidades. La solicitud se guarda **12 meses** desde su creación para preparar la cotización y atenderla.",
          "El precio que ves junto a cada producto es el **precio de catálogo**. El precio final se confirma después, por escrito, cuando la solicitud se revisa y se acuerda con quien la hizo. Lo que se ve en pantalla no es una oferta cerrada, y el precio que se acuerde puede ser distinto del que aparece en el catálogo.",
          "**Contamos con responderte en un plazo máximo de 5 días hábiles** desde que se recibe la solicitud. Ese plazo corre en el calendario del negocio, no en el software: el sitio no lleva el reloj de la atención, así que no puede avisarte por si se pasa. Lo que sí puedes comprobar por escrito es el estado de la solicitud, que se actualiza a mano.",
        ],
      },
      {
        titulo: "De los productos y la personalización",
        cuerpo: [
          "Los Pines y los llaveros **no** se personalizan: se entregan tal como están en el catálogo. Los productos de impresión 3D **si** se personalizan a partir del archivo que aporta quien compra, y por eso **no admiten devolución por cambio de opinión**: una pieza impresa con los datos de otra persona no se puede revender.",
          "La regla se decide **por categoría**, no producto a producto, así que el catálogo es lo que manda: si un producto aparece en una categoría personalizable, se personaliza. Cuando un producto se personaliza por encargo, el precio se calcula sobre esa pieza y no sobre un producto de catálogo.",
        ],
      },
      {
        titulo: "Cuenta y acceso",
        cuerpo: [
          "Existe una cuenta de cliente para dejar datos de contacto y ver el historial de solicitudes. **No hay registro público**: las cuentas las crea quien administra el negocio, así que no cualquiera puede abrir una cuenta por su cuenta.",
          "**La sesión dura 8 horas.** Pasado ese tiempo hay que volver a entrar. Y al cambiar la contraseña **se cierran todas las sesiones abiertas**, incluida la del dispositivo que la cambio: si alguien robo una contraseña, cambiarla corta el acceso desde el momento.",
          "Este sitio **no ofrece descarga de datos ni borrado de cuenta** desde la propia página, y no existe ningún botón para hacerlo, porque la función no está implementada. Las dos solicitudes se hacen **por escrito** al contacto del aviso de privacidad, y se atienden en un plazo máximo de **20 días hábiles**.",
        ],
      },
      {
        titulo: "Cambio de este documento",
        cuerpo: [
          "Cada versión tiene su propia fecha. Cuando el texto cambia, la versión sube y la fecha se actualiza. Al enviar una solicitud queda registrada la versión de estos términos que estaba vigente en ese momento, de modo que siempre se puede saber que texto se acepto.",
        ],
      },
    ],
  },
  {
    slug: "aviso-de-privacidad",
    titulo: "Aviso de privacidad",
    version: "1.0",
    actualizadoEn: "2026-10-06",
    huella: "0f021e275584",
    contenido: [
      {
        titulo: "Quién es el responsable",
        cuerpo: [
          "El responsable de los datos personales es {{RAZON_SOCIAL}}, con RFC {{RFC}} y domicilio fiscal {{DOMICILIO_FISCAL}}. La persona responsable de privacidad es {{RESPONSABLE_PRIVACIDAD}} y se puede escribir a {{CORREO_CONTACTO}}.",
          "Las solicitudes de derechos se atienden **por escrito**, en un plazo máximo de **20 días hábiles** contados desde su recepción, y se responden a la misma dirección de correo desde la que se reciben.",
        ],
      },
      {
        titulo: "Qué datos se recogen y por qué",
        cuerpo: [
          "**Solo se recogen los datos que hacen falta para poder cotizar, y nada más.** Al enviar una solicitud de cotización se guardan el nombre, el correo, el teléfono, la dirección de entrega, los productos y sus cantidades, y la fecha en que se creo la solicitud. Al crear una cuenta de cliente se guardan el correo, la contraseña cifrada y el nombre visible. No se recoge ningún otro dato, y en particular **no** se guardan ni la dirección IP ni datos de navegación.",
          "La contraseña se guarda **cifrada con un algoritmo de derivación lento**, y nunca en claro: nadie, ni siquiera quien administra el negocio, puede leerla desde la base de datos. Si se pierde, no se puede recuperar ni ver: hay que escribir una nueva.",
          "**Este sitio no envía comunicaciones electrónicas, ni promociones, ni recordatorios.** No hay un servicio de correo configurado, así que no se manda ninguna notificación automática. La atención se hace contestando a lo que la persona escriba, por el medio que ella use. Por eso **no hay ningún consentimiento que recoger al registrarse**: no se pide permiso para algo que no se manda. El único registro de aceptación que existe es el de la versión de este aviso y de los términos, y se anota **solo** cuando alguien envía una cotización.",
          "**Este sitio no ofrece descarga de datos ni borrado de cuenta desde la página**, y no existe ningún botón que lo haga. Las dos solicitudes se hacen por escrito al contacto de arriba, y se atienden en **20 días hábiles** como máximo.",
        ],
      },
      {
        titulo: "Cookies y almacenamiento local",
        cuerpo: [
          "**Este sitio no usa cookies de terceros ni técnicas de seguimiento.** La única cookie es `pp_session`, que es necesaria: guarda la sesión de quien ha entrado, caduca a las 8 horas, es `HttpOnly` (no la puede leer ningún script de la página), es `SameSite=Lax` y va con `Secure` en producción.",
          "En el almacenamiento local del navegador hay una sola clave, `pingo-quote-cart`, que es **funcional**: guarda lo que has metido en el carrito para que la cotización se pueda enviar. Sin ella no se podría completar el formulario.",
          "No hay Publicidad, ni medición de audiencia, ni analítica. Ninguna entrada de la política de cookies corresponde a una tecnología que este repositorio no tenga.",
        ],
      },
      {
        titulo: "La dirección IP",
        cuerpo: [
          "La dirección IP **no se persiste**: no va a la base de datos ni a los registros del sistema. Se lee únicamente para contar peticiones en un contador que vive en memoria del servidor, y ese contador se pierde al reiniciar el servidor. No se usa para decidir a quien se le muestra algo.",
        ],
      },
      {
        titulo: "Sus derechos",
        cuerpo: [
          "Los derechos se ejercen **por escrito**, no desde un botón, y se responden **en un plazo máximo de 20 días hábiles** desde su recepción. No hay registro público y por tanto no hay una cuenta que el visitante pueda abrir ni borrar por si mismo: se escribe al contacto indicado arriba y se contesta a esa misma dirección.",
          "Los derechos que se atienden son **acceso** (saber que datos hay), **rectificación** (corregir un dato equivocado), **cancelación** (cancelar una solicitud en curso), **oposición** (oponerse a un uso) y **eliminación** (borrar los datos de una solicitud concreta). Los cinco se atienden **sin costo** para quien los ejerce.",
          "Una solicitud se elimina desde el panel de cotizaciones, junto con sus partidas, **en una sola operación**, de modo que no quedan productos sueltos sin la solicitud a la que pertenecen. La cuenta de cliente se elimina de la base de datos por quien administra el negocio, no desde la página.",
        ],
      },
      {
        titulo: "Cuánto tiempo se guardan",
        cuerpo: [
          "Las solicitudes de cotización se conservan **12 meses** desde su creación. Ese es el plazo, y no se alarga por nada: al mes 13 la solicitud aparece marcada en el panel para que una persona decida que hacer con ella.",
          "Cumplidos los 12 meses **el sistema no borra nada por si solo**. Es una decisión deliberada: un borrado automático y silencioso es irreversible, y una solicitud puede estar en discusión. Quien decide borrar, borra; quien no, la tiene a la vista.",
          "Los datos de la cuenta de cliente se conservan **mientras la cuenta exista**. Los registros de que versión de los documentos se acepto se guardan **junto a la solicitud**, y se borran con ella.",
        ],
      },
      {
        titulo: "Cambio de este aviso",
        cuerpo: [
          "Cada versión tiene su propia fecha, y ambas aparecen al principio de esta página. Al enviar una solicitud queda anotada **que versión de este aviso estaba vigente ese día**, de modo que siempre se puede saber que texto se acepto y no solo el de hoy.",
          "No se envían comunicaciones electrónicas, así que **no hay ninguna otra vía por la que se avise de un cambio**: la única forma de enterarse es volver a esta página. Quien tenga cotizaciones abiertas puede preguntar por la versión vigente al escribir.",
        ],
      },
    ],
  },
  {
    slug: "politica-de-cookies",
    titulo: "Política de cookies",
    version: "1.0",
    actualizadoEn: "2026-10-06",
    huella: "8b9a18cf2f95",
    contenido: [
      {
        titulo: "Qué cookies usa este sitio",
        cuerpo: [
          "Una sola: `pp_session`. No hay cookies de terceros, ni publicidad, ni medición de audiencia, ni ninguna técnica de seguimiento.",
        ],
      },
      {
        titulo: "La cookie `pp_session`",
        cuerpo: [
          "Es **necesaria**: sin ella no se puede saber quien ha entrado. Guarda la sesión, no datos de contenido.",
          "Sus valores, tal y como están definidos en el código: caduca a las **8 horas**; es `HttpOnly`, así que el navegador no la expone a los scripts de la página; es `SameSite=Lax`; y lleva `Secure` cuando el sitio corre en producción. Solo se envía al propio dominio.",
        ],
      },
      {
        titulo: "El almacenamiento local",
        cuerpo: [
          "En `localStorage` hay una única clave: `pingo-quote-cart`. Es **funcional**, no de seguimiento: guarda los productos del carrito para que la solicitud se pueda enviar. No contiene datos identificables y desaparece si el visitante borra el almacenamiento del navegador.",
        ],
      },
      {
        titulo: "Por qué no hay banner de cookies",
        cuerpo: [
          "No se muestra banner de consentimiento porque **no hay ninguna tecnología no esencial que lo requiera**: ni analítica, ni publicidad, ni redes sociales, ni ningún recurso de terceros. Todo lo que el sitio carga viene de este mismo servidor.",
          "Pedir permiso para algo que no se usa sería hacer perder tiempo al visitante, y guardar esa respuesta sería guardar un dato que nadie ha pedido dar. Así que **no se guarda ninguna decisión de consentimiento**: en el almacenamiento local del navegador no hay ninguna clave de ese tipo, y eso se puede comprobar.",
          "Si alguna vez se añade una tecnología que necesite consentimiento, este documento **cambia, sube de versión y aparece un panel** con las cuatro categorías (necesarias, analíticas, marketing y preferencias) y tres vías: aceptar, rechazar y configurar. Aceptar y rechazar tendrán exactamente el mismo peso visual, para que rechazar sea tan fácil como aceptar.",
        ],
      },
      {
        titulo: "Cómo borrar lo que hay guardado",
        cuerpo: [
          "Cerrando la sesión, la cookie `pp_session` se elimina. El contenido de `localStorage` se borra vaciando el carrito o desde las opciones del navegador.",
        ],
      },
    ],
  },
  {
    slug: "politica-de-envios",
    titulo: "Política de envíos",
    version: "1.0",
    actualizadoEn: "2026-10-06",
    huella: "0c81a8d7659d",
    contenido: [
      {
        titulo: "Cómo se entrega",
        cuerpo: [
          "La entrega se hace **solo en México**. No se envía a otros países y este documento no ofrece esa posibilidad.",
          "La compra se cierra por escrito: se revisa la solicitud, se acuerda el precio y la forma de entrega, y se confirma. **No hay pago en línea**: este sitio no tiene pasarela de pago, ni acepta tarjetas, ni cobra nada desde el navegador.",
        ],
      },
      {
        titulo: "Plazos",
        cuerpo: [
          "**Este documento no fija un plazo de entrega, porque no sería verdad.** El sistema no lleva el control de los tiempos de producción ni de transportista, así que cualquier cifra escrita aquí sería una promesa que nadie podría cumplir.",
          "Lo que sí se compromete es esto: el plazo concreto **se escribe en la cotización** antes de cobrar nada, y ese plazo es el que vale. Si el pedido necesita una pieza impresa a medida, el plazo se cuenta desde que se recibe el archivo y se confirma que sirve, no desde el día de la solicitud.",
          "Contamos con **responder la cotización en 5 días hábiles** desde que se recibe la solicitud. Si se pasa de ese plazo, la respuesta escrita lleva el motivo, porque un retraso sin explicación es peor que un retraso.",
        ],
      },
      {
        titulo: "Envío y cancelación",
        cuerpo: [
          "Una solicitud de cotización **se puede cancelar sin costo** en cualquier momento antes de que se cierre el pedido, y la cancelación se atiende por escrito. **No hay penalización por cancelar**: no se ha cobrado nada todavía.",
          "La cancelación se confirma por escrito en un plazo máximo de **5 días hábiles** desde que se recibe el aviso. Los detalles completos están en la política de cambios, cancelaciones y devoluciones.",
        ],
      },
    ],
  },
  {
    slug: "cambios-y-devoluciones",
    titulo: "Cambios, cancelaciones y devoluciones",
    version: "1.0",
    actualizadoEn: "2026-10-06",
    huella: "16067b6e75bf",
    contenido: [
      {
        titulo: "No hay pago en línea, y por eso no hay reembolso",
        cuerpo: [
          "Este sitio **no cobra nada**: no hay pasarela de pago, ni tarjeta, ni pago desde el navegador, ni datos bancarios se piden en ningún momento. Lo que se envía desde el catálogo es una **solicitud de cotización**, no una compra.",
          "Por eso **no hay reembolso**: no se ha cobrado ningún dinero. Quien devuelve un producto ya entregado ya ha pagado por el, y por tanto ya no está en este documento sino en el de devoluciones.",
          "El precio que aparece junto a cada producto es el **precio de catálogo hasta confirmar la cotización**. El precio final se acuerda **por escrito** antes de cerrar el pedido, y ese es el único que se cobra.",
        ],
      },
      {
        titulo: "Cancelar una solicitud",
        cuerpo: [
          "Una solicitud se puede cancelar **sin costo** mientras no se haya cerrado el pedido, y **no hay penalización por hacerlo**: no se ha cobrado nada todavía. Se avisa por escrito al contacto del aviso de privacidad.",
          "El panel de cotizaciones es la vía por la que se atiende la cancelación: desde ahí se cambia el estado a cancelada y **la solicitud se elimina junto con sus partidas en una sola operación**. Se confirma por escrito en un plazo máximo de **5 días hábiles** desde el aviso.",
        ],
      },
      {
        titulo: "Garantía del producto entregado",
        cuerpo: [
          "Una vez entregado el producto y cobrado el precio acordado, se aplica **una garantía de 3 meses** sobre defectos de fabricación y materiales. La garantía cubre el producto que no funciona como se ofrecio y **no** cubre el desgaste por uso, ni los daños causados por el transporte, ni los cambios de opinión sobre el diseño.",
          "Las condiciones concretas de la garantía **se escriben en la confirmación del pedido**, antes de cobrar: que cubre, que no, y cómo se hace la reclamación. Si un producto llega con defecto, se avisa **dentro de los primeros 30 días** desde la entrega, y se responde por escrito en un plazo máximo de **5 días hábiles**.",
          "La garantía del producto es una cosa distinta de la devolución de un pago, que aquí no existe porque no hay pago por el navegador.",
        ],
      },
      {
        titulo: "Productos personalizados",
        cuerpo: [
          "Los productos de impresión 3D se hacen a partir de un archivo que aporta quien compra, y **no admiten devolución por cambio de opinión**: una pieza con los datos o el diseño de otra persona no se puede revender ni guardar.",
          "Si el archivo resulta no ser imprimible, o el resultado no corresponde a lo pedido, el problema se resuelve **sin costo**: se reimprime o se devuelve el importe. Ese caso es un error nuestro y se asume como tal.",
          "Los productos personalizables que **no** tengan este problema siguen la misma garantía de 3 meses que el resto del catálogo. Lo que no se aplica es la devolución por arrepentimiento, y eso se dice antes de cobrar, en la confirmación del pedido.",
        ],
      },
    ],
  },
  {
    slug: "informacion-legal",
    titulo: "Información legal",
    version: "1.0",
    actualizadoEn: "2026-10-06",
    huella: "a652f07df766",
    contenido: [
      {
        titulo: "Datos del negocio",
        cuerpo: [
          "Nombre comercial: {{NOMBRE_COMERCIAL}}. Razón social: {{RAZON_SOCIAL}}. RFC: {{RFC}}. Domicilio fiscal: {{DOMICILIO_FISCAL}}. Correo: {{CORREO_CONTACTO}}. Teléfono: {{TELEFONO}}.",
          "Los datos de contacto se revisan **cada 3 meses** y se actualizan en cuanto cambian. Si alguno de los que aparecen aquí está sin rellenar, significa que todavía no se ha cargado, y se acepta por escrito al correo o teléfono que sí tenga.",
        ],
      },
      {
        titulo: "Sobre la procedencia de las imágenes y las fuentes",
        cuerpo: [
          "Cada recurso visual y tipográfico del sitio tiene su origen escrito en el repositorio, y el inventario se revisa **cada 6 meses**. Cuando no se sabe de dónde viene una imagen o una fuente, **no se publica**: es preferible un hueco a un recurso sin procedencia.",
          "Los iconos vienen de una librería de código abierta y se usan bajo su licencia; las tipografías que se muestran en pantalla están igualmente documentadas. El sitio **no se atribuye la autoría de un recurso cuya procedencia no esté registrada**, y eso se comprueba leyendo el inventario, no este texto.",
          "Los datos que envía quien compra (una dirección de correo, un nombre, un archivo de diseño) son suyos: se usan **solo** para preparar la cotización y el envío, y no se ceden a nadie ni se usan para publicidad, porque no hay publicidad.",
          "Si un material del sitio aparece con derechos de otra persona, se retira y se responde por escrito en un plazo máximo de **5 días hábiles** desde el aviso.",
        ],
      },
      {
        titulo: "Lenguaje y errores",
        cuerpo: [
          "Los textos de este sitio están en castellano. Si encuentra una errata en un documento legal, se avisa al contacto del aviso de privacidad.",
        ],
      },
    ],
  },
  {
    slug: "accesibilidad",
    titulo: "Accesibilidad",
    version: "1.0",
    actualizadoEn: "2026-10-06",
    huella: "1d9aff04245d",
    contenido: [
      {
        titulo: "Objetivo",
        cuerpo: [
          "Pingo Pop trabaja para mejorar continuamente la accesibilidad de su sitio, tomando como referencia el estándar **WCAG 2.2 AA**.",
          "Ese es el **estándar objetivo**, no un sello. Este documento no declara una certificación: lo que hay es una lista de lo revisado, de lo que falta, y de cada cuando se vuelve a revisar. La revisión se hace **cada 6 meses**, y el resultado se anota aquí aunque no haya cambiado nada.",
        ],
      },
      {
        titulo: "Cómo reportar un problema",
        cuerpo: [
          "Si algo del sitio no se puede usar con el teclado, con un lector de pantalla, o sin ver bien los colores, se avisa por escrito al correo de contacto que aparece en el aviso de privacidad, describiendo que se intento hacer y que paso. Se responde por escrito.",
        ],
      },
      {
        titulo: "Lo que se ha revisado",
        cuerpo: [
          "Se ha revisado la navegación con teclado y la visibilidad del foco, el contraste de los colores frente al fondo, las etiquetas de los campos, los mensajes de error, las alternativas textuales de las imágenes, y la estructura de encabezados de las páginas.",
        ],
      },
      {
        titulo: "Lo que no se ha comprobado",
        cuerpo: [
          "**No se ha hecho una auditoría externa**, ni con personas reales, ni con tecnología de asistencia, y eso no se va a camuflar: lo que no se ha comprobado no se da por comprobado, y por eso aquí no hay un sello de conformidad.",
          "Lo que sí hay es un compromiso con quien reporta un problema: se responde por escrito en un plazo máximo de **5 días hábiles**, se anota el fallo en la lista de la página anterior, y en la siguiente revisión se dice si se resolvió. Los problemas graves de teclado o de lectura se atienden **antes que los de contenido**.",
        ],
      },
    ],
  },
] as const;

/**
 * Serializa el contenido de un documento para hashearlo.
 *
 * El formato es `JSON.stringify` **sin espacios**: es compacto y no depende de
 * como se formatee el array en el fichero. Si un dia cambiara este formato,
 * cambian todas las huellas a la vez, y eso es justo lo que hay que ver.
 *
 * @param contenido - Las secciones del documento.
 * @returns El texto exacto cuyo sha256 es la huella.
 */
export function serializarParaHuella(contenido: readonly Seccion[]): string {
  return JSON.stringify(contenido);
}

/**
 * Huella de un contenido: 12 primeros hex del sha256.
 *
 * Vive aqui, y no en el fichero de cada documento, para que el calculo se vea
 * en un solo sitio. Usa `node:crypto`, que viene con Node: cero dependencias.
 *
 * @param contenido - Las secciones del documento.
 * @returns 12 caracteres en minusculas.
 */
export function huellaDe(contenido: readonly Seccion[]): string {
  return createHash("sha256")
    .update(serializarParaHuella(contenido), "utf8")
    .digest("hex")
    .slice(0, 12);
}

/**
 * Registro de firmas: que huella tiene cada version publicada de cada documento.
 *
 * **Es lo que hace verificable RF-6, y es mas de lo que parece.** Sin esta
 * tabla, cambiar el texto sin subir la version se detecta porque la huella deja
 * de cuadrar. Pero subir la version **sin** cambiar el texto no se detectaria:
 * la huella seguiria siendo la misma y nadie se enteraria de que la version no
 * significa nada. Al declarar aqui que version va con que huella, dos versiones
 * del mismo documento **nunca** pueden compartir huella, y por tanto subir la
 * version obliga a cambiar el texto.
 *
 * Cuando se edite un documento: se sube `version`, se recalcula `huella` con
 * `huellaDe()`, y se anade la pareja nueva a esta tabla **conservando** la vieja.
 */
export const FIRMAS_POR_DOCUMENTO: Record<string, Record<string, string>> = {
  "terminos-y-condiciones": { "1.0": "22ef2bac4011" },
  "aviso-de-privacidad": { "1.0": "0f021e275584" },
  "politica-de-cookies": { "1.0": "8b9a18cf2f95" },
  "politica-de-envios": { "1.0": "0c81a8d7659d" },
  "cambios-y-devoluciones": { "1.0": "16067b6e75bf" },
  "informacion-legal": { "1.0": "a652f07df766" },
  accesibilidad: { "1.0": "1d9aff04245d" },
};

/** Documento por `slug`, o `null` si el slug no existe (para que sea un 404). */
export function documentoDe(slug: string): Documento | null {
  return DOCUMENTOS.find((documento) => documento.slug === slug) ?? null;
}

/** Version vigente de un documento, o `null` si el slug no existe. */
export function versionDe(slug: string): string | null {
  return documentoDe(slug)?.version ?? null;
}

/**
 * Los tres documentos que se aceptan al enviar una cotización (RF-19).
 *
 * Son los unicos que se registran, y no por Decision: porque la unica accion
 * afirmativa con sujeto identificable hoy es **enviar la cotización**. Mientras
 * el visitante solo navega, no se registra nada.
 */
export const DOCUMENTO_POR_TIPO: Record<TipoLegalDoc, string> = {
  TERMINOS: "terminos-y-condiciones",
  PRIVACIDAD: "aviso-de-privacidad",
  COOKIES: "politica-de-cookies",
};

/**
 * Comprueba que las versiones que envian las versions del cliente son las
 * vigentes.
 *
 * @param entrada - Mapa `slug -> version`.
 * @returns `true` solo si **todos** los exigidos estan con su version actual y
 *   ninguno trae una version que no exista.
 */
export function sonVersionesValidas(entrada: Record<string, string>): boolean {
  const exigidos = Object.values(DOCUMENTO_POR_TIPO);

  for (const slug of exigidos) {
    if (versionDe(slug) !== entrada[slug]) return false;
  }

  for (const [slug, version] of Object.entries(entrada)) {
    if (versionDe(slug) !== version) return false;
  }

  return true;
}

/**
 * Los tokens que los documentos usan. Se reexporta para que un test pueda
 * comprobar que ningún texto pide un token que `interpolar` no conoce.
 */
export { TOKENS_LEGALES };