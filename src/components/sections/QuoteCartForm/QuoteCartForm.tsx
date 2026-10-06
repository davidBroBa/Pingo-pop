"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { useQuoteCart } from "@/context/QuoteCartContext";

type QuoteCartFormProps = {
  onSuccess: () => void;
};

/**
 * Los dos documentos que declara la casilla (P6).
 *
 * Los slug van **escritos aqui** y no importados de `legal-versions.ts`, y el
 * motivo es tecnico y medido en el servidor de desarrollo: ese modulo importa
 * `node:crypto`, asi que importarlo desde un componente de cliente mete
 * `crypto-browserify` en el paquete del navegador, **800 KB** en una pagina que
 * no calcula ni un hash. Por eso el numero de version **no va al lado de la
 * casilla**: no hay nada de donde sacarlo sin esa dependencia, asi que lo pone el
 * servidor al registrar, contrastado con el registro de `legal-versions.ts` (ver
 * `AceptacionSchema`), y lo que el visitante ve es el documento enlazado, que es
 * quien muestra su version (RF-6).
 *
 * Cookies no esta, y por lo mismo que en el servidor: no hay ninguna tecnologia
 * no esencial que pida consentimiento (`hayQuePedirConsentimiento()`), asi que
 * no hay nada que aceptar.
 */
const DOCUMENTOS_ACEPTADOS = [
  { slug: "terminos-y-condiciones", etiqueta: "Terminos y condiciones" },
  { slug: "aviso-de-privacidad", etiqueta: "Aviso de privacidad" },
] as const;

/**
 * Saca el mensaje de una respuesta de error sin asumir su forma.
 *
 * El servidor devuelve `{ error, fields }` y `fields` lleva el mensaje del campo
 * concreto que fallo. Aqui interesa el de la casilla (`aceptacion`), porque es el
 * que explica por que el envio se ha parado. Ante cualquier otra forma devuelve
 * `null` y quien llama cae en el texto generico.
 *
 * @param resultado - El cuerpo ya parseado, de tipo desconocido.
 * @returns El mensaje que se muestra, o `null` si no hay ninguno legible.
 */
function mensajeDeError(resultado: unknown): string | null {
  if (typeof resultado !== "object" || resultado === null) return null;

  const cuerpo = resultado as { error?: unknown; fields?: unknown };
  if (typeof cuerpo.fields === "object" && cuerpo.fields !== null) {
    const campos = cuerpo.fields as Record<string, unknown>;
    // `aceptacion` es el bloque entero y `acepta` el campo de dentro. Se miran los
    // dos porque el mensaje depende de que regla haya saltado.
    for (const clave of ["aceptacion", "acepta"]) {
      const mensaje = campos[clave];
      if (typeof mensaje === "string" && mensaje !== "") return mensaje;
    }
  }

  return typeof cuerpo.error === "string" && cuerpo.error !== ""
    ? cuerpo.error
    : null;
}

export function QuoteCartForm({ onSuccess }: QuoteCartFormProps) {
  const { items } = useQuoteCart();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Token de idempotencia (RF-27), **en memoria y nunca en `localStorage`**.
   *
   * Dos motivos, y los dos importan: un token guardado en disco bloquearia una
   * solicitud legitima hecha al dia siguiente con el mismo formulario, y escribirlo
   * en el navegador seria recolectar un dato que no hace falta (RF-15). Se
   * genera en el inicializador de `useState`, que corre tambien en el servidor:
   * `crypto.randomUUID()` existe en Node y en el navegador, y como el valor **no
   * se pinta** en el HTML, que difiera entre los dos no puede romper la
   * hidratacion.
   *
   * Tras cada envio con exito se regenera: el siguiente envio es una solicitud
   * nueva y de verdad, no una repeticion de la anterior.
   */
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (items.length === 0) {
      setError("Agrega al menos un producto a tu cotización.");
      return;
    }

    setLoading(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      details: formData.get("details"),
      items: items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
      idempotencyKey,
      // Solo la afirmacion. **Las versiones no las manda el navegador**: las pone
      // el servidor desde el registro de `legal-versions.ts` y las contrasta
      // siempre (ver el comentario de `AceptacionSchema`).
      aceptacion: {
        acepta: formData.get("acepta") === "on",
      },
    };

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result: unknown = await response.json().catch(() => null);

        setError(
          mensajeDeError(result) ?? `Error del servidor: ${response.status}`,
        );

        return;
      }

      form.reset();
      setIdempotencyKey(crypto.randomUUID());
      onSuccess();
    } catch {
      setError(
        "Ocurrió un problema al enviar tu solicitud. Inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="cartoon-border cartoon-shadow rounded-3xl bg-card p-6 sm:p-8"
    >
      <div>
        <h2 className="text-2xl font-bold text-primary">Tus datos</h2>

        <p className="mt-2 text-sm leading-6 text-foreground-muted">
          Déjanos tus datos para preparar tu cotización.
        </p>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <input
          name="name"
          required
          minLength={3}
          placeholder="Tu nombre"
          className="cartoon-border cartoon-focus rounded-2xl bg-white px-4 py-3 outline-none"
        />

        <input
          name="phone"
          required
          minLength={10}
          placeholder="WhatsApp o teléfono"
          className="cartoon-border cartoon-focus rounded-2xl bg-white px-4 py-3 outline-none"
        />
      </div>

      <input
        name="email"
        type="email"
        placeholder="Correo electrónico (opcional)"
        className="cartoon-border cartoon-focus mt-5 w-full rounded-2xl bg-white px-4 py-3 outline-none"
      />

      <textarea
        name="details"
        required
        minLength={10}
        rows={5}
        placeholder="Cuéntanos qué productos y cantidades necesitas, o cualquier requisito especial..."
        className="cartoon-border cartoon-focus mt-5 w-full resize-none rounded-2xl bg-white px-4 py-3 outline-none"
      />

      {/* RF-10: enviar esto NO es comprar. El texto va antes de la casilla para que
          se lea al decidir, no despues de haber enviado. */}
      <div className="cartoon-border cartoon-shadow-sm mt-6 rounded-2xl bg-cartoon-lavender px-4 py-3">
        <p className="text-sm font-semibold text-primary">
          Enviar no es comprar
        </p>

        <p className="mt-1 text-sm leading-6 text-foreground-muted">
          Esto es una <strong>solicitud de cotización</strong>, no un pago: aquí no
          se cobra nada y no hay ninguna tarjeta. El precio que ves es el de
          catálogo y el precio final se confirma por escrito antes de cerrar
          cualquier pedido.
        </p>
      </div>

      <div className="cartoon-border mt-6 flex items-start gap-3 rounded-2xl bg-white px-4 py-4">
        <input
          id="acepta"
          name="acepta"
          type="checkbox"
          required
          className="cartoon-focus mt-1 h-5 w-5 shrink-0"
        />

        <label htmlFor="acepta" className="text-sm leading-6 text-foreground-muted">
          He leído y acepto los{" "}
          {DOCUMENTOS_ACEPTADOS.map((documento, indice) => (
            <span key={documento.slug}>
              {indice > 0 ? " y el " : ""}
              <Link
                href={`/${documento.slug}`}
                target="_blank"
                rel="noreferrer"
                className="cartoon-focus font-semibold text-primary underline"
              >
                {documento.etiqueta}
              </Link>
            </span>
          ))}
          .
        </label>
      </div>

      {error && (
        <p className="cartoon-border cartoon-shadow-sm mt-4 rounded-2xl bg-cartoon-coral px-4 py-3 text-sm font-medium text-primary">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus mt-6 h-12 w-full rounded-2xl bg-accent px-6 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Enviar solicitud de cotización"}
      </button>
    </form>
  );
}