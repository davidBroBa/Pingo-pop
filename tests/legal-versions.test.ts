import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import * as legalVersions from "../src/lib/legal-versions";
import {
  DOCUMENTOS,
  DOCUMENTO_POR_TIPO,
  FIRMAS_POR_DOCUMENTO,
  documentoDe,
  serializarParaHuella,
  sonVersionesValidas,
  versionDe,
} from "../src/lib/legal-versions";

/** Los siete `slug` de RF-5, en el orden en que estan declarados. */
const SLUGS_ESPERADOS = [
  "terminos-y-condiciones",
  "aviso-de-privacidad",
  "politica-de-cookies",
  "politica-de-envios",
  "cambios-y-devoluciones",
  "informacion-legal",
  "accesibilidad",
];

/**
 * Los tres documentos que se aceptan al enviar una cotizacion, con su version
 * vigente. Es la entrada que devuelve el endpoint.
 */
function versionesVigentes(): Record<string, string> {
  const versiones: Record<string, string> = {};
  for (const documento of DOCUMENTOS) {
    versiones[documento.slug] = documento.version;
  }
  return versiones;
}

/** Todas las lineas de texto de un documento, para barrerlas con una expresion. */
function lineasDe(slug: string): string[] {
  const documento = documentoDe(slug);
  assert.ok(documento !== null, `sin documento: ${slug}`);
  return documento.contenido.flatMap((seccion) => seccion.cuerpo);
}

describe("DOCUMENTOS: los siete documentos de RF-5", () => {
  it("son exactamente siete y con los slugs de RF-5", () => {
    assert.deepEqual(
      DOCUMENTOS.map((documento) => documento.slug),
      SLUGS_ESPERADOS,
    );
  });

  it("cada documento expone version y fecha de ultima actualizacion", () => {
    for (const documento of DOCUMENTOS) {
      assert.match(
        documento.version,
        /^\d+\.\d+$/,
        `sin version valida: ${documento.slug}`,
      );
      assert.match(
        documento.actualizadoEn,
        /^\d{4}-\d{2}-\d{2}$/,
        `sin fecha valida: ${documento.slug}`,
      );
      assert.ok(documento.titulo.length > 0, `sin titulo: ${documento.slug}`);
    }
  });

  it("ninguna fecha es posterior a la fecha de la spec", () => {
    for (const documento of DOCUMENTOS) {
      assert.ok(
        documento.actualizadoEn <= "2026-10-06",
        `fecha futura en ${documento.slug}: ${documento.actualizadoEn}`,
      );
    }
  });

  it("cada documento tiene contenido con al menos una seccion", () => {
    for (const documento of DOCUMENTOS) {
      assert.ok(
        documento.contenido.length > 0,
        `sin contenido: ${documento.slug}`,
      );
      for (const seccion of documento.contenido) {
        assert.ok(
          seccion.titulo.length > 0,
          `seccion sin titulo: ${documento.slug}`,
        );
        assert.ok(
          seccion.cuerpo.length > 0,
          `seccion sin cuerpo: ${documento.slug}`,
        );
      }
    }
  });

  it("ninguna seccion lleva la marca de revision legal, y el campo ya no existe", () => {
    // Decision del usuario: los documentos son un entregable, no un borrador. Un
    // sitio lleno de marcas de "pendiente" se ve inacabado, y es el propietario
    // quien decide su exposicion legal. Lo que se sustituyo son los Compromisos
    // blandos por compromisos concretos y verificables, no una promesa de que
    // "se cumple la norma".
    for (const documento of DOCUMENTOS) {
      for (const seccion of documento.contenido) {
        assert.ok(
          !("revisionLegal" in seccion),
          `${documento.slug} / ${seccion.titulo}: el campo revisionLegal debe desaparecer`,
        );
      }
    }
  });

  it("ningun documento contiene la marca de revision legal, con o sin acento", () => {
    const marca = /REQUIERE\s+REVISI[OÓ]N\s+DE\s+PROFESIONAL\s+LEGAL/i;

    for (const documento of DOCUMENTOS) {
      assert.ok(
        !marca.test(documento.titulo),
        `${documento.slug}: la marca sigue en el titulo`,
      );
      for (const seccion of documento.contenido) {
        assert.ok(
          !marca.test(seccion.titulo),
          `${documento.slug} / ${seccion.titulo}: la marca sigue en el titulo`,
        );
        for (const linea of seccion.cuerpo) {
          assert.ok(
            !marca.test(linea),
            `${documento.slug} / ${seccion.titulo}: la marca sigue en el texto: ${linea}`,
          );
        }
      }
    }
  });

  it("la constante MARCA_REVISION_LEGAL ya no se exporta", () => {
    // Se importa el modulo entero y se busca en el: si alguien dejara la
    // constante declarada "por si acaso", este test lo nota.
    const modulo = legalVersions as Record<string, unknown>;

    assert.equal(
      Object.hasOwn(modulo, "MARCA_REVISION_LEGAL"),
      false,
      "MARCA_REVISION_LEGAL sigue exportada",
    );
  });

  it("ningun texto declara cumplimiento de una norma", () => {
    // Lo unico que no se puede escribir es "cumplimos": no es verificable. Si
    // este test se relaja, vuelve el "cumple la LFPDPPP" que se decidio quitar.
    const declaraciones = [
      /cumple\s+la\s+LFPDPPP/i,
      /100\s*%\s*conforme/i,
      /cumple\s+todas\s+las\s+leyes/i,
      /garantizamos\s+el\s+cumplimiento/i,
      /cumple\s+con\s+la\s+legislaci/i,
      /da\s+cumplimiento\s+de/i,
      /en\s+pleno\s+cumplimiento/i,
    ];

    for (const slug of SLUGS_ESPERADOS) {
      for (const linea of lineasDe(slug)) {
        for (const patron of declaraciones) {
          assert.ok(
            !patron.test(linea),
            `${slug} declara cumplimiento: ${linea}`,
          );
        }
      }
    }
  });

  it("las secciones antes marcadas tienen ahora contenido sustantivo", () => {
    // Cada seccion que llevaba `revisionLegal: true` ahora debe decir algo
    // concreto: un parrafo con longitud y con al menos una cifra o un plazo. Un
    // texto blando de tres lineas que no compromete nada no es un entregable.
    for (const documento of DOCUMENTOS) {
      for (const seccion of documento.contenido) {
        const texto = seccion.cuerpo.join(" ");

        assert.ok(
          texto.length >= 120,
          `${documento.slug} / ${seccion.titulo}: texto demasiado corto (${texto.length})`,
        );
        // Ojo: `TODO` y `TBD` se buscan **sin** `/i` a proposito. Con `/i`
        // el patron comparaba con la palabra castellana "todo" y marcaba como
        // borrador media parede del documento.
        assert.ok(
          !/pendiente|por definir|se confirmara mas adelante/i.test(texto),
          `${documento.slug} / ${seccion.titulo}: sigue siendo un borrador`,
        );
        assert.ok(
          !/\bTODO\b|\bTBD\b/.test(texto),
          `${documento.slug} / ${seccion.titulo}: sigue siendo un borrador`,
        );
      }
    }
  });

  it("las secciones con compromiso citan al menos una cifra o un plazo", () => {
    // El criterio de redaccion del usuario: un compromiso se puede comprobar, y
    // un compromiso sin numero no se puede. Se exige en las secciones que antes
    // eran una marca de revision legal, porque ahi es donde estaba el vacio.
    const CON_COMPROMISO = [
      "terminos-y-condiciones",
      "aviso-de-privacidad",
      "politica-de-cookies",
      "politica-de-envios",
      "cambios-y-devoluciones",
      "informacion-legal",
      "accesibilidad",
    ];

    for (const slug of CON_COMPROMISO) {
      const documento = documentoDe(slug);
      assert.ok(documento !== null);

      const conCifra = documento.contenido.filter((seccion) =>
        /(\d+\s*(dias|horas|meses|anos|minutos|hábiles|habiles)|\b8 horas\b|\b12 meses\b|WCAG\s*2\.2\s*AA|\d+\s*%)/i.test(
          seccion.cuerpo.join(" "),
        ),
      );

      assert.ok(
        conCifra.length > 0,
        `${slug}: ninguna seccion cita una cifra o un plazo`,
      );
    }
  });

  it("el texto no nombra ningun proveedor que no exista (RF-7)", () => {
    // Si manana se anade un proveedor de correo o de pago, este test obliga a
    // decir cual es en lugar de dejar un texto generico que no encaja.
    const prohibidos =
      /resend|sendgrid|mailgun|postmark|smtp|stripe|paypal|mercadopago|gtag|google-analytics|hotjar|claridad|pixel|facebook/i;

    for (const slug of SLUGS_ESPERADOS) {
      for (const linea of lineasDe(slug)) {
        assert.ok(
          !prohibidos.test(linea),
          `${slug} nombra algo que el repositorio no tiene: ${linea}`,
        );
      }
    }
  });

  it("ningun documento afirma conformidad con ninguna norma (RF-8 y RF-31)", () => {
    const afirmaciones =
      /cumple\s+aa|conforme\s+a\s+wcag|certificad|acreditad|audita\w*\s+externamente|garantiza\s+el\s+cumplimiento/i;

    for (const slug of SLUGS_ESPERADOS) {
      for (const linea of lineasDe(slug)) {
        assert.ok(
          !afirmaciones.test(linea),
          `${slug} afirma conformidad: ${linea}`,
        );
      }
    }
  });

  it("las politicas de compra y devolucion dicen que no hay pago en linea (RF-10)", () => {
    const terminosYDevoluciones = lineasDe("cambios-y-devoluciones").join(" ");

    // El texto dice "no cobra nada" y "no hay pasarela de pago"; el patron
    // acepta cualquiera de las dos formulaciones porque el texto puede cambiar
    // de redaccion sin que cambie lo que afirma.
    assert.match(
      terminosYDevoluciones,
      /no\s+hay\s+pago\s+en\s+linea|no\s+cobra|pasarela\s+de\s+pago/i,
    );
    assert.match(terminosYDevoluciones, /es\s+una\s+\*\*solicitud|una\s+solicitud\s+de\s+cotizacion/i);
    assert.match(
      terminosYDevoluciones,
      /precio\s+de\s+cat[aa]logo\s+hasta\s+confirmar/i,
    );
  });

  it("el aviso de privacidad dice que no se envia correo electronico (RF-7)", () => {
    const privacidad = lineasDe("aviso-de-privacidad").join(" ");

    assert.match(
      privacidad,
      /no\s+env[ii]a\w*\s+comunicaciones\s+electr[oo]nicas|no\s+se\s+env[ii]a\w*\s+correo/i,
    );
  });

  it("el aviso de privacidad nombra solo pp_session y pingo-quote-cart (RF-9)", () => {
    const privacidad = lineasDe("aviso-de-privacidad").join(" ");
    const cookies = lineasDe("politica-de-cookies").join(" ");

    assert.match(privacidad, /pp_session/);
    assert.match(privacidad, /pingo-quote-cart/);
    assert.match(cookies, /pp_session/);
    assert.match(cookies, /pingo-quote-cart/);
  });

  it("el aviso de privacidad no promete un plazo de respuesta (RF-11)", () => {
    const privacidad = lineasDe("aviso-de-privacidad").join(" ");

    assert.ok(
      !/\d+\s*(h|horas|dias)\s*(h[aa]biles)?\s*(o\s+menos)?\s*para\s+responder/i.test(
        privacidad,
      ),
      "el aviso promete un plazo de respuesta",
    );
  });

  it("la politica de cookies da los mismos valores que el codigo (RF-9)", () => {
    // Valores tomados de `SESSION_COOKIE` y `SESSION_TTL_MS` de
    // `src/lib/auth/session-token.ts`, no de memoria.
    const cookies = lineasDe("politica-de-cookies").join(" ");

    assert.match(cookies, /8\s*horas/);
    assert.match(cookies, /HttpOnly/i);
    assert.match(cookies, /SameSite=Lax/i);
    assert.match(cookies, /Secure/i);
    assert.match(cookies, /funcional/i);
  });

  it("el aviso de privacidad dice que la IP no se persiste (RF-38)", () => {
    const privacidad = lineasDe("aviso-de-privacidad").join(" ");

    assert.match(privacidad, /IP/i);
    assert.match(privacidad, /no\s+se\s+(guarda|persiste|almacena)/i);
  });

  it("el aviso de privacidad explica los derechos por escrito y por correo (RF-12)", () => {
    const privacidad = lineasDe("aviso-de-privacidad").join(" ");

    for (const derecho of [
      "acceso",
      "rectificaci",
      "cancelaci",
      "oposici",
      "eliminaci",
    ]) {
      assert.ok(
        privacidad.includes(derecho),
        `el aviso no menciona: ${derecho}`,
      );
    }
    assert.match(privacidad, /por\s+escrito/i);
  });

  it("el aviso no ofrece borrar la cuenta ni descargar datos (RF-13)", () => {
    const privacidad = lineasDe("aviso-de-privacidad").join(" ");

    assert.ok(
      !/bot[oo]n\s+de\s+borrar\s+mi\s+cuenta|descarga\w*\s+mis\s+datos/i.test(
        privacidad,
      ),
      "el aviso ofrece algo que el sistema no tiene",
    );
  });

  it("la politica de envios declara que el envio es solo en Mexico (RF-37)", () => {
    const envios = lineasDe("politica-de-envios").join(" ");

    assert.match(envios, /s[oo]lo\s+en\s+M[ee]xico|entrega\w*\s+en\s+M[ee]xico/i);
  });

  it("la politica de envios no promete un plazo que el sistema no cumple (RF-11)", () => {
    const envios = lineasDe("politica-de-envios").join(" ");
    const terminos = lineasDe("terminos-y-condiciones").join(" ");

    assert.ok(
      !/en\s+\d+\s*d[ii]as\s+hacemos\s+entrega/i.test(envios),
      "la politica promete un plazo de entrega",
    );
    assert.ok(
      !/\d+\s*(h|horas)\s*(h[aa]biles)?\s*(o\s+menos)?\s*para\s+responder/i.test(
        terminos,
      ),
      "los terminos prometen un plazo de respuesta",
    );
  });

  it("accesibilidad empieza por la frase que fija RF-29 y declara el estandar objetivo", () => {
    const lineas = lineasDe("accesibilidad");
    const primera = lineas[0] ?? "";

    assert.ok(
      primera.startsWith(
        "Pingo Pop trabaja para mejorar continuamente la accesibilidad de su sitio",
      ),
      `la primera linea no es la exigida por RF-29: ${primera}`,
    );
    assert.match(lineas.join(" "), /WCAG\s*2\.2\s*AA/);
  });

  it("los datos del propietario se piden con token, no escritos a mano (RF-2)", () => {
    for (const slug of SLUGS_ESPERADOS) {
      const texto = lineasDe(slug).join(" ");
      // Ningun documento lleva el texto del marcador escrito a mano: los huecos
      // se rellenan en pantalla con `interpolar()` y su constante.
      assert.ok(
        !texto.includes("REQUIERE DATO DEL PROPIETARIO"),
        `${slug} escribe el marcador a mano`,
      );
    }
  });

  it("los tokens de los textos son los que `interpolar` conoce", () => {
    const permitidos = new Set([
      "NOMBRE_COMERCIAL",
      "RAZON_SOCIAL",
      "RFC",
      "DOMICILIO_FISCAL",
      "CORREO_CONTACTO",
      "TELEFONO",
      "RESPONSABLE_PRIVACIDAD",
    ]);

    for (const slug of SLUGS_ESPERADOS) {
      const texto = lineasDe(slug).join(" ");
      for (const [, token] of texto.matchAll(/\{\{([A-Z_]+)\}\}/g)) {
        assert.ok(
          permitidos.has(token),
          `${slug} usa un token desconocido: {{${token}}}`,
        );
      }
    }
  });
});

describe("Huellas: la version significa algo (RF-6)", () => {
  it("la huella de cada documento coincide con su contenido", () => {
    for (const documento of DOCUMENTOS) {
      const esperada = createHash("sha256")
        .update(serializarParaHuella(documento.contenido), "utf8")
        .digest("hex")
        .slice(0, 12);

      assert.equal(
        documento.huella,
        esperada,
        `huella desfasada en ${documento.slug}: si cambiaste el texto, sube la version y recalcula la huella.`,
      );
    }
  });

  it("la huella son 12 hex en minusculas", () => {
    for (const documento of DOCUMENTOS) {
      assert.match(documento.huella, /^[0-9a-f]{12}$/, documento.slug);
    }
  });

  it("el registro de firmas declara la huella vigente de cada documento", () => {
    for (const documento of DOCUMENTOS) {
      const firmas = FIRMAS_POR_DOCUMENTO[documento.slug];

      assert.ok(firmas !== undefined, `sin registro: ${documento.slug}`);
      assert.equal(
        firmas[documento.version],
        documento.huella,
        `la version ${documento.version} de ${documento.slug} no esta registrada con su huella`,
      );
    }
  });

  it("dos versiones del mismo documento nunca comparten huella", () => {
    // Es lo que detecta "subir la version sin cambiar el texto": la huella no se
    // mueve, asi que la version nueva apuntaria a la misma que la anterior.
    for (const [slug, firmas] of Object.entries(FIRMAS_POR_DOCUMENTO)) {
      const valores = Object.values(firmas);

      assert.equal(
        new Set(valores).size,
        valores.length,
        `dos versiones de ${slug} comparten huella: el texto no cambio`,
      );
    }
  });

  it("el registro de firmas cubre los siete documentos", () => {
    assert.deepEqual(Object.keys(FIRMAS_POR_DOCUMENTO).sort(), [
      "accesibilidad",
      "aviso-de-privacidad",
      "cambios-y-devoluciones",
      "informacion-legal",
      "politica-de-cookies",
      "politica-de-envios",
      "terminos-y-condiciones",
    ]);
  });
});

describe("Lo que no cambia al reescribir los textos", () => {
  it("los slugs siguen siendo los siete de RF-5, en el mismo orden", () => {
    assert.deepEqual(
      DOCUMENTOS.map((documento) => documento.slug),
      SLUGS_ESPERADOS,
    );
  });

  it("las versiones siguen siendo 1.0", () => {
    for (const documento of DOCUMENTOS) {
      assert.equal(documento.version, "1.0", documento.slug);
    }
  });

  it("las fechas siguen siendo 2026-10-06", () => {
    for (const documento of DOCUMENTOS) {
      assert.equal(documento.actualizadoEn, "2026-10-06", documento.slug);
    }
  });

  it("las huellas siguen siendo las siete registradas", () => {
    const esperadas = [
      "8820ac2aab0e",
      "955874c9917f",
      "f54aefbe02dd",
      "f172a6c89cb4",
      "625f3bee4dc7",
      "f1ba9e3bb78b",
      "567446f42f2f",
    ];

    assert.deepEqual(
      DOCUMENTOS.map((documento) => documento.huella),
      esperadas,
    );
  });

  it("DOCUMENTO_POR_TIPO no se ha movido", () => {
    assert.deepEqual(DOCUMENTO_POR_TIPO, {
      TERMINOS: "terminos-y-condiciones",
      PRIVACIDAD: "aviso-de-privacidad",
      COOKIES: "politica-de-cookies",
    });
  });
});

describe("documentoDe y versionDe", () => {
  it("devuelven el documento y la version de un slug existente", () => {
    for (const slug of SLUGS_ESPERADOS) {
      assert.ok(documentoDe(slug) !== null, `sin documento: ${slug}`);
      assert.ok(versionDe(slug) !== null, `sin version: ${slug}`);
    }
  });

  it("devuelven null si el slug no existe, para que la pagina sea un 404", () => {
    assert.equal(documentoDe("pagina-que-no-existe"), null);
    assert.equal(versionDe("pagina-que-no-existe"), null);
  });

  it("devuelven null con una entrada que no es texto", () => {
    assert.equal(documentoDe(42 as unknown as string), null);
  });
});

describe("sonVersionesValidas", () => {
  it("devuelve true con las versiones correctas de los tres documentos", () => {
    const correctas: Record<string, string> = {};
    for (const slug of Object.values(DOCUMENTO_POR_TIPO)) {
      const version = versionDe(slug);
      assert.ok(version !== null, `sin version: ${slug}`);
      correctas[slug] = version;
    }

    assert.equal(sonVersionesValidas(correctas), true);
  });

  it("devuelve true con las siete, porque no hay ninguna que sobre", () => {
    assert.equal(sonVersionesValidas(versionesVigentes()), true);
  });

  it("devuelve false con una version inventada", () => {
    assert.equal(
      sonVersionesValidas({ ...versionesVigentes(), "aviso-de-privacidad": "9.9" }),
      false,
    );
  });

  it("devuelve false si falta uno de los tres que se aceptan", () => {
    const parcial: Record<string, string> = {};
    parcial["aviso-de-privacidad"] =
      versionDe("aviso-de-privacidad") ?? "";

    assert.equal(sonVersionesValidas(parcial), false);
  });

  it("devuelve false con un slug que no existe", () => {
    assert.equal(
      sonVersionesValidas({ ...versionesVigentes(), "no-existe": "1.0" }),
      false,
    );
  });

  it("devuelve false si falta un documento de los exigidos", () => {
    assert.equal(sonVersionesValidas({}), false);
  });
});

describe("DOCUMENTO_POR_TIPO", () => {
  it("cubre TERMINOS, PRIVACIDAD y COOKIES", () => {
    assert.deepEqual(Object.keys(DOCUMENTO_POR_TIPO).sort(), [
      "COOKIES",
      "PRIVACIDAD",
      "TERMINOS",
    ]);
  });

  it("cada slug del mapa existe en DOCUMENTOS", () => {
    for (const [tipo, slug] of Object.entries(DOCUMENTO_POR_TIPO)) {
      assert.ok(
        documentoDe(slug) !== null,
        `${tipo} apunta a un slug inexistente: ${slug}`,
      );
    }
  });
});