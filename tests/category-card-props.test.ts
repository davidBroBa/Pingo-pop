import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ACCENTS,
  NUMERO_VISIBLE,
  acentoPara,
  construirTarjetas,
  hrefCategoria,
  numeroPara,
} from "../src/lib/category-card-props";

/**
 * Lo que llega de la base de datos: lo minimo que la tarjeta necesita.
 * Deliberadamente **no** incluye `number` ni color: esas dos cosas se derivan.
 */
type Categoria = {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  slug: string | null;
};

function cat(id: number, name: string, image: string | null = null): Categoria {
  return { id, name, description: `Descripcion de ${name}`, image, slug: `${id}-slug` };
}

/** Las 4 categorias escritas a mano que hay hoy, como red de seguridad. */
const RESERVA: Categoria[] = [
  cat(1, "Pines catalogo VIP"),
  cat(2, "Botones fotograficos"),
  cat(3, "Impresion 3D"),
  cat(4, "Llaveros"),
];

describe("NUMERO_VISIBLE", () => {
  it("es 4: decision del usuario, no un descuido (D11)", () => {
    assert.equal(NUMERO_VISIBLE, 4);
  });
});

describe("numeroPara", () => {
  it("numeracion en dos digitos desde el 1", () => {
    assert.equal(numeroPara(0), "01");
    assert.equal(numeroPara(1), "02");
    assert.equal(numeroPara(3), "04");
  });

  it("no se rompe con mas de 99: alarga en lugar de recortarse", () => {
    assert.equal(numeroPara(99), "100");
    assert.equal(numeroPara(8), "09");
  });
});

describe("acentoPara", () => {
  it("reparte los colores de la paleta por posicion", () => {
    assert.equal(acentoPara(0), ACCENTS[0]);
    assert.equal(acentoPara(3), ACCENTS[3]);
  });

  it("vuelve al primer color cada 4 (modulo el tamaño de la paleta)", () => {
    assert.equal(acentoPara(4), ACCENTS[0]);
    assert.equal(acentoPara(5), ACCENTS[1]);
  });

  it("es determinista: la misma posicion da siempre el mismo color", () => {
    for (let i = 0; i < 12; i += 1) {
      assert.equal(acentoPara(i), acentoPara(i));
    }
  });
});

describe("construirTarjetas", () => {
  it("con 4 categorias salen los numeros 01-04 y los 4 acentos, en orden", () => {
    const tarjetas = construirTarjetas(RESERVA, RESERVA);
    assert.equal(tarjetas.length, 4);
    assert.deepEqual(
      tarjetas.map((t) => t.numero),
      ["01", "02", "03", "04"],
    );
    assert.deepEqual(
      tarjetas.map((t) => t.acento),
      [...ACCENTS],
    );
  });

  it("CON 6 categorias solo devuelve 4 (D11)", () => {
    const muchas = [
      ...RESERVA,
      cat(5, "Quinta", "/uploads/products/aaaa.jpg"),
      cat(6, "Sexta"),
    ];
    const tarjetas = construirTarjetas(muchas, RESERVA);
    assert.equal(tarjetas.length, 4);
    assert.deepEqual(
      tarjetas.map((t) => t.nombre),
      RESERVA.map((c) => c.name),
    );
  });

  it("con 0 categorias y red de seguridad sale la reserva, sin fotos", () => {
    const tarjetas = construirTarjetas([], RESERVA);
    assert.equal(tarjetas.length, 4);
    for (const t of tarjetas) {
      assert.equal(t.imagen, null);
      assert.equal(t.esReserva, true);
    }
  });

  it("con 1 sola categoria sale SOLO esa, y no se rellena con la reserva", () => {
    const tarjetas = construirTarjetas([cat(9, "Textil")], RESERVA);
    assert.equal(tarjetas.length, 1);
    assert.equal(tarjetas[0].nombre, "Textil");
    assert.equal(tarjetas[0].numero, "01");
    assert.equal(tarjetas[0].esReserva, false);
  });

  it("con 0 categorias y sin red de seguridad devuelve lista vacia, sin reventar", () => {
    const tarjetas = construirTarjetas([], []);
    assert.deepEqual(tarjetas, []);
  });

  it("lleva la foto cuando la hay", () => {
    const imagen = "/uploads/products/0123456789abcdef0123456789abcdef.jpg";
    const tarjetas = construirTarjetas([cat(1, "Pines", imagen)], RESERVA);
    assert.equal(tarjetas[0].imagen, imagen);
    assert.equal(tarjetas[0].esReserva, false);
  });

  it("trata la imagen vacia como ausente", () => {
    const tarjetas = construirTarjetas([cat(1, "Pines", "")], RESERVA);
    assert.equal(tarjetas[0].imagen, null);
  });

  it("NO inventa categorias que no vienen dadas", () => {
    const tarjetas = construirTarjetas([cat(1, "A"), cat(2, "B")], RESERVA);
    assert.equal(tarjetas.length, 2);
    assert.deepEqual(
      tarjetas.map((t) => t.nombre),
      ["A", "B"],
    );
  });

  it("el mismo orden de entrada produce siempre las mismas tarjetas", () => {
    const entrada = [cat(1, "A"), cat(2, "B"), cat(3, "C")];
    assert.deepEqual(
      construirTarjetas(entrada, RESERVA),
      construirTarjetas(entrada, RESERVA),
    );
  });

  it("conserva el id para el enlace de la tarjeta", () => {
    const tarjetas = construirTarjetas([cat(42, "Textil")], RESERVA);
    assert.equal(tarjetas[0].id, 42);
  });

  it("una descripcion ausente sale cadena vacia, no undefined", () => {
    const tarjetas = construirTarjetas(
      [{ id: 1, name: "A", description: null, image: null, slug: null }],
      RESERVA,
    );
    assert.equal(tarjetas[0].descripcion, "");
  });

  it("sin categorias de la BD, el texto de la reserva es el de la reserva", () => {
    const tarjetas = construirTarjetas([], RESERVA);
    for (const t of tarjetas) {
      assert.equal(t.esReserva, true);
      assert.ok(t.descripcion.length > 0, "la reserva trae descripcion");
    }
  });
});

describe("hrefCategoria", () => {
  it("una categoria de la BD con slug enlaza al catalogo filtrado", () => {
    const [tarjeta] = construirTarjetas([cat(7, "Pines", null)], RESERVA);
    assert.equal(hrefCategoria(tarjeta), "/products?categoria=7-slug");
  });

  it("una categoria sin slug cae al catalogo completo", () => {
    const [tarjeta] = construirTarjetas(
      [{ id: 8, name: "Textil", description: null, image: null, slug: null }],
      RESERVA,
    );
    assert.equal(hrefCategoria(tarjeta), "/products");
  });

  it("una tarjeta de reserva enlaza al catalogo completo", () => {
    const tarjetas = construirTarjetas([], RESERVA);
    for (const t of tarjetas) {
      assert.equal(t.esReserva, true);
      assert.equal(hrefCategoria(t), "/products");
    }
  });
});