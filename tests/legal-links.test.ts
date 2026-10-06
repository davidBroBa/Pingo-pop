import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { LEGAL_LINKS } from "../src/lib/legal-links";
import { DOCUMENTOS } from "../src/lib/legal-versions";

/**
 * `LEGAL_LINKS` es la copia ligera que consumen el pie de pagina y el sitemap.
 * `DOCUMENTOS` es la copia con el contenido. Viven separadas por un motivo
 * medido: `legal-versions.ts` importa `node:crypto`, y arrastrarlo a un
 * componente de cliente metia `crypto-browserify` en el navegador (800 KB).
 *
 * Esa separacion solo es segura si **los dos enumerados coinciden**. Estos
 * tests son el seguro: si divergen, el pie y el sitemaparianDocuments que el
 * sitio ya no publica, o al reves.
 */
describe("LEGAL_LINKS frente a DOCUMENTOS", () => {
  it("hay siete enlaces y siete documentos", () => {
    assert.equal(LEGAL_LINKS.length, 7);
    assert.equal(DOCUMENTOS.length, 7);
  });

  it("tienen los mismos slugs, en el mismo orden", () => {
    assert.deepEqual(
      DOCUMENTOS.map((d) => d.slug),
      LEGAL_LINKS.map((l) => l.slug),
    );
  });

  it("el titulo y la fecha de cada documento coinciden con su enlace", () => {
    for (const documento of DOCUMENTOS) {
      const enlace = LEGAL_LINKS.find((l) => l.slug === documento.slug);
      assert.ok(enlace !== undefined, `sin enlace para ${documento.slug}`);
      assert.equal(
        enlace.titulo,
        documento.titulo,
        `titulo distinto en ${documento.slug}`,
      );
      assert.equal(
        enlace.actualizadoEn,
        documento.actualizadoEn,
        `fecha distinta en ${documento.slug}`,
      );
    }
  });

  it("cada slug es una ruta limpia y sin acentos raremos", () => {
    for (const enlace of LEGAL_LINKS) {
      assert.match(
        enlace.slug,
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        `slug con caracteres raros: ${enlace.slug}`,
      );
    }
  });

  it("ninguna fecha esta en el futuro ni vacia", () => {
    const hoy = new Date("2026-10-06");
    for (const enlace of LEGAL_LINKS) {
      assert.match(
        enlace.actualizadoEn,
        /^\d{4}-\d{2}-\d{2}$/,
        `fecha con otra forma: ${enlace.actualizadoEn}`,
      );
      const fecha = new Date(enlace.actualizadoEn);
      assert.ok(
        !Number.isNaN(fecha.getTime()),
        `fecha invalida: ${enlace.actualizadoEn}`,
      );
      assert.ok(
        fecha.getTime() <= hoy.getTime(),
        `fecha futura en ${enlace.slug}: ${enlace.actualizadoEn}`,
      );
    }
  });
});

describe("legal-links.ts no arrastra nada", () => {
  /**
   * Este test es el que evita que la regresión vuelva. `legal-links.ts` solo
   * puede tener datos: si alguien le añade un import de `node:crypto`, de
   * Prisma o de React, el pie de pagina vuelve a meter 800 KB en el navegador y
   * nada mas lo diria.
   */
  it("no importa nada: ni node:crypto, ni Prisma, ni React", () => {
    const ruta = path.join(process.cwd(), "src", "lib", "legal-links.ts");
    const fuente = readFileSync(ruta, "utf8");

    // Se quitan los bloques de comentario para no dar por bueno un import
    // que solo aparece en un ejemplo de la documentacion.
    const sinComentarios = fuente
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");

    const importaciones = [...sinComentarios.matchAll(/^\s*import\s/gm)];
    assert.equal(
      importaciones.length,
      0,
      "legal-links.ts no debe tener ningun import: se consume desde el cliente",
    );
  });

  it("los componentes de cliente no importan legal-versions.ts", () => {
    // El pie, el formulario y cualquier otro componente "use client" deben usar
    // `legal-links`. Si aparece `legal-versions`, vuelve `crypto-browserify`.
    const componentes = [
      "src/components/layout/Footer/Footer.tsx",
      "src/components/sections/QuoteCartForm/QuoteCartForm.tsx",
    ];
    for (const relativo of componentes) {
      const fuente = readFileSync(path.join(process.cwd(), relativo), "utf8");
      const importa = /from\s+"@\/lib\/legal-versions"/.test(fuente);
      assert.equal(
        importa,
        false,
        `${relativo} no debe importar legal-versions: usa legal-links`,
      );
    }
  });
});