import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { dividirEnEmpaques } from "../src/lib/legal-texto";
import { DOCUMENTOS } from "../src/lib/legal-versions";

/**
 * Los textos legales traen marcado `**negrita**` en 93 de sus lineas. Si se
 * pintaran como texto plano, el visitante veria los asteriscos, que es
 * exactamente lo que pasa con un documento legal copiado de un markdown sin
 * renderizar.
 *
 * Aqui no se usa `dangerouslySetInnerHTML`: el texto legal es contenido, y
 * aunque hoy lo controle el propio repositorio, convertirlo a HTML con una
 * interpolacion seria abrir la puerta a que un texto con `<script>` se ejecutara.
 * Se parte el texto en trozos y se construye el React a mano.
 */

describe("dividirEnEmpaques", () => {
  it("sin marcado devuelve un solo trozo, sin negrita", () => {
    assert.deepEqual(dividirEnEmpaques("texto normal"), [
      { texto: "texto normal", fuerte: false },
    ]);
  });

  it("marca el trozo entre asteriscos como negrita", () => {
    assert.deepEqual(dividirEnEmpaques("antes **dentro** despues"), [
      { texto: "antes ", fuerte: false },
      { texto: "dentro", fuerte: true },
      { texto: " despues", fuerte: false },
    ]);
  });

  it("con varios marcados en la misma linea", () => {
    const trozos = dividirEnEmpaques("**uno** y **dos**");
    assert.equal(trozos.length, 3);
    assert.deepEqual(
      trozos.map((t) => t.texto),
      ["uno", " y ", "dos"],
    );
    assert.deepEqual(
      trozos.map((t) => t.fuerte),
      [true, false, true],
    );
  });

  it("un asterisco suelto NO es negrita", () => {
    // Un solo asterisco es texto normal en Markdown. Si se tratara como negrita,
    // un precio como "5 * 3" o una multiplicacion sairian mal paradas.
    assert.deepEqual(dividirEnEmpaques("5 * 3 = 15"), [
      { texto: "5 * 3 = 15", fuerte: false },
    ]);
  });

  it("marcado sin cerrar se queda como texto, no se inventa la negrita", () => {
    // Un `**` sin pareja no debe dejarlo todo en negrita: es contenido publishing
    // y una negrita falsaHighlight es peor que un asterisco visible.
    const trozos = dividirEnEmpaques("abre **pero no cierra");
    assert.equal(trozos.length, 1);
    assert.equal(trozos[0].fuerte, false);
    assert.ok(trozos[0].texto.includes("**"), "el asterisco se conserva");
  });

  it("texto vacio devuelve lista vacia, no un trozo vacio", () => {
    assert.deepEqual(dividirEnEmpaques(""), []);
  });

  it("conserva los saltos de linea y los espacios", () => {
    // El texto legal va en parrafos con `<p>`, pero un salto dentro de un mismo
    // parrafo tiene que sobrevivir al reparto.
    const trozos = dividirEnEmpaques("linea 1\nlinea 2");
    assert.equal(trozos[0].texto, "linea 1\nlinea 2");
  });

  it("no interprets HTML: las etiquetas se quedan como texto", () => {
    const trozos = dividirEnEmpaques("<script>alert(1)</script>");
    assert.equal(trozos.length, 1);
    assert.equal(trozos[0].texto, "<script>alert(1)</script>");
    assert.equal(trozos[0].fuerte, false);
  });

  it("cuatro asteriscos vacios no producen un trozo fuerte vacio", () => {
    // `****` en Markdown es negrita vacia. Pintar un `<strong></strong>` sucio
    // no sirve de nada y complica el DOM.
    const trozos = dividirEnEmpaques("a **** b");
    assert.equal(
      trozos.some((t) => t.fuerte && t.texto === ""),
      false,
      "no debe haber un trozo fuerte vacio",
    );
  });
});

describe("los textos legales reales se reparten bien", () => {
  it("ningun texto del registro tiene marcado sin cerrar", () => {
    // Si algum dia alguien edita un texto y deja un `**` sin pareja, el aviso sale
    // visible en la pagina publicada. Este test lo ve aqui y no un visitante.
    for (const documento of DOCUMENTOS) {
      for (const seccion of documento.contenido) {
        const conteo = (seccion.cuerpo.join(" ").match(/\*\*/g) ?? []).length;
        assert.equal(
          conteo % 2,
          0,
          `${documento.slug} / ${seccion.titulo}: ${conteo} marcas **, impar`,
        );
      }
    }
  });

  it("cada texto del registro se puede pintar sin perder caracteres", () => {
    // El reparto no puede comerse texto. Se comparan los caracteres quitando solo
    // los asteriscos, que son los que se convierten en `<strong>`.
    for (const documento of DOCUMENTOS) {
      for (const seccion of documento.contenido) {
        for (const parrafo of seccion.cuerpo) {
          const unido = dividirEnEmpaques(parrafo)
            .map((t) => t.texto)
            .join("");
          assert.equal(
            unido,
            parrafo.replace(/\*\*/g, ""),
            `${documento.slug}: el reparto perdio texto`,
          );
        }
      }
    }
  });

  it("el reparto no produce mas de 200 trozos en ningun parrafo", () => {
    // Un texto con 93 lineas de marcado es normal; uno con 200 trozos en un
    // parrafo significaria que el patron se ha roto y esta repartiendo de mas.
    for (const documento of DOCUMENTOS) {
      for (const seccion of documento.contenido) {
        for (const parrafo of seccion.cuerpo) {
          assert.ok(
            dividirEnEmpaques(parrafo).length <= 200,
            `${documento.slug}: demasiados trozos`,
          );
        }
      }
    }
  });
});
