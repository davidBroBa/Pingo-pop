import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hasControlChars } from "../src/lib/control-chars";
import {
  CreateCategorySchema,
  CreateProductSchema,
  DeleteProductSchema,
  UpdateProductSchema,
  slugify,
} from "../src/lib/validation";

/**
 * Los caracteres de control se construyen con `String.fromCharCode` en lugar de
 * escribirse literales: un byte de control escrito en el fuente es fragil (las
 * herramientas de escritura pueden alterarlo) y ademas no se distingue a simple
 * vista de un espacio.
 */
const NUL = String.fromCharCode(0);
const DEL = String.fromCharCode(127);
const ESC = String.fromCharCode(27);

describe("caracteres de control", () => {
  it("detecta un caracter nulo", () => {
    assert.equal(hasControlChars(`ab${NUL}cd`), true);
  });

  it("detecta DEL", () => {
    assert.equal(hasControlChars(`abc${DEL}`), true);
  });

  it("detecta ESC", () => {
    assert.equal(hasControlChars(`abc${ESC}`), true);
  });

  it("permite saltos de linea", () => {
    assert.equal(hasControlChars("primera\nsegunda"), false);
    assert.equal(hasControlChars("primera\r\nsegunda"), false);
  });

  it("acepta texto normal con espacios y puntuacion", () => {
    assert.equal(hasControlChars("Playera negra, talla M"), false);
  });

  it("acepta acentos y eñes", () => {
    assert.equal(hasControlChars("Diseño Único"), false);
  });

  it("acepta texto largo con espacios", () => {
    assert.equal(hasControlChars(" ".repeat(500)), false);
  });
});

describe("slugify", () => {
  it("pasa a minusculas y sustituye espacios por guiones", () => {
    assert.equal(slugify("Playera Personalizada"), "playera-personalizada");
  });

  it("conserva la ñ como transicion valida", () => {
    assert.equal(slugify("Añadir año"), "anadir-ano");
  });

  it("recorta guiones sobrantes en los extremos", () => {
    assert.equal(slugify("  --Hola--  "), "hola");
  });

  it("descarta simbolos", () => {
    assert.equal(slugify("Camiseta 100% ¡Algodón!"), "camiseta-100-algodon");
  });
});

describe("esquema de producto", () => {
  const valido = { name: "Playera", price: 250, categoryId: 1 };

  it("acepta un producto minimo valido", () => {
    assert.equal(CreateProductSchema.safeParse(valido).success, true);
  });

  it("rechaza precio cero o negativo", () => {
    assert.equal(CreateProductSchema.safeParse({ ...valido, price: 0 }).success, false);
    assert.equal(CreateProductSchema.safeParse({ ...valido, price: -5 }).success, false);
  });

  it("rechaza un precio que no es numero", () => {
    assert.equal(
      CreateProductSchema.safeParse({ ...valido, price: "gratis" }).success,
      false,
    );
  });

  it("rechaza una categoria inexistente", () => {
    assert.equal(
      CreateProductSchema.safeParse({ ...valido, categoryId: 0 }).success,
      false,
    );
  });

  it("rechaza un nombre con caracteres de control", () => {
    assert.equal(
      CreateProductSchema.safeParse({ ...valido, name: `Play${NUL}era` }).success,
      false,
    );
  });

  it("rechaza un slug con mayusculas", () => {
    assert.equal(
      CreateProductSchema.safeParse({ ...valido, slug: "Mi-Producto" }).success,
      false,
    );
  });

  it("rechaza un slug con path traversal", () => {
    assert.equal(
      CreateProductSchema.safeParse({ ...valido, slug: "../etc/passwd" }).success,
      false,
    );
  });

  it("rechaza una imagen con ruta manipulada", () => {
    assert.equal(
      CreateProductSchema.safeParse({
        ...valido,
        image: "/uploads/products/../../evil.js",
      }).success,
      false,
    );
  });

  it("rechaza una imagen fuera de la carpeta de productos", () => {
    assert.equal(
      CreateProductSchema.safeParse({ ...valido, image: "/etc/passwd" }).success,
      false,
    );
  });

  it("acepta una imagen con la forma que genera el endpoint de subida", () => {
    const image = `/uploads/products/${"a".repeat(32)}.png`;
    assert.equal(
      CreateProductSchema.safeParse({ ...valido, image }).success,
      true,
    );
  });

  it("acepta descripciones largas dentro del limite", () => {
    assert.equal(
      CreateProductSchema.safeParse({ ...valido, description: "a".repeat(4000) })
        .success,
      true,
    );
  });

  it("rechaza descripciones por encima del limite", () => {
    assert.equal(
      CreateProductSchema.safeParse({ ...valido, description: "a".repeat(4001) })
        .success,
      false,
    );
  });

  it("exige id en la actualizacion", () => {
    assert.equal(UpdateProductSchema.safeParse(valido).success, false);
    assert.equal(
      UpdateProductSchema.safeParse({ ...valido, id: 3 }).success,
      true,
    );
  });

  it("exige id entero positivo en la baja", () => {
    assert.equal(DeleteProductSchema.safeParse({ id: 1 }).success, true);
    assert.equal(DeleteProductSchema.safeParse({ id: -1 }).success, false);
    assert.equal(DeleteProductSchema.safeParse({ id: 1.5 }).success, false);
    assert.equal(DeleteProductSchema.safeParse({}).success, false);
  });
});

describe("esquema de categoria", () => {
  it("acepta nombre y slug validos", () => {
    assert.equal(
      CreateCategorySchema.safeParse({ name: "Textil", slug: "textil" }).success,
      true,
    );
  });

  it("hace opcional el slug", () => {
    assert.equal(CreateCategorySchema.safeParse({ name: "Textil" }).success, true);
  });

  it("rechaza un nombre vacio", () => {
    assert.equal(CreateCategorySchema.safeParse({ name: "   " }).success, false);
  });

  it("rechaza un slug con separadores repetidos", () => {
    assert.equal(
      CreateCategorySchema.safeParse({ name: "Textil", slug: "a--b" }).success,
      false,
    );
  });
});

describe("CreateProductSchema: campo image", () => {
  const base = { name: "Pin", price: 10, categoryId: 1 };

  /**
   * El formulario de administracion inicializa `image: ""` y lo manda tal cual:
   * `JSON.stringify` conserva la cadena vacia (solo descarta `undefined`). Si el
   * esquema la rechazara, el administrador no podria dar de alta NINGUN producto
   * sin imagen, que es el caso normal. Una cadena vacia significa, en un
   * formulario, "no hay imagen": tiene que aceptarse y valer `null`.
   */
  it("acepta cadena vacia como ausencia de imagen", () => {
    const resultado = CreateProductSchema.safeParse({ ...base, image: "" });

    assert.equal(resultado.success, true);
    if (resultado.success) {
      assert.ok(
        resultado.data.image === null || resultado.data.image === undefined,
        `se esperaba null o undefined, se obtuvo ${JSON.stringify(resultado.data.image)}`,
      );
    }
  });

  it("acepta cadena de solo espacios como ausencia de imagen", () => {
    assert.equal(
      CreateProductSchema.safeParse({ ...base, image: "   " }).success,
      true,
    );
  });

  it("acepta null y undefined como ausencia de imagen", () => {
    assert.equal(
      CreateProductSchema.safeParse({ ...base, image: null }).success,
      true,
    );
    assert.equal(
      CreateProductSchema.safeParse({ ...base, image: undefined }).success,
      true,
    );
  });

  it("acepta omitir el campo", () => {
    assert.equal(CreateProductSchema.safeParse(base).success, true);
  });

  it("sigue aceptando una ruta valida", () => {
    const ruta = `/uploads/products/${"a".repeat(32)}.jpg`;
    const resultado = CreateProductSchema.safeParse({ ...base, image: ruta });

    assert.equal(resultado.success, true);
    if (resultado.success) {
      assert.equal(resultado.data.image, ruta);
    }
  });

  it("sigue rechazando una ruta con traversal", () => {
    assert.equal(
      CreateProductSchema.safeParse({
        ...base,
        image: "/uploads/products/../../../etc/passwd",
      }).success,
      false,
    );
  });

  it("sigue rechazando una URL externa", () => {
    assert.equal(
      CreateProductSchema.safeParse({ ...base, image: "https://ejemplo.com/x.jpg" })
        .success,
      false,
    );
  });
});