/**
 * Reparto del texto legal en trozos con y sin negrita.
 *
 * ## Por que existe
 *
 * Los siete documentos traen marcado `**negrita**` en **93 de sus lineas**. Sin
 * esto, un visitante leeria los asteriscos en un documento legal, que es
 * precisamente la senal de "esto lo copio de un markdown y no se renderizo".
 *
 * ## Por que NO se usa `dangerouslySetInnerHTML`
 *
 * El texto es contenido publicado, y aunque hoy lo controle el propio
 * repositorio, pasar un texto a HTML con una interpolacion deja la puerta abierta
 * a que un documento con `<script>` se ejecute. Se parte la cadena y se construye
 * el React a mano: lo que no es React nunca llega al DOM.
 *
 * Modulo **puro** a proposito: el runner de tests es `node:test` sin jsdom, asi
 * que esto se prueba sin navegador, y la comprobacion de que el reparto no pierde
 * ni un caracter se hace recorriendo los siete documentos reales.
 */

/** Un trozo de texto: en negrita o no. */
export type Trozo = {
  texto: string;
  fuerte: boolean;
};

/**
 * Pares de asteriscos, sin capturar el contenido entre ellos.
 *
 * El `**` de apertura se come, el de cierre se come, y lo de en medio se devuelve
 * como trozo `fuerte`. Un `**` sin pareja simplemente no casa y se queda en el texto.
 */
const NEGRITA = /\*\*([^*]+)\*\*/g;

/**
 * Parte un parrafo en trozos con y sin negrita.
 *
 * ## Casos que estan decididos, no accidentales
 *
 * - **Un solo `*` no es negrita.** En Markdown no lo es, y aqui tampoco: `5 * 3`
 *   tiene que leerse tal cual.
 * - **`**` sin cerrar se queda como texto.** Una negrita inventada es peor que un
 *   asterisco visible, porque resaltar texto que no lo esta. `tests/legal-texto.test.ts`
 *   comprueba ademas que **ninguno** de los documentos reales tenga el marcador
 *   sin pareja, asi que esto es una red y no un caso normal.
 * - **Los trozos vacios se descartan.** `****` es negrita vacia en Markdown y un
 *   `<strong></strong>` sucio no aporta nada.
 * - **El texto no se modifica** salvo quitar los asteriscos, que son justo lo que
 *   se convierte en `<strong>`. El salto de linea dentro de un parrafo sobrevive.
 *
 * @param parrafo - Texto de un parrafo, ya con los tokens sustituidos.
 * @returns Los trozos, en orden. Lista vacia si el parrafo estaba vacio.
 */
export function dividirEnEmpaques(parrafo: string): Trozo[] {
  if (parrafo === "") return [];

  const trozos: Trozo[] = [];
  let cursor = 0;

  NEGRITA.lastIndex = 0;
  let coincidencia: RegExpExecArray | null;

  while ((coincidencia = NEGRITA.exec(parrafo)) !== null) {
    if (coincidencia.index > cursor) {
      trozos.push({
        texto: parrafo.slice(cursor, coincidencia.index),
        fuerte: false,
      });
    }
    trozos.push({ texto: coincidencia[1] as string, fuerte: true });
    cursor = coincidencia.index + coincidencia[0].length;
  }

  if (cursor < parrafo.length) {
    trozos.push({ texto: parrafo.slice(cursor), fuerte: false });
  }

  return trozos;
}
