"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

const VERSION_TERMINOS = "1.0";
const VERSION_PRIVACIDAD = "1.0";

/**
 * Formulario de creacion de cuenta de cliente (rol BUYER).
 *
 * No decide nada por su cuenta: envia los datos a `/api/auth/register`, que
 * valida en el borde, crea el usuario y abre la sesion. Este componente solo
 * pinta el estado de esa peticion (cargando, errores por campo, exito).
 */
export function RegisterForm(): React.ReactElement {
  const router = useRouter();
  const emailId = useId();
  const nameId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const terminosId = useId();
  const privacidadId = useId();

  const [values, setValues] = useState({
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof typeof values) => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setGeneral(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrors({});
    setGeneral(null);

    const payload = {
      email: values.email,
      name: values.name || undefined,
      password: values.password,
      confirmPassword: values.confirmPassword,
      aceptacion: {
        acepta: true,
        terminos: VERSION_TERMINOS,
        privacidad: VERSION_PRIVACIDAD,
      },
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        const fields: Record<string, string | undefined> = data?.fields || {};
        setErrors({
          email: fields.email,
          name: fields.name,
          password: fields.password,
          confirmPassword: fields.confirmPassword,
          acepta: fields.acepta || fields.form,
          form: fields.form,
        });
        setGeneral(data?.error || "No se pudo crear la cuenta.");
        setLoading(false);
        return;
      }
      router.push("/perfil");
      router.refresh();
    } catch {
      setGeneral("Servicio no disponible. Intenta de nuevo en unos minutos.");
      setLoading(false);
    }
  };

  return (
    <form
      className="cartoon-border cartoon-shadow space-y-6 rounded-3xl bg-card p-6 sm:p-8"
      onSubmit={handleSubmit}
      noValidate
    >
      {general ? (
        <p
          role="alert"
          className="cartoon-border cartoon-shadow-sm rounded-2xl bg-cartoon-coral p-4 text-sm font-medium text-primary"
        >
          {general}
        </p>
      ) : null}

      <div>
        <label
          htmlFor={emailId}
          className="mb-2 block text-sm font-semibold text-primary"
        >
          Correo electrónico
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={handleChange("email")}
          placeholder="tu@correo.com"
          className={`cartoon-border cartoon-focus w-full rounded-2xl bg-white px-4 py-3 outline-none ${
            errors.email ? "border-cartoon-coral" : ""
          }`}
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? `${emailId}-error` : undefined}
        />
        {errors.email ? (
          <p
            id={`${emailId}-error`}
            role="alert"
            className="mt-2 inline-block rounded-full bg-cartoon-coral px-3 py-1 text-xs font-semibold text-primary"
          >
            {errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor={nameId}
          className="mb-2 block text-sm font-semibold text-primary"
        >
          Nombre{" "}
          <span className="font-normal text-foreground-muted">(opcional)</span>
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          autoComplete="name"
          value={values.name}
          onChange={handleChange("name")}
          placeholder="Cómo prefieres que te llamemos"
          className={`cartoon-border cartoon-focus w-full rounded-2xl bg-white px-4 py-3 outline-none ${
            errors.name ? "border-cartoon-coral" : ""
          }`}
          aria-invalid={errors.name ? "true" : "false"}
          aria-describedby={errors.name ? `${nameId}-error` : undefined}
        />
        {errors.name ? (
          <p
            id={`${nameId}-error`}
            role="alert"
            className="mt-2 inline-block rounded-full bg-cartoon-coral px-3 py-1 text-xs font-semibold text-primary"
          >
            {errors.name}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor={passwordId}
          className="mb-2 block text-sm font-semibold text-primary"
        >
          Contraseña
        </label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={values.password}
          onChange={handleChange("password")}
          placeholder="••••••••"
          className={`cartoon-border cartoon-focus w-full rounded-2xl bg-white px-4 py-3 outline-none ${
            errors.password ? "border-cartoon-coral" : ""
          }`}
          aria-invalid={errors.password ? "true" : "false"}
          aria-describedby={
            errors.password ? `${passwordId}-error` : `${passwordId}-hint`
          }
        />
        <p
          id={`${passwordId}-hint`}
          className="mt-2 text-xs text-foreground-muted"
        >
          Mínimo 8 caracteres.
        </p>
        {errors.password ? (
          <p
            id={`${passwordId}-error`}
            role="alert"
            className="mt-2 inline-block rounded-full bg-cartoon-coral px-3 py-1 text-xs font-semibold text-primary"
          >
            {errors.password}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor={confirmPasswordId}
          className="mb-2 block text-sm font-semibold text-primary"
        >
          Repetir contraseña
        </label>
        <input
          id={confirmPasswordId}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={values.confirmPassword}
          onChange={handleChange("confirmPassword")}
          placeholder="••••••••"
          className={`cartoon-border cartoon-focus w-full rounded-2xl bg-white px-4 py-3 outline-none ${
            errors.confirmPassword ? "border-cartoon-coral" : ""
          }`}
          aria-invalid={errors.confirmPassword ? "true" : "false"}
          aria-describedby={
            errors.confirmPassword ? `${confirmPasswordId}-error` : undefined
          }
        />
        {errors.confirmPassword ? (
          <p
            id={`${confirmPasswordId}-error`}
            role="alert"
            className="mt-2 inline-block rounded-full bg-cartoon-coral px-3 py-1 text-xs font-semibold text-primary"
          >
            {errors.confirmPassword}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-3 text-sm text-primary">
          <input
            type="checkbox"
            id={terminosId}
            checked={aceptaTerminos}
            onChange={(e) => {
              setAceptaTerminos(e.target.checked);
              if (e.target.checked)
                setErrors((prev) => ({ ...prev, acepta: undefined }));
            }}
            className="cartoon-focus mt-0.5 h-4 w-4 accent-accent"
            aria-describedby={errors.acepta ? `${terminosId}-err` : undefined}
          />
          <span>
            He leído y acepto los{" "}
            <Link
              href="/terminos-y-condiciones"
              className="font-semibold text-primary underline"
            >
              Términos y condiciones
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-primary">
          <input
            type="checkbox"
            id={privacidadId}
            checked={aceptaPrivacidad}
            onChange={(e) => {
              setAceptaPrivacidad(e.target.checked);
              if (e.target.checked && aceptaTerminos)
                setErrors((prev) => ({ ...prev, acepta: undefined }));
            }}
            className="cartoon-focus mt-0.5 h-4 w-4 accent-accent"
            aria-describedby={errors.acepta ? `${privacidadId}-err` : undefined}
          />
          <span>
            He leído y acepto el{" "}
            <Link
              href="/aviso-de-privacidad"
              className="font-semibold text-primary underline"
            >
              Aviso de privacidad
            </Link>
            .
          </span>
        </label>
        {errors.acepta ? (
          <p
            role="alert"
            className="inline-block rounded-full bg-cartoon-coral px-3 py-1 text-xs font-semibold text-primary"
          >
            {errors.acepta}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={loading || !aceptaTerminos || !aceptaPrivacidad}
        className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus h-12 w-full rounded-2xl bg-accent px-6 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <p className="text-center text-sm text-foreground-muted">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary underline"
        >
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}