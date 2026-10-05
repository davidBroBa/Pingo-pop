import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_STORED_CART_LENGTH,
  parseStoredCart,
  serializeCart,
} from "../src/lib/quote-cart-storage";

/**
 * Ruta de imagen valida. Reutiliza el formato que exige `imagePath` en
 * `validation.ts`: `/uploads/products/` mas 32 hex mas extension.
 */
const VALID_IMAGE = "/uploads/products/a1b2c3d4e5f60718293a4b5c6d7e8f90.jpg";

/** Item valido, tal y como lo guarda `addItem` mas la cantidad. */
function item(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "Pin de enforceable",
    slug: "pin-de-enforceable",
    price: "150.00",
    image: null,
    quantity: 1,
    ...overrides,
  };
}

describe("parseStoredCart: lo que se acepta", () => {
  it("devuelve un item valido tal cual", () => {
    const resultado = parseStoredCart(JSON.stringify([item()]));

    assert.deepEqual(resultado, [item()]);
  });

  it("devuelve varios items conservando el orden", () => {
    const carrito = [item({ id: 1 }), item({ id: 2, quantity: 3 })];

    assert.deepEqual(parseStoredCart(JSON.stringify(carrito)), carrito);
  });

  it("acepta image como cadena", () => {
    const conImagen = item({ image: VALID_IMAGE });

    assert.deepEqual(parseStoredCart(JSON.stringify([conImagen])), [conImagen]);
  });

  it("acepta el tope exacto de 50 productos", () => {
    const tope = Array.from({ length: 50 }, (_, i) => item({ id: i + 1 }));

    assert.equal(parseStoredCart(JSON.stringify(tope)).length, 50);
  });

  it("acepta el tope exacto de cantidad 10000", () => {
    const resultado = parseStoredCart(JSON.stringify([item({ quantity: 10_000 })]));

    assert.equal(resultado[0]?.quantity, 10_000);
  });

  it("acepta un precio decimal con los dos decimales de Prisma", () => {
    const resultado = parseStoredCart(JSON.stringify([item({ price: "1234.56" })]));

    assert.equal(resultado[0]?.price, "1234.56");
  });
});

describe("parseStoredCart: lo que se rechaza y devuelve carrito vacio", () => {
  it("devuelve vacio si no hay nada guardado", () => {
    assert.deepEqual(parseStoredCart(null), []);
  });

  it("devuelve vacio si la cadena esta vacia", () => {
    assert.deepEqual(parseStoredCart(""), []);
  });

  it("devuelve vacio si el JSON esta corrupto", () => {
    assert.deepEqual(parseStoredCart("{{{"), []);
  });

  it("devuelve vacio si no es un array", () => {
    assert.deepEqual(parseStoredCart('{"a":1}'), []);
    assert.deepEqual(parseStoredCart('"texto"'), []);
    assert.deepEqual(parseStoredCart("42"), []);
    assert.deepEqual(parseStoredCart("null"), []);
  });

  it("devuelve vacio si a un item le falta un campo obligatorio", () => {
    const sinNombre = item();
    delete (sinNombre as Record<string, unknown>).name;

    assert.deepEqual(parseStoredCart(JSON.stringify([sinNombre])), []);
  });

  it("devuelve vacio si la cantidad es 0, negativa o decimal", () => {
    assert.deepEqual(parseStoredCart(JSON.stringify([item({ quantity: 0 })])), []);
    assert.deepEqual(parseStoredCart(JSON.stringify([item({ quantity: -3 })])), []);
    assert.deepEqual(parseStoredCart(JSON.stringify([item({ quantity: 1.5 })])), []);
  });

  it("devuelve vacio si la cantidad supera el limite del servidor", () => {
    assert.deepEqual(parseStoredCart(JSON.stringify([item({ quantity: 10_001 })])), []);
  });

  it("devuelve vacio si el id no es un entero positivo", () => {
    assert.deepEqual(parseStoredCart(JSON.stringify([item({ id: 0 })])), []);
    assert.deepEqual(parseStoredCart(JSON.stringify([item({ id: -1 })])), []);
    assert.deepEqual(parseStoredCart(JSON.stringify([item({ id: 1.5 })])), []);
  });

  it("devuelve vacio si hay mas de 50 productos", () => {
    const demasiados = Array.from({ length: 51 }, (_, i) => item({ id: i + 1 }));

    assert.deepEqual(parseStoredCart(JSON.stringify(demasiados)), []);
  });

  it("devuelve vacio si el precio no es un numero", () => {
    // Sin esta comprobacion, `Number("abc")` da NaN y la pagina muestra "NaN MXN".
    assert.deepEqual(parseStoredCart(JSON.stringify([item({ price: "abc" })])), []);
  });

  it("devuelve vacio si el nombre esta en blanco", () => {
    assert.deepEqual(parseStoredCart(JSON.stringify([item({ name: "   " })])), []);
  });

  it("devuelve vacio si image no es cadena ni null", () => {
    assert.deepEqual(parseStoredCart(JSON.stringify([item({ image: 42 })])), []);
  });

  it("devuelve vacio si la ruta de imagen es externa", () => {
    // Reutiliza `imagePath` de validation.ts: solo se admiten rutas propias.
    assert.deepEqual(
      parseStoredCart(JSON.stringify([item({ image: "https://otro-sitio/x.jpg" })])),
      [],
    );
    assert.deepEqual(
      parseStoredCart(JSON.stringify([item({ image: "/uploads/products/x.jpg" })])),
      [],
    );
  });

  it("devuelve vacio si el nombre trae caracteres de control", () => {
    // Reutiliza `shortText` de validation.ts.
    assert.deepEqual(
      parseStoredCart(JSON.stringify([item({ name: "Pin\u0000malo" })])),
      [],
    );
  });

  it("devuelve vacio si el slug no es un slug", () => {
    // Reutiliza `slugText` de validation.ts.
    assert.deepEqual(
      parseStoredCart(JSON.stringify([item({ slug: "../../etc/passwd" })])),
      [],
    );
  });

  it("descarta una entrada demasiado grande sin analizarla", () => {
    const enorme = "[" + '"' + "x".repeat(MAX_STORED_CART_LENGTH) + '"' + "]";

    assert.ok(enorme.length > MAX_STORED_CART_LENGTH);
    assert.deepEqual(parseStoredCart(enorme), []);
  });
});

describe("serializeCart", () => {
  it("produce un array JSON", () => {
    assert.equal(serializeCart([]), "[]");
  });

  it("hace el viaje de ida y vuelta sin perder datos", () => {
    const carrito = [item(), item({ id: 7, quantity: 4, image: VALID_IMAGE })];

    assert.deepEqual(parseStoredCart(serializeCart(carrito)), carrito);
  });

  it("el limite declarado coincide con el Documento de la spec (64 KiB)", () => {
    assert.equal(MAX_STORED_CART_LENGTH, 64 * 1024);
  });
});