"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";


const VERSION_TERMINOS = "1.0";
const VERSION_PRIVACIDAD = "1.0";

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
    <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
      {general ? (
        <div role="alert" className="rounded-md bg-accent/10 p-3 text-sm text-ink">
          {general}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor={emailId} className="text-sm font-medium text-ink">
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
          className={`rounded-md border px-3 py-2 text-sm text-ink shadow-cartoon-sm focus:outline-none cartoon-focus ${
            errors.email ? "border-red-400" : "border-border"
          }`}
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? `${emailId}-error` : undefined}
        />
        {errors.email ? (
          <p id={`${emailId}-error`} role="alert" className="text-xs text-red-600">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={nameId} className="text-sm font-medium text-ink">
          Nombre (opcional)
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          autoComplete="name"
          value={values.name}
          onChange={handleChange("name")}
          className={`rounded-md border px-3 py-2 text-sm text-ink shadow-cartoon-sm focus:outline-none cartoon-focus ${
            errors.name ? "border-red-400" : "border-border"
          }`}
          aria-invalid={errors.name ? "true" : "false"}
          aria-describedby={errors.name ? `${nameId}-error` : undefined}
        />
        {errors.name ? (
          <p id={`${nameId}-error`} role="alert" className="text-xs text-red-600">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={passwordId} className="text-sm font-medium text-ink">
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
          className={`rounded-md border px-3 py-2 text-sm text-ink shadow-cartoon-sm focus:outline-none cartoon-focus ${
            errors.password ? "border-red-400" : "border-border"
          }`}
          aria-invalid={errors.password ? "true" : "false"}
          aria-describedby={errors.password ? `${passwordId}-error` : undefined}
        />
        {errors.password ? (
          <p id={`${passwordId}-error`} role="alert" className="text-xs text-red-600">
            {errors.password}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={confirmPasswordId} className="text-sm font-medium text-ink">
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
          className={`rounded-md border px-3 py-2 text-sm text-ink shadow-cartoon-sm focus:outline-none cartoon-focus ${
            errors.confirmPassword ? "border-red-400" : "border-border"
          }`}
          aria-invalid={errors.confirmPassword ? "true" : "false"}
          aria-describedby={errors.confirmPassword ? `${confirmPasswordId}-error` : undefined}
        />
        {errors.confirmPassword ? (
          <p id={`${confirmPasswordId}-error`} role="alert" className="text-xs text-red-600">
            {errors.confirmPassword}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            id={terminosId}
            checked={aceptaTerminos}
            onChange={(e) => {
              setAceptaTerminos(e.target.checked);
              if (e.target.checked) setErrors((prev) => ({ ...prev, acepta: undefined }));
            }}
            className="mt-1"
            aria-describedby={errors.acepta ? `${terminosId}-err` : undefined}
          />
          <span>
            He leído y acepto los{" "}
            <Link href="/terminos-y-condiciones" className="underline">
              Términos y condiciones
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            id={privacidadId}
            checked={aceptaPrivacidad}
            onChange={(e) => {
              setAceptaPrivacidad(e.target.checked);
              if (e.target.checked && aceptaTerminos) setErrors((prev) => ({ ...prev, acepta: undefined }));
            }}
            className="mt-1"
            aria-describedby={errors.acepta ? `${privacidadId}-err` : undefined}
          />
          <span>
            He leído y acepto el{" "}
            <Link href="/aviso-de-privacidad" className="underline">
              Aviso de privacidad
            </Link>
            .
          </span>
        </label>
        {errors.acepta ? (
          <p role="alert" className="text-xs text-red-600">
            {errors.acepta}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={loading || !aceptaTerminos || !aceptaPrivacidad}
        className={`rounded-md bg-accent px-4 py-2 text-sm font-semibold text-ink shadow-cartoon-sm transition hover:bg-accent/90 focus:outline-none cartoon-focus disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <p className="text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
