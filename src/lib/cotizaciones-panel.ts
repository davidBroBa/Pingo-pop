/**
 * Logica del panel de cotizaciones, **pura**.
 *
 * Vive aqui y no dentro de `CotizacionesView` porque el runner de tests es
 * `node:test` **sin jsdom**: lo comprobable tiene que estar en un modulo sin
 * React. El Client Component solo la pinta.
 *
 * ## La regla que sostiene este modulo
 *
 * **El panel no lee el reloj.** El instante se lee **una** vez, en la pagina del
 * servidor, y se pasa como prop (P8). Por eso {@link antiguedadLegible} recibe
 * `hoy` como parametro en vez de llamar a `new Date()`: si lo leyera por su
 * cuenta, el navegador y el servidor calcularian antiguedades distintas y el
 * contador de vencidas no cuadraria con lo que dice el listado.
 *
 * ## Por que los titulos estan duplicados aqui
 *
 * El titulo real de cada documento vive en `legal-versions.ts`, y ese modulo
 * importa `node:crypto` para la huella. Importarlo desde el panel arrastraria
 * `crypto-browserify` al navegador, que es el mismo error que ya se cometio con
 * un enlace del pie de pagina (800 KB medidos). Asi que los tres titulos estan
 * aqui, y `tests/cotizaciones-panel.test.ts` ata los dos sitio: si
 * `DOCUMENTO_POR_TIPO` gana o pierde un tipo, la lista de aqui se queda corta y
 * el test se pone rojo.
 */

/** Los tres documentos que alguien puede aceptar al cotizar (RF-20). */
export type TipoAceptacion = "TERMINOS" | "PRIVACIDAD" | "COOKIES";

/** Titulo legible de cada documento, en el idioma en que lo ve el administrador. */
export const TITULO_POR_TIPO: Record<TipoAceptacion, string> = {
  TERMINOS: "Términos y condiciones",
  PRIVACIDAD: "Aviso de privacidad",
  COOKIES: "Política de cookies",
};

/** Los cinco estados de `QuoteStatus`, con su etiqueta en espanol. */
export const ETIQUETA_ESTADO: Record<string, string> = {
  PENDING: "Pendiente",
  QUOTED: "Cotizada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

/** Un registro de aceptacion tal y como lo devuelve la API. */
export type Aceptacion = { tipo: TipoAceptacion; version: string };

/**
 * Una solicitud vencida, tal y como la devuelve `marcarParaRevision()`.
 *
 * Se re-declara aquí **con la forma**, sin importar `retention.ts`, por una razón
 * práctica: este archivo lo consume el Client Component, y el tipo por sí solo no
 * arrastra código. El test de `retention.test.ts` fija la forma real, y
 * `tests/cotizaciones-panel.test.ts` comprueba que ambas piezas encajan.
 */
export type MarcadaParaRevision = {
  id: number;
  status: string;
  meses: number;
  creadaEl: string;
};

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/**
 * Convierte un intervalo en algo legible: "hace 3 dias".
 *
 * ## Por que recibe `hoy`
 *
 * Es la regla de P8, y es la que hace que el contador de vencidas cuadre con el
 * listado. Si esta funcion leyera el reloj, el panel calcularia sobre la hora del
 * navegador y la pagina del servidor sobre la suya: dos numeros distintos para
 * la misma fila, y nadie podria decir cual es el bueno.
 *
 * Una fecha **en el futuro** sale como "hace 0 minutos" y no como "hace -3
 * horas". Pasa de verdad (el reloj del navegador va por delante del del servidor)
 * y un numero negativo en el panel de trabajo del negocio se lee como un fallo.
 *
 * Las unidades van **con tilde** (`día`, `más`, `año`). Es texto que se lee
 * todos los días en el panel, y aquí es donde se cuece el mismo error que se
 * corrigió en los documentos legales: el comentario va sin tilde porque es
 * código, la pantalla no.
 *
 * @param fecha - Fecha de creacion, en ISO 8601.
 * @param hoy - Instante de referencia, en ISO 8601. Lo pasa el servidor.
 * @returns Antiguedad en espanol, o "sin fecha" si la fecha no se entiende.
 */
export function antiguedadLegible(fecha: string, hoy: string): string {
  const desde = Date.parse(fecha);
  const ahora = Date.parse(hoy);

  if (Number.isNaN(desde) || Number.isNaN(ahora)) return "sin fecha";

  const pasado = Math.max(0, ahora - desde);

  if (pasado < HORA) {
    const minutos = Math.floor(pasado / MINUTO);
    return minutos === 1 ? "hace 1 minuto" : `hace ${minutos} minutos`;
  }

  if (pasado < DIA) {
    const horas = Math.floor(pasado / HORA);
    return horas === 1 ? "hace 1 hora" : `hace ${horas} horas`;
  }

  const dias = Math.floor(pasado / DIA);
  if (dias < 30) return dias === 1 ? "hace 1 día" : `hace ${dias} días`;

  const meses = Math.floor(pasado / (30 * DIA));
  if (meses < 12) return meses === 1 ? "hace 1 mes" : `hace ${meses} meses`;

  const anos = Math.floor(pasado / (365 * DIA));
  return anos === 1 ? "hace 1 año" : `hace ${anos} años`;
}

/**
 * Resume que documentos acepto una solicitud, con su version (RF-21).
 *
 * El panel tiene que poder **demostrar que texto estaba vigente** el dia del
 * envio. Sin esto, una solicitud de hace ocho meses no se puede defender: el
 * aviso de privacidad de hoy puede no ser el de entonces.
 *
 * Una lista vacia **no** sale como texto vacio: en una celda de una tabla, el
 * vacio parece que la carga fallo, mientras que "Ninguna" es un dato.
 *
 * @param aceptaciones - Registros de `LegalAcceptance`, en el orden recibido.
 * @returns Titulo y version de cada documento, separados por punto medio.
 */
export function resumenAceptaciones(aceptaciones: readonly Aceptacion[]): string {
  if (aceptaciones.length === 0) return "Ninguna";

  return aceptaciones
    .map(
      (aceptacion) =>
        `${TITULO_POR_TIPO[aceptacion.tipo] ?? aceptacion.tipo} ${aceptacion.version}`,
    )
    .join(" · ");
}

/**
 * Texto de confirmacion antes de borrar una solicitud.
 *
 * Sin esto, "borrar" en un panel de cotizaciones suena a borrar un formulario de
 * contacto, y **no lo es**: el `DELETE` quita tambien el registro de aceptacion,
 * que es la unica prueba de que version de los documentos vio la persona
 * (RF-24). Es un borrado sin vuelta atras, asi que se dice.
 *
 * @param id - Id de la solicitud que se va a borrar.
 * @returns Texto para un `confirm()` del navegador.
 */
export function textoAvisoBorrado(id: number): string {
  return (
    `¿Borrar la solicitud ${id}? Esto borra también sus partidas y el registro ` +
    "de aceptación de los documentos legales. No se puede deshacer."
  );
}

/**
 * Texto del aviso de una solicitud vencida (RF-22).
 *
 * ## Por qué este aviso existe y no uno más genérico
 *
 * RF-22 dice que cumplidos los 12 meses la solicitud "queda marcada para revisión:
 * el sistema **no borra sola, avisa**". Avisar sin decir *cuál* es avisar a medias:
 * el administrador veía un número y tenía que recordar qué filas eran. Esta es la
 * fila, y el texto dice **cuántos meses lleva** para que el número no sea el único
 * dato.
 *
 * Y no dice "vencida" a secas, porque eso se lee como "ya no existe". La decisión
 * de borrarla es de una persona; el aviso solo pone el dato delante.
 *
 * @param meses - Meses cumplidos, tal y como los calcula `mesesTranscurridos`.
 * @returns El aviso de la fila.
 */
export function textoAvisoVencida(meses: number): string {
  const unidad = meses === 1 ? "mes" : "meses";
  return `${meses} ${unidad} desde su envío: para revisar`;
}

/**
 * Indice de las solicitudes vencidas, por id.
 *
 * Es un `Map` y no un `Set` porque el panel no solo necesita saber *si* una fila
 * esta vencida, sino **cuantos meses lleva**, que es lo que pinta el aviso.
 *
 * Se construye con un `Map` y no buscándose linealmente en cada fila porque el
 * listado se pinta entero en cada repintado: con 300 solicitudes, buscar en un
 * array por fila son 90.000 comparaciones en cada render.
 *
 * Un id repetido **no** pisa el anterior: en una base de datos con clave primaria
 * no puede pasar, y si pasara significa que el dato de entrada está mal, así que
 * se queda la primera y no se lanza.
 *
 * @param paraRevisar - Lo que devuelve `marcarParaRevision()`.
 * @returns `id -> { meses, status, creadaEl }`.
 */
export function indiceVencidas(
  paraRevisar: readonly MarcadaParaRevision[],
): Map<number, MarcadaParaRevision> {
  const indice = new Map<number, MarcadaParaRevision>();
  for (const marcada of paraRevisar) {
    if (!indice.has(marcada.id)) {
      indice.set(marcada.id, marcada);
    }
  }
  return indice;
}

/**
 * La entrada vencida de una fila, o `undefined` si no lo está.
 *
 * @param indice - El resultado de {@link indiceVencidas}.
 * @param id - Id de la fila que se está pintando.
 * @returns La marca, o `undefined`.
 */
export function idVencida(
  indice: Map<number, MarcadaParaRevision>,
  id: number,
): MarcadaParaRevision | undefined {
  return indice.get(id);
}

/**
 * Filtra el listado a las vencidas, o lo devuelve entero.
 *
 * **No muta el array recibido.** El listado completo se necesita para el contador
 * de la cabecera y para apagar el filtro, y un `splice` en sitio dejaría la
 * cabecera diciendo un número que ya no corresponde a lo que hay debajo.
 *
 * @param lista - El listado completo, tal y como llegó de la API.
 * @param indice - El resultado de {@link indiceVencidas}.
 * @param soloVencidas - Si el filtro está activo.
 * @returns La lista a pintar, nueva si se filtró.
 */
export function filtrarSoloVencidas<T extends { id: number }>(
  lista: readonly T[],
  indice: Map<number, MarcadaParaRevision>,
  soloVencidas: boolean,
): T[] {
  if (!soloVencidas) return [...lista];
  return lista.filter((fila) => indice.has(fila.id));
}
