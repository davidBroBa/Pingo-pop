import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Typography } from "@/components/ui";

export function CTA() {
  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-[32px] bg-[#2A2227] px-8 py-16 md:px-16 md:py-20">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#F7B92C] opacity-20 blur-3xl" />

          <div className="relative max-w-2xl space-y-7">
            <span className="text-sm font-semibold uppercase tracking-[0.15em] text-[#F7B92C]">
              Hagámoslo realidad
            </span>

            <Typography variant="h2" className="text-white">
              ¿Tienes una idea?
              <br />
              Nosotros la hacemos.
            </Typography>

            <Typography variant="body-lg" className="max-w-xl text-white/70">
              Cuéntanos qué tienes en mente y creemos juntos algo completamente
              personalizado.
            </Typography>

            <div className="pt-2">
              <Link
                href="/cotizacion"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#F7B92C] px-6 py-3 font-semibold text-[#2A2227] transition duration-200 hover:scale-[1.01]"
              >
                Crear mi pedido
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
