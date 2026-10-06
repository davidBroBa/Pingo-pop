import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  BOTON_BASE,
  CATEGORIAS_CONSENTIMIENTO,
  CLAVE_CONSENTIMIENTO,
  DECISIONES,
  TECNOLOGIAS_NO_ESENCIALES,
  VERSION_DECISION,
  botonClases,
  contarClases,
  crearRegistro,
  esDecisionValida,
  hayQuePedirConsentimiento,
  leerRegistro,
  pideConfirmacion,
} from "../src/lib/consent";

/** Las tres vias del panel de RF-16, en el orden en que las declara la spec. */
const VIAS = ["aceptar", "rechazar", "configurar"] as const;

describe("TECNOLOGIAS_NO_ESENCIALES esta vacia (D14)", () => {
  it("hoy no hay ninguna tecnologia no esencial", () => {
    assert.deepEqual([...TECNOLOGIAS_NO_ESENCIALES], []);
  });

  it("por eso no hay que pedir consentimiento (RF-15)", () => {
    assert.equal(hayQuePedirConsentimiento(), false);
  });

  it("el modulo dice por que esta vacia, en un comentario, no en una constante", async () => {
    // Si manana se anade una tecnologia, el comentario tiene que actualizarse. Se
    // comprueba leyendo el propio modulo: es la unica forma de que el motivo no se
    // quede en la memoria de quien lo escribio (RF-15).
    const { readFileSync } = await import("node:fs");
    const fuente = readFileSync(
      join(process.cwd(), "src", "lib", "consent.ts"),
      "utf8",
    );

    assert.match(fuente, /RF-15/);
    assert.match(fuente, /localStorage/);
    assert.match(fuente, /D14/);
  });
});

describe("Las cuatro categorias (RF-16)", () => {
  it("son necesarias, analiticas, marketing y preferencias", () => {
    assert.deepEqual(
      [...CATEGORIAS_CONSENTIMIENTO],
      ["necesarias", "analiticas", "marketing", "preferencias"],
    );
  });

  it("la clave de localStorage es la declarada", () => {
    assert.equal(CLAVE_CONSENTIMIENTO, "pingo-consentimiento");
  });

  it("con alguna tecnologia no esencial habria que preguntar", () => {
    // La funcion se prueba tambien con un array simulado: lo que importa es
    // que la longitud decide, no el contenido concreto.
    const simulado = ["analitica-de-ejemplo"] as const;

    assert.equal(hayQuePedirConsentimiento(simulado), true);
    assert.equal(hayQuePedirConsentimiento([]), false);
  });
});

describe("esDecisionValida", () => {
  it("acepta las tres vias", () => {
    for (const via of VIAS) {
      assert.equal(esDecisionValida(via), true, via);
    }
  });

  it("rechaza cualquier otra cosa", () => {
    assert.equal(esDecisionValida("aceptado"), false);
    assert.equal(esDecisionValida("ACEPTAR"), false);
    assert.equal(esDecisionValida(""), false);
    assert.equal(esDecisionValida(null), false);
    assert.equal(esDecisionValida(7), false);
  });

  it("DECISIONES son exactamente las tres vias", () => {
    assert.deepEqual([...DECISIONES], [...VIAS]);
  });
});

describe("crearRegistro", () => {
  it("lleva version, tipo, decision y la marca de tiempo que se le paso", () => {
    const hoy = new Date("2026-10-06T12:30:00.000Z");

    const registro = crearRegistro("TERMINOS", "aceptar", hoy);

    assert.deepEqual(registro, {
      version: VERSION_DECISION,
      tipo: "TERMINOS",
      decision: "aceptar",
      decidedAt: "2026-10-06T12:30:00.000Z",
    });
  });

  it("no lee el reloj: la fecha es exactamente la que recibe", () => {
    // Si el modulo usara `new Date()`, este texto daria una hora distinta en
    // cuanto el reloj de la maquina no coincidiera con la de la prueba.
    const antes = new Date("2020-01-01T00:00:00.000Z");
    const despues = new Date("2030-12-31T23:59:59.000Z");

    assert.equal(crearRegistro("COOKIES", "rechazar", antes).decidedAt, "2020-01-01T00:00:00.000Z");
    assert.equal(
      crearRegistro("COOKIES", "rechazar", despues).decidedAt,
      "2030-12-31T23:59:59.000Z",
    );
  });

  it("VERSION_DECISION es 1", () => {
    assert.equal(VERSION_DECISION, 1);
  });
});

describe("leerRegistro", () => {
  it("devuelve el registro tal cual si el texto es valido", () => {
    const hoy = new Date("2026-10-06T12:30:00.000Z");
    const registro = crearRegistro("PRIVACIDAD", "configurar", hoy);

    const leido = leerRegistro(JSON.stringify(registro));

    assert.deepEqual(leido, registro);
  });

  it("devuelve null con texto manipulado", () => {
    assert.equal(leerRegistro("no soy json"), null);
    assert.equal(leerRegistro("[]"), null);
    assert.equal(leerRegistro("null"), null);
    assert.equal(leerRegistro('{"version":99}'), null);
    assert.equal(leerRegistro('{"tipo":"COOKIES"}'), null);
  });

  it("devuelve null si la decision no es una de las tres vias", () => {
    const invalido = JSON.stringify({
      version: VERSION_DECISION,
      tipo: "TERMINOS",
      decision: "quiza",
      decidedAt: "2026-10-06T12:30:00.000Z",
    });

    assert.equal(leerRegistro(invalido), null);
  });

  it("devuelve null si la marca de tiempo no es una fecha ISO", () => {
    const invalido = JSON.stringify({
      version: VERSION_DECISION,
      tipo: "TERMINOS",
      decision: "aceptar",
      decidedAt: "ayer",
    });

    assert.equal(leerRegistro(invalido), null);
  });
});

describe("pideConfirmacion: cambiar una decision no se hace en silencio (RF-18)", () => {
  it("sin decision previa no hay nada que confirmar", () => {
    assert.equal(pideConfirmacion(null, "aceptar"), false);
    assert.equal(pideConfirmacion(undefined, "rechazar"), false);
  });

  it("una decision distinta si pide confirmacion", () => {
    assert.equal(pideConfirmacion("aceptar", "rechazar"), true);
    assert.equal(pideConfirmacion("rechazar", "aceptar"), true);
  });

  it("la misma decision no pide confirmacion", () => {
    assert.equal(pideConfirmacion("aceptar", "aceptar"), false);
    assert.equal(pideConfirmacion("rechazar", "rechazar"), false);
    assert.equal(pideConfirmacion("configurar", "configurar"), false);
  });
});

describe("RF-17 comprobado contando clases, no a ojo", () => {
  it("aceptar y rechazar tienen el mismo numero de clases", () => {
    assert.equal(
      contarClases(botonClases("aceptar")),
      contarClases(botonClases("rechazar")),
    );
  });

  it("las dos valen las clases de la base mas una, el acento", () => {
    const esperadas = contarClases(BOTON_BASE) + 1;

    assert.equal(contarClases(botonClases("aceptar")), esperadas);
    assert.equal(contarClases(botonClases("rechazar")), esperadas);
    assert.equal(contarClases(botonClases("configurar")), esperadas);
  });

  it("la base aporta tamano, peso, foco y borde para las tres vias", () => {
    for (const via of VIAS) {
      const clases = botonClases(via);

      assert.ok(clases.includes("h-12"), `${via} sin altura`);
      assert.ok(clases.includes("font-semibold"), `${via} sin peso`);
      assert.ok(clases.includes("cartoon-focus"), `${via} sin foco visible`);
      assert.ok(clases.includes("cartoon-border"), `${via} sin borde`);
      assert.ok(clases.startsWith(BOTON_BASE), `${via} no usa la base`);
    }
  });

  it("ninguna via se convierte en enlace ni en texto atenuado", () => {
    for (const via of VIAS) {
      const clases = botonClases(via);

      assert.ok(!clases.includes("underline"), `${via} como enlace`);
      assert.ok(!clases.includes("opacity-"), `${via} atenuado`);
      assert.ok(!clases.includes("text-muted"), `${via} atenuado`);
    }
  });

  it("las tres vias se distinguen solo por el acento", () => {
    const acentos = VIAS.map((via) => contarClases(botonClases(via)));

    assert.deepEqual(acentos, [acentos[0], acentos[0], acentos[0]]);
  });
});