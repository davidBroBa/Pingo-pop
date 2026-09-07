import { ArrowRight } from "lucide-react";

import { Card, Typography } from "@/components/ui";

const steps = [
  {
    number: "01",
    title: "Elige tu producto",
    description: "Escoge el producto que más se adapte a tu idea o proyecto.",
  },
  {
    number: "02",
    title: "Mándanos tu diseño",
    description:
      "Envíanos tu imagen, ilustración o concepto y nosotros nos encargamos del resto.",
  },
  {
    number: "03",
    title: "Lo hacemos realidad",
    description:
      "Fabricamos tu producto cuidando cada detalle para que recibas algo especial.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-[#FCFCFC] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl space-y-14 px-6">
        <div className="max-w-2xl space-y-4">
          <span className="text-sm font-semibold uppercase tracking-[0.15em] text-[#707070]">
            Cómo funciona
          </span>

          <Typography variant="h2" className="text-[#2A2227]">
            De una idea a algo real
          </Typography>

          <Typography variant="body-lg" className="text-[#707070]">
            Hacer algo personalizado no tiene por qué ser complicado.
          </Typography>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.number} className="relative min-h-[300px]">
              <div className="flex h-full flex-col justify-between gap-12">
                <div className="flex items-center justify-between">
                  <span className="font-heading text-4xl font-bold text-[#F7B92C]">
                    {step.number}
                  </span>

                  {index < steps.length - 1 && (
                    <ArrowRight
                      size={20}
                      className="hidden text-[#707070] md:block"
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <Typography variant="h3" className="text-[#2A2227]">
                    {step.title}
                  </Typography>

                  <Typography variant="body" className="text-[#707070]">
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
