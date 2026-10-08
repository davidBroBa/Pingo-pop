"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/**
 * Formulario de acceso.
 *
 * No decide nada sobre permisos: solo envia credenciales al endpoint, que es el
 * que comprueba el hash y decide si abre sesion. Que el panel luego rechace a
 * un comprador es asunto del middleware y de `requireAdmin`.
 *
 * Los mensajes que llegan del servidor son safe para mostrar: el endpoint
 * responde siempre con un texto generico, exista o no la cuenta.
 */

/** Destino tras entrar con exito, si el middleware pidio venir a `/login`. */
function resolveDestination(role: string, next: string | null): string {
  // Un ADMIN que venia de `/admin/...` vuelve ahi; en cualquier otro caso al
  // panel. Un comprador siempre al inicio: no tiene nada que ver en `/admin`.
  if (role === "ADMIN") {
    if (next !== null && next.startsWith("/admin")) {
      return next;
    }
    return "/admin/productos";
  }
  return "/";
}

/**
 * @param next - Ruta original a la que el middleware queria enviar. Se recibe
 *   como prop desde el Server Component para no depender de `useSearchParams`,
 *   que obliga a envolver la pagina en un `Suspense`.
 */
export default function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(readApiError(data));
      }

      const role =
        typeof data === "object" && data !== null && "role" in data
          ? String((data as { role: unknown }).role)
          : "BUYER";

      // `replace` en vez de `push`: la pantalla de login no debe quedar en el
      // historial, porque el boton "atras" devolveria a una pagina ya cerrada.
      router.replace(resolveDestination(role, next));
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo iniciar sesion.",
      );
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="cartoon-border cartoon-shadow space-y-6 rounded-3xl bg-card p-6 sm:p-8"
    >
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-semibold text-primary"
        >
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@correo.com"
          className="cartoon-border cartoon-focus w-full rounded-2xl bg-white px-4 py-3 outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-semibold text-primary"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className="cartoon-border cartoon-focus w-full rounded-2xl bg-white px-4 py-3 outline-none"
        />
      </div>

      {error !== "" && (
        <p
          role="alert"
          className="cartoon-border cartoon-shadow-sm rounded-2xl bg-cartoon-coral p-4 text-sm font-medium text-primary"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus h-12 w-full rounded-2xl bg-accent px-6 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link
          href="/registro"
          className="font-semibold text-primary underline"
        >
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}

/**
 * Extrae el mensaje de error de la respuesta de la API.
 *
 * @param payload - Cuerpo ya parseado de la respuesta.
 * @returns El texto del servidor, o un generico si no viene en el formato esperado.
 */
function readApiError(payload: unknown): string {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const value = (payload as { error: unknown }).error;
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return "No se pudo iniciar sesion.";
}
