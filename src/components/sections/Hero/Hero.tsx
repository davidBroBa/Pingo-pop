import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Typography } from "@/components/ui";

/** Estrella de 4 puntas decorativa (docs/DESIGN.md §3.6). */
function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <path
        d="M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z"
        fill="currentColor"
        stroke="#2A2227"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Squiggle decorativo bajo titulares. */
function Squiggle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 24"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <path
        d="M4 16 Q 22 4 40 14 T 76 14 T 112 14 T 148 14 T 184 14 T 216 14"
        stroke="#F7B92C"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-cartoon-cream">
      {/* Formas decorativas flotantes */}
      <Star className="absolute left-[6%] top-16 h-10 w-10 text-cartoon-pink" />
      <Star className="absolute right-[42%] top-24 h-6 w-6 rotate-12 text-cartoon-sky" />
      <Star className="absolute bottom-16 left-[38%] h-8 w-8 -rotate-6 text-cartoon-lavender" />

      <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:py-24">
        <div className="max-w-2xl space-y-8">
          <div className="cartoon-border cartoon-shadow-sm inline-flex -rotate-2 rounded-full bg-cartoon-pink px-4 py-2">
            <span className="text-sm font-semibold text-primary">
              Surtido mayorista
            </span>
          </div>

          <Typography variant="h1" className="font-heading text-primary">
            Surtimos tu
            <br />
            <span className="relative inline-block">
              negocio.
              <Squiggle className="absolute -bottom-3 left-0 w-full" />
            </span>
          </Typography>

          <Typography variant="body-lg" className="max-w-xl text-foreground-muted">
            Pines metálicos, llaveros, réplicas en impresión 3D, acrílicos y
            fotobotones. Pedidos al mayoreo para negocios, con precio por
            volumen.
          </Typography>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/cotizacion"
              className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-accent px-6 font-medium text-primary"
            >
              Solicitar cotización
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/products"
              className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus inline-flex h-12 items-center justify-center rounded-[16px] bg-white px-6 font-medium text-foreground"
            >
              Ver catálogo
            </Link>
          </div>
        </div>

        <div className="relative flex min-h-[420px] items-center justify-center">
          <div className="cartoon-border-thick cartoon-shadow-lg relative flex h-[360px] w-full max-w-[480px] rotate-2 items-center justify-center rounded-[32px] bg-white">
            <span className="font-heading text-6xl font-bold text-primary">
              Pingo
            </span>
            <Star className="absolute -right-5 -top-5 h-14 w-14 rotate-12 text-accent" />
            <div className="cartoon-border cartoon-shadow-sm absolute -bottom-4 -left-4 rotate-[-4deg] rounded-full bg-cartoon-mint px-4 py-2">
              <span className="text-sm font-semibold text-primary">
                Catálogo
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
