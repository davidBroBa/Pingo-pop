import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RegisterSchema } from "../src/lib/register-schema";

/**
 * Tests del esquema de registro publico de cliente (spec 010).
 *
 * Modulo puro, sin DOM ni base de datos. Se escriben junto con la implementacion
 * para fijar los casos que la ruta `/api/auth/register` da por sentados:
 * normalizacion del email, politica BUYER, y que las dos casillas legales sean
 * imprescindibles.
 */

const VALIDO = {
  email: "  Cliente@Ejemplo.COM ",
  name: "Cliente de Prueba",
  password: "clavefaca",
  confirmPassword: "clavefaca",
  aceptacion: { acepta: true, terminos: "1.0", privacidad: "1.0" },
} as const;

describe("RegisterSchema - casos felices", () => {
  it("acepta un registro valido y normaliza el email", () => {
    const result = RegisterSchema.safeParse(VALIDO);
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.email, "cliente@ejemplo.com");
    assert.equal(result.data.name, "Cliente de Prueba");
  });

  it("permite registro sin nombre (es opcional)", () => {
    const result = RegisterSchema.safeParse({ ...VALIDO, name: undefined });
    assert.equal(result.success, true);
  });

  it("la politica BUYER no exige complejidad (solo 8+)", () => {
    const result = RegisterSchema.safeParse({
      ...VALIDO,
      password: "abcdefgh",
      confirmPassword: "abcdefgh",
    });
    assert.equal(result.success, true);
  });
});

describe("RegisterSchema - validaciones", () => {
  it("rechaza contrasena corta", () => {
    const result = RegisterSchema.safeParse({
      ...VALIDO,
      password: "corta",
      confirmPassword: "corta",
    });
    assert.equal(result.success, false);
    if (result.success) return;
    assert.ok(
      result.error.issues.some((issue) => issue.path.includes("password")),
      "debe reportar el campo password",
    );
  });

  it("rechaza contrasenas que no coinciden", () => {
    const result = RegisterSchema.safeParse({
      ...VALIDO,
      confirmPassword: "otracosa123",
    });
    assert.equal(result.success, false);
  });

  it("rechaza email invalido", () => {
    const result = RegisterSchema.safeParse({ ...VALIDO, email: "no-es-correo" });
    assert.equal(result.success, false);
  });

  it("rechaza nombre con caracteres de control", () => {
    const result = RegisterSchema.safeParse({
      ...VALIDO,
      name: "Nombre\u0007Raro",
    });
    assert.equal(result.success, false);
  });
});

describe("RegisterSchema - aceptacion legal obligatoria", () => {
  it("rechaza si acepta no es true", () => {
    const result = RegisterSchema.safeParse({
      ...VALIDO,
      aceptacion: { ...VALIDO.aceptacion, acepta: false },
    });
    assert.equal(result.success, false);
    if (result.success) return;
    assert.ok(
      result.error.issues.some(
        (issue) => issue.path[0] === "aceptacion" && issue.path[1] === "acepta",
      ),
      "debe reportar la casilla de aceptacion",
    );
  });

  it("rechaza si falta la version de terminos", () => {
    const result = RegisterSchema.safeParse({
      ...VALIDO,
      aceptacion: { acepta: true, terminos: "", privacidad: "1.0" },
    });
    assert.equal(result.success, false);
  });

  it("rechaza si falta la version de privacidad", () => {
    const result = RegisterSchema.safeParse({
      ...VALIDO,
      aceptacion: { acepta: true, terminos: "1.0", privacidad: "" },
    });
    assert.equal(result.success, false);
  });

  it("rechaza versiones no vigentes (0.9 no es actual)", () => {
    const result = RegisterSchema.safeParse({
      ...VALIDO,
      aceptacion: { acepta: true, terminos: "0.9", privacidad: "1.0" },
    });
    assert.equal(result.success, false);
  });

  it("rechaza si falta el objeto de aceptacion entero", () => {
    const { email, name, password, confirmPassword } = VALIDO;
    const result = RegisterSchema.safeParse({
      email,
      name,
      password,
      confirmPassword,
    });
    assert.equal(result.success, false);
  });
});
