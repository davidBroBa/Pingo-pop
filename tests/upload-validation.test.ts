import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_IMAGE_BYTES, validateImage } from "../src/lib/upload-validation";

/**
 * Anotar el buffer concreto (`ArrayBuffer`, no `ArrayBufferLike`) es lo que
 * permite pasar estos arrays a `new File(...)`: el constructor de `Blob` exige
 * una vista sobre `ArrayBuffer` y no acepta `SharedArrayBuffer`.
 */
function jpegBytes(length: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(length);
  bytes.set([0xff, 0xd8, 0xff, 0xe0], 0);
  return bytes;
}

/** Bytes con la firma de un PNG. */
function pngBytes(): Uint8Array<ArrayBuffer> {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0,
  ]);
}

/** Bytes con la firma de un WebP (contenedor RIFF). */
function webpBytes(): Uint8Array<ArrayBuffer> {
  return new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
  ]);
}

/** Texto codificado como bytes, para los casos de contenido malicioso. */
function textBytes(text: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(text);
  const bytes = new Uint8Array(encoded.byteLength);
  bytes.set(encoded, 0);
  return bytes;
}

/** Envuelve bytes en un `File` con el tipo MIME indicado. */
function asFile(
  bytes: Uint8Array<ArrayBuffer>,
  type: string,
  name = "imagen",
): File {
  return new File([bytes], name, { type });
}

describe("validacion de imagenes", () => {
  it("acepta un JPEG bien formado", async () => {
    const result = await validateImage(asFile(jpegBytes(2048), "image/jpeg"));
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.ext, "jpg");
      assert.equal(result.mime, "image/jpeg");
    }
  });

  it("acepta un PNG bien formado", async () => {
    const result = await validateImage(asFile(pngBytes(), "image/png"));
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.ext, "png");
    }
  });

  it("acepta un WebP bien formado", async () => {
    const result = await validateImage(asFile(webpBytes(), "image/webp"));
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.ext, "webp");
    }
  });

  it("rechaza un tipo fuera de la lista blanca", async () => {
    const result = await validateImage(asFile(jpegBytes(1024), "image/gif"));
    assert.equal(result.ok, false);
  });

  it("rechaza un SVG aunque declare un MIME de imagen", async () => {
    // Un SVG admite <script> y se sirve como documento activo: por eso queda
    // fuera de la lista blanca aunque se anuncie como imagen.
    const svg = textBytes(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    const result = await validateImage(asFile(svg, "image/svg+xml"));
    assert.equal(result.ok, false);
  });

  it("rechaza un HTML disfrazado de JPEG", async () => {
    // El caso importante: el content-type dice JPEG, pero los bytes son HTML.
    // Si solo nos fiamos de la cabecera, esto se guardaria y se serviria como
    // documento activo en el dominio de la tienda.
    const html = textBytes("<html><body>hola</body></html>");
    const result = await validateImage(asFile(html, "image/jpeg", "foto.jpg"));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /no coincide|contenido/i);
    }
  });

  it("rechaza un PNG que en realidad es JPEG", async () => {
    const result = await validateImage(asFile(jpegBytes(1024), "image/png"));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /declara/);
    }
  });

  it("rechaza un archivo vacio", async () => {
    const result = await validateImage(asFile(new Uint8Array(0), "image/jpeg"));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /vacio/i);
    }
  });

  it("rechaza un archivo que supera el limite", async () => {
    const oversized = jpegBytes(MAX_IMAGE_BYTES + 1);
    const result = await validateImage(asFile(oversized, "image/jpeg"));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /limite/i);
    }
  });

  it("acepta un archivo justo en el limite", async () => {
    const exact = jpegBytes(MAX_IMAGE_BYTES);
    const result = await validateImage(asFile(exact, "image/jpeg"));
    assert.equal(result.ok, true);
  });

  it("no se fia del nombre original para decidir la extension", async () => {
    // Nombre peligroso, contenido de PNG legitimo: se acepta y la extension
    // sale de la lista blanca, nunca del nombre que envio el usuario.
    const result = await validateImage(
      asFile(pngBytes(), "image/png", "../../../evil.html"),
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.ext, "png");
    }
  });
});
