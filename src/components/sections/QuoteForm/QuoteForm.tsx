"use client";

import Link from "next/link";
import { Check, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { useQuoteCart } from "@/context/QuoteCartContext";

type QuoteFormProps = {
  productId: number;
  productName: string;
  productSlug: string;
  productPrice: string;
  productImage?: string | null;
};

export function QuoteForm({
  productId,
  productName,
  productSlug,
  productPrice,
  productImage = null,
}: QuoteFormProps) {
  const { addItem } = useQuoteCart();
  const [added, setAdded] = useState(false);

  function handleAddToQuote() {
    addItem({
      id: productId,
      name: productName,
      slug: productSlug,
      price: productPrice,
      image: productImage,
    });

    setAdded(true);
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={handleAddToQuote}
        className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 font-semibold text-primary"
      >
        {added ? (
          <>
            <Check size={18} />
            Agregado a cotización
          </>
        ) : (
          <>
            <ShoppingBag size={18} />
            Agregar a cotización
          </>
        )}
      </button>

      {added && (
        <Link
          href="/cotizacion"
          className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus mt-3 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-white px-6 font-semibold text-primary"
        >
          Ver mi cotización
        </Link>
      )}
    </div>
  );
}
