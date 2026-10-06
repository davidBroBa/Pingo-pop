import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/env";

/**
 * Rutas que **no** deben indexarse.
 *
 * `/admin` es el panel: que un buscador lo indexe no solo es inutil, es
 * una.URL de administracion en un resultado de busqueda. `/perfil` y
 * `/cotizacion` son personales: el primero es la cuenta de alguien y el segundo
 * su carrito, leido desde `localStorage`, asi que indexarlos no publica datos
 * pero si invites a entrar a paginas vacias.
 *
 * `Disallow` **no** es una proteccion de seguridad: un buscador puede ignorar
 * esta linea. Lo que protege es el indice, no el acceso. El acceso lo
 *eterminan el middleware y `requireAdmin()`.
 */
/**
 * Las cinco rutas que la spec (T15) pedia mas la que el codigo habia anadido.
 *
 * `/api` no devuelve paginas sino datos, y casi todos exigen sesion: no hay
 * nada que indexar. `/login` es un formulario, y un buscador que lo indexe
 * ofrece "entrar" a quien no tiene cuenta. `/cotizacion` estaba ya porque es el
 * carrito del visitante. Seunion las cinco: `Disallow` nunca protege el acceso,
 * solo el indice, asi que anadir rutas aqui no tiene coste.
 */
const RUTAS_PRIVADAS = [
  "/admin",
  "/api",
  "/perfil",
  "/login",
  "/cotizacion",
];

/**
 * `robots.txt`.
 *
 * Todo el sitio es publico salvo esas tres rutas. La sesion no cambia nada
 * aqui: un buscador no envia cookies, asi que listar paginas privadas "para los
 * que ya estan dentro" no tendria ningun sentido.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: RUTAS_PRIVADAS,
      },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}