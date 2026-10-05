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

const accents = [
  "bg-cartoon-sky",
  "bg-cartoon-pink",
  "bg-cartoon-mint",
  "bg-cartoon-lavender",
] as const;

export function Categories() {
  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl space-y-14 px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl space-y-4">
            <span className="cartoon-border cartoon-shadow-sm inline-block rotate-[-1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
              Lo que hacemos
            </span>

            <Typography variant="h2" className="font-heading text-primary">
              Productos hechos para tus ideas
            </Typography>

            <Typography variant="body-lg" className="max-w-xl text-foreground-muted">
              Convertimos diseños, personajes e ideas en productos
              personalizados que puedes tener en tus manos.
            </Typography>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, index) => (
            <Card
              key={category.number}
              className="group relative min-h-[280px] overflow-hidden"
            >
              <div className="flex h-full flex-col justify-between gap-10">
                <div className="flex items-start justify-between">
                  <span
                    className={`cartoon-border cartoon-shadow-sm flex h-9 w-9 rotate-[-3deg] items-center justify-center rounded-full text-sm font-bold text-primary ${accents[index % accents.length]}`}
                  >
                    {category.number}
                  </span>

                  <div className="cartoon-border flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary transition-transform duration-200 group-hover:rotate-45">
                    <ArrowUpRight size={18} />
                  </div>
                </div>

                <div className="space-y-3">
                  <Typography variant="h3" className="font-heading text-primary">
                    {category.title}
                  </Typography>

                  <Typography variant="body" className="text-foreground-muted">
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
