import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSessionCurrent } from "../src/lib/auth/session-token";

/**
 * Tests de la comparacion de version de sesion.
 *
 * Escritos ANTES de implementar `isSessionCurrent`, para verlos fallar de verdad.
 *
 * Que la funcion sea pura y separad de Prisma es deliberado: la revocacion depende de
 * la BD, pero la **decision** de si una sesion sigue vigente no. Asi se puede
 * comprobar la matriz entera sin base de datos ni navegador.
 */

describe("isSessionCurrent", () => {
  it("una sesion sin cambios sigue vigente", () => {
    assert.equal(isSessionCurrent(0, 0), true);
    assert.equal(isSessionCurrent(1, 1), true);
    assert.equal(isSessionCurrent(7, 7), true);
  });

  it("una cookie mas nueva que la BD no vale (borrada y recreada)", () => {
    // Puede pasar si alguien restaura una copia de la base de datos.
    assert.equal(isSessionCurrent(5, 3), false);
  });

  it("una cookie mas vieja que la BD no vale: la contrasena cambio", () => {
    assert.equal(isSessionCurrent(2, 3), false);
    assert.equal(isSessionCurrent(0, 1), false);
  });

  it("la cookie antigua sin `sv` se trata como version 0 y sigue viva", () => {
    // Es el caso del despliegue: las cookies emitidas antes de este cambio no
    // tienen `sv` y no deben expulsar a nadie de golpe.
    assert.equal(isSessionCurrent(0, 0), true);
  });

  it("una version negativa nunca es vigente", () => {
    // No deberia llegar: `verifySession` ya lo rechaza. Aqui se blinda la ultima
    // linea por si alguien llama a esta funcion con un payload a mano.
    assert.equal(isSessionCurrent(-1, 0), false);
    assert.equal(isSessionCurrent(-1, -1), false);
  });

  it("no se fia de comparar solo por desigualdad: exige igualdad exacta", () => {
    assert.equal(isSessionCurrent(1, 2), false);
    assert.equal(isSessionCurrent(2, 1), false);
  });
});
