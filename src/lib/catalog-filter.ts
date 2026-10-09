/**
 * Interpretacion del filtro por categoria del catalogo (`/products`).
 *
 * La pagina recibe `searchParams` como un `Promise` (Next 16) con valores
 * `string | string[] | undefined`. Esta funcion decide, sin tocar la base de
 * datos ni el DOM, que filtro aplicar. Es logica pura y testeable.
 */

/**
 * Reutiliza la misma regla de slug que las categorias al crearse
 * (`slugText` en `@/lib/validation`): minusculas, numeros y guiones, sin
 * separadores repetidos ni caracteres raros. Un slug que no pasa aqui no puede
 * existir en la BD, asi que el 404 lo devuelve la pagina.
 */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Resultado de interpretar el parametro `categoria`. */
export type FiltroCategoria =
  | { tipo: "todos" }
  | { tipo: "slug"; slug: string }
  | { tipo: "invalido" };

/**
 * Decide que hace una cadena concreta: vacio es "sin filtro", slug valido es
 * filtro, cualquier otra cosa es invalido.
 */
function decideCadena(cadena: string): FiltroCategoria {
  if (cadena === "") return { tipo: "todos" };
  if (!SLUG_REGEX.test(cadena)) return { tipo: "invalido" };
  return { tipo: "slug", slug: cadena };
}

/**
 * Interpreta el valor crudo de `searchParams.categoria`.
 *
 * - `undefined` o `""` → `todos` (no filtra; `?categoria=` vacio se trata
 *   igual que ausente).
 * - Lista vacia → `todos`; lista con valores → decide por su primer elemento.
 * - Cadena con un slug valido → `slug`.
 * - Cualquier otra cosa (`42`, un objeto, una cadena malformada) → `invalido`,
 *   y la pagina responde 404. Nada de interpretar como "ver todo" lo que no
 *   es una peticion explicita de ver todo.
 *
 * @param valor - El valor de `searchParams.categoria` tal cual llega.
 */
export function tipoFiltroCategoria(valor: unknown): FiltroCategoria {
  if (valor === undefined) return { tipo: "todos" };
  if (Array.isArray(valor)) {
    if (valor.length === 0) return { tipo: "todos" };
    return typeof valor[0] === "string"
      ? decideCadena(valor[0])
      : { tipo: "invalido" };
  }
  return typeof valor === "string" ? decideCadena(valor) : { tipo: "invalido" };
}