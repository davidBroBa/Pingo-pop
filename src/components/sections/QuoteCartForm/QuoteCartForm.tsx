"use client";

import { FormEvent, useState } from "react";

import { useQuoteCart } from "@/context/QuoteCartContext";

type QuoteCartFormProps = {
  onSuccess: () => void;
};

export function QuoteCartForm({ onSuccess }: QuoteCartFormProps) {
  const { items } = useQuoteCart();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        const result = await response.json().catch(() => null);

        setError(result?.error || `Error del servidor: ${response.status}`);

        return;
      }

      form.reset();
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
