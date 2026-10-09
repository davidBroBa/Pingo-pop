import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { interpretaRutaUpload } from "../src/lib/upload-servida";

/**
 * Interpretacion de los segmentos de `GET /uploads/[...path]` (spec 011).
 *
 * Solo se sirven ficheros de `public/uploads/products/` y `public/uploads/site/`
 * con nombre aleatorio de 32 hex y extension JPEG/PNG/WebP: la misma regla que
 * la subida (spec 008). Cualquier otra forma se rechaza **antes** de tocar
 * disco.
 */

const HASH = "0123456789abcdef0123456789abcdef";

describe("interpretaRutaUpload", () => {
  it("acepta products con extension jpg", () => {
    const ruta = interpretaRutaUpload(["products", `${HASH}.jpg`]);
    assert.deepEqual(ruta, {
      carpeta: "products",
      nombre: `${HASH}.jpg`,
      mime: "image/jpeg",
    });
  });

  it("acepta site con extension png", () => {
    const ruta = interpretaRutaUpload(["site", `${HASH}.png`]);
    assert.ok(ruta !== null);
    assert.equal(ruta.carpeta, "site");
    assert.equal(ruta.mime, "image/png");
  });

  it("acepta webp", () => {
    const ruta = interpretaRutaUpload(["products", `${HASH}.webp`]);
    assert.ok(ruta !== null);
    assert.equal(ruta.mime, "image/webp");
  });

  it("rechaza una carpeta que no sea products ni site", () => {
    assert.equal(
      interpretaRutaUpload(["otros", `${HASH}.jpg`]),
      null,
    );
  });

  it("rechaza un nombre que no sea 32 hex + extension", () => {
    assert.equal(interpretaRutaUpload(["products", "foto.jpg"]), null);
    assert.equal(interpretaRutaUpload(["products", "a.jpg"]), null);
  });

  it("rechaza extensiones fuera de la lista blanca", () => {
    assert.equal(interpretaRutaUpload(["products", `${HASH}.php`]), null);
    assert.equal(interpretaRutaUpload(["products", `${HASH}.ico`]), null);
    assert.equal(interpretaRutaUpload(["products", `${HASH}.jpg.exe`]), null);
  });

  it("rechaza .gitkeep y cualquier fichero sin extension permitida", () => {
    assert.equal(interpretaRutaUpload(["products", ".gitkeep"]), null);
  });

  it("rechaza la ruta vacia y con mas de dos segmentos", () => {
    assert.equal(interpretaRutaUpload([]), null);
    assert.equal(interpretaRutaUpload(["products", `${HASH}.jpg`, "extra"]), null);
  });

  it("rechaza cualquier intento de traversal", () => {
    assert.equal(interpretaRutaUpload(["..", "passwd"]), null);
    assert.equal(interpretaRutaUpload([".", `${HASH}.jpg`]), null);
    assert.equal(
      interpretaRutaUpload(["products", `..%2f${HASH}.jpg`]),
      null,
    );
  });
});