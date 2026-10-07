import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  esRutaDeAdmin,
  limitaSesionTemporal,
  sesionLimitada,
} from "../src/lib/auth/sesion-temporal";

/**
 * Que puede hacer una sesion que todavia no ha cambiado la contrasena temporal
 * (spec 007, D21/D24).
 *
 * ## Por que este modulo es tan pequeno
 *
 * El `matcher` del `proxy` es `["/admin/:path*", "/perfil"]`. El proxy **no ve**
 * ninguna otra ruta, asi que este no puede ser "redirigir todo a /perfil": no le
 * llegan las demas peticiones. Y ensanchar el matcher para que las viera pasaria
 * **todas** las peticiones del sitio por la verificacion HMAC, y ademas del
 * `middleware.ts`, que es justo el fichero que Next 16 avisa que va a cambiar de
 * nombre. Un cambio de ese tamano en el fichero mas sensible de la autenticacion
 * no entra de polvillo en una spec de cuentas.
 *
 * El limite se aplica donde el proxy **si** esta: `403` en todo `/admin/*`, y
 * `/perfil` pasa. Con eso un ADMIN recien creado **no puede entrar al panel** con la
 * contrasena temporal, que es el objetivo de D21. Podria mirar el catalogo publico, y
 * no estorba a nadie.
 *
 * ## Y en la API, que el proxy no ve
 *
 * `{@link sesionLimitada}` la usan **dos** barreras, porque el proxy no protege la
 * API: una peticion directa a `/api/admin/productos` no pasa por el matcher. Sin el
 * segundo consumidor, un ADMIN con contrasena temporal tendia el panel cerrado pero
 * podria escribir en la API, y "el dano se limita a /perfil" seria falso.
 *
 * ## Lo que obliga de verdad
 *
 * Son tres cosas y **ninguna funciona sola**:
 *  - el `403` en `/admin/*` del proxy,
 *  - el `403` de `requireAdmin()` en la API,
 *  - y un aviso en `/perfil` que no desaparece hasta que se cambie.
 */

describe("limitaSesionTemporal (lo que decide el proxy)", () => {
  it("sin marca, todo pasa: es el caso normal", () => {
    assert.equal(limitaSesionTemporal("/productos", 0), "pasar");
    assert.equal(limitaSesionTemporal("/admin/productos", 0), "pasar");
    assert.equal(limitaSesionTemporal("/perfil", 0), "pasar");
  });

  it("swc AUSENTE se comporta como 0, y no expulsa a nadie", () => {
    // El caso del despliegue: cookies firmadas antes de que existiera el campo.
    // Si aqui se tratara como marcada, al desplegar todo el mundo perdia el panel
    // de golpe. Es el mismo motivo por el que `verifySession` lo interpreta como 0.
    const sinSwc = undefined as unknown as number;
    assert.equal(limitaSesionTemporal("/admin/productos", sinSwc), "pasar");
    assert.equal(limitaSesionTemporal("/perfil", sinSwc), "pasar");
  });

  it("con la marca puesta, /admin/* queda DENEGADO", () => {
    // Es el nucleo de D21: con una contrasena temporal no se tocan cotizaciones
    // ni datos legales.
    assert.equal(limitaSesionTemporal("/admin/productos", 1), "denegar");
    assert.equal(limitaSesionTemporal("/admin/cotizaciones", 1), "denegar");
    assert.equal(limitaSesionTemporal("/admin/legal", 1), "denegar");
  });

  it("con la marca puesta, /perfil PASA siempre", () => {
    // La trampa del bucle. Si el proxy denegara o redirigiera `/perfil`, la
    // persona se quedaria sin poder cambiar la contrasena que le obligaron a
    // cambiar: un callejon sin salida. Aqui solo hay dos estados posibles y ninguno
    // de los dos bloquea el paso.
    assert.equal(limitaSesionTemporal("/perfil", 1), "pasar");
  });

  it("/admin no deniega a si mismo: solo a lo que hay debajo", () => {
    // `/administracion` no empieza por `/admin/` como camino, pero `/admin` a secas
    // si. Y `/administerio` **no** debe quedar bloqueado por una comparacion
    // sin barra: es una pagina normal.
    assert.equal(limitaSesionTemporal("/admin", 1), "denegar");
    assert.equal(limitaSesionTemporal("/administracion", 1), "pasar");
    assert.equal(limitaSesionTemporal("/admin-x", 1), "pasar");
  });

  it("cualquier valor distinto de 1 es 0 a efectos de decision", () => {
    // `swc` llega validado como entero >= 0, asi que 2 no deberia ocurrir. Pero si
    // ocurre, lo que **no** puede pasar es que se interprete como "marcada": de eso
    // se deduce que el compare es estricto, no un `if (swc)`.
    assert.equal(limitaSesionTemporal("/admin/productos", 2), "pasar");
    assert.equal(limitaSesionTemporal("/admin/productos", 0), "pasar");
  });
});

describe("esRutaDeAdmin", () => {
  it("reconoce el panel y solo el panel", () => {
    assert.equal(esRutaDeAdmin("/admin"), true);
    assert.equal(esRutaDeAdmin("/admin/productos"), true);
    assert.equal(esRutaDeAdmin("/administracion"), false);
    assert.equal(esRutaDeAdmin("/perfil"), false);
  });
});

/**
 * El predicado que comparten el proxy y `requireAdmin()`.
 *
 * Vive aqui, y no en `proxy-limit` porque los dos lo necesitan y un modulo que se
 * llama "del proxy" importado desde la API seria un nombre que miente. Se prueba
 * aparte del `switch` de rutas porque es el que decide si la API responde 403, y ese
 * 403 es el que impide escribir con una contrasena temporal.
 */
describe("sesionLimitada", () => {
  it("solo el 1 exacto marca la sesion como limitada", () => {
    assert.equal(sesionLimitada(1), true);
    assert.equal(sesionLimitada(0), false);
  });

  it("swc AUSENTE no limita: el despliegue no puede expulsar a nadie", () => {
    const sinSwc = undefined as unknown as number;
    assert.equal(
      sesionLimitada(sinSwc),
      false,
      "un token sin swc es de antes del despliegue y debe seguir valiendo",
    );
  });

  it("un valor inesperado deja pasar, porque el coste de equivocarse es distinto", () => {
    // `verifySession` ya rechaza lo que no es entero >= 0, asi que esto no deberia
    // llegar. Pero si llegara, denegar por un dato raro deja el sitio sin nadie que
    // lo administre, y pasar no pierde nada porque las dos barreras vuelven a
    // comprobar contra la base de datos.
    assert.equal(sesionLimitada(2), false);
    assert.equal(sesionLimitada(-1), false);
  });

  it("es coherente con el limite del proxy: mismos valores, misma respuesta", () => {
    // Si estas dos funciones se desincronizasen, el panel se cerraria y la API
    // seguiria abierta, o al reves. Un solo recorrido las compara.
    for (const swc of [0, 1, 2, -1]) {
      const limitada = sesionLimitada(swc);
      const porRuta = limitaSesionTemporal("/admin/productos", swc) === "denegar";
      assert.equal(
        limitada,
        porRuta,
        `con swc=${swc} las dos barreras tienen que coincidir`,
      );
    }
  });
});