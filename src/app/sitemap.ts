import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/env";
import { LEGAL_LINKS } from "@/lib/legal-links";

/**
 * Paginas publicas que se ofrecen a ser indexadas.
 *
 * `frecuencia` va en ingles (`weekly`, `monthly`) porque son los valores que
 * espera el protocolo de sitemaps, no una decision de idioma del sitio. Poner
 * "semanal" no compila, y tiene sentido: el valor lo lee el buscador.
 *
 * Los siete documentos legales salen de `LEGAL_LINKS`, **no de una lista escrita
 * a mano aqui**: si el conjunto crece y esta lista no, el sitemap se queda corto
 * en silencio, que es la forma mas dificil de detectar de que falta algo.
 *
 * Las rutas privadas (`/admin`, `/perfil`, `/cotizacion`) **no** van aqui. Un
 * sitemap es una lista de URLs que se ofrecen a ser indexadas: incluir
 * `/admin/productos` es ofrecer una pantalla de administracion a ser indexada.
 */
const PAGINAS_PUBLICAS = [
  { path: "/", prioridad: 1, frecuencia: "weekly" as const },
  { path: "/products", prioridad: 0.9, frecuencia: "weekly" as const },
  { path: "/contacto", prioridad: 0.6, frecuencia: "monthly" as const },
  { path: "/novedades", prioridad: 0.6, frecuencia: "monthly" as const },
];

/**
 * `sitemap.xml`.
 *
 * Sin `lastModified` en las paginas publicas: se podria poner la fecha del
 * build, que cambia en cada despliegue aunque el contenido no haya cambiado, y
 * eso despista al buscador en lugar de ayudar. Los documentos legales si llevan
 * la suya, `actualizadoEn`, que cambia **solo** cuando cambia el texto.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const hoy = new Date();

  const paginas = PAGINAS_PUBLICAS.map((pagina) => ({
    url: `${base}${pagina.path}`,
    lastModified: hoy,
    changeFrequency: pagina.frecuencia,
    priority: pagina.prioridad,
  }));

  const legales = LEGAL_LINKS.map((documento) => ({
    url: `${base}/${documento.slug}`,
    lastModified: new Date(documento.actualizadoEn),
    changeFrequency: "monthly" as const,
    priority: 0.3,
  }));

  return [...paginas, ...legales];
}