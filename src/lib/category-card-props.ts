/**
 * Derivacion de los datos que necesita pintar una tarjeta de categoria.
 *
 * Vive en `src/lib/` y **no** en el componente por dos motivos concretos:
 *
 *  1. El runner de tests es `node:test` **sin jsdom** (`docs/constitution.md` §6
 *     prohibe anadir dependencias). Una funcion comprobable tiene que poder
 *     existir fuera de React.
 *  2. La derivacion es la parte que puede salir mal. Si el numero o el color se
 *     calcularan dentro del `.tsx`, un cambio de orden en el array cambiaria la
 *     paleta sin que nada fallara.
 *
 * Ni React, ni base de datos, ni DOM, ni reloj.
 */

/** Categoria tal y como llega de la base de datos, en el minimo que hace falta. */
export type CategoriaMinima = {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  /** Slug unico en la BD. `null` solo en la red de seguridad de la portada. */
  slug: string | null;
};

/** Los cuatro colores cartoon de la seccion, en el orden en que se alternan. */
export const ACCENTS = [
  "bg-cartoon-sky",
  "bg-cartoon-pink",
  "bg-cartoon-mint",
  "bg-cartoon-lavender",
] as const;

/**
 * Cuantas tarjetas se ven en la portada. **Decision del usuario (D11), no un
 * descuido**: se eligio 4 a proposito, aunque la seccion sea data-driven. Lo que
 * se recorta es la presentacion, no la gestion: una 5.ª categoria se crea, se
 * edita y admite foto, y simplemente no aparece en la portada.
 */
export const NUMERO_VISIBLE = 4;

/** Una tarjeta lista para pintar. */
export type TarjetaCategoria = {
  id: number;
  nombre: string;
  descripcion: string;
  imagen: string | null;
  numero: string;
  acento: (typeof ACCENTS)[number];
  /** `true` cuando la tarjeta viene de la red de seguridad, no de la base de datos. */
  esReserva: boolean;
  /** Slug de la categoria, para el enlace al catalogo filtrado. */
  slug: string | null;
};

/**
 * Numero decorativo de la tarjeta, en dos digitos: la posicion 0 es `"01"`.
 *
 * Por encima de 99 alarga en vez de recortar, porque recortarlo daria dos
 * tarjetas con el mismo numero.
 */
export function numeroPara(indice: number): string {
  return String(indice + 1).padStart(2, "0");
}

/**
 * Color de acento segun la posicion, dando la vuelta cada cuatro.
 *
 * Con muchas categorias el color se repite; queda anotado como deuda en lugar
 * de inventar un esquema de la base de datos para guardar colores.
 */
export function acentoPara(indice: number): (typeof ACCENTS)[number] {
  const largo = ACCENTS.length;
  const dentro = ((indice % largo) + largo) % largo;
  return ACCENTS[dentro];
}

/** Normaliza la foto: la cadena vacia y los espacios son "sin foto". */
function normalizaImagen(valor: string | null | undefined): string | null {
  if (typeof valor !== "string") return null;
  return valor.trim() === "" ? null : valor;
}

/** Convierte una categoria en una tarjeta. */
function aTarjeta(categoria: CategoriaMinima, indice: number): TarjetaCategoria {
  return {
    id: categoria.id,
    nombre: categoria.name,
    descripcion: categoria.description ?? "",
    imagen: normalizaImagen(categoria.image),
    numero: numeroPara(indice),
    acento: acentoPara(indice),
    esReserva: false,
    slug: categoria.slug,
  };
}

/**
 * Construye las tarjetas de la portada.
 *
 * Tres reglas, en este orden:
 *
 *  1. Si hay categorias, se usan esas, recortadas a `NUMERO_VISIBLE`.
 *  2. Si **no** hay ninguna, se usa la red de seguridad: la portada no se ve
 *     rota por un problema de datos, ni aunque alguien borre todas las categorias.
 *  3. Nunca se rellena con la reserva lo que ya viene dado: con una sola
 *     categoria sale **una** tarjeta, no cuatro con tres de mentira.
 *
 * @param categorias - Las que devuelve la base de datos, ya ordenadas.
 * @param reserva - Contenido escrito a mano, usado solo si no hay ninguna.
 */
export function construirTarjetas(
  categorias: readonly CategoriaMinima[],
  reserva: readonly CategoriaMinima[],
): TarjetaCategoria[] {
  if (categorias.length === 0) {
    return reserva
      .slice(0, NUMERO_VISIBLE)
      .map((categoria, indice) => ({
        ...aTarjeta(categoria, indice),
        imagen: null,
        esReserva: true,
      }));
  }

  return categorias
    .slice(0, NUMERO_VISIBLE)
    .map((categoria, indice) => aTarjeta(categoria, indice));
}

/**
 * Enlace al que lleva una tarjeta de la portada (bug report: «los botones de
 * catalogo no llevan a ningun lado»).
 *
 * Con slug en la BD se enlaza al catalogo **filtrado** por esa categoria
 * (`/products?categoria=<slug>`). Sin slug —la red de seguridad— cae al
 * catalogo completo: no existe una pagina propia de categoria, y un boton que
 * lleva a todas partes es mejor que un boton que no lleva a ninguna.
 *
 * @param tarjeta - Tarjeta ya construida por `construirTarjetas`.
 * @returns Ruta de destino del enlace.
 */
export function hrefCategoria(tarjeta: TarjetaCategoria): string {
  if (tarjeta.esReserva || tarjeta.slug === null) {
    return "/products";
  }
  return `/products?categoria=${tarjeta.slug}`;
}