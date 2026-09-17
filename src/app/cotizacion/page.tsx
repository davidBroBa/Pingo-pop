"use client";

import Link from "next/link";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { QuoteCartForm } from "@/components/sections/QuoteCartForm/QuoteCartForm";
import { useQuoteCart } from "@/context/QuoteCartContext";

import { MainLayout } from "@/components/layout";

export default function CotizacionPage() {
  const { items, removeItem, updateQuantity, clearCart } = useQuoteCart();
  const [submitted, setSubmitted] = useState(false);

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const estimatedTotal = items.reduce(
    (total, item) => total + Number(item.price) * item.quantity,
    0,
  );

  if (submitted) {
    return (
      <main className="min-h-screen bg-white px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-[#ECECEC] bg-[#FAFAFA] p-8 text-center sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7B92C] text-[#2A2227]">
              <span className="text-2xl">✓</span>
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.15em] text-[#707070]">
              Solicitud recibida
            </p>

            <h1 className="mt-3 font-heading text-3xl font-bold text-[#2A2227] sm:text-4xl">
              ¡Tu cotización fue enviada!
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#707070]">
              Recibimos correctamente tu solicitud. Revisaremos los detalles de
              tu pedido y nos pondremos en contacto contigo para confirmar todo.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/products"
                onClick={clearCart}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#F7B92C] px-6 font-semibold text-[#2A2227] transition duration-200 hover:scale-[1.01]"
              >
                Seguir navegando
              </Link>

              <Link
                href="/"
                onClick={clearCart}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#ECECEC] bg-white px-6 font-semibold text-[#2A2227] transition duration-200 hover:bg-[#FAFAFA]"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <MainLayout>
    <main className="min-h-screen bg-white px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/products"
          className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-[#707070] transition-colors hover:text-[#2A2227]"
        >
          <ArrowLeft size={16} />
          Volver a productos
        </Link>

        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#707070]">
            Mi cotización
          </p>

          <h1 className="font-heading text-5xl font-bold text-[#2A2227]">
            Crea tu pedido
          </h1>

          <p className="mt-4 text-lg leading-8 text-[#707070]">
            Revisa los productos que quieres cotizar y ajusta las cantidades.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-[#ECECEC] bg-[#FAFAFA] p-10 text-center">
            <h2 className="font-heading text-2xl font-bold text-[#2A2227]">
              Tu cotización está vacía
            </h2>

            <p className="mt-3 text-[#707070]">
              Agrega productos para comenzar tu solicitud.
            </p>

            <Link
              href="/products"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[#F7B92C] px-6 font-semibold text-[#2A2227]"
            >
              Ver productos
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#707070]">
                {totalItems} {totalItems === 1 ? "producto" : "productos"}
              </p>

              <button
                type="button"
                onClick={clearCart}
                className="text-sm font-medium text-[#707070] hover:text-red-600"
              >
                Vaciar cotización
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-5 rounded-3xl border border-[#ECECEC] bg-[#FAFAFA] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                  <div className="flex items-center gap-5">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white">
                      <span className="font-heading text-xl font-bold text-[#2A2227]/20">
                        Pingo
                      </span>
                    </div>

                    <div>
                      <p className="text-sm text-[#707070]">
                        Producto personalizado
                      </p>

                      <h2 className="mt-1 font-heading text-xl font-bold text-[#2A2227]">
                        {item.name}
                      </h2>

                      <p className="mt-2 font-semibold text-[#2A2227]">
                        Desde ${item.price} MXN
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-6 sm:justify-end">
                    <div className="flex items-center rounded-2xl border border-[#ECECEC] bg-white">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        disabled={item.quantity === 1}
                        className="flex h-10 w-10 items-center justify-center disabled:opacity-30"
                      >
                        <Minus size={16} />
                      </button>

                      <span className="w-10 text-center font-semibold">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="flex h-10 w-10 items-center justify-center"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-[#707070] hover:bg-red-50 hover:text-red-600"
                      aria-label={`Eliminar ${item.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-[#2A2227] p-6 sm:flex-row sm:items-center sm:p-8">
              <div>
                <p className="text-sm text-white/60">Siguiente paso</p>

                <h2 className="mt-1 font-heading text-2xl font-bold text-white">
                  Solicita tu cotización
                </h2>

                <p className="mt-2 text-sm text-white/60">
                  Revisaremos tu pedido y te contactaremos para confirmar los
                  detalles.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-3xl border border-[#ECECEC] bg-[#FAFAFA] p-6 sm:p-8">
              <div>
                <p className="text-sm text-[#707070]">Costo aproximado</p>
                <p className="mt-1 font-heading text-3xl font-bold text-[#2A2227]">
                  ${estimatedTotal.toFixed(2)} MXN
                </p>
              </div>

              <p className="max-w-xs text-right text-sm leading-6 text-[#707070]">
                El costo final puede variar según las características y
                personalización de tu pedido.
              </p>
            </div>

            <div id="datos" className="scroll-mt-28 pt-4">
              <QuoteCartForm onSuccess={() => setSubmitted(true)} />
            </div>
          </div>
        )}
      </div>
    </main>
    </MainLayout>
  );
}
