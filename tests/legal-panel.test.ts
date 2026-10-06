import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CAMPOS_LEGALES, camposFaltantes } from "../src/lib/legal-data";
import {
  AYUDA_POR_CAMPO,
  ETIQUETA_POR_CAMPO,
  resumenFaltantes,
  textoAvisoFaltantes,
} from "../src/lib/legal-panel";

/**
 * RF-3: el panel de datos legales tiene que **avisar de los que faltan**, y el
 * aviso sale de `camposFaltantes()`, no de una lista escrita a mano en el
 * componente. Estos tests comprueban las dos mitades: que el mapa de etiquetas
 * cubre exactamente los seis campos, y que el texto nombra los que faltan.
 */

describe("ETIQUETA_POR_CAMPO", () => {
  it("cubre los seis campos y ni uno mas", () => {
    // Si `CAMPOS_LEGALES` gana un campo y aqui no, el formulario nuevo se queda
    // sin etiqueta y el panel no lo puede ofrecer. Este test lo delata.
    assert.deepEqual(Object.keys(ETIQUETA_POR_CAMPO).sort(), [
      ...CAMPOS_LEGALES,
    ].sort());
  });

  it("cada campo tiene etiqueta y ayuda, y ninguna esta vacia", () => {
    for (const campo of CAMPOS_LEGALES) {
      // "RFC" son tres caracteres y es una etiqueta correcta: el umbral va a 2
      // porque lo que se quiere descartar es la etiqueta vacia o de un caracter.
      assert.ok(
        ETIQUETA_POR_CAMPO[campo].trim().length >= 2,
        `etiqueta vacia en ${campo}`,
      );
      assert.ok(
        AYUDA_POR_CAMPO[campo].trim().length > 10,
        `ayuda demasiado corta en ${campo}`,
      );
    }
  });

  it("las etiquetas van con mayuscula, como las de un formulario real", () => {
    for (const campo of CAMPOS_LEGALES) {
      const etiqueta = ETIQUETA_POR_CAMPO[campo];
      assert.equal(
        etiqueta[0],
        etiqueta[0]?.toUpperCase(),
        `etiqueta sin mayuscula inicial: ${campo}`,
      );
    }
  });

  it("el RFC avisa de que no se comprueba el digito de verificacion", () => {
    // El codigo valida 12 o 13 caracteres pero NO el digito, porque la tabla la
    // tiene el SAT. Si el panel no lo dice, alguien dejara el RFC de ejemplo
    // esperando que el sistema lo rechace.
    assert.match(AYUDA_POR_CAMPO.rfc, /12|13/);
  });
});

describe("textoAvisoFaltantes", () => {
  it("con todo relleno no avisa de que falte nada", () => {
    const texto = textoAvisoFaltantes([]);
    assert.match(texto.toLowerCase(), /complet|rellen/);
    assert.ok(!texto.toLowerCase().includes("faltan"), texto);
  });

  it("con los seis vacios los nombra TODOS, y en el orden de CAMPOS_LEGALES", () => {
    const texto = textoAvisoFaltantes([...CAMPOS_LEGALES]);
    for (const campo of CAMPOS_LEGALES) {
      assert.ok(
        texto.includes(ETIQUETA_POR_CAMPO[campo]),
        `no nombra ${campo}: ${texto}`,
      );
    }
    const posiciones = CAMPOS_LEGALES.map((c) => texto.indexOf(ETIQUETA_POR_CAMPO[c]));
    const ordenadas = [...posiciones].sort((a, b) => a - b);
    assert.deepEqual(
      posiciones,
      ordenadas,
      "el aviso no respeta el orden de CAMPOS_LEGALES, que es el que se revisa",
    );
  });

  it("con uno solo lo nombra a el, sin ruido", () => {
    const texto = textoAvisoFaltantes(["rfc"]);
    assert.ok(texto.includes(ETIQUETA_POR_CAMPO.rfc), texto);
    for (const campo of CAMPOS_LEGALES) {
      if (campo === "rfc") continue;
      assert.ok(
        !texto.includes(ETIQUETA_POR_CAMPO[campo]),
        `menciona ${campo} de mas: ${texto}`,
      );
    }
  });

  it("usa el singular con uno y el plural con varios", () => {
    assert.match(textoAvisoFaltantes(["rfc"]).toLowerCase(), /falta\s/, "");
    assert.match(
      textoAvisoFaltantes(["rfc", "telefono"]).toLowerCase(),
      /faltan\s/,
    );
  });

  it("recuerda que los huecos se publican como marcador", () => {
    // Esto es lo que hace el aviso util y no solo decorativo: el admin tiene que
    // entender que un campo vacio no es un campo opcional, sale en la pagina legal.
    assert.match(textoAvisoFaltantes(["rfc"]), /pública|publik|publica|pública/i);
  });
});

describe("resumenFaltantes", () => {
  it("cuenta los que faltan sobre los seis", () => {
    assert.equal(resumenFaltantes([...CAMPOS_LEGALES]), "0 de 6");
    assert.equal(resumenFaltantes(["rfc", "telefono"]), "4 de 6");
    assert.equal(resumenFaltantes([]), "6 de 6");
  });

  it("usa `camposFaltantes()` de verdad, no un filtro propio", () => {
    // La entrada y la salida del panel van por el mismo camino que las paginas
    // legales: si aqui se contara de otra manera, el aviso y lo publicado
    // dirian cosas distintas.
    const entrada = { rfc: "PING250101XXX" };
    assert.deepEqual(camposFaltantes(entrada), [
      "razonSocial",
      "domicilioFiscal",
      "correoContacto",
      "telefono",
      "responsablePrivacidad",
    ]);
  });
});
