import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { imagePath, siteImagePath } from "../src/lib/validation";

/** Ruta con la forma que genera `storeImage` para el destino `site`. */
const VALIDA =
  "/uploads/site/0123456789abcdef0123456789abcdef.jpg";

describe("siteImagePath", () => {
  it("acepta la forma que produce la subida al destino site", () => {
    const r = siteImagePath.parse(VALIDA);
    assert.equal(r, VALIDA);
  });

  it("acepta las tres extensiones de la lista blanca", () => {
    for (const ext of ["jpg", "png", "webp"]) {
      const ruta = `/uploads/site/${"a".repeat(32)}.${ext}`;
      assert.equal(siteImagePath.parse(ruta), ruta);
    }
  });

  it("rechaza la forma de productos: el hero no puede apuntar al catalogo", () => {
    const r = siteImagePath.safeParse(
      "/uploads/products/0123456789abcdef0123456789abcdef.jpg",
    );
    assert.equal(r.success, false);
  });

  it("rechaza traversal", () => {
    for (const ruta of [
      "/uploads/site/../../evil.js",
      "/uploads/site/../../../etc/passwd",
      "/uploads/site/abc/../../products/0123456789abcdef0123456789abcdef.jpg",
    ]) {
      assert.equal(
        siteImagePath.safeParse(ruta).success,
        false,
        `deberia rechazar: ${ruta}`,
      );
    }
  });

  it("rechaza una URL externa", () => {
    for (const ruta of [
      "https://example.com/photo.jpg",
      "http://example.com/photo.jpg",
      "//example.com/photo.jpg",
      "javascript:alert(1)",
      "data:image/png;base64,iVBORw0KGgo=",
    ]) {
      assert.equal(
        siteImagePath.safeParse(ruta).success,
        false,
        `deberia rechazar: ${ruta}`,
      );
    }
  });

  it("rechaza una ruta arbitraria dentro de uploads", () => {
    for (const ruta of [
      "/uploads/site/photo.jpg",
      "/uploads/site/0123456789abcdef0123456789abcdeg.jpg",
      "/uploads/site/0123456789abcdef0123456789abcdef.txt",
      "/uploads/site/0123456789abcdef0123456789abcdef.jpg/../../x",
      "/uploads/otra/0123456789abcdef0123456789abcdef.jpg",
      "/imagenes/logo.png",
    ]) {
      assert.equal(
        siteImagePath.safeParse(ruta).success,
        false,
        `deberia rechazar: ${ruta}`,
      );
    }
  });

  it("rechaza un nombre en mayusculas: el generador usa hex en minuscula", () => {
    assert.equal(
      siteImagePath.safeParse(
        "/uploads/site/0123456789ABCDEF0123456789ABCDEF.jpg",
      ).success,
      false,
    );
  });

  it("normaliza la cadena vacia y los espacios a ausencia", () => {
    for (const valor of ["", "   ", "\t\n"]) {
      const r = siteImagePath.safeParse(valor);
      assert.equal(r.success, true, `deberia aceptar: ${JSON.stringify(valor)}`);
      assert.equal(r.success && r.data, undefined);
    }
  });

  it("acepta null y undefined como ausencia", () => {
    // `null` se queda `null` y `undefined` se queda `undefined`. No es un
    // capricho: es lo que hace `imagePath` con la misma forma de esquema, y el
    // endpoint guarda `null` en la base de datos cuando no hay foto.
    for (const valor of [null, undefined]) {
      const r = siteImagePath.safeParse(valor);
      assert.equal(r.success, true, `deberia aceptar: ${String(valor)}`);
      assert.equal(r.success && r.data, valor);
    }
  });

  it("se comporta igual que imagePath en la ausencia", () => {
    // Si divergieran, un formulario que sirve para productos y para el hero
    // trataria los dos casos distinto y apareceria un bug dificil de ver.
    for (const valor of ["", "   ", null, undefined]) {
      const productos = imagePath.safeParse(valor);
      const sitio = siteImagePath.safeParse(valor);
      assert.equal(sitio.success, productos.success, `falla en: ${String(valor)}`);
      assert.equal(
        sitio.success ? sitio.data : null,
        productos.success ? productos.data : null,
        `difiere en: ${String(valor)}`,
      );
    }
  });

  it("no acepta un numero ni un objeto", () => {
    for (const valor of [42, true, { path: VALIDA }, ["x"]]) {
      assert.equal(
        siteImagePath.safeParse(valor).success,
        false,
        `deberia rechazar: ${JSON.stringify(valor)}`,
      );
    }
  });

  it("rechaza una ruta mas larga de 300 caracteres", () => {
    const larga = `/uploads/site/${"a".repeat(320)}.jpg`;
    assert.equal(siteImagePath.safeParse(larga).success, false);
  });
});