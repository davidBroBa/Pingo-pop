import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSessionPayload,
  signSession,
  verifySession,
  type SessionPayload,
} from "../src/lib/auth/session-token";

/**
 * El secreto se fija antes de firmar: `getSecret` lo lee del entorno en el
 * momento de firmar, asi que basta con asignarlo al arrancar el fichero.
 */
process.env.SESSION_SECRET = "secreto-de-prueba-de-32-caracteres-minimo!!";

/** Token de administrador valido, reutilizado por varias pruebas. */
async function adminToken(): Promise<string> {
  return signSession(buildSessionPayload(1, "ADMIN", 0, 0));
}

describe("firma de sesion", () => {
  it("acepta un token recien firmado", async () => {
    const session = await verifySession(await adminToken());
    // `assert.ok` estrecha el tipo: sin esto TypeScript no sabe que `session`
    // deja de ser `null` despues de la comprobacion.
    assert.ok(session !== null, "el token recien firmado deberia validar");
    assert.equal(session.userId, 1);
    assert.equal(session.role, "ADMIN");
  });

  it("rechaza un token sin cookie", async () => {
    assert.equal(await verifySession(undefined), null);
  });

  it("rechaza un token vacio", async () => {
    assert.equal(await verifySession(""), null);
  });

  it("rechaza un token al que le sobra un punto", async () => {
    const token = await adminToken();
    assert.equal(await verifySession(`${token}.extra`), null);
  });

  it("rechaza un token manipulado en el payload", async () => {
    // Falsifica el base64url del payload para escalarse a ADMIN y reutiliza la
    // firma de un token legitimo. Es exactamente el ataque que el HMAC evita:
    // la firma ya no encaja con el cuerpo, asi que debe rechazarse.
    const forged = Buffer.from(
      JSON.stringify({
        userId: 1,
        role: "ADMIN",
        iat: 0,
        exp: Date.now() + 60_000,
      }),
    ).toString("base64url");
    const original = await adminToken();
    const signature = original.slice(original.lastIndexOf(".") + 1);
    assert.equal(await verifySession(`${forged}.${signature}`), null);
  });

  it("rechaza un token con la firma recortada", async () => {
    const token = await adminToken();
    const body = token.slice(0, token.lastIndexOf("."));
    assert.equal(await verifySession(`${body}.AAAA`), null);
  });

  it("rechaza un token con caracteres no base64 en la firma", async () => {
    // Una cookie corrupta debe producir un 401 limpio. Si `atob` lanzase, el
    // error sube hasta el middleware en lugar de convertirse en "sin sesion".
    const token = await adminToken();
    const body = token.slice(0, token.lastIndexOf("."));
    assert.equal(await verifySession(`${body}.no-es-base64$$`), null);
  });

  it("rechaza un token generado con otro secreto", async () => {
    const original = process.env.SESSION_SECRET;
    const token = await adminToken();
    process.env.SESSION_SECRET = "otro-secreto-distinto-de-32-caracteres!!";
    try {
      assert.equal(await verifySession(token), null);
    } finally {
      process.env.SESSION_SECRET = original;
    }
  });

  it("rechaza un token expirado", async () => {
    const expired = await signSession({
      userId: 7,
      role: "BUYER",
      sv: 0,
      swc: 0,
      iat: Date.now() - 10_000,
      exp: Date.now() - 1,
    });
    assert.equal(await verifySession(expired), null);
  });

  it("rechaza un payload cuyo rol no es valido", async () => {
    // Se firma de verdad, pero con un rol inventado: la firma es correcta y aun
    // asi tiene que rechazarse, porque el rol forma parte del contrato.
    const bogus = await signSession({
      userId: 1,
      role: "ROOT" as "BUYER",
      sv: 0,
      swc: 0,
      iat: Date.now(),
      exp: Date.now() + 60_000,
    });
    assert.equal(await verifySession(bogus), null);
  });

  it("rechaza un payload con userId no entero", async () => {
    const forged = await signSession({
      userId: 1.5,
      role: "ADMIN",
      sv: 0,
      swc: 0,
      iat: Date.now(),
      exp: Date.now() + 60_000,
    });
    assert.equal(await verifySession(forged), null);
  });

  it("falla en lugar de firmar cuando falta SESSION_SECRET", async () => {
    const original = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    try {
      await assert.rejects(() =>
        signSession(buildSessionPayload(1, "ADMIN", 0, 0)),
      );
    } finally {
      process.env.SESSION_SECRET = original;
    }
  });

  it("falla cuando SESSION_SECRET es demasiado corto", async () => {
    const original = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "corto";
    try {
      await assert.rejects(() =>
        signSession(buildSessionPayload(1, "ADMIN", 0, 0)),
      );
    } finally {
      process.env.SESSION_SECRET = original;
    }
  });

  it("devuelve null, y no lanza, cuando SESSION_SECRET falta al verificar", async () => {
    // El camino de verificacion se ejecuta en el middleware. Si launchara la
    // excepcion, una cookie de sesion con el secreto caido tumbaria el panel
    // entero con un 500 en vez de redirigir a /login.
    const original = process.env.SESSION_SECRET;
    const token = await adminToken();
    delete process.env.SESSION_SECRET;
    try {
      assert.equal(await verifySession(token), null);
    } finally {
      process.env.SESSION_SECRET = original;
    }
  });
});

/**
 * `sv` (spec 006) es lo que permite revocar sesiones al cambiar la contrasena.
 * Se anade en un bloque aparte para no mezclarlo con los casos de firma.
 */
describe("version de sesion (sv)", () => {
  it("viaja en el payload tal cual se le pasa", async () => {
    const token = await signSession(buildSessionPayload(3, "BUYER", 4, 0));
    const session = await verifySession(token);
    assert.ok(session !== null);
    assert.equal(session.sv, 4);
  });

  it("una cookie emitida sin `sv` se valida como version 0", async () => {
    // Caso del despliegue: las cookies anteriores a la columna no deben expulsar a
    // nadie. Se firma un payload sin el campo a proposito.
    const token = await signSession({
      userId: 3,
      role: "BUYER",
      iat: Date.now(),
      exp: Date.now() + 60_000,
    } as unknown as Parameters<typeof signSession>[0]);

    const session = await verifySession(token);
    assert.ok(session !== null);
    assert.equal(session.sv, 0);
  });

  it("rechaza un `sv` que no es entero", async () => {
    const token = await signSession({
      userId: 3,
      role: "BUYER",
      sv: 1.5,
      iat: Date.now(),
      exp: Date.now() + 60_000,
    } as unknown as Parameters<typeof signSession>[0]);
    assert.equal(await verifySession(token), null);
  });

  it("rechaza un `sv` negativo", async () => {
    const token = await signSession({
      userId: 3,
      role: "BUYER",
      sv: -1,
      iat: Date.now(),
      exp: Date.now() + 60_000,
    } as unknown as Parameters<typeof signSession>[0]);
    assert.equal(await verifySession(token), null);
  });

  it("rechaza un `sv` que es texto", async () => {
    const token = await signSession({
      userId: 3,
      role: "BUYER",
      sv: "dos",
      iat: Date.now(),
      exp: Date.now() + 60_000,
    } as unknown as Parameters<typeof signSession>[0]);
    assert.equal(await verifySession(token), null);
  });
});

/**
 * `swc` — "session wants change" (spec 007, D21/D24).
 *
 * El distintivo de que la cuenta **todavia no ha cambiado** la contraseña temporal
 * que le puso un administrador. Viaja **dentro del token firmado**, y por eso el
 * `proxy` puede fiarse de el sin consultar la base de datos: si alguien edita el
 * valor a mano, la firma ya no cuadra.
 *
 * El token va firmado porque el `proxy` corre en **Edge**: no tiene Prisma y no
 * puede preguntar al usuario si la contraseña sigue siendo temporal. La cookie le
 * da la decision rapida; `getSessionUser()` relee la base de datos y manda.
 */
describe("swc: la sesion con contrasena temporal", () => {
  /**
   * Firma un payload **sin** `swc`, imitando una cookie emitida antes de que
   * existiera el campo.
   *
   * El `as` es deliberado y es **el punto**: `SessionPayload.swc` es obligatorio,
   * asi que la unica forma de construir un payload sin el es mentirle al
   * compilador. Y mentirle es exactamente lo que hacia un despliegue: firmaba
   * cookies sin `swc` sin saberlo. Si aqui el campo fuera opcional, el
   * compilador no quejaria y este test no tendria nada que comprobar.
   */
  async function tokenSinSwc(): Promise<string> {
    const sinSwc = {
      userId: 1,
      role: "ADMIN",
      sv: 0,
      iat: Date.now(),
      exp: Date.now() + 60_000,
    };
    return signSession(sinSwc as SessionPayload);
  }

  it("buildSessionPayload firma el distintivo", async () => {
    const token = await signSession(buildSessionPayload(1, "ADMIN", 0, 1));
    const session = await verifySession(token);
    assert.ok(session !== null);
    assert.equal(session.swc, 1);
  });

  it("una sesion normal lleva swc 0", async () => {
    const token = await signSession(buildSessionPayload(1, "ADMIN", 0, 0));
    const session = await verifySession(token);
    assert.ok(session !== null);
    assert.equal(session.swc, 0);
  });

  it("swc AUSENTE se verifica como 0, y no se rechaza", async () => {
    // El caso del despliegue: hay cookies vivas firmadas antes de que existiera
    // este campo. Si se rechazaran, el despliegue cerraria el panel a todo el
    // mundo de golpe. Es el mismo motivo por el que `sv` ausente vale 0, y esta
    // asercion es la que protege esa decision.
    const session = await verifySession(await tokenSinSwc());
    assert.ok(session !== null, "un token sin swc debe seguir siendo valido");
    assert.equal(session.swc, 0);
  });

  it("un swc negativo o no entero se rechaza, igual que sv", async () => {
    // Si el `proxy` trata el valor como booleano, un -1 o un 1.5 que se colaran
    // darian un comportamiento raro. Se validan en el mismo sitio que `sv`, y
    // `verifySession` devuelve `null` en vez de lanzar: ese es su contrato.
    for (const malo of [-1, 1.5]) {
      const token = await signSession({
        userId: 1,
        role: "ADMIN",
        sv: 0,
        swc: malo,
        iat: Date.now(),
        exp: Date.now() + 60_000,
      });
      assert.equal(
        await verifySession(token),
        null,
        `un swc de ${malo} deberia rechazarse`,
      );
    }
  });

  it("un swc editado a mano NO verifica: el token va firmado", async () => {
    // Si esto pasara, cualquiera podria quitarse el limite de la sesion
    // reescribiendo su propia cookie. El HMAC es lo que hace que el `proxy` pueda
    // creerlo sin base de datos.
    const token = await signSession(buildSessionPayload(1, "ADMIN", 0, 1));
    const partes = token.split(".");
    const payload = JSON.parse(
      Buffer.from(partes[0] as string, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    payload.swc = 0;

    const falsificado = `${Buffer.from(JSON.stringify(payload), "utf8").toString(
      "base64url",
    )}.${partes[1] as string}`;

    assert.equal(
      await verifySession(falsificado),
      null,
      "una cookie con la firma old y el payload cambiado no debe validar",
    );
  });
});