"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button, Input } from "@/components/ui";
import {
  BUYER_PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "@/lib/account-schema";

type ProfileViewProps = {
  usuario: {
    id: number;
    email: string;
    name: string | null;
    role: "BUYER" | "ADMIN";
    createdAt: string;
    updatedAt: string;
  };
  sesion: { emitidaEn: string; caducaEn: string };
  /** `true` solo para ADMIN: habilita el bloque de datos que un usuario no ve. */
  esAdmin: boolean;
  /**
   * `true` si la cuenta sigue con la **contrasena temporal** que le puso un
   * administrador (spec 007, D21).
   *
   * Lo decide el servidor leyendo `session.swc`, que `getSessionUser()` ha
   * relecto de la **base de datos**, no de la cookie. Por eso el aviso no se
   * puede falsear desde el cliente: si alguien edita su propia cookie, el
   * servidor sigue viendo la columna y lo sigue enseñando.
   *
   * Es la **otra mitad** del mismo limite que aplica el `proxy`. El proxy pone el
   * 403 en `/admin/*`; este aviso explica **por que**, porque sin el el panel se
   * negaria en silencio y "obligatorio" seria una palabra sin contenido.
   */
  debeCambiarContrasena: boolean;
};

/**
 * Vista de la cuenta: datos, edicion del nombre, cambio de contrasena y cierre de
 * sesion.
 *
 * El bloque de datos de ADMIN lo habilita `esAdmin`, que decide el servidor leyendo
 * el rol **de la base de datos** (via `getSessionUser`). Ocultarlo en el cliente no
 * bastaria como medida de seguridad —el HTML llega igual—, pero evita mandar datos de
 * mas a quien no debe verlos.
 *
 * El navegador no sabe nada de contrasenas: la politica se aplica en el servidor, en
 * `POST /api/account/password`. Aqui solo se avisa del minimo para no desperdiciar un
 * envio, y los errores reales se muestran tal cual los devuelve el endpoint.
 */
export default function ProfileView({
  usuario,
  sesion,
  esAdmin,
  debeCambiarContrasena,
}: ProfileViewProps) {
  const router = useRouter();

  const [name, setName] = useState(usuario.name ?? "");
  const [perfilEstado, setPerfilEstado] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [contrasenaEstado, setContrasenaEstado] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);
  const [cambiando, setCambiando] = useState(false);

  /** Formato de fecha en espanol, sin depender de la configuracion regional del servidor. */
  function fecha(iso: string): string {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  function hora(iso: string): string {
    return new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  }

  async function guardarNombre(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardandoPerfil(true);
    setPerfilEstado(null);

    try {
      const respuesta = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const datos = await respuesta.json().catch(() => null);

      if (!respuesta.ok) {
        setPerfilEstado({
          tipo: "error",
          texto: datos?.fields?.name ?? datos?.error ?? "No se pudo guardar.",
        });
        return;
      }

      setPerfilEstado({ tipo: "ok", texto: "Nombre guardado." });
      router.refresh();
    } catch {
      setPerfilEstado({
        tipo: "error",
        texto: "Ocurrio un problema. Intenta de nuevo.",
      });
    } finally {
      setGuardandoPerfil(false);
    }
  }

  async function cambiarContrasena(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCambiando(true);
    setContrasenaEstado(null);

    try {
      const respuesta = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: actual,
          newPassword: nueva,
          confirmPassword: confirmacion,
        }),
      });
      const datos = await respuesta.json().catch(() => null);

      if (!respuesta.ok) {
        setContrasenaEstado({
          tipo: "error",
          texto: datos?.error ?? "No se pudo cambiar la contrasena.",
        });
        return;
      }

      // El endpoint ya borro la cookie y revoco el resto de sesiones. Se manda al
      // login: el `replace` evita que el boton atras devuelva a una pagina para la
      // que ya no hay sesion.
      router.replace("/login?contrasena=cambiada");
      router.refresh();
    } catch {
      setContrasenaEstado({
        tipo: "error",
        texto: "Ocurrio un problema. Intenta de nuevo.",
      });
    } finally {
      setCambiando(false);
    }
  }

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  const minimoNueva = esAdmin ? 12 : BUYER_PASSWORD_MIN_LENGTH;

  return (
    // `div` y no `main`: el `main` lo aporta `MainLayout`, y dos elementos `<main>`
    // en la misma pagina son HTML invalido.
    <div className="bg-cartoon-cream px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <p className="cartoon-border cartoon-shadow-sm mb-4 inline-block rotate-[-1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Mi cuenta
          </p>
          <h1 className="font-heading text-4xl font-bold text-primary">
            {usuario.name ?? "Tu perfil"}
          </h1>
          <p className="mt-3 text-foreground-muted">
            {usuario.email}
          </p>
        </header>

        {/* --- Aviso de contrasena temporal (spec 007, D21) ---
            Va **antes** de todo lo demas y con `role="alert"`, para que se lea al
            entrar sin tener que buscarlo. No es un adorno: es la mitad que hace
            falta para que el 403 del panel tenga explicacion. Sin este bloque, un
            administrador recien creado ve el panel negarse y no sabe por que. */}
        {debeCambiarContrasena ? (
          <p
            role="alert"
            className="cartoon-border cartoon-shadow rounded-3xl bg-cartoon-coral p-6 text-foreground sm:p-8"
          >
            <strong className="block text-lg font-bold text-primary">
              Tu contraseña es temporal
            </strong>
            <span className="mt-2 block text-sm">
              La creó otra persona y te la dio para que entraras. Cámbiala aquí
              abajo antes de hacer nada más.
              {esAdmin
                ? " Mientras no la cambies no podrás entrar al panel de administración."
                : " Mientras no la cambies podrás entrar, pero no podrás hacer nada de tu cuenta."}
            </span>
          </p>
        ) : null}

        {/* --- Nombre --- */}
        <section className="cartoon-border cartoon-shadow rounded-3xl bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-primary">Tu nombre</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Es el nombre que te muestramos. Tu correo no se cambia desde aqui.
          </p>

          <form onSubmit={guardarNombre} className="mt-5 space-y-4">
            <Input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como te llamamos"
              minLength={2}
              maxLength={120}
              aria-label="Tu nombre"
            />
            <Button type="submit" disabled={guardandoPerfil}>
              {guardandoPerfil ? "Guardando..." : "Guardar nombre"}
            </Button>
            {perfilEstado !== null ? (
              <p
                className={`cartoon-border cartoon-shadow-sm rounded-2xl px-4 py-3 text-sm font-medium ${
                  perfilEstado.tipo === "ok"
                    ? "bg-cartoon-mint text-primary"
                    : "bg-cartoon-coral text-primary"
                }`}
              >
                {perfilEstado.texto}
              </p>
            ) : null}
          </form>
        </section>

        {/* --- Contrasena --- */}
        <section className="cartoon-border cartoon-shadow rounded-3xl bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-primary">Cambiar contrasena</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Al cambiarla se cierran <strong>todas</strong> tus sesiones, incluido este
            dispositivo: tendras que entrar de nuevo.
            {esAdmin
              ? " Como administrador, la nueva necesita al menos 12 caracteres, con mayuscula, minuscula, digito y un signo de puntuacion."
              : ` La nueva necesita al menos ${minimoNueva} caracteres.`}
          </p>

          <form onSubmit={cambiarContrasena} className="mt-5 space-y-4">
            <Input
              type="password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder="Tu contrasena actual"
              autoComplete="current-password"
              aria-label="Tu contrasena actual"
            />
            <Input
              type="password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              placeholder="Contrasena nueva"
              minLength={minimoNueva}
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete="new-password"
              aria-label="Contrasena nueva"
            />
            <Input
              type="password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              placeholder="Repite la contrasena nueva"
              minLength={minimoNueva}
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete="new-password"
              aria-label="Repite la contrasena nueva"
            />
            <Button type="submit" disabled={cambiando}>
              {cambiando ? "Cambiando..." : "Cambiar contrasena"}
            </Button>
            {contrasenaEstado !== null ? (
              <p className="cartoon-border cartoon-shadow-sm rounded-2xl bg-cartoon-coral px-4 py-3 text-sm font-medium text-primary">
                {contrasenaEstado.texto}
              </p>
            ) : null}
          </form>
        </section>

        {/* --- Datos que solo ve un administrador --- */}
        {esAdmin ? (
          <section className="cartoon-border cartoon-shadow rounded-3xl bg-cartoon-lavender p-6 sm:p-8">
            <p className="cartoon-border cartoon-shadow-sm mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
              Solo administrador
            </p>
            <h2 className="text-2xl font-bold text-primary">
              Datos internos de la cuenta
            </h2>
            <p className="mt-2 text-sm text-primary/80">
              Un usuario normal no ve nada de este bloque.
            </p>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2 border-b border-primary/20 pb-2">
                <dt className="font-semibold text-primary">Id interno</dt>
                <dd className="text-primary/90">{usuario.id}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-b border-primary/20 pb-2">
                <dt className="font-semibold text-primary">Rol</dt>
                <dd className="text-primary/90">{usuario.role}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-b border-primary/20 pb-2">
                <dt className="font-semibold text-primary">Cuenta creada</dt>
                <dd className="text-primary/90">{fecha(usuario.createdAt)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-b border-primary/20 pb-2">
                <dt className="font-semibold text-primary">
                  Ultima modificacion
                </dt>
                <dd className="text-primary/90">
                  {fecha(usuario.updatedAt)}
                  <span className="text-primary/70">
                    {" "}
                    a las {hora(usuario.updatedAt)}
                  </span>
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-b border-primary/20 pb-2">
                <dt className="font-semibold text-primary">Sesion emitida</dt>
                <dd className="text-primary/90">{hora(sesion.emitidaEn)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="font-semibold text-primary">Sesion caduca</dt>
                <dd className="text-primary/90">{hora(sesion.caducaEn)}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        {/* --- Cerrar sesion: disponible para cualquier rol --- */}
        <section className="cartoon-border cartoon-shadow rounded-3xl bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-primary">Cerrar sesion</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Cierra la sesion de este dispositivo. Tus otras sesiones siguen abiertas.
          </p>
          <Button
            type="button"
            onClick={cerrarSesion}
            className="mt-5 bg-white text-foreground"
          >
            Cerrar sesion
          </Button>
        </section>
      </div>
    </div>
  );
}
