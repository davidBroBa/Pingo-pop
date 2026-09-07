import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Typography } from "@/components/ui";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:py-24">
        <div className="max-w-2xl space-y-8">
          <div className="inline-flex rounded-full border border-[#ECECEC] bg-[#FAFAFA] px-4 py-2">
            <span className="text-sm font-semibold text-[#2A2227]">
              Hecho especialmente para ti
            </span>
          </div>

          <Typography variant="h1" className="text-[#2A2227]">
            Tus ideas,
            <br />
            hechas realidad.
          </Typography>

          <Typography variant="body-lg" className="max-w-xl text-[#707070]">
            Creamos productos personalizados que convierten tus ideas en algo
            que puedes tocar, regalar y disfrutar.
          </Typography>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/cotizacion"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-accent px-6 font-medium text-primary transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
            >
              Crear mi pedido
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/products"
              className="inline-flex h-12 items-center justify-center rounded-[16px] border border-border bg-white px-6 font-medium text-foreground transition-all duration-200 hover:bg-card"
            >
              Ver productos
            </Link>
          </div>
        </div>

        <div className="relative flex min-h-[420px] items-center justify-center">
          <div className="absolute h-72 w-72 rounded-full bg-[#F7B92C]/20 blur-3xl" />

          <div className="relative flex h-[360px] w-full max-w-[480px] items-center justify-center rounded-[32px] border border-[#ECECEC] bg-[#FAFAFA] shadow-sm">
            <span className="font-heading text-6xl font-bold text-[#2A2227]">
              Pingo
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
