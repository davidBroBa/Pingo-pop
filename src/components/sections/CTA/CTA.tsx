import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Typography } from "@/components/ui";

export function CTA() {
  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="cartoon-border-thick cartoon-shadow-lg relative overflow-hidden rounded-[32px] bg-primary px-8 py-16 md:px-16 md:py-20">
          <svg
            viewBox="0 0 100 100"
            aria-hidden="true"
            className="absolute -right-8 -top-8 h-40 w-40 rotate-12 text-accent"
          >
            <path
              d="M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z"
              fill="currentColor"
              stroke="#2A2227"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </svg>

          <div className="relative max-w-2xl space-y-7">
            <span className="cartoon-border cartoon-shadow-sm inline-block rotate-[-1deg] rounded-full bg-cartoon-pink px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
              Catálogo
            </span>

            <Typography variant="h2" className="font-heading text-white">
              ¿Buscas algo en concreto?
              <br />
              Pide una cotización.
            </Typography>

            <Typography variant="body-lg" className="max-w-xl text-white/70">
              Revisa nuestro catálogo y solicita cotización de los productos que ya existen.
            </Typography>

            <div className="pt-2">
              <Link
                href="/cotizacion"
                className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus inline-flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 font-semibold text-primary"
              >
                Solicitar cotización
                <ArrowRight
                  size={18}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
