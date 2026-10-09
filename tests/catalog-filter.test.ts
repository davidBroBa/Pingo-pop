import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { tipoFiltroCategoria } from "../src/lib/catalog-filter";

/**
 * Interpretacion del parametro `categoria` del catalogo (`/products`).
 *
 * El `searchParams` de Next 16 es `Promise<{ [key: string]: string | string[]
 * | undefined }>`, asi que la funcion recibe ese valor crudo y decide que
 * filtro aplicar. Es logica pura: no lee la base de datos ni el DOM.
 */

describe("tipoFiltroCategoria", () => {
  it("sin parametro devuelve 'todos'", () => {
    assert.equal(tipoFiltroCategoria(undefined).tipo, "todos");
  });

  it("con parametro vacio devuelve 'todos' (decisión: ?categoria= no filtra)", () => {
    assert.equal(tipoFiltroCategoria("").tipo, "todos");
  });

  it("con una lista vacia devuelve 'todos'", () => {
    assert.equal(tipoFiltroCategoria([]).tipo, "todos");
  });

  it("un slug valido devuelve el filtro con ese slug", () => {
    const filtro = tipoFiltroCategoria("pines-metalicos");
    assert.equal(filtro.tipo, "slug");
    assert.equal(filtro.tipo === "slug" && filtro.slug, "pines-metalicos");
  });

  it("con una lista toma el primer valor", () => {
    const filtro = tipoFiltroCategoria(["impresion-3d", "llaveros"]);
    assert.equal(filtro.tipo, "slug");
    assert.equal(filtro.tipo === "slug" && filtro.slug, "impresion-3d");
  });

  it("un slug con mayusculas es invalido", () => {
    assert.equal(tipoFiltroCategoria("Pines-Metalicos").tipo, "invalido");
  });

  it("un slug con path traversal es invalido", () => {
    assert.equal(tipoFiltroCategoria("../etc/passwd").tipo, "invalido");
  });

  it("un valor no string es invalido, no 'todos'", () => {
    assert.equal(tipoFiltroCategoria(42).tipo, "invalido");
    assert.equal(tipoFiltroCategoria({}).tipo, "invalido");
  });
});