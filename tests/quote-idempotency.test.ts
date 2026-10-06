import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import {
  FORMATO_TOKEN,
  decisionDeIdempotencia,
  esTokenValido,
  normalizarToken,
} from "../src/lib/quote-idempotency";

/**
 * NOTA DE VERIFICACION, y hay que saberla antes de dar esta suite por buena:
 *
 * Esto demuestra **la mitad pura** del requisito RF-27: que el token se valida,
 * se normaliza y decide correctamente. Lo que **no** demuestra es que la base de
 * datos no duplique la solicitud: eso es cosa del indice unico de la migracion
 * y de la transaccion de `POST /api/quotes`, y se comprueba en **V9**. Un test
 * que afirmara lo que no comprueba seria peor que no tener test.
 */

/** Un UUID v4 tal y como lo genera `crypto.randomUUID()`. */
function tokenValido(): string {
  return randomUUID();
}

describe("FORMATO_TOKEN", () => {
  it("acepta un UUID v4", () => {
    const token = tokenValido();

    assert.match(token, FORMATO_TOKEN);
    assert.equal(esTokenValido(token), true);
  });

  it("acepta las dos formas canonicas de un v4", () => {
    // La `4` en el tercer grupo y la `8`/`9`/`a`/`b` en el cuarto son las que
    // distinguen la version 4 y la variante RFC 4122.
    assert.equal(
      esTokenValido("3f2504e0-4f89-41d3-9a0c-0305e82c3301"),
      true,
    );
    assert.equal(
      esTokenValido("f81d4fae-7dec-41b0-a765-00a0c91e6bf6"),
      true,
    );
  });

  it("rechaza la cadena vacia", () => {
    assert.equal(esTokenValido(""), false);
    assert.equal(normalizarToken(""), null);
  });
});

describe("Lo que se rechaza: token vacio o manipulado", () => {
  it("rechaza 36 caracteres que no son un UUID", () => {
    const manipulado = "x".repeat(36);

    assert.equal(manipulado.length, 36);
    assert.equal(esTokenValido(manipulado), false);
    assert.equal(normalizarToken(manipulado), null);
  });

  it("rechaza un UUID v1: la clave no dice de donde viene", () => {
    // Un v1 lleva la hora y la maquina; aqui solo se admite v4, que es
    // aleatorio y es lo que genera `crypto.randomUUID()`.
    assert.equal(
      esTokenValido("6ba7b810-9dad-11d1-80b4-00c04fd430c8"),
      false,
    );
  });

  it("rechaza una entrada que no es texto", () => {
    assert.equal(esTokenValido(null), false);
    assert.equal(esTokenValido(undefined), false);
    assert.equal(esTokenValido(42), false);
    assert.equal(esTokenValido({}), false);
    assert.equal(esTokenValido([]), false);
    assert.equal(normalizarToken(null), null);
  });

  it("rechaza un intento de traversal en vez de devolverlo tal cual", () => {
    assert.equal(
      normalizarToken("../../etc/passwd"),
      null,
    );
    assert.equal(normalizarToken("'; DROP TABLE QuoteRequest; --"), null);
  });

  it("rechaza un token con espacios pegados: no se recorta para validar", () => {
    // `esTokenValido` es la puerta de seguridad y no perdona nada.
    assert.equal(esTokenValido(`  ${tokenValido()}  `), false);
  });
});

describe("normalizarToken", () => {
  it("recorta los espacios y acepta el token que venga envuelto", () => {
    const token = tokenValido();

    assert.equal(normalizarToken(`  ${token}  `), token);
  });

  it("baja a minusculas un UUID en mayusculas", () => {
    const token = tokenValido().toUpperCase();
    const minuscula = token.toLowerCase();

    assert.equal(normalizarToken(token), minuscula);
    assert.equal(esTokenValido(minuscula), true);
  });

  it("devuelve el token ya normalizado tal cual, sin tocarlo", () => {
    const token = tokenValido();

    assert.equal(normalizarToken(token), token);
  });

  it("el mismo token con espacios y en mayusculas da la misma clave", () => {
    const token = tokenValido();

    assert.equal(
      normalizarToken(` ${token.toUpperCase()} `),
      normalizarToken(token),
    );
  });
});

describe("El mismo token dos veces no crea dos solicitudes (RF-27)", () => {
  it("dos tokens distintos dan claves distintas", () => {
    const uno = normalizarToken(tokenValido());
    const otro = normalizarToken(tokenValido());

    assert.ok(uno !== null && otro !== null);
    assert.notEqual(uno, otro);
  });

  it("sin fila previa, el token decide crear", () => {
    const decision = decisionDeIdempotencia(tokenValido(), null);

    assert.deepEqual(decision, { reutilizar: false });
  });

  it("con fila previa para ese token, decide reutilizar su id", () => {
    const token = tokenValido();
    const primera = decisionDeIdempotencia(token, null);
    assert.deepEqual(primera, { reutilizar: false });

    // El segundo envio del mismo navegador llega con la misma clave y la misma
    // fila existe: aqui esta la deduplicacion.
    const segunda = decisionDeIdempotencia(token, { id: 7 });

    assert.deepEqual(segunda, { reutilizar: true, id: 7 });
  });

  it("el token llega con espacios o en mayusculas y la decision no cambia", () => {
    const token = tokenValido();

    assert.deepEqual(
      decisionDeIdempotencia(` ${token.toUpperCase()} `, { id: 7 }),
      { reutilizar: true, id: 7 },
    );
  });

  it("un token manipulado se RECHAZA antes de mirar si existe la fila", () => {
    // Es lo que pide la spec: un token invalido no se acepta como "primera
    // vez", porque eso seria una puerta abierta a crear solicitudes sin clave.
    const manipulado = decisionDeIdempotencia("x".repeat(36), null);

    assert.deepEqual(manipulado, { error: "token invalido" });

    const vacio = decisionDeIdempotencia("", null);
    assert.deepEqual(vacio, { error: "token invalido" });

    const conFila = decisionDeIdempotencia("x".repeat(36), { id: 7 });
    assert.deepEqual(conFila, { error: "token invalido" });
  });

  it("la decision dice siempre una de las tres cosas, y solo tres", () => {
    const decisiones = [
      decisionDeIdempotencia(tokenValido(), null),
      decisionDeIdempotencia(tokenValido(), { id: 3 }),
      decisionDeIdempotencia("x".repeat(36), null),
    ];

    for (const decision of decisiones) {
      if ("error" in decision) {
        // Rechazar: una sola clave, la del error.
        assert.deepEqual(Object.keys(decision), ["error"]);
        continue;
      }
      // Crear o reutilizar: `reutilizar` siempre, y `id` solo al reutilizar.
      // Nunca `error` junto a `reutilizar`, que es como se confunde un 400 con
      // un 201 en el endpoint.
      if (decision.reutilizar === true) {
        assert.deepEqual(Object.keys(decision).sort(), ["id", "reutilizar"]);
      } else {
        assert.deepEqual(Object.keys(decision), ["reutilizar"]);
      }
    }
  });

  it("reutilizar solo aparece cuando hay id, y error nunca con id", () => {
    const conFila = decisionDeIdempotencia(tokenValido(), { id: 42 });

    assert.equal("id" in conFila, true);
    assert.equal("error" in decisionDeIdempotencia("", null), true);
    assert.equal("id" in decisionDeIdempotencia("", null), false);
  });
});