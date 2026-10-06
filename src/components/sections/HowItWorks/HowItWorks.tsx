import { ArrowRight } from "lucide-react";

import { Card, Typography } from "@/components/ui";

const steps = [
  {
    number: "01",
    title: "Elige del catálogo",
    description:
      "Recorre el catálogo y escoge los productos y cantidades que necesitas.",
  },
  {
    number: "02",
    title: "Solicita cotización",
    description:
      "Te respondemos con disponibilidad, precio y tiempos de entrega.",
  },
  {
    number: "03",
    title: "Confirmamos el pedido",
    description:
      "Aprobamos la orden y preparamos el surtido para entrega.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-cartoon-cream py-24 lg:py-32">
      <div className="mx-auto max-w-7xl space-y-14 px-6">
        <div className="max-w-2xl space-y-4">
          <span className="cartoon-border cartoon-shadow-sm inline-block rotate-[-1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Cómo funciona
          </span>

          <Typography variant="h2" className="font-heading text-primary">
            Pedir es sencillo
          </Typography>

          <Typography variant="body-lg" className="text-foreground-muted">
            Tres pasos: eliges, cotizas y te surtimos.
          </Typography>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.number} className="relative min-h-[300px] bg-white">
              <div className="flex h-full flex-col justify-between gap-12">
                <div className="flex items-center justify-between">
                  <span className="cartoon-border cartoon-shadow-sm flex h-14 w-14 rotate-[-3deg] items-center justify-center rounded-2xl bg-accent font-heading text-2xl font-bold text-primary">
                    {step.number}
                  </span>

                  {index < steps.length - 1 && (
                    <ArrowRight
                      size={20}
                      className="hidden text-foreground-muted md:block"
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <Typography variant="h3" className="font-heading text-primary">
                    {step.title}
                  </Typography>

                  <Typography variant="body" className="text-foreground-muted">
                    {step.description}
                  </Typography>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
