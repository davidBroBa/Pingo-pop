import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ETIQUETA_ESTADO,
  TITULO_POR_TIPO,
  antiguedadLegible,
  filtrarSoloVencidas,
  idVencida,
  indiceVencidas,
  resumenAceptaciones,
  textoAvisoBorrado,
  textoAvisoVencida,
} from "../src/lib/cotizaciones-panel";
import { DOCUMENTO_POR_TIPO } from "../src/lib/legal-versions";

/**
 * Logica del panel de cotizaciones, probada sin navegador ni base de datos.
 *
 * El runner es `node:test` sin jsdom, asi que la comprobable vive en este modulo
 * puro y el Client Component solo la pinta. Por eso `antiguedadLegible()`
 * **recibe `hoy`**: no puede leer el reloj, y un test lo demuestra.
 */

describe("antiguedadLegible", () => {
  it("no lee el reloj: sin `hoy` no puede calcular nada", () => {
    // Si algun dia esta funcion metiera `new Date()` por su cuenta, estas pruebas
    // seguirian pasando en verde. Esto no lo detecta, y por eso el parametro es
    // obligatorio y el panel recibe `hoy` desde la pagina del servidor.
    assert.equal(typeof antiguedadLegible, "function");
    assert.equal(antiguedadLegible.length, 2, "debe pedir la fecha y el hoy");
  });

  it("dice los minutos, las horas y los dias segun lo que Away", () => {
    const hoy = "2026-10-06T12:00:00.000Z";
    assert.equal(
      antiguedadLegible("2026-10-06T11:30:00.000Z", hoy),
      "hace 30 minutos",
    );
    assert.equal(
      antiguedadLegible("2026-10-06T09:00:00.000Z", hoy),
      "hace 3 horas",
    );
    assert.equal(
      antiguedadLegible("2026-10-04T12:00:00.000Z", hoy),
      "hace 2 días",
    );
  });

  it("usa el singular cuando toca", () => {
    const hoy = "2026-10-06T12:00:00.000Z";
    assert.equal(
      antiguedadLegible("2026-10-06T11:00:00.000Z", hoy),
      "hace 1 hora",
    );
    assert.equal(
      antiguedadLegible("2026-10-05T12:00:00.000Z", hoy),
      "hace 1 día",
    );
  });

  it("salta a meses y años, y no se equivoca con los meses largos", () => {
    const hoy = "2026-10-06T12:00:00.000Z";
    assert.equal(
      antiguedadLegible("2026-07-06T12:00:00.000Z", hoy),
      "hace 3 meses",
    );
    assert.equal(
      antiguedadLegible("2025-10-06T12:00:00.000Z", hoy),
      "hace 1 año",
    );
  });

  it("nunca dice un numero negativo si la fecha viene en el futuro", () => {
    // Puede pasar: el reloj del navegador va por delante del del servidor, o una
    // fila se creo con una fecha por delante. Decir "hace -3 horas" en un panel
    // de trabajo del negocio se ve como un fallo del panel.
    const hoy = "2026-10-06T12:00:00.000Z";
    const texto = antiguedadLegible("2026-10-09T12:00:00.000Z", hoy);
    assert.ok(!texto.includes("-"), `no debe llevar guion: ${texto}`);
    assert.equal(texto, "hace 0 minutos");
  });

  it("las unidades llevan tilde: dia, mas, ano", () => {
    // El panel se lee a diario y en español. Un "hace 3 dias" en pantalla es el
    // mismo defecto que se corrigio en los documentos legales.
    const hoy = "2026-10-06T12:00:00.000Z";
    assert.match(antiguedadLegible("2026-10-01T12:00:00.000Z", hoy), /días$/);
    assert.match(antiguedadLegible("2026-07-06T12:00:00.000Z", hoy), /meses$/);
    assert.match(antiguedadLegible("2024-10-06T12:00:00.000Z", hoy), /años$/);
  });
});

describe("resumenAceptaciones", () => {
  it("pone el titulo del documento y la version aceptada", () => {
    const texto = resumenAceptaciones([
      { tipo: "TERMINOS", version: "1.0" },
      { tipo: "PRIVACIDAD", version: "1.0" },
    ]);
    assert.ok(texto.includes("Términos y condiciones"), texto);
    assert.ok(texto.includes("Aviso de privacidad"), texto);
    assert.ok(texto.includes("1.0"), texto);
  });

  it("no inventa un documento que no se acepto", () => {
    const texto = resumenAceptaciones([{ tipo: "TERMINOS", version: "1.0" }]);
    assert.ok(!texto.toLowerCase().includes("privacidad"), texto);
  });

  it("dice que no hay registro en vez de devolver texto vacio", () => {
    // Una celda vacia en un panel parece un fallo de carga. "Ninguna" es un dato.
    const texto = resumenAceptaciones([]);
    assert.equal(texto, "Ninguna");
  });

  it("conserva el orden en que se aceptaron", () => {
    const texto = resumenAceptaciones([
      { tipo: "PRIVACIDAD", version: "1.0" },
      { tipo: "TERMINOS", version: "1.0" },
    ]);
    // En minuscula: los titulos empiezan en mayuscula y comparar con la palabra
    // en minuscula daria -1 y el test pasaria por el motivo equivocado.
    const plano = texto.toLowerCase();
    assert.ok(
      plano.indexOf("privacidad") < plano.indexOf("términos"),
      `el orden no se respeta: ${texto}`,
    );
  });

  it("usa el titulo real del registro de documentos", () => {
    // Si `DOCUMENTO_POR_TIPO` cambia de slug, el mapa de titulos de aqui puede
    // quedarse viejo. Este test ata los dos: los tipos tienen que ser los mismos.
    assert.deepEqual(Object.keys(TITULO_POR_TIPO).sort(), Object.keys(DOCUMENTO_POR_TIPO).sort());
  });
});

describe("ETIQUETA_ESTADO", () => {
  it("cubre los cinco estados del enum, ni uno mas", () => {
    assert.deepEqual(Object.keys(ETIQUETA_ESTADO).sort(), [
      "ACCEPTED",
      "CANCELLED",
      "PENDING",
      "QUOTED",
      "REJECTED",
    ]);
  });

  it("los estados terminales no suenan a 'todavia esta en curso'", () => {
    for (const estado of ["ACCEPTED", "REJECTED", "CANCELLED"] as const) {
      const etiqueta = ETIQUETA_ESTADO[estado];
      assert.ok(etiqueta.length > 0, `${estado} sin etiqueta`);
      assert.ok(
        !etiqueta.toLowerCase().includes("pendiente"),
        `${estado} no debe decir pendiente`,
      );
    }
  });
});

describe("textoAvisoBorrado", () => {
  it("avisa de que tambien borra el registro de aceptacion", () => {
    // Es la parte que RF-24 exige y la que un administrador no puede deducir:
    // sin este aviso, "borrar" suena a borrar un formulario de contacto.
    const texto = textoAvisoBorrado(7).toLowerCase();
    assert.ok(texto.includes("7"), texto);
    assert.ok(texto.includes("aceptaci"), texto);
    assert.ok(texto.includes("partidas"), texto);
    assert.ok(texto.includes("borr"), texto);
  });

  it("no dice 'borrar' sin mas: dice que no se puede deshacer", () => {
    const texto = textoAvisoBorrado(7).toLowerCase();
    assert.ok(texto.includes("no se puede deshacer"), texto);
  });
});


describe("aviso de vencida (RF-22)", () => {
  // RF-22 dice que el sistema "avisa" y no borra sola. Avisar sin decir *cual*
  // es avisar a medias: el administrador ve un numero y tiene que deducir de
  // memoria que filas son. `marcarParaRevision()` ya calcula la lista exacta.
  it("dice cuantos meses lleva y que hay que revisarla", () => {
    const texto = textoAvisoVencida(14);
    assert.match(texto, /14/);
    assert.match(texto.toLowerCase(), /revis/);
  });

  it("no dice 'vencida' como si el sistema la hubiera borrado", () => {
    // El aviso tiene que dejar claro que la decision es de una persona. Un
    // "solicitud vencida" a secas se lee como "ya no existe".
    const texto = textoAvisoVencida(14).toLowerCase();
    assert.ok(!texto.includes("borrada"), texto);
    assert.ok(!texto.includes("eliminada"), texto);
  });

  it("usa el singular con un mes", () => {
    assert.match(textoAvisoVencida(1), /1 mes\b/);
  });
});

describe("indiceVencidas", () => {
  it("con lista vacia no marca ninguna fila", () => {
    const indice = indiceVencidas([]);
    assert.equal(idVencida(indice, 1), undefined);
    assert.equal(indice.size, 0);
  });

  it("devuelve la entrada de la fila que esta vencida", () => {
    const indice = indiceVencidas([
      { id: 7, status: "ACCEPTED", meses: 14, creadaEl: "2025-08-01T00:00:00.000Z" },
    ]);
    const marcada = idVencida(indice, 7);
    assert.ok(marcada !== undefined);
    assert.equal(marcada.meses, 14);
    assert.equal(idVencida(indice, 8), undefined);
  });

  it("aguanta ids repetidos sin romperse", () => {
    // No deberia pasar, pero un indice que se construye con un reduce y falla en
    // silencio ante un duplicado es peor que uno que sencillamente lo ignora.
    const indice = indiceVencidas([
      { id: 7, status: "ACCEPTED", meses: 14, creadaEl: "2025-08-01T00:00:00.000Z" },
      { id: 7, status: "CANCELLED", meses: 20, creadaEl: "2024-08-01T00:00:00.000Z" },
    ]);
    assert.equal(indice.size, 1);
    assert.equal(idVencida(indice, 7)?.meses, 14);
  });

  it("el filtro deja solo las vencidas y no toca el original", () => {
    const indice = indiceVencidas([
      { id: 7, status: "ACCEPTED", meses: 14, creadaEl: "2025-08-01T00:00:00.000Z" },
    ]);
    const lista = [
      { id: 7, name: "A" },
      { id: 8, name: "B" },
    ];
    const filtrada = filtrarSoloVencidas(lista, indice, true);
    assert.deepEqual(filtrada.map((f) => f.id), [7]);
    assert.equal(lista.length, 2, "el array original no se toca");
  });

  it("con el filtro apagado devuelve la lista entera, tambien vacia de indices", () => {
    const lista = [{ id: 7, name: "A" }, { id: 8, name: "B" }];
    assert.deepEqual(filtrarSoloVencidas(lista, indiceVencidas([]), false), lista);
  });
});