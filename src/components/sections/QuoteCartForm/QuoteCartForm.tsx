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
      className="rounded-3xl border border-[#ECECEC] bg-[#FAFAFA] p-6 sm:p-8"
    >
      <div>
        <h2 className="font-heading text-2xl font-bold text-[#2A2227]">
          Tus datos
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#707070]">
          Déjanos tus datos para preparar tu cotización.
        </p>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <input
          name="name"
          required
          minLength={3}
          placeholder="Tu nombre"
          className="rounded-2xl border border-[#ECECEC] bg-white px-4 py-3 outline-none transition focus:border-[#F7B92C]"
        />

        <input
          name="phone"
          required
          minLength={10}
          placeholder="WhatsApp o teléfono"
          className="rounded-2xl border border-[#ECECEC] bg-white px-4 py-3 outline-none transition focus:border-[#F7B92C]"
        />
      </div>

      <input
        name="email"
        type="email"
        placeholder="Correo electrónico (opcional)"
        className="mt-5 w-full rounded-2xl border border-[#ECECEC] bg-white px-4 py-3 outline-none transition focus:border-[#F7B92C]"
      />

      <textarea
        name="details"
        required
        minLength={10}
        rows={5}
        placeholder="Cuéntanos detalles de tu pedido, diseños, colores, medidas o cualquier requisito especial..."
        className="mt-5 w-full resize-none rounded-2xl border border-[#ECECEC] bg-white px-4 py-3 outline-none transition focus:border-[#F7B92C]"
      />

      {error && (
        <p className="mt-4 text-sm font-medium text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 h-12 w-full rounded-2xl bg-[#F7B92C] px-6 font-semibold text-[#2A2227] transition duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Enviar solicitud de cotización"}
      </button>
    </form>
  );
}
