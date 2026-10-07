"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ETIQUETA_ROL,
  ROLES,
  textoConfirmacion,
  type AccionUsuario,
} from "@/lib/usuarios-panel";

/**
 * Panel de cuentas (spec 007, T10).
 *
 * ## Por que este componente carga los datos y las otras paginas no
 *
 * Mismo motivo que `/admin/cotizaciones`, y por eso se repite aqui en vez de
 * inventar un patron nuevo: la pagina **no** puede leer Prisma por su cuenta, porque
 * lo unico que comprueba la revocacion de una sesion es `requireAdmin()`, que usa
 * `getSessionUser()`. Si esta pantalla leyera las cuentas desde el servidor, bastaria
 * una cookie firmada de una sesion que el administrador ya habia invalidado cambiando
 * su contrasena para verlas todas. El `proxy` no lo evita: corre en Edge y no tiene
 * Prisma.
 *
 * Asi que la lectura pasa por `GET /api/admin/usuarios`, que ya esta verificada con
 * sus 401 y 403. Y tras cada cambio **repinta**, que con los datos en props habria que
 * mantener dos copias de la lista.
 *
 * ## Lo que este panel **no** puede hacer
 *
 * **No borra cuentas.** No hay boton de borrar y no hay `DELETE` en la API (RF-11).
 * Quitar el acceso es **desactivar**, que se puede revertir. Si en algun momento hace
 * falta un borrado de verdad, hay que decidir antes que se hace con las cotizaciones y
 * los aceptos de esos usuarios, porque `User` **no tiene ninguna relacion** en el
 * esquema y un `delete` dejaria datos huerfanos sin avisar.
 */

/** Una cuenta del listado, tal y como la devuelve `GET /api/admin/usuarios`. */
type Usuario = {
  id: number;
  email: string;
  name: string | null;
  role: "BUYER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
  activo: boolean;
  debeCambiarContrasena: boolean;
};

/**
 * `ETIQUETA_ROL` viene de `usuarios-panel.ts`, no de aqui: es el mismo texto que ve
 * el usuario en el alta y en la fila, y dos copias es como se desincroniza uno.
 *
 * Este componente importa **exclusivamente** de `usuarios-panel.ts`. Nunca de
 * `usuarios.ts`, que arrastra el cliente de Prisma y `node:module`: un Client
 * Component que lo importe hace que Turbopack no pueda trocear la pagina y revienta
 * con un panic. Ver la cabecera de `usuarios-panel.ts`.
 */

/**
 * Error de la API, o el que toque si la respuesta no lo trae.
 *
 * La misma funcion que tienen `CotizacionesView` y `AdminProductsView`, con su
 * propio texto por defecto. Sigue siendo una copia y no un helper compartido: tres
 * usos no justifican un modulo, y cada panel tiene su cuenta de estados.
 */
function leerError(payload: unknown, porDefecto: string): string {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const value = (payload as { error: unknown }).error;
    if (typeof value === "string" && value.length > 0) return value;
  }
  return porDefecto;
}

/** Fecha corta, en el formato que ya usan los demas paneles. */
function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function UsuariosView() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  /** Campos del formulario de alta. */
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<Usuario["role"]>("BUYER");
  const [contrasena, setContrasena] = useState("");
  /** Id de la cuenta cuyo formulario de restablecimiento esta abierto, o `null`. */
  const [restableciendo, setRestableciendo] = useState<number | null>(null);
  const [nuevaContrasena, setNuevaContrasena] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const response = await fetch("/api/admin/usuarios");
      const data = (await response.json()) as { usuarios?: Usuario[] } & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(leerError(data, "No se pudieron cargar las cuentas."));
      }
      setUsuarios(data.usuarios ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las cuentas.");
    } finally {
      setCargando(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- esta regla busca estado
     DERIVADO de props u otro estado, que se resuelve en el render. Aqui el estado
     viene de una peticion HTTP cuya respuesta depende de una comprobacion de
     revocacion de sesion que solo se puede hacer en el servidor **con base de
     datos** (`requireAdmin()` -> `getSessionUser()`). No hay forma de derivarlo
     durante el render. Y la alternativa "que la pagina lo pase por props", que es lo
     que hace `AdminProductsView`, es justo lo que aqui no se puede: una pagina que
     consulta Prisma por su cuenta serviria el HTML a una sesion que el
     administrador ya habia invalidado cambiando su contrasena, porque el middleware
     corre en Edge y no puede revocar. Discharge identico al de `CotizacionesView`, y
     por el mismo motivo de fondo. */
  useEffect(() => {
    void cargar();
  }, [cargar]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * Ejecuta una de las cuatro acciones y repinta.
   *
   * El texto de confirmacion **no** esta aqui: sale de `textoConfirmacion()`, en el
   * modulo puro. Es un texto que se lee justo antes de hacer clic, o sea de las pocas
   * cosas que conviene poder probar sin navegador, y ahi se puede revisar de verdad.
   */
  const accion = useCallback(
    async (
      id: number,
      nombreAccion: AccionUsuario,
      extra: Record<string, unknown> = {},
    ) => {
      setOcupado(true);
      setError("");
      setAviso("");
      try {
        const response = await fetch(`/api/admin/usuarios/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ accion: nombreAccion, ...extra }),
        });
        const data = (await response.json()) as { error?: string; contrasena?: string };
        if (!response.ok) {
          /* Un rechazo de la politica de contrasena viene en `contrasena`, no en
             `error`: se lo anade `compruebaContrasena()` y llega tal cual. Si solo
             se mirara `error`, el usuario veria "no se pudo modificar" sin el motivo,
             que es justo lo que tiene que corregir. */
          const motivo =
            typeof data.contrasena === "string" && data.contrasena.length > 0
              ? data.contrasena
              : leerError(data, "No se pudo modificar la cuenta.");
          throw new Error(motivo);
        }
        setRestableciendo(null);
        setNuevaContrasena("");
        await cargar();
        setAviso("Listo.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo modificar la cuenta.");
      } finally {
        setOcupado(false);
      }
    },
    [cargar],
  );

  const crear = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setOcupado(true);
      setError("");
      setAviso("");
      try {
        const response = await fetch("/api/admin/usuarios", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, nombre, rol, contrasena }),
        });
        const data = (await response.json()) as { error?: string; contrasena?: string };
        if (!response.ok) {
          const motivo =
            typeof data.contrasena === "string" && data.contrasena.length > 0
              ? data.contrasena
              : leerError(data, "No se pudo crear la cuenta.");
          throw new Error(motivo);
        }
        /* Se limpian los campos del formulario: si no, el siguiente alta arrastra la
           contrasena del anterior en el campo, que es una forma muy normal de
           acabarcen la contrasena de otra cuenta en el historial del navegador. */
        setEmail("");
        setNombre("");
        setContrasena("");
        setRol("BUYER");
        await cargar();
        setAviso("Cuenta creada. La contraseña que has puesto es temporal.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo crear la cuenta.");
      } finally {
        setOcupado(false);
      }
    },
    [cargar, contrasena, email, nombre, rol],
  );

  if (cargando) {
    return <p className="text-foreground-muted">Cargando cuentas...</p>;
  }

  return (
    <div className="space-y-8">
      {error !== "" ? (
        <p
          role="alert"
          className="cartoon-border rounded-3xl bg-cartoon-coral p-4 text-foreground"
        >
          {error}
        </p>
      ) : null}
      {aviso !== "" ? (
        <p
          role="status"
          className="cartoon-border rounded-3xl bg-cartoon-mint p-4 text-foreground"
        >
          {aviso}
        </p>
      ) : null}

      {/* --- Alta --- */}
      <section className="cartoon-border cartoon-shadow rounded-3xl bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-primary">Crear una cuenta</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          La contraseña es <strong className="text-primary">temporal</strong>. La
          persona tendrá que cambiarla al entrar, y hasta entonces no podrá entrar al
          panel.
        </p>

        <form className="mt-6 space-y-4" onSubmit={crear}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Correo</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cartoon-border mt-1 w-full rounded-2xl bg-white px-4 py-2"
                autoComplete="off"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Nombre (opcional)</span>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="cartoon-border mt-1 w-full rounded-2xl bg-white px-4 py-2"
                autoComplete="off"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold">Rol</span>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as Usuario["role"])}
              className="cartoon-border mt-1 w-full rounded-2xl bg-white px-4 py-2"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ETIQUETA_ROL[r]}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-foreground-muted">
              {rol === "ADMIN"
                ? "Da acceso al panel. Puede ser alguien de confianza: quien sea admin puede crear a otro admin."
                : "Puede entrar y usar su cuenta, pero no ver el panel."}
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Contraseña temporal</span>
            <input
              type="text"
              required
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className="cartoon-border mt-1 w-full rounded-2xl bg-white px-4 py-2"
              autoComplete="off"
            />
            <span className="mt-1 block text-xs text-foreground-muted">
              {rol === "ADMIN"
                ? "Un administrador necesita 12 caracteres o más, con mayúscula, minúscula, un dígito y un símbolo."
                : "Una cuenta normal necesita 8 caracteres o más."}
            </span>
          </label>

          <button
            type="submit"
            disabled={ocupado}
            className="cartoon-border cartoon-shadow-sm cartoon-focus rounded-full bg-primary px-6 py-3 font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60"
          >
            {ocupado ? "Guardando..." : "Crear cuenta"}
          </button>
        </form>
      </section>

      {/* --- Listado --- */}
      <section className="cartoon-border cartoon-shadow rounded-3xl bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-primary">
          Cuentas ({usuarios.length})
        </h2>

        <ul className="mt-6 space-y-4">
          {usuarios.map((u) => (
            <li
              key={u.id}
              className="cartoon-border rounded-2xl bg-white p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {/* Cuando no hay nombre, el correo **no** se repite en dos
                      lineas: la primera cae al correo y la segunda volveria a
                      ponerlo. En la foto salia "buyer@..." dos veces seguidas, que
                      parece un fallo de la pagina. */}
                  <p className="font-bold">
                    {u.name ?? u.email}
                  </p>
                  {u.name === null ? null : (
                    <p className="truncate text-sm text-foreground-muted">
                      {u.email}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-foreground-muted">
                    Creada el {fechaCorta(u.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="cartoon-border rounded-full bg-cartoon-sky px-3 py-1 text-xs font-semibold">
                    {ETIQUETA_ROL[u.role]}
                  </span>
                  {!u.activo ? (
                    <span className="cartoon-border rounded-full bg-cartoon-lavender px-3 py-1 text-xs font-semibold">
                      Desactivada
                    </span>
                  ) : null}
                  {u.debeCambiarContrasena ? (
                    <span className="cartoon-border rounded-full bg-cartoon-coral px-3 py-1 text-xs font-semibold">
                      Contraseña temporal
                    </span>
                  ) : null}
                </div>
              </div>

              {/* El formulario de restablecimiento solo se abre para una cuenta, y
                  con el boton de cerrar tambien se recoge: si no, dos formularios a
                  la vez harian ambiguo a que cuenta se refiere la contrasena que se
                  esta escribiendo. */}
              {restableciendo === u.id ? (
                <div className="mt-4 rounded-2xl bg-cartoon-lavender p-4">
                  <label className="block">
                    <span className="text-sm font-semibold">
                      Contraseña nueva de {u.email}
                    </span>
                    <input
                      type="text"
                      value={nuevaContrasena}
                      onChange={(e) => setNuevaContrasena(e.target.value)}
                      className="cartoon-border mt-1 w-full rounded-2xl bg-white px-4 py-2"
                      autoComplete="off"
                    />
                    <span className="mt-1 block text-xs">
                      Volverá a ser temporal: tendrá que cambiarla al entrar.
                    </span>
                  </label>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={ocupado || nuevaContrasena.length === 0}
                      onClick={() => {
                        setRestableciendo(null);
                        setNuevaContrasena("");
                      }}
                      className="cartoon-border rounded-full bg-white px-4 py-2 text-sm font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={ocupado || nuevaContrasena.length === 0}
                      onClick={() =>
                        void accion(u.id, "restablecer_contrasena", {
                          contrasena: nuevaContrasena,
                        })
                      }
                      className="cartoon-border cartoon-shadow-sm rounded-full bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                    >
                      Restablecer
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {/* Cambiar de rol: un `select` y un boton, en vez de un boton por
                    rol. Un `prompt` con el rol escrito a mano no valida nada y es el
                    sitio mas facil de equivocarse. */}
                <select
                  aria-label={`Rol nuevo de ${u.email}`}
                  value={u.role}
                  disabled={ocupado}
                  onChange={(e) => {
                    const nuevo = e.target.value as Usuario["role"];
                    if (nuevo === u.role) return;
                    if (
                      !window.confirm(
                        textoConfirmacion("cambiar_rol", u.email),
                      )
                    ) {
                      /* Vuelve al valor que tinha: sin esto, el `select` se queda
                         mostrando el rol nuevo mientras la base de datos tiene el
                         viejo, y la pantalla miente. */
                      e.target.value = u.role;
                      return;
                    }
                    void accion(u.id, "cambiar_rol", { rol: nuevo });
                  }}
                  className="cartoon-border rounded-2xl bg-white px-3 py-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ETIQUETA_ROL[r]}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => {
                    setRestableciendo(u.id);
                    setNuevaContrasena("");
                    setError("");
                    setAviso("");
                  }}
                  className="cartoon-border rounded-full bg-cartoon-sky px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  Restablecer contraseña
                </button>

                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => {
                    const nombreAccion: AccionUsuario = u.activo
                      ? "desactivar"
                      : "reactivar";
                    if (!window.confirm(textoConfirmacion(nombreAccion, u.email))) {
                      return;
                    }
                    void accion(u.id, nombreAccion);
                  }}
                  className="cartoon-border rounded-full bg-cartoon-pink px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {u.activo ? "Desactivar" : "Reactivar"}
                </button>
              </div>
            </li>
          ))}
        </ul>

        {usuarios.length === 0 ? (
          <p className="mt-6 text-foreground-muted">No hay ninguna cuenta.</p>
        ) : null}
      </section>
    </div>
  );
}