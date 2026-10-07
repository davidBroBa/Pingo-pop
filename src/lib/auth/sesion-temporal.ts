/**
 * Limite de la sesion que todavia no ha cambiado la contrasena temporal
 * (spec 007, D21/D24).
 *
 * ## Que decide, y por que es tan poco
 *
 * El `matcher` del `proxy` es `["/admin/:path*", "/perfil"]`: **no ve ninguna otra
 * ruta**. Por eso esta decision tiene exactamente dos casos utiles, y no el
 * "redirigirlo todo a `/perfil`" que se planeo al principio: al proxy no le llegan
 * las demas peticiones.
 *
 * Y ensanchar el matcher para que las viera seria un cambio de otro tamano: pasaria
 * **todas** las peticiones del sitio por la verificacion HMAC, en el fichero que
 * Next 16.3.8 avisa que va a cambiar de nombre a `proxy`. Eso no entra de polvillo en
 * una spec de cuentas de usuario.
 *
 * ## Lo que si se consigue
 *
 * Un ADMIN recien creado **no puede entrar al panel** con la contrasena temporal:
 * `/admin/*` queda **denegado**, con 403, hasta que la cambie. Ese es el objetivo de
 * D21, que el administrador que la puso nunca conozca una contrasena que sirva para
 * algo. Podria mirar el catalogo publico, y no estorba a nadie.
 *
 * ## Y la API, que el proxy no ve (y por que este modulo tiene dos clientes)
 *
 * El `proxy` protege la **navegacion**. Una peticion directa a
 * `POST /api/admin/productos` no pasa por su `matcher`, asi que sin una segunda
 * barrera un ADMIN con contrasena temporal tendria el panel cerrado pero podria
 * escribir en la API. Y "el dano se limita a `/perfil`" seria falso.
 *
 * Por eso {@link sesionLimitada} la usan los dos: `src/middleware.ts` para el 403 de
 * la pagina y `src/lib/auth/require-admin.ts` para el 403 de la API. Por eso el
 * fichero **no** se llama `proxy-limit`, que era el nombre que tuvo al escribirse:
 * un modulo llamado "del proxy" importado desde la API es un nombre que miente.
 *
 * ## Lo que obliga
 *
 * Son tres cosas y **ninguna funciona sola**:
 *
 *  1. El `403` en `/admin/*` del proxy.
 *  2. El `403` de `requireAdmin()`, que consulta la base de datos.
 *  3. Un aviso en `/perfil` que no desaparece hasta que se cambie.
 *
 * Sin la tercera, "obligatorio" seria una palabra: el panel se negaria sin explicar
 * por que. Con las tres, quien entra con la temporal ve el porque y tiene donde
 * resolverlo.
 *
 * Modulo **puro**: corre en Edge y no puede tocar Prisma, asi que lo unico que hace
 * aqui es decidir con lo que le da la cookie ya verificada. Y al ser puro, se prueba
 * entero con `node:test`, sin navegador.
 */

/** Lo que el proxy hace con una peticion. */
export type Decision = "pasar" | "denegar";

/** Lo unico que el proxy puede hacer con una sesion marcada. */
export const RUTA_PERFIL = "/perfil";

/** Prefijo del panel, **con barra**, para no capturar `/administracion`. */
const PREFIJO_ADMIN = "/admin";

/** Las peticiones del panel que este proxy ve, por el `matcher` actual. */
export function esRutaDeAdmin(ruta: string): boolean {
  return ruta === PREFIJO_ADMIN || ruta.startsWith(`${PREFIJO_ADMIN}/`);
}

/**
 * Si una sesion esta **limitada** por no haber cambiado la contrasena temporal.
 *
 * Este es el predicado que comparten las dos barreras, asi que va antes que nada y
 * no depende de la ruta.
 *
 * La comparacion es `=== 1` y **no** un `if (swc)`, por dos motivos:
 *
 *  - `swc` ausente se convierte en `0` en `verifySession()`, para que un despliegue
 *    no expulse a las cookies ya emitidas. Un `if (swc)` con un `undefined` que se
 *    colara seria falso, pero un `if (swc)` con un `-1` seria **cierto**, y eso
 *    cerraria el panel por un dato raro.
 *  - El coste de los dos errores no es el mismo: un valor inesperado que **pasa**
 *    no pierde nada, porque `requireAdmin()` y `getSessionUser()` vuelven a comprobar
 *    contra la base de datos; un valor inesperado que **deniega** deja el sitio sin
 *    nadie que lo administre.
 *
 * @param swc - El distintivo del token verificado: `1` si la sesion sigue con la
 *   contrasena temporal.
 * @returns `true` si la sesion todavia no ha cambiado la contrasena temporal.
 */
export function sesionLimitada(swc: number): boolean {
  return swc === 1;
}

/**
 * Decide si una peticion puede continuar con una sesion sin cambiar la contrasena.
 *
 * `swc` llega ya validado por `verifySession()` como entero **mayor o igual a 0`, y
 * ausente se ha convertido en `0` ahi. El unico predicado es
 * {@link sesionLimitada}, el mismo que usa `requireAdmin()`: si las dos barreras se
 * desincronizasen, el panel se cerraria y la API seguiria abierta. Hay un test que
 * las recorre con los mismos valores y exige que coincidan.
 *
 * @param ruta - `pathname` de la peticion.
 * @param swc - El distintivo del token verificado.
 * @returns `"denegar"` para el panel, `"pasar"` en cualquier otro caso.
 */
export function limitaSesionTemporal(ruta: string, swc: number): Decision {
  if (!sesionLimitada(swc)) return "pasar";
  if (esRutaDeAdmin(ruta)) return "denegar";
  return "pasar";
}