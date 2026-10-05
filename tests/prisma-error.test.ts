import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Prisma } from "../src/generated/prisma/client";
import { describePrismaError } from "../src/lib/prisma-error";

/**
 * Construye un `PrismaClientKnownRequestError` real. No vale un objeto
 *Literico con `code`: el modulo decide con `instanceof`, y un objeto plano
 * pasaria por la rama de "error desconocido" dando un falso verde.
 */
function knownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("fallo de prueba", {
    code,
    clientVersion: "prueba",
    meta: {},
  });
}

describe("describePrismaError", () => {
  it("trata la violacion de clave foranea como error del cliente", () => {
    const resultado = describePrismaError(knownError("P2003"), "No se pudo crear.");

    assert.equal(resultado.status, 422);
    assert.equal(resultado.serverFault, false);
  });

  it("no filtra el mensaje original al cliente en P2003", () => {
    const resultado = describePrismaError(knownError("P2003"), "No se pudo crear.");

    assert.ok(
      !resultado.message.includes("prueba"),
      `el mensaje filtra detalles internos: ${resultado.message}`,
    );
  });

  it("trata la violacion de unicidad como conflicto", () => {
    assert.equal(describePrismaError(knownError("P2002"), "x").status, 409);
  });

  it("trata el registro inexistente como 404", () => {
    assert.equal(describePrismaError(knownError("P2025"), "x").status, 404);
  });

  it("trata la relacion obligatoria no cumplida como 422", () => {
    assert.equal(describePrismaError(knownError("P2014"), "x").status, 422);
  });

  it("un error conocido no catalogado es 400, no 500", () => {
    const resultado = describePrismaError(knownError("P2999"), "No se pudo crear.");

    assert.equal(resultado.status, 400);
    assert.equal(resultado.serverFault, false);
  });

  it("un fallo real del servidor sigue siendo 500 y se registra", () => {
    const resultado = describePrismaError(new Error("pool agotado"), "No se pudo crear.");

    assert.equal(resultado.status, 500);
    assert.equal(resultado.serverFault, true);
  });

  it("algo que no es un error tampoco se trata como fallo del cliente", () => {
    assert.equal(describePrismaError("cadena", "x").status, 500);
    assert.equal(describePrismaError(undefined, "x").status, 500);
    assert.equal(describePrismaError(null, "x").status, 500);
  });

  it("usa el mensaje de reserva en un fallo del servidor", () => {
    const resultado = describePrismaError(new Error("detalle interno"), "No se pudo crear.");

    assert.equal(resultado.message, "No se pudo crear.");
  });

  it("el mensaje de un fallo del servidor no incluye el detalle interno", () => {
    const resultado = describePrismaError(
      new Error("ECONNREFUSED 127.0.0.1:3306 usuario=pingo"),
      "No se pudo crear.",
    );

    assert.ok(!resultado.message.includes("3306"));
    assert.ok(!resultado.message.includes("pingo"));
  });
});
