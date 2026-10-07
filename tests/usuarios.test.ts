import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Role } from "../src/generated/prisma/client";
import {
  ACCIONES_USUARIO as ACCIONES_PANEL,
  ROLES as ROLES_PANEL,
  textoConfirmacion,
} from "../src/lib/usuarios-panel";
import {
  CambioUsuarioSchema,
  EmailSchema,
  NuevoUsuarioSchema,
  normalizarEmail,
} from "../src/lib/usuarios";

/**
 * Logica pura de la gestion de cuentas (spec 007).
 *
 * El runner es `node:test` **sin jsdom**, asi que lo comprobable vive en este
 * modulo y el panel solo lo pinta. Por eso aqui se comprueban las tres cosas que
 * importan de verdad: que el correo **es** la identidad, que la contraseña se
 * valida **con el rol que llega**, y que las acciones del panel son una lista
 * **cerrada**.
 */

describe("normalizarEmail", () => {
  it("baja a minusculas y recorta", () => {
    assert.equal(normalizarEmail("  ANA@Pingo-Pop.Local  "), "ana@pingo-pop.local");
  });

  it("dos escrituras distintas del mismo correo son la misma cuenta", () => {
    // El correo es la identidad y es `@unique` en el esquema. Si "Ana@x.com" y
    // "ana@x.com" llegaran sin normalizar, la segunda creacion soltaria un 409
    // inexplicable, o peor, crearia dos cuentas de la misma persona.
    assert.equal(
      normalizarEmail("Ana@Pingo-Pop.Local"),
      normalizarEmail("ana@pingo-pop.local"),
    );
  });

  it("no toca un correo ya normalizado", () => {
    assert.equal(normalizarEmail("ana@pingo-pop.local"), "ana@pingo-pop.local");
  });
});

describe("EmailSchema", () => {
  it("acepta un correo normalizado", () => {
    assert.equal(EmailSchema.safeParse("ana@pingo-pop.local").success, true);
  });

  it("rechaza un correo mal formado", () => {
    for (const malo of ["ana", "ana@", "@x.com", "ana@x", "ana x@y.com"]) {
      assert.equal(
        EmailSchema.safeParse(malo).success,
        false,
        `deberia rechazar: ${malo}`,
      );
    }
  });

  it("no acepta cadena vacia: aqui el correo es obligatorio", () => {
    // A diferencia de los datos legales, un usuario **necesita** correo: es su
    // identidad y es la columna unica. Una cuenta sin correo no existe.
    assert.equal(EmailSchema.safeParse("").success, false);
    assert.equal(EmailSchema.safeParse("   ").success, false);
  });
});

describe("NuevoUsuarioSchema", () => {
  const base = {
    email: "nuevo@pingo-pop.local",
    rol: "BUYER" as const,
    contrasena: "Clave-de-prueba-1",
  };

  it("acepta un BUYER con contrasena de 8 o mas", () => {
    const r = NuevoUsuarioSchema.safeParse({ ...base, contrasena: "ochochars" });
    assert.equal(r.success, true, r.success ? "" : JSON.stringify(r.error.issues));
  });

  it("NO acepta un ADMIN con una contrasena de solo 8 caracteres", () => {
    // Es el suelo de la spec 006, y crear una cuenta no lo baja. Si aqui se
    // aceptara, se podrian crear administradores con una contrasena mas corta
    // que la que el propio perfil exige.
    const r = NuevoUsuarioSchema.safeParse({
      ...base,
      rol: "ADMIN",
      contrasena: "ochochars",
    });
    assert.equal(r.success, false, "un ADMIN con 8 caracteres no deberia pasar");
  });

  it("acepta un ADMIN con 12, mayuscula, minuscula, digito y puntuacion", () => {
    const r = NuevoUsuarioSchema.safeParse({
      ...base,
      rol: "ADMIN",
      contrasena: "Clave-de-prueba-1",
    });
    assert.equal(r.success, true, r.success ? "" : JSON.stringify(r.error.issues));
  });

  it("la contrasena se valida CON EL ROL QUE LLEGA, no con uno fijo", () => {
    // Si el esquema validara siempre contra BUYER, un ADMIN podria nacer con 8
    // caracteres. Y si validara siempre contra ADMIN, un BUYER no podria crear su
    // cuenta con la politica que le corresponde.
    const conAdmin = NuevoUsuarioSchema.safeParse({
      ...base,
      rol: "ADMIN",
      contrasena: "ochochars",
    });
    const conBuyer = NuevoUsuarioSchema.safeParse({
      ...base,
      rol: "BUYER",
      contrasena: "ochochars",
    });
    assert.equal(conAdmin.success, false);
    assert.equal(conBuyer.success, true);
  });

  it("rechaza un rol que no existe", () => {
    const r = NuevoUsuarioSchema.safeParse({ ...base, rol: "SUPERADMIN" });
    assert.equal(r.success, false);
  });

  it("el nombre es opcional, pero si viene no puede ser basura", () => {
    assert.equal(NuevoUsuarioSchema.safeParse(base).success, true);
    const conCorta = NuevoUsuarioSchema.safeParse({ ...base, nombre: "A" });
    assert.equal(conCorta.success, false);
    const conLarga = NuevoUsuarioSchema.safeParse({
      ...base,
      nombre: "x".repeat(121),
    });
    assert.equal(conLarga.success, false);
  });
});

describe("CambioUsuarioSchema", () => {
  it("acepta las cuatro acciones con los datos que cada una exige", () => {
    // Cada acción necesita su propio dato: `cambiar_rol` el rol y
    // `restablecer_contrasena` la contraseña. Un bucle que las probara todas con
    // `{ id, accion }` a secas se contradiría con los dos tests siguientes, que
    // comprueban justo que sin ese dato **no** pasan.
    const completas: Record<string, unknown> = {
      cambiar_rol: { id: 1, accion: "cambiar_rol", rol: "ADMIN" },
      desactivar: { id: 1, accion: "desactivar" },
      reactivar: { id: 1, accion: "reactivar" },
      restablecer_contrasena: {
        id: 1,
        accion: "restablecer_contrasena",
        contrasena: "Clave-de-prueba-1",
      },
    };

    for (const accion of Object.keys(completas)) {
      const r = CambioUsuarioSchema.safeParse(completas[accion]);
      assert.equal(r.success, true, `deberia aceptar ${accion}`);
    }
  });

  it("rechaza una accion que no esta en la lista", () => {
    // Una union cerrada, no un string libre. Un `PATCH { accion: "inventada" }`
    // tiene que ser un 400, no un switch que cae en un default silencioso y dice
    // "hecho" sin haber hecho nada.
    const r = CambioUsuarioSchema.safeParse({ id: 1, accion: "borrar" });
    assert.equal(r.success, false, "una accion fuera de la lista no debe pasar");
  });

  it("restablecer_contrasena exige la contrasena nueva", () => {
    const sinContrasena = CambioUsuarioSchema.safeParse({
      id: 1,
      accion: "restablecer_contrasena",
    });
    assert.equal(sinContrasena.success, false);

    const conContrasena = CambioUsuarioSchema.safeParse({
      id: 1,
      accion: "restablecer_contrasena",
      contrasena: "Clave-de-prueba-1",
    });
    assert.equal(conContrasena.success, true);
  });

  it("cambiar_rol exige el rol nuevo", () => {
    const sinRol = CambioUsuarioSchema.safeParse({ id: 1, accion: "cambiar_rol" });
    assert.equal(sinRol.success, false);

    const conRol = CambioUsuarioSchema.safeParse({
      id: 1,
      accion: "cambiar_rol",
      rol: "ADMIN",
    });
    assert.equal(conRol.success, true);
  });

  it("exige un id entero positivo", () => {
    for (const id of [0, -1, 1.5, "abc", undefined]) {
      const r = CambioUsuarioSchema.safeParse({ id, accion: "desactivar" });
      assert.equal(r.success, false, `id invalido deberia fallar: ${String(id)}`);
    }
  });
});

describe("textoConfirmacion", () => {
  it("desactivar avisa de que corta el acceso y de que no se puede deshacer", () => {
    const texto = textoConfirmacion("desactivar", "ana@pingo-pop.local");
    assert.ok(texto.includes("ana@pingo-pop.local"), texto);
    assert.match(texto.toLowerCase(), /sesion|acceso/);
    assert.match(texto.toLowerCase(), /no se puede deshacer|deshacer/);
  });

  it("restablecer_contrasena dice que vuelve a exigir el cambio", () => {
    // Es lo que distingue restablecer de cambiar: quien restablece **sabe** que
    // la cuenta queda otra vez con contraseña temporal.
    const texto = textoConfirmacion(
      "restablecer_contrasena",
      "ana@pingo-pop.local",
    ).toLowerCase();
    assert.match(texto, /volver|otra vez|temporal/);
  });

  it("reactivar no promete nada que no haga", () => {
    const texto = textoConfirmacion("reactivar", "ana@pingo-pop.local").toLowerCase();
    assert.ok(
      !texto.includes("no se puede deshacer"),
      "reactivar si se puede revertir, asi que no debe decirlo",
    );
  });
});

/**
 * La lista de roles del panel **esta escrita a mano**, y este es el test que la
 * ata al enum de Prisma.
 *
 * ## Por que esta duplicacion
 *
 * `UsuariosView` es un Client Component, y `usuarios.ts` importa el cliente generado
 * de Prisma para leer `Object.values(Role)`. Ese cliente pide `node:module`, y Turbopack
 * **no puede trocearlo para el navegador**: la pagina reventaba con un panic de
 * chunking alCompilar `/admin/usuarios`.
 *
 * Asi que el panel lee su lista de aqui, que no importa nada. Y para que la lista no
 * se quede viejo si mañana se anade un rol al esquema, este test compara las dos: si
 * divergen, se pone rojo. Es el mismo trato que `tests/cotizaciones-panel.test.ts`
 * hace con los titulos de los documentos legales, y por el mismo motivo.
 */
describe("la lista de roles del panel no se desincroniza del esquema", () => {
  it("coincide con el enum de Prisma, en el mismo orden", () => {
    assert.deepEqual(
      [...ROLES_PANEL],
      Object.values(Role),
      "si anades un rol al esquema, anadelo tambien a ROLES en usuarios-panel.ts",
    );
  });

  it("los dos roles del enum estan, y solo esos", () => {
    assert.ok(ROLES_PANEL.includes("BUYER"));
    assert.ok(ROLES_PANEL.includes("ADMIN"));
    assert.equal(ROLES_PANEL.length, 2);
  });

  it("las acciones del panel son las mismas que acepta el esquema", async () => {
    // El enum de `CambioUsuarioSchema` y `ACCIONES_USUARIO` no pueden separarse: si
    // el panel ofreciera una accion que el esquema rechaza, el boton daria un 400 sin
    // explicacion. Se comprueba que las cuatro pasan por el esquema.
    for (const accion of ACCIONES_PANEL) {
      const cuerpo =
        accion === "cambiar_rol"
          ? { id: 1, accion, rol: "ADMIN" }
          : accion === "restablecer_contrasena"
            ? { id: 1, accion, contrasena: "Clave-de-prueba-1" }
            : { id: 1, accion };
      const r = await import("../src/lib/usuarios").then((m) =>
        m.CambioUsuarioSchema.safeParse(cuerpo),
      );
      assert.equal(r.success, true, `el esquema deberia aceptar ${accion}`);
    }
  });
});