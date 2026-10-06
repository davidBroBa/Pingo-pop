/**
 * Los siete documentos legales, **solo lo necesario para navegación**.
 *
 * Existe separado de `legal-versions.ts` por una razón concreta y medida:
 * `legal-versions.ts` importa `node:crypto`, porque la huella **es** un sha256
 * del contenido. Un componente de cliente que lo importase arrastraba
 * `crypto-browserify` al navegador: se midieron **800 KB** en el chunk de
 * `/cotizacion` por un simple enlace del pie de pagina.
 *
 * Aqui no hay un solo import. Es el modulo que puede consumir el pie, el sitemap
 * y cualquier componente cliente sin arrastrar nada.
 *
 * Los titulos, las fechas y el orden **no** se escriben dos veces: un test de
 * `tests/legal-versions.test.ts` comprueba que `DOCUMENTOS` y `LEGAL_LINKS` tienen
 * los mismos siete slugs, **con el mismo titulo y la misma fecha**, en el mismo
 * orden. Si un documento se añade a uno y no al otro, el test se pone rojo.
 */

/** Un documento legal reducido a lo que necesitan los enlaces y el sitemap. */
export type EnlaceLegal = {
  /** Ruta publica: siempre `/{slug}`. */
  readonly slug: string;
  /** Texto del enlace, tal y como lo ve el visitante. */
  readonly titulo: string;
  /** Fecha de la última actualización, en `AAAA-MM-DD`. La usa el sitemap. */
  readonly actualizadoEn: string;
};

/** Los siete documentos de RF-5, en orden de lectura razonable. */
export const LEGAL_LINKS: readonly EnlaceLegal[] = [
  {
    slug: "terminos-y-condiciones",
    titulo: "Términos y condiciones",
    actualizadoEn: "2026-10-06",
  },
  {
    slug: "aviso-de-privacidad",
    titulo: "Aviso de privacidad",
    actualizadoEn: "2026-10-06",
  },
  {
    slug: "politica-de-cookies",
    titulo: "Política de cookies",
    actualizadoEn: "2026-10-06",
  },
  {
    slug: "politica-de-envios",
    titulo: "Política de envíos",
    actualizadoEn: "2026-10-06",
  },
  {
    slug: "cambios-y-devoluciones",
    titulo: "Cambios, cancelaciones y devoluciones",
    actualizadoEn: "2026-10-06",
  },
  {
    slug: "informacion-legal",
    titulo: "Información legal",
    actualizadoEn: "2026-10-06",
  },
  {
    slug: "accesibilidad",
    titulo: "Accesibilidad",
    actualizadoEn: "2026-10-06",
  },
];