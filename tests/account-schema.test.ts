import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ADMIN_PASSWORD_MIN_LENGTH,
  BUYER_PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  ChangePasswordSchema,
  UpdateProfileSchema,
  passwordPolicyProblems,
} from "../src/lib/account-schema";

/**
 * Tests de las dos politicas de contrasena y de los esquemas de cuenta.
 *
 * Escritos ANTES que `src/lib/account-schema.ts` para verlos fallar de verdad.
 * Modulo puro: sin DOM y sin base de datos, que es lo permite `node:test`.
 *
 * Cada caso dice en el titulo cuantos caracteres tiene, para que la cuenta no haya
 * que hacer a mano y un cambio futuro no rompa la intencion sin avisar.
 */

/** Caracter de control Bell: inyecta saltos rareos al devolver el dato. */
const BELL = "\u0007";

describe("limites compartidos", () => {
  it("el suelo de BUYER es 8 porque el login rechaza menos", () => {
    assert.equal(BUYER_PASSWORD_MIN_LENGTH, 8);
  });

  it("el suelo de ADMIN es 12", () => {
    assert.equal(ADMIN_PASSWORD_MIN_LENGTH, 12);
  });

  it("las dos politicas comparten el tope de 200", () => {
    assert.equal(PASSWORD_MAX_LENGTH, 200);
  });
});

describe("politica BUYER: relajada, sin exigir complejidad", () => {
  it("acepta 8 digitos, sin una sola letra", () => {
    assert.deepEqual(passwordPolicyProblems("12345678", "BUYER"), []);
  });

  it("rechaza 7 caracteres", () => {
    assert.ok(passwordPolicyProblems("1234567", "BUYER").length > 0);
  });

  it("acepta una palabra larga sin mayusculas ni simbolos", () => {
    assert.deepEqual(passwordPolicyProblems("pachamama", "BUYER"), []);
  });

  it("no exige mayuscula, minuscula, digito ni puntuacion", () => {
    // "abcdefgh" son 8 caracteres y no tiene nada de lo que ADMIN exige.
    assert.deepEqual(passwordPolicyProblems("abcdefgh", "BUYER"), []);
    assert.ok(passwordPolicyProblems("abcdefgh", "ADMIN").length > 0);
  });

  it("acepta acentos y enye", () => {
    // "anio" con enye: 4 caracteres, se anaden 4 mas para llegar al suelo.
    assert.deepEqual(passwordPolicyProblems(`${"anioñ".repeat(2)}`, "BUYER"), []);
  });

  it("acepta espacios", () => {
    assert.deepEqual(passwordPolicyProblems("mi pin 1", "BUYER"), []);
  });

  it("acepta exactamente 200 caracteres", () => {
    assert.deepEqual(passwordPolicyProblems("a".repeat(200), "BUYER"), []);
  });

  it("rechaza 201 caracteres", () => {
    assert.ok(passwordPolicyProblems("a".repeat(201), "BUYER").length > 0);
  });

  it("rechaza un caracter de control aunque el largo sea correcto", () => {
    assert.ok(passwordPolicyProblems(`abcd${BELL}efgh`, "BUYER").length > 0);
  });
});

describe("politica ADMIN: estricta", () => {
  it("acepta una contrasena que cumple las cuatro condiciones", () => {
    assert.deepEqual(passwordPolicyProblems("Pingo.Admin2026!", "ADMIN"), []);
  });

  it("rechaza 11 caracteres aunque tenga de todo", () => {
    assert.ok(passwordPolicyProblems("Ab1!efghij", "ADMIN").length > 0);
  });

  it("rechaza sin mayuscula", () => {
    assert.ok(passwordPolicyProblems("pingo.admin2026!", "ADMIN").length > 0);
  });

  it("rechaza sin digito", () => {
    assert.ok(passwordPolicyProblems("Pingo.AdminAdmin!", "ADMIN").length > 0);
  });

  it("rechaza sin signo de puntuacion", () => {
    assert.ok(passwordPolicyProblems("PingoAdmin2026", "ADMIN").length > 0);
  });

  it("rechaza sin minuscula", () => {
    assert.ok(passwordPolicyProblems("PINGO.ADMIN2026!", "ADMIN").length > 0);
  });

  it("el motivo devuelto nombra la regla que se incumple", () => {
    const problemas = passwordPolicyProblems("pingo.admin2026!", "ADMIN");
    assert.ok(problemas.length > 0);
    assert.match(problemas.join(" "), /may/i);
  });

  it("rechaza 201 caracteres", () => {
    assert.ok(passwordPolicyProblems("aA1!".repeat(60), "ADMIN").length > 0);
  });

  it("rechaza un caracter de control aunque cumpla las cuatro condiciones", () => {
    assert.ok(passwordPolicyProblems(`Pingo.Admin2026!${BELL}`, "ADMIN").length > 0);
  });
});

describe("UpdateProfileSchema", () => {
  it("acepta un nombre dentro de rango", () => {
    assert.equal(UpdateProfileSchema.safeParse({ name: "Pingo" }).success, true);
    assert.equal(UpdateProfileSchema.safeParse({ name: "a".repeat(120) }).success, true);
  });

  it("rechaza un nombre de 1 caracter", () => {
    assert.equal(UpdateProfileSchema.safeParse({ name: "a" }).success, false);
  });

  it("rechaza un nombre de 121 caracteres", () => {
    assert.equal(UpdateProfileSchema.safeParse({ name: "a".repeat(121) }).success, false);
  });

  it("rechaza un nombre vacio o solo espacios", () => {
    assert.equal(UpdateProfileSchema.safeParse({ name: "" }).success, false);
    assert.equal(UpdateProfileSchema.safeParse({ name: "   " }).success, false);
  });

  it("rechaza un nombre con caracter de control", () => {
    assert.equal(UpdateProfileSchema.safeParse({ name: `Pin${BELL}go` }).success, false);
  });

  it("no acepta campos extra: el email no se edita por aqui", () => {
    const resultado = UpdateProfileSchema.safeParse({
      name: "Pingo",
      email: "otro@ejemplo.com",
    });
    assert.equal(resultado.success, false);
  });
});

describe("ChangePasswordSchema", () => {
  const base = {
    currentPassword: "12345678",
    newPassword: "Pingo.Admin2026!",
    confirmPassword: "Pingo.Admin2026!",
  };

  it("acepta un cambio coherente", () => {
    assert.equal(ChangePasswordSchema.safeParse(base).success, true);
  });

  it("rechaza si la confirmacion no coincide", () => {
    assert.equal(
      ChangePasswordSchema.safeParse({ ...base, confirmPassword: "otra" }).success,
      false,
    );
  });

  it("exige los tres campos", () => {
    assert.equal(ChangePasswordSchema.safeParse({}).success, false);
    assert.equal(
      ChangePasswordSchema.safeParse({ currentPassword: "x" }).success,
      false,
    );
  });

  it("rechaza una contrasena actual vacia", () => {
    assert.equal(
      ChangePasswordSchema.safeParse({ ...base, currentPassword: "" }).success,
      false,
    );
  });

  it("acepta una contrasena nueva relajada", () => {
    const cambio = {
      currentPassword: "12345678",
      newPassword: "pachamama",
      confirmPassword: "pachamama",
    };
    assert.equal(ChangePasswordSchema.safeParse(cambio).success, true);
  });

  it("NO comprueba la politica: la aplica el endpoint segun el rol", () => {
    // "abcd" son 4 caracteres: pasa el esquema, y el endpoint lo rechaza con 400
    // aplicando la politica. Aqui solo se comprueban forma y coincidencia.
    const cambio = {
      currentPassword: "12345678",
      newPassword: "abcd",
      confirmPassword: "abcd",
    };
    assert.equal(ChangePasswordSchema.safeParse(cambio).success, true);
  });
});
