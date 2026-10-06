import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ESTADOS_TERMINALES,
  MESES_RETENCION,
  contarAntiguas,
  esVencida,
  marcarParaRevision,
  mesesTranscurridos,
} from "../src/lib/retention";

/**
 * Fecha de referencia de las pruebas. **Nunca** se usa `new Date()`: un modulo
 * que lee el reloj no se puede probar de forma reproducible.
 */
const HOY = new Date("2026-10-06T12:00:00.000Z");

/** Una solicitud de hace `meses` meses exactos, en el estado indicado. */
function solicitud(id: number, status: string, meses: number) {
  const creada = new Date(HOY);
  creada.setUTCMonth(creada.getUTCMonth() - meses);
  return { id, status, createdAt: creada };
}

describe("El plazo viene de una constante (D15)", () => {
  it("son 12 meses, no un numero escrito en la logica", () => {
    assert.equal(MESES_RETENCION, 12);
  });

  it("los estados terminales son ACCEPTED, REJECTED y CANCELLED (RF-26)", () => {
    assert.deepEqual(
      [...ESTADOS_TERMINALES].sort(),
      ["ACCEPTED", "CANCELLED", "REJECTED"],
    );
  });
});

describe("esVencida", () => {
  it("una solicitud de 13 meses en PENDING no se marca (RF-23)", () => {
    assert.equal(esVencida(solicitud(1, "PENDING", 13), HOY), false);
  });

  it("la misma de 13 meses en ACCEPTED si se marca (RF-22)", () => {
    assert.equal(esVencida(solicitud(1, "ACCEPTED", 13), HOY), true);
  });

  it("QUOTED, que no es terminal, tampoco se marca aunque sea viejisima (RF-23)", () => {
    assert.equal(esVencida(solicitud(1, "QUOTED", 13), HOY), false);
    assert.equal(esVencida(solicitud(1, "QUOTED", 60), HOY), false);
  });

  it("REJECTED y CANCELLED si se marcan", () => {
    assert.equal(esVencida(solicitud(1, "REJECTED", 13), HOY), true);
    assert.equal(esVencida(solicitud(1, "CANCELLED", 13), HOY), true);
  });

  it("con plazo 0 no se marca ninguna (el borde de la spec)", () => {
    assert.equal(esVencida(solicitud(1, "ACCEPTED", 60), HOY, 0), false);
  });

  it("exactamente 12 meses si se marca (borde)", () => {
    assert.equal(esVencida(solicitud(1, "ACCEPTED", 12), HOY), true);
  });

  it("11 meses y pico no se marca", () => {
    assert.equal(esVencida(solicitud(1, "ACCEPTED", 11), HOY), false);
  });

  it("un plazo mayor se respeta tal cual", () => {
    assert.equal(esVencida(solicitud(1, "ACCEPTED", 13), HOY, 24), false);
    assert.equal(esVencida(solicitud(1, "ACCEPTED", 25), HOY, 24), true);
  });

  it("con un plazo negativo tampoco se marca, en vez de dar la vuelta", () => {
    assert.equal(esVencida(solicitud(1, "ACCEPTED", 60), HOY, -3), false);
  });

  it("un estado desconocido no se marca: no esta en la lista de terminales", () => {
    assert.equal(esVencida(solicitud(1, "LO_QUE_SEA", 99), HOY), false);
    assert.equal(esVencida(solicitud(1, "", 99), HOY), false);
  });

  it("el estado distingue mayusculas, como el enum de Prisma", () => {
    assert.equal(esVencida(solicitud(1, "accepted", 13), HOY), false);
  });
});

describe("mesesTranscurridos", () => {
  it("cuenta meses completos, no dias partidos", () => {
    assert.equal(mesesTranscurridos(solicitud(1, "PENDING", 0).createdAt, HOY), 0);
    assert.equal(mesesTranscurridos(solicitud(1, "PENDING", 1).createdAt, HOY), 1);
    assert.equal(mesesTranscurridos(solicitud(1, "PENDING", 12).createdAt, HOY), 12);
    assert.equal(mesesTranscurridos(solicitud(1, "PENDING", 25).createdAt, HOY), 25);
  });

  it("un dia shy del mes completo cuenta un mes menos", () => {
    const casi = new Date("2026-09-07T12:00:00.000Z");

    assert.equal(mesesTranscurridos(casi, HOY), 0);
  });

  it("no cuenta meses negativos con una solicitud del futuro", () => {
    const futura = new Date("2027-01-01T00:00:00.000Z");

    assert.equal(mesesTranscurridos(futura, HOY), 0);
  });
});

describe("marcarParaRevision", () => {
  it("devuelve solo las vencidas, con su id, estado, meses y fecha de creacion", () => {
    const lista = [
      solicitud(1, "ACCEPTED", 13),
      solicitud(2, "PENDING", 30),
      solicitud(3, "REJECTED", 12),
      solicitud(4, "CANCELLED", 5),
    ];

    const marcadas = marcarParaRevision(lista, HOY);

    assert.deepEqual(
      marcadas.map((m) => m.id),
      [1, 3],
    );
    assert.equal(marcadas[0]?.status, "ACCEPTED");
    assert.equal(marcadas[0]?.meses, 13);
    assert.equal(
      marcadas[0]?.creadaEl,
      solicitud(1, "ACCEPTED", 13).createdAt.toISOString(),
    );
  });

  it("con una lista vacia no hay nada que marcar", () => {
    assert.deepEqual(marcarParaRevision([], HOY), []);
  });

  it("respeta un plazo distinto al de la constante", () => {
    const lista = [solicitud(1, "ACCEPTED", 20)];

    assert.deepEqual(marcarParaRevision(lista, HOY, 24), []);
    assert.equal(marcarParaRevision(lista, HOY, 18).length, 1);
  });

  it("no muta la lista que recibe", () => {
    const lista = [solicitud(1, "ACCEPTED", 13)];
    const copia = structuredClone(lista);

    marcarParaRevision(lista, HOY);

    assert.deepEqual(lista, copia);
  });
});

describe("contarAntiguas (RF-24)", () => {
  it("cuenta bien en una lista mezclada", () => {
    const lista = [
      solicitud(1, "PENDING", 40),
      solicitud(2, "ACCEPTED", 13),
      solicitud(3, "QUOTED", 26),
      solicitud(4, "REJECTED", 12),
      solicitud(5, "CANCELLED", 3),
      solicitud(6, "ACCEPTED", 11),
    ];

    assert.equal(contarAntiguas(lista, HOY), 2);
  });

  it("con la lista vacia cuenta cero", () => {
    assert.equal(contarAntiguas([], HOY), 0);
  });

  it("cuenta lo mismo que marcarParaRevision", () => {
    const lista = [
      solicitud(1, "ACCEPTED", 13),
      solicitud(2, "PENDING", 13),
      solicitud(3, "CANCELLED", 14),
    ];

    assert.equal(
      contarAntiguas(lista, HOY),
      marcarParaRevision(lista, HOY).length,
    );
  });

  it("con plazo 0 cuenta cero", () => {
    assert.equal(contarAntiguas([solicitud(1, "ACCEPTED", 99)], HOY, 0), 0);
  });
});