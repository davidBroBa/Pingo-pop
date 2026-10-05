import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clientKey, consume, retryAfterSeconds } from "../src/lib/rate-limit";

/**
 * El limitador mantiene el estado en un `Map` del modulo, asi que las pruebas
 * usan claves distintas para no depender del orden de ejecucion.
 */

/** Contador unico, para que cada prueba use su propia clave. */
let sequence = 0;

/** Clave nueva garantizada, incluso si dos pruebas coinciden en nombre. */
function freshKey(label: string): string {
  sequence += 1;
  return `${label}-${sequence}`;
}

describe("limitador de peticiones", () => {
  it("permite el primer intento", () => {
    assert.equal(consume(freshKey("nuevo"), 3), true);
  });

  it("rechaza al superar el maximo", () => {
    const key = freshKey("lleno");
    assert.equal(consume(key, 3), true);
    assert.equal(consume(key, 3), true);
    assert.equal(consume(key, 3), true);
    assert.equal(consume(key, 3), false);
  });

  it("sigue rechazando despues del limite", () => {
    const key = freshKey("persistente");
    for (let i = 0; i < 5; i += 1) {
      consume(key, 2);
    }
    assert.equal(consume(key, 2), false);
  });

  it("deja pasar de nuevo cuando vence la ventana", () => {
    const key = freshKey("ventana");
    assert.equal(consume(key, 1, 30), true);
    assert.equal(consume(key, 1, 30), false);

    // Ventana de 30 ms: al expirar, el mismo contador vuelve a estar disponible.
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        assert.equal(consume(key, 1, 30), true);
        resolve();
      }, 45);
    });
  });

  it("mantiene las claves separadas entre si", () => {
    const a = freshKey("a");
    const b = freshKey("b");
    assert.equal(consume(a, 1), true);
    assert.equal(consume(a, 1), false);
    // Que `a` este agotada no puede cerrar la cuota de `b`: si compartieran
    // cuota, un atacante podria agotar la de otro inundando su propia IP.
    assert.equal(consume(b, 1), true);
  });

  it("informa de los segundos que quedan para reintentar", () => {
    const key = freshKey("retry");
    consume(key, 1, 60_000);
    const seconds = retryAfterSeconds(key);
    assert.ok(seconds > 0 && seconds <= 60, `esperaba 1..60, obtuve ${seconds}`);
  });

  it("devuelve 0 segundos cuando no hay cuota activa", () => {
    assert.equal(retryAfterSeconds("clave-que-nunca-se-uso"), 0);
  });
});

describe("extraccion de la IP del cliente", () => {
  it("toma la primera direccion de x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178",
    });
    assert.equal(clientKey(headers), "203.0.113.7");
  });

  it("cae a x-real-ip si no hay x-forwarded-for", () => {
    const headers = new Headers({ "x-real-ip": "198.51.100.4" });
    assert.equal(clientKey(headers), "198.51.100.4");
  });

  it("agrupa en localhost cuando no hay ninguna cabecera", () => {
    // Sin proxy todas las peticiones comparten cuota. Es un trade-off
    // explicito: preferimos agrupar a que la cuota sea esquivable con una
    // cabecera manipulada.
    assert.equal(clientKey(new Headers()), "127.0.0.1");
  });

  it("ignora un x-forwarded-for vacio", () => {
    const headers = new Headers({
      "x-forwarded-for": "",
      "x-real-ip": "198.51.100.9",
    });
    assert.equal(clientKey(headers), "198.51.100.9");
  });
});
