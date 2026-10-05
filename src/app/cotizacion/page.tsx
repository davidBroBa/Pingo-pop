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
      <main className="min-h-screen bg-cartoon-cream px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="cartoon-border-thick cartoon-shadow-lg rounded-3xl bg-white p-8 text-center sm:p-12">
            <div className="cartoon-border cartoon-shadow mx-auto flex h-16 w-16 rotate-6 items-center justify-center rounded-full bg-cartoon-mint">
              <span className="text-2xl font-bold text-primary">✓</span>
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.15em] text-foreground-muted">
              Solicitud recibida
            </p>

            <h1 className="mt-3 text-3xl font-bold text-primary sm:text-4xl">
              ¡Tu cotización fue enviada!
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-foreground-muted">
              Recibimos correctamente tu solicitud. Revisaremos los detalles de
              tu pedido y nos pondremos en contacto contigo para confirmar todo.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/products"
                onClick={clearCart}
                className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus inline-flex h-12 items-center justify-center rounded-2xl bg-accent px-6 font-semibold text-primary"
              >
                Seguir navegando
              </Link>

              <Link
                href="/"
                onClick={clearCart}
                className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 font-semibold text-primary"
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
    <main className="min-h-screen bg-cartoon-cream px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/products"
          className="cartoon-focus mb-10 inline-flex items-center gap-2 rounded-[8px] text-sm font-medium text-foreground-muted transition-colors hover:text-primary"
        >
          <ArrowLeft size={16} />
          Volver a productos
        </Link>

        <div className="mb-12 max-w-2xl">
          <span className="cartoon-border cartoon-shadow-sm inline-block rotate-[-1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Mi cotización
          </span>

          <h1 className="mt-4 text-5xl font-bold text-primary">
            Crea tu pedido
          </h1>

          <p className="mt-4 text-lg leading-8 text-foreground-muted">
            Revisa los productos que quieres cotizar y ajusta las cantidades.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="cartoon-border cartoon-shadow rounded-3xl bg-card p-10 text-center">
            <h2 className="text-2xl font-bold text-primary">
              Tu cotización está vacía
            </h2>

            <p className="mt-3 text-foreground-muted">
              Agrega productos para comenzar tu solicitud.
            </p>

            <Link
              href="/products"
              className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-accent px-6 font-semibold text-primary"
            >
              Ver productos
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground-muted">
                {totalItems} {totalItems === 1 ? "producto" : "productos"}
              </p>

              <button
                type="button"
                onClick={clearCart}
                className="cartoon-border cartoon-shadow-sm cartoon-focus rounded-full bg-cartoon-coral px-4 py-1.5 text-sm font-medium text-primary transition-transform duration-200 hover:-translate-y-0.5"
              >
                Vaciar cotización
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="cartoon-border cartoon-shadow flex flex-col gap-5 rounded-3xl bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                  <div className="flex items-center gap-5">
                    <div className="cartoon-border cartoon-shadow-sm flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white">
                      <span className="font-heading text-xl font-bold text-primary/20">
                        Pingo
                      </span>
                    </div>

                    <div>
                      <p className="text-sm text-foreground-muted">
                        Producto personalizado
                      </p>

                      <h2 className="mt-1 text-xl font-bold text-primary">
                        {item.name}
                      </h2>

                      <p className="mt-2 font-semibold text-primary">
                        Desde ${item.price} MXN
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-6 sm:justify-end">
                    <div className="cartoon-border cartoon-shadow-sm flex items-center rounded-2xl bg-white">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        disabled={item.quantity === 1}
                        className="cartoon-focus flex h-10 w-10 items-center justify-center disabled:opacity-30"
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
                        className="cartoon-focus flex h-10 w-10 items-center justify-center"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="cartoon-border cartoon-shadow-sm cartoon-focus flex h-10 w-10 items-center justify-center rounded-full bg-white text-foreground-muted transition-colors hover:bg-cartoon-coral hover:text-primary"
                      aria-label={`Eliminar ${item.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cartoon-border-thick cartoon-shadow-lg flex flex-col items-start justify-between gap-5 rounded-3xl bg-primary p-6 sm:flex-row sm:items-center sm:p-8">
              <div>
                <p className="text-sm text-white/60">Siguiente paso</p>

                <h2 className="mt-1 text-2xl font-bold text-white">
                  Solicita tu cotización
                </h2>

                <p className="mt-2 text-sm text-white/60">
                  Revisaremos tu pedido y te contactaremos para confirmar los
                  detalles.
                </p>
              </div>
            </div>
            <div className="cartoon-border cartoon-shadow flex items-center justify-between rounded-3xl bg-card p-6 sm:p-8">
              <div>
                <p className="text-sm text-foreground-muted">
                  Costo aproximado
                </p>
                <p className="cartoon-border cartoon-shadow-sm mt-1 inline-block rounded-2xl bg-accent px-4 py-1 text-3xl font-bold text-primary">
                  ${estimatedTotal.toFixed(2)} MXN
                </p>
              </div>

              <p className="max-w-xs text-right text-sm leading-6 text-foreground-muted">
                El costo final puede variar según las características y
                personalización de tu pedido.
              </p>
            </div>

            <div id="datos" className="scroll-mt-28 pt-4">
              {/* Al enviar bien se vacia el carrito: si no, al recargar el
                  usuario veria su pedido intacto y podria reenviarlo. */}
              <QuoteCartForm
                onSuccess={() => {
                  setSubmitted(true);
                  clearCart();
                }}
              />
            </div>
          </div>
        )}
      </div>
    </main>
    </MainLayout>
  );
}
