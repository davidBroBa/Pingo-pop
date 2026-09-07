import { ArrowUpRight } from "lucide-react";

import { Card, Typography } from "@/components/ui";

const categories = [
  {
    number: "01",
    title: "Pines metálicos",
    description:
      "Diseños personalizados con acabados profesionales para marcas, eventos y colecciones.",
  },
  {
    number: "02",
    title: "Botones fotográficos",
    description:
      "Recuerdos personalizados con tus imágenes, diseños o ilustraciones favoritas.",
  },
  {
    number: "03",
    title: "Impresión 3D",
    description: "Figuras, prototipos y piezas creadas especialmente para ti.",
  },
  {
    number: "04",
    title: "Llaveros",
    description:
      "Accesorios personalizados para regalos, negocios y proyectos especiales.",
  },
];

export function Categories() {
  return (
    <section className="bg-[#FCFCFC] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl space-y-14 px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl space-y-4">
            <span className="text-sm font-semibold uppercase tracking-[0.15em] text-[#707070]">
              Lo que hacemos
            </span>

            <Typography variant="h2" className="text-[#2A2227]">
              Productos hechos para tus ideas
            </Typography>

            <Typography variant="body-lg" className="max-w-xl text-[#707070]">
              Convertimos diseños, personajes e ideas en productos
              personalizados que puedes tener en tus manos.
            </Typography>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Card
              key={category.number}
              className="group relative min-h-[280px] overflow-hidden transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="flex h-full flex-col justify-between gap-10">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-semibold text-[#707070]">
                    {category.number}
                  </span>

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7B92C] text-[#2A2227] transition-transform duration-200 group-hover:scale-105">
                    <ArrowUpRight size={18} />
                  </div>
                </div>

                <div className="space-y-3">
                  <Typography variant="h3" className="text-[#2A2227]">
                    {category.title}
                  </Typography>

                  <Typography variant="body" className="text-[#707070]">
                    {category.description}
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
