import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, it } from "node:test";

import {
  CAMPOS_LEGALES,
  LegalDataSchema,
  MARCADOR_PENDIENTE,
  NOMBRE_COMERCIAL,
  camposFaltantes,
  interpolar,
  leerLegal,
} from "../src/lib/legal-data";

/**
 * Raiz del repositorio. El runner es `node --import tsx --test` desde la raiz
 * del proyecto (`npm test`), asi que `process.cwd()` es el sitio correcto y no
 * depende de como se llame al runner.
 */
const RAIZ = process.cwd();

/** Datos legales completos, con los seis campos rellenados. */
const COMPLETO = {
  razonSocial: "Vendedora de Pins SA de CV",
  rfc: "VPA101010HSA",
  domicilioFiscal: "Calle Falsa 123, Colonia Centro, Ciudad de Mexico",
  correoContacto: "hola@pingo-pop.mx",
  telefono: "55 1234 5678",
  responsablePrivacidad: "Ana Perez, responsable de privacidad",
} satisfies Record<string, string>;

/**
 * Recorre `src/` y devuelve los ficheros cuyo texto contiene el marcador.
 *
 * El unico fichero permitido es `src/lib/legal-data.ts`, donde vive la
 * constante. Cualquier otro significa que alguien escribio el texto del
 * marcador a mano, que es justo lo que RF-2 prohibe.
 */
function ficherosConMarcador(): string[] {
  // Con separador "/" en los dos lados: `join` usa "\\" en Windows y la
  // comparacion fallaria justo en el fichero que si puede llevar el texto.
  const permitidos = new Set(["src/lib/legal-data.ts"]);
  const extensiones = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
  const encontrados: string[] = [];

  const visitar = (directorio: string): void => {
    for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
      const completo = join(directorio, entrada.name);
      if (entrada.isDirectory()) {
        visitar(completo);
        continue;
      }
      const relativo = relative(RAIZ, completo).split(sep).join("/");
      if (permitidos.has(relativo)) continue;
      const punto = relativo.lastIndexOf(".");
      const extension = punto === -1 ? "" : relativo.slice(punto);
      if (!extensiones.has(extension)) continue;
      if (readFileSync(completo, "utf8").includes(MARCADOR_PENDIENTE)) {
        encontrados.push(relativo);
      }
    }
  };

  visitar(join(RAIZ, "src"));
  return encontrados;
}

describe("leerLegal: los seis campos", () => {
  it("devuelve el marcador en los seis campos cuando no hay nada", () => {
    const leidos = leerLegal({});

    assert.equal(CAMPOS_LEGALES.length, 6);
    for (const campo of CAMPOS_LEGALES) {
      assert.equal(leidos[campo], MARCADOR_PENDIENTE);
    }
  });

  it("devuelve los seis valores cuando estan rellenos", () => {
    assert.deepEqual(leerLegal(COMPLETO), COMPLETO);
  });

  it("trata un campo de solo espacios como ausente, igual que imagePath", () => {
    // El mismo `preprocess` que usa `imagePath` en `validation.ts`: `""` y
    // `"   "` son "sin dato", no un error de validacion.
    const leidos = leerLegal({ ...COMPLETO, razonSocial: "   " });

    assert.equal(leidos.razonSocial, MARCADOR_PENDIENTE);
    assert.equal(leidos.rfc, COMPLETO.rfc);
  });

  it("recorta los espacios que sobran en un campo relleno", () => {
    assert.equal(
      leerLegal({ ...COMPLETO, telefono: "  55 1234 5678  " }).telefono,
      "55 1234 5678",
    );
  });

  it("acepta null y undefined como ausentes, no como fallo", () => {
    const leidos = leerLegal({ rfc: null, telefono: undefined });

    assert.equal(leidos.rfc, MARCADOR_PENDIENTE);
    assert.equal(leidos.telefono, MARCADOR_PENDIENTE);
  });
});

describe("camposFaltantes", () => {
  it("lista los seis en el orden de CAMPOS_LEGALES cuando no hay nada", () => {
    assert.deepEqual(camposFaltantes({}), [
      "razonSocial",
      "rfc",
      "domicilioFiscal",
      "correoContacto",
      "telefono",
      "responsablePrivacidad",
    ]);
  });

  it("devuelve lista vacia cuando estan todos rellenos", () => {
    assert.deepEqual(camposFaltantes(COMPLETO), []);
  });

  it("lista exactamente los que faltan, ni uno mas", () => {
    const faltan = camposFaltantes({
      razonSocial: COMPLETO.razonSocial,
      rfc: "",
      domicilioFiscal: "   ",
      correoContacto: COMPLETO.correoContacto,
      telefono: COMPLETO.telefono,
    });

    assert.deepEqual(faltan, ["rfc", "domicilioFiscal", "responsablePrivacidad"]);
  });
});

describe("MARCADOR_PENDIENTE es una constante unica", () => {
  it("el recorrido de src/ lee ficheros de verdad", () => {
    // Si el recorrido no leyera nada, el caso siguiente pasaria sin comprobar
    // nada. Se comprueba primero que el recorrido llega a un fichero conocido.
    const control = readFileSync(join(RAIZ, "src", "lib", "validation.ts"), "utf8");

    assert.ok(control.length > 0);
    assert.ok(control.includes("imagePath"));
  });

  it("el texto del marcador no aparece en ningun fichero de src/", () => {
    const encontrados = ficherosConMarcador();

    assert.deepEqual(
      encontrados,
      [],
      `El marcador escrito a mano en: ${encontrados.join(", ")}. Usa MARCADOR_PENDIENTE de src/lib/legal-data.ts.`,
    );
  });
});

describe("interpolar", () => {
  it("sustituye un token conocido por el valor", () => {
    assert.equal(
      interpolar("Razon: {{RAZON_SOCIAL}}", leerLegal(COMPLETO)),
      `Razon: ${COMPLETO.razonSocial}`,
    );
  });

  it("sustituye un token sin dato por el marcador, nunca por un {{CLAVE}} visible", () => {
    const resultado = interpolar("Razon: {{RAZON_SOCIAL}}", leerLegal({}));

    assert.equal(resultado, `Razon: ${MARCADOR_PENDIENTE}`);
    assert.ok(!resultado.includes("{{"));
  });

  it("un token desconocido sale como marcador y no como texto sin sustituir", () => {
    const resultado = interpolar("Domicilio: {{DOMICILIO_FISCAL}}", {});

    assert.equal(resultado, `Domicilio: ${MARCADOR_PENDIENTE}`);
    assert.ok(!resultado.includes("{{"));
  });

  it("sustituye varios tokens en la misma plantilla", () => {
    const resultado = interpolar(
      "{{NOMBRE_COMERCIAL}} - {{RAZON_SOCIAL}} - {{RFC}}",
      leerLegal(COMPLETO),
    );

    assert.equal(
      resultado,
      `${NOMBRE_COMERCIAL} - ${COMPLETO.razonSocial} - ${COMPLETO.rfc}`,
    );
  });

  it("devuelve el texto identico cuando no hay ningun token", () => {
    const texto = "Pingo POP no usa pasarela de pago.";

    assert.equal(interpolar(texto, leerLegal({})), texto);
  });

  it("{{NOMBRE_COMERCIAL}} devuelve el nombre comercial conocido", () => {
    assert.equal(NOMBRE_COMERCIAL, "Pingo POP");
    assert.equal(
      interpolar("Marca: {{NOMBRE_COMERCIAL}}", leerLegal({})),
      "Marca: Pingo POP",
    );
  });
});

describe("LegalDataSchema", () => {
  it("acepta los seis campos vacios como ausencia", () => {
    const resultado = LegalDataSchema.safeParse({
      razonSocial: "",
      rfc: "   ",
      domicilioFiscal: "",
      correoContacto: "",
      telefono: "",
      responsablePrivacidad: "",
    });

    assert.equal(resultado.success, true);
  });

  it("acepta el objeto vacio sin campos", () => {
    assert.equal(LegalDataSchema.safeParse({}).success, true);
  });

  it("rechaza un campo por encima de su longitud maxima", () => {
    const resultado = LegalDataSchema.safeParse({
      razonSocial: "x".repeat(121),
    });

    assert.equal(resultado.success, false);
  });

  it("rechaza un correo que no es correo", () => {
    const resultado = LegalDataSchema.safeParse({
      correoContacto: "no-es-un-correo",
    });

    assert.equal(resultado.success, false);
  });

  it("rechaza un RFC con espacios o longitud imposible", () => {
    assert.equal(
      LegalDataSchema.safeParse({ rfc: "VPA 101010 HSA" }).success,
      false,
    );
    assert.equal(LegalDataSchema.safeParse({ rfc: "VPA101" }).success, false);
    // 14 caracteres: por encima del tope de 13 (12 es persona moral, 13 fisica).
    assert.equal(
      LegalDataSchema.safeParse({ rfc: "VPA101010HSAAZ" }).success,
      false,
    );
    // 12 (persona moral) y 13 (persona fisica) son los dos largos validos.
    assert.equal(LegalDataSchema.safeParse({ rfc: "VPA101010HSA" }).success, true);
    assert.equal(LegalDataSchema.safeParse({ rfc: "VPA101010HSAB" }).success, true);
  });

  it("no calcula el digito de verificacion del RFC, solo su forma", () => {
    // El digito de verificacion lo comprueba el SAT, no este modulo: aqui solo
    // se acotan longitud y caracteres para no inventar una regla mas.
    assert.equal(LegalDataSchema.safeParse({ rfc: "VPA101010HS0" }).success, true);
  });
});