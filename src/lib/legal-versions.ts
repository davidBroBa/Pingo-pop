import { createHash } from "node:crypto";

import { TOKENS_LEGALES } from "@/lib/legal-data";

/**
 * Registro de los documentos legales: version, fecha y contenido (RF-6).
 *
 * Modulo puro en cuanto a datos: sin React, sin base de datos y sin DOM. Lo
 * unico que **no** es puro, a proposito, es {@link serializarParaHuella}, que
 * usa `node:crypto` porque la huella **es** un hash. `node:crypto` viene con
 * Node: no es una dependencia nueva.
 *
 * ## EL CRITERIO DE REDACCION, y es lo unico que importa al leer este fichero
 *
 * Los documentos legales de {{NOMBRE_COMERCIAL}} son un **entregable**, no un
 * borrador. Decidido por el propietario: **no hay ninguna marca de "pendiente"
 * de revision legal**, porque un sitio lleno de marcas de "esto falta" se ve
 * inacabado, y es el propietario quien decide su propia exposicion legal.
 *
 * El criterio con el que esta escrito cada parrafo es uno solo, y conviene
 * tenerlo presente al tocar cualquier texto de aqui:
 *
 *  - **Un compromiso, no una declaracion.** No se escribe "se cumple la
 *    LFPDPPP" ni "100% conforme": eso no se puede comprobar y no lo firma
 *    nadie. Se escribe **lo que el negocio hace, con numero**: "responde en un
 *    plazo maximo de 20 dias habiles", "conserva la solicitud 12 meses".
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
    titulo: "Terminos y condiciones",
    version: "1.0",
    actualizadoEn: "2026-10-06",
    huella: "8820ac2aab0e",
    contenido: [
      {
        titulo: "Quienes somos y que es este sitio",
        cuerpo: [
          "Este sitio pertenece a {{NOMBRE_COMERCIAL}} y muestra un catalogo de productos: Pines, llaveros y productos de impresion 3D. La denominacion comercial del negocio es {{NOMBRE_COMERCIAL}} y su razon social es {{RAZON_SOCIAL}}.",
          "Lo que aparece en el sitio es un catalogo. No hay carrito de compra con pago: hay un formulario de solicitud de cotizacion. Enviar ese formulario **no compra nada**, es el paso inicial de una conversacion comercial.",
        ],
      },
      {
        titulo: "Que pasa cuando envias una solicitud de cotizacion",
        cuerpo: [
          "Al enviar el formulario se crea una solicitud de cotizacion a la que queda asociada la informacion que escribiste: nombre, correo, telefono, direccion de entrega, productos y cantidades. La solicitud se guarda **12 meses** desde su creacion para preparar la cotizacion y atenderla.",
          "El precio que ves junto a cada producto es el **precio de catalogo**. El precio final se confirma despues, por escrito, cuando la solicitud se revisa y se acuerda con quien la hizo. Lo que se ve en pantalla no es una oferta cerrada, y el precio que se acuerde puede ser distinto del que aparece en el catalogo.",
          "**Contamos con responderte en un plazo maximo de 5 dias habiles** desde que se recibe la solicitud. Ese plazo corre en el calendario del negocio, no en el software: el sitio no lleva el reloj de la atencion, asi que no puede avisarte por si se pasa. Lo que si puedes comprobar por escrito es el estado de la solicitud, que se actualiza a mano.",
        ],
      },
      {
        titulo: "De los productos y la personalizacion",
        cuerpo: [
          "Los Pines y los llaveros **no** se personalizan: se entregan tal como estan en el catalogo. Los productos de impresion 3D **si** se personalizan a partir del archivo que aporta quien compra, y por eso **no admiten devolucion por cambio de opinion**: una pieza impresa con los datos de otra persona no se puede revender.",
          "La regla se decide **por categoria**, no producto a producto, asi que el catalogo es lo que manda: si un producto aparece en una categoria personalizable, se personaliza. Cuando un producto se personaliza por encargo, el precio se calcula sobre esa pieza y no sobre un producto de catalogo.",
        ],
      },
      {
        titulo: "Cuenta y acceso",
        cuerpo: [
          "Existe una cuenta de cliente para dejar datos de contacto y ver el historial de solicitudes. **No hay registro publico**: las cuentas las crea quien administra el negocio, asi que no cualquiera puede abrir una cuenta por su cuenta.",
          "**La sesion dura 8 horas.** Pasado ese tiempo hay que volver a entrar. Y al cambiar la contrasena **se cierran todas las sesiones abiertas**, incluida la del dispositivo que la cambio: si alguien robo una contrasena, cambiarla corta el acceso desde el momento.",
          "Este sitio **no ofrece descarga de datos ni borrado de cuenta** desde la propia pagina, y no existe ningun boton para hacerlo, porque la funcion no esta implementada. Las dos solicitudes se hacen **por escrito** al contacto del aviso de privacidad, y se atienden en un plazo maximo de **20 dias habiles**.",
        ],
      },
      {
        titulo: "Cambio de este documento",
        cuerpo: [
          "Cada version tiene su propia fecha. Cuando el texto cambia, la version sube y la fecha se actualiza. Al enviar una solicitud queda registrada la version de estos terminos que estaba vigente en ese momento, de modo que siempre se puede saber que texto se acepto.",
        ],
      },
    ],
  },
  {
    slug: "aviso-de-privacidad",
    titulo: "Aviso de privacidad",
    version: "1.0",
    actualizadoEn: "2026-10-06",
    huella: "955874c9917f",
    contenido: [
      {
        titulo: "Quien es el responsable",
        cuerpo: [
          "El responsable de los datos personales es {{RAZON_SOCIAL}}, con RFC {{RFC}} y domicilio fiscal {{DOMICILIO_FISCAL}}. La persona responsable de privacidad es {{RESPONSABLE_PRIVACIDAD}} y se puede escribir a {{CORREO_CONTACTO}}.",
          "Las solicitudes de derechos se atienden **por escrito**, en un plazo maximo de **20 dias habiles** contados desde su recepcion, y se responden a la misma direccion de correo desde la que se reciben.",
        ],
      },
      {
        titulo: "Que datos se recogen y por que",
        cuerpo: [
          "**Solo se recogen los datos que hacen falta para poder cotizar, y nada mas.** Al enviar una solicitud de cotizacion se guardan el nombre, el correo, el telefono, la direccion de entrega, los productos y sus cantidades, y la fecha en que se creo la solicitud. Al crear una cuenta de cliente se guardan el correo, la contrasena cifrada y el nombre visible. No se recoge ningun otro dato, y en particular **no** se guardan ni la direccion IP ni datos de navegacion.",
          "La contrasena se guarda **cifrada con un algoritmo de derivacion lento**, y nunca en claro: nadie, ni siquiera quien administra el negocio, puede leerla desde la base de datos. Si se pierde, no se puede recuperar ni ver: hay que escribir una nueva.",
          "**Este sitio no envia comunicaciones electronicas, ni promociones, ni recordatorios.** No hay un servicio de correo configurado, asi que no se manda ninguna notificacion automatica. La atencion se hace contestando a lo que la persona escriba, por el medio que ella use. Por eso **no hay ningun consentimiento que.recoger al registrarse**: no se pide permiso para algo que no se manda. El unico registro de aceptacion que existe es el de la version de este aviso y de los terminos, y se anota **solo** cuando alguien envia una cotizacion.",
          "**Este sitio no ofrece descarga de datos ni borrado de cuenta desde la pagina**, y no existe ningun boton que lo haga. Las dos solicitudes se hacen por escrito al contacto de arriba, y se atienden en **20 dias habiles** como maximo.",
        ],
      },
      {
        titulo: "Cookies y almacenamiento local",
        cuerpo: [
          "**Este sitio no usa cookies de terceros ni tecnicas de seguimiento.** La unica cookie es `pp_session`, que es necesaria: guarda la sesion de quien ha entrado, caduca a las 8 horas, es `HttpOnly` (no la puede leer ningun script de la pagina), es `SameSite=Lax` y va con `Secure` en produccion.",
          "En el almacenamiento local del navegador hay una sola clave, `pingo-quote-cart`, que es **funcional**: guarda lo que has metido en el carrito para que la cotizacion se pueda enviar. Sin ella no se podria completar el formulario.",
          "No hay Publicidad, ni medicion de audiencia, ni analitica. Ninguna entrada de la politica de cookies corresponde a una tecnologia que este repositorio no tenga.",
        ],
      },
      {
        titulo: "La direccion IP",
        cuerpo: [
          "La direccion IP **no se persiste**: no va a la base de datos ni a los registros del sistema. Se lee unicamente para contar peticiones en un contador que vive en memoria del servidor, y ese contador se pierde al reiniciar el servidor. No se usa para decidir a quien se le muestra algo.",
        ],
      },
      {
        titulo: "Sus derechos",
        cuerpo: [
          "Los derechos se ejercen **por escrito**, no desde un boton, y se responden **en un plazo maximo de 20 dias habiles** desde su recepcion. No hay registro publico y por tanto no hay una cuenta que el visitante pueda abrir ni borrar por si mismo: se escribe al contacto indicado arriba y se contesta a esa misma direccion.",
          "Los derechos que se atienden son **acceso** (saber que datos hay), **rectificacion** (corregir un dato equivocado), **cancelacion** (cancelar una solicitud en curso), **oposicion** (oponerse a un uso) y **eliminacion** (borrar los datos de una solicitud concreta). Los cinco se atienden **sin costo** para quien los ejerce.",
          "Una solicitud se elimina desde el panel de cotizaciones, junto con sus partidas, **en una sola operacion**, de modo que no quedan productos sueltos sin la solicitud a la que pertenecen. La cuenta de cliente se elimina de la base de datos por quien administra el negocio, no desde la pagina.",
        ],
      },
      {
        titulo: "Cuanto tiempo se guardan",
        cuerpo: [
          "Las solicitudes de cotizacion se conservan **12 meses** desde su creacion. Ese es el plazo, y no se alarga por nada: al mes 13 la solicitud aparece marcada en el panel para que una persona decida que hacer con ella.",
          "Cumplidos los 12 meses **el sistema no borra nada por si solo**. Es una decision deliberada: un borrado automatico y silencioso es irreversible, y una solicitud puede estar en discusion. Quien decide borrar, borra; quien no, la tiene a la vista.",
          "Los datos de la cuenta de cliente se conservan **mientras la cuenta exista**. Los registros de que version de los documentos se acepto se guardan **junto a la solicitud**, y se borran con ella.",
        ],
      },
      {
        titulo: "Cambio de este aviso",
        cuerpo: [
          "Cada version tiene su propia fecha, y ambas aparecen al principio de esta pagina. Al enviar una solicitud queda anotada **que version de este aviso estaba vigente ese dia**, de modo que siempre se puede saber que texto se acepto y no solo el de hoy.",
          "No se envian comunicaciones electronicas, asi que **no hay ninguna otra via por la que se avise de un cambio**: la unica forma de enterarse es volver a esta pagina. Quien tenga cotizaciones abiertas puede preguntar por la version vigente al escribir.",
        ],
      },
    ],
  },
  {
    slug: "politica-de-cookies",
    titulo: "Politica de cookies",
    version: "1.0",
    actualizadoEn: "2026-10-06",
    huella: "f54aefbe02dd",
    contenido: [
      {
        titulo: "Que cookies usa este sitio",
        cuerpo: [
          "Una sola: `pp_session`. No hay cookies de terceros, ni publicidad, ni medicion de audiencia, ni ninguna tecnica de seguimiento.",
        ],
      },
      {
        titulo: "La cookie `pp_session`",
        cuerpo: [
          "Es **necesaria**: sin ella no se puede saber quien ha entrado. Guarda la sesion, no datos de contenido.",
          "Sus valores, tal y como estan definidos en el codigo: caduca a las **8 horas**; es `HttpOnly`, asi que el navegador no la expone a los scripts de la pagina; es `SameSite=Lax`; y lleva `Secure` cuando el sitio corre en produccion. Solo se envia al propio dominio.",
        ],
      },
      {
        titulo: "El almacenamiento local",
        cuerpo: [
          "En `localStorage` hay una unica clave: `pingo-quote-cart`. Es **funcional**, no de seguimiento: guarda los productos del carrito para que la solicitud se pueda enviar. No contiene datos identificables y desaparece si el visitante borra el almacenamiento del navegador.",
        ],
      },
      {
        titulo: "Porque no hay banner de cookies",
        cuerpo: [
          "No se muestra banner de consentimiento porque **no hay ninguna tecnologia no esencial que lo requiera**: ni analitica, ni publicidad, ni redes sociales, ni ningun recurso de terceros. Todo lo que el sitio carga viene de este mismo servidor.",
          "Pedir permiso para algo que no se usa seria hacer perder tiempo al visitante, y guardar esa respuesta seria guardar un dato que nadie ha pedido dar. Asi que **no se guarda ninguna decision de consentimiento**: en el almacenamiento local del navegador no hay ninguna clave de ese tipo, y eso se puede comprobar.",
          "Si alguna vez se anade una tecnologia que necesite consentimiento, este documento **cambia, sube de version y aparece un panel** con las cuatro categorias (necesarias, analiticas, marketing y preferencias) y tres vias: aceptar, rechazar y configurar. Aceptar y rechazar tendran exactamente el mismo peso visual, para que rechazar sea tan facil como aceptar.",
        ],
      },
      {
        titulo: "Como borrar lo que hay guardado",
        cuerpo: [
          "Cerrando la sesion, la cookie `pp_session` se elimina. El contenido de `localStorage` se borra vaciando el carrito o desde las opciones del navegador.",
        ],
      },
    ],
  },
  {
    slug: "politica-de-envios",
    titulo: "Politica de envios",
    version: "1.0",
    actualizadoEn: "2026-10-06",
    huella: "f172a6c89cb4",
    contenido: [
      {
        titulo: "Como se entrega",
        cuerpo: [
          "La entrega se hace **solo en Mexico**. No se envia a otros paises y este documento no ofrece esa posibilidad.",
          "La compra se cierra por escrito: se revisa la solicitud, se acuerda el precio y la forma de entrega, y se confirma. **No hay pago en linea**: este sitio no tiene pasarela de pago, ni acepta tarjetas, ni cobra nada desde el navegador.",
        ],
      },
      {
        titulo: "Plazos",
        cuerpo: [
          "**Este documento no fija un plazo de entrega, porque no seria verdad.** El sistema no lleva el control de los tiempos de produccion ni de transportista, asi que cualquier cifra escrita aqui seria una promesa que nadie podria cumplir.",
          "Lo que si se compromete es esto: el plazo concreto **se escribe en la cotizacion** antes de cobrar nada, y ese plazo es el que vale. Si el pedido necesita una pieza impresa a medida, el plazo se cuenta desde que se recibe el archivo y se confirma que sirve, no desde el dia de la solicitud.",
          "Contamos con **responder la cotizacion en 5 dias habiles** desde que se recibe la solicitud. Si se pasa de ese plazo, la respuesta escrita lleva el motivo, porque un retraso sin explicacion es peor que un retraso.",
        ],
      },
      {
        titulo: "Envio y cancelacion",
        cuerpo: [
          "Una solicitud de cotizacion **se puede cancelar sin costo** en cualquier momento antes de que se cierre el pedido, y la cancelacion se atiende por escrito. **No hay penalizacion por cancelar**: no se ha cobrado nada todavia.",
          "La cancelacion se confirma por escrito en un plazo maximo de **5 dias habiles** desde que se recibe el aviso. Los detalles completos estan en la politica de cambios, cancelaciones y devoluciones.",
        ],
      },
    ],
  },
  {
    slug: "cambios-y-devoluciones",
    titulo: "Cambios, cancelaciones y devoluciones",
    version: "1.0",
    actualizadoEn: "2026-10-06",
    huella: "625f3bee4dc7",
    contenido: [
      {
        titulo: "No hay pago en linea, y por eso no hay reembolso",
        cuerpo: [
          "Este sitio **no cobra nada**: no hay pasarela de pago, ni tarjeta, ni pago desde el navegador, ni datos bancarios se piden en ningun momento. Lo que se envia desde el catalogo es una **solicitud de cotizacion**, no una compra.",
          "Por eso **no hay reembolso**: no se ha cobrado ningun dinero. Quien devuelve un producto ya entregado ya ha pagado por el, y por tanto ya no esta en este documento sino en el de devoluciones.",
          "El precio que aparece junto a cada producto es el **precio de catalogo hasta confirmar la cotizacion**. El precio final se acuerda **por escrito** antes de cerrar el pedido, y ese es el unico que se cobra.",
        ],
      },
      {
        titulo: "Cancelar una solicitud",
        cuerpo: [
          "Una solicitud se puede cancelar **sin costo** mientras no se haya cerrado el pedido, y **no hay penalizacion por hacerlo**: no se ha cobrado nada todavia. Se avisa por escrito al contacto del aviso de privacidad.",
          "El panel de cotizaciones es la via por la que se atiende la cancelacion: desde ahi se cambia el estado a cancelada y **la solicitud se elimina junto con sus partidas en una sola operacion**. Se confirma por escrito en un plazo maximo de **5 dias habiles** desde el aviso.",
        ],
      },
      {
        titulo: "Garantia del producto entregado",
        cuerpo: [
          "Una vez entregado el producto y cobrado el precio acordado, se aplica **una garantia de 3 meses** sobre defectos de fabricacion y materiales. La garantia cubre el producto que no funciona como se ofrecio y **no** cubre el desgaste por uso, ni los danos causados por el transporte, ni los cambios de opinion sobre el diseno.",
          "Las condiciones concretas de la garantia **se escriben en la confirmacion del pedido**, antes de cobrar: que cubre, que no, y como se hace la reclamacion. Si un producto llega con defecto, se avisa **dentro de los primeros 30 dias** desde la entrega, y se responde por escrito en un plazo maximo de **5 dias habiles**.",
          "La garantia del producto es una cosa distinta de la devolucion de un pago, que aqui no existe porque no hay pago por el navegador.",
        ],
      },
      {
        titulo: "Productos personalizados",
        cuerpo: [
          "Los productos de impresion 3D se hacen a partir de un archivo que aporta quien compra, y **no admiten devolucion por cambio de opinion**: una pieza con los datos o el diseno de otra persona no se puede revender ni guardar.",
          "Si el archivo resulta no ser imprimible, o el resultado no corresponde a lo pedido, el problema se resuelve **sin costo**: se reimprime o se devuelve el importe. Ese caso es un error nuestro y se asume como tal.",
          "Los productos personalizables que **no** tengan este problema siguen la misma garantia de 3 meses que el resto del catalogo. Lo que no se aplica es la devolucion por arrepentimiento, y eso se dice antes de cobrar, en la confirmacion del pedido.",
        ],
      },
    ],
  },
  {
    slug: "informacion-legal",
    titulo: "Informacion legal",
    version: "1.0",
    actualizadoEn: "2026-10-06",
    huella: "f1ba9e3bb78b",
    contenido: [
      {
        titulo: "Datos del negocio",
        cuerpo: [
          "Nombre comercial: {{NOMBRE_COMERCIAL}}. Razon social: {{RAZON_SOCIAL}}. RFC: {{RFC}}. Domicilio fiscal: {{DOMICILIO_FISCAL}}. Correo: {{CORREO_CONTACTO}}. Telefono: {{TELEFONO}}.",
          "Los datos de contacto se revisan **cada 3 meses** y se actualizan en cuanto cambian. Si alguno de los que aparecen aqui esta sin rellenar, significa que todavia no se ha cargado, y se acepta por escrito al correo o telefono que si tenga.",
        ],
      },
      {
        titulo: "Sobre la procedencia de las imagenes y las fuentes",
        cuerpo: [
          "Cada recurso visual y tipografico del sitio tiene su origen escrito en el repositorio, y el inventario se revisa **cada 6 meses**. Cuando no se sabe de donde viene una imagen o una fuente, **no se publica**: es preferible un hueco a un recurso sin procedencia.",
          "Los iconos vienen de una libreria de codigo abierta y se usan bajo su licencia; las tipografias que se muestran en pantalla estan igualmente documentadas. El sitio **no se atribuye la autoria de un recurso cuya procedencia no este registrada**, y eso se comprueba leyendo el inventario, no este texto.",
          "Los datos que envia quien compra (una direccion de correo, un nombre, un archivo de diseno) son suyos: se usan **solo** para preparar la cotizacion y el envio, y no se ceden a nadie ni se usan para publicidad, porque no hay publicidad.",
          "Si un material del sitio aparece con derechos de otra persona, se retira y se responde por escrito en un plazo maximo de **5 dias habiles** desde el aviso.",
        ],
      },
      {
        titulo: "Lenguaje y errores",
        cuerpo: [
          "Los textos de este sitio estan en castellano. Si encuentra una errata en un documento legal, se avisa al contacto del aviso de privacidad.",
        ],
      },
    ],
  },
  {
    slug: "accesibilidad",
    titulo: "Accesibilidad",
    version: "1.0",
    actualizadoEn: "2026-10-06",
    huella: "567446f42f2f",
    contenido: [
      {
        titulo: "Objetivo",
        cuerpo: [
          "Pingo Pop trabaja para mejorar continuamente la accesibilidad de su sitio, tomando como referencia el estandar **WCAG 2.2 AA**.",
          "Ese es el **estandar objetivo**, no un sello. Este documento no declara una certificacion: lo que hay es una lista de lo revisado, de lo que falta, y de cada cuando se vuelve a revisar. La revision se hace **cada 6 meses**, y el resultado se anota aqui aunque no haya cambiado nada.",
        ],
      },
      {
        titulo: "Como reportar un problema",
        cuerpo: [
          "Si algo del sitio no se puede usar con el teclado, con un lector de pantalla, o sin ver bien los colores, se avisa por escrito al correo de contacto que aparece en el aviso de privacidad, describiendo que se intento hacer y que paso. Se responde por escrito.",
        ],
      },
      {
        titulo: "Lo que se ha revisado",
        cuerpo: [
          "Se ha revisado la navegacion con teclado y la visibilidad del foco, el contraste de los colores frente al fondo, las etiquetas de los campos, los mensajes de error, las alternativas textuales de las imagenes, y la estructura de encabezados de las paginas.",
        ],
      },
      {
        titulo: "Lo que no se ha comprobado",
        cuerpo: [
          "**No se ha hecho una auditoria externa**, ni con personas reales, ni con tecnologia de asistencia, y eso no se va a camuflar: lo que no se ha comprobado no se da por comprobado, y por eso aqui no hay un sello de conformidad.",
          "Lo que si hay es un compromiso con quien reporta un problema: se responde por escrito en un plazo maximo de **5 dias habiles**, se anota el fallo en la lista de la pagina anterior, y en la siguiente revision se dice si se resolvio. Los problemas graves de teclado o de lectura se atienden **antes que los de contenido**.",
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
  "terminos-y-condiciones": { "1.0": "8820ac2aab0e" },
  "aviso-de-privacidad": { "1.0": "955874c9917f" },
  "politica-de-cookies": { "1.0": "f54aefbe02dd" },
  "politica-de-envios": { "1.0": "f172a6c89cb4" },
  "cambios-y-devoluciones": { "1.0": "625f3bee4dc7" },
  "informacion-legal": { "1.0": "f1ba9e3bb78b" },
  accesibilidad: { "1.0": "567446f42f2f" },
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
 * Los tres documentos que se aceptan al enviar una cotizacion (RF-19).
 *
 * Son los unicos que se registran, y no por Decision: porque la unica accion
 * afirmativa con sujeto identificable hoy es **enviar la cotizacion**. Mientras
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
 * comprobar que ningun texto pide un token que `interpolar` no conoce.
 */
export { TOKENS_LEGALES };