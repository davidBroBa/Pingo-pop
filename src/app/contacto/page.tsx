import Link from "next/link";

export default function ContactoPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="mb-10 inline-flex text-sm font-medium text-[#707070] transition-colors hover:text-[#2A2227]"
        >
          ← Volver al inicio
        </Link>

        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#707070]">
            Contacto
          </p>

          <h1 className="font-heading text-5xl font-bold text-[#2A2227]">
            Hablemos de tu idea
          </h1>

          <p className="mt-6 text-lg leading-8 text-[#707070]">
            ¿Tienes un proyecto en mente? Cuéntanos qué quieres crear y
            encontraremos la mejor forma de hacerlo realidad.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-[#ECECEC] bg-[#FAFAFA] p-8">
            <h2 className="font-heading text-2xl font-bold text-[#2A2227]">
              Solicita una cotización
            </h2>

            <p className="mt-3 leading-7 text-[#707070]">
              Elige un producto y envíanos los detalles de tu proyecto.
            </p>

            <Link
              href="/products"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[#F7B92C] px-6 font-semibold text-[#2A2227] transition duration-200 hover:scale-[1.01]"
            >
              Ver productos
            </Link>
          </div>

          <div className="rounded-3xl border border-[#ECECEC] bg-[#FAFAFA] p-8">
            <h2 className="font-heading text-2xl font-bold text-[#2A2227]">
              Estamos para ayudarte
            </h2>

            <p className="mt-3 leading-7 text-[#707070]">
              Si tienes una pregunta sobre materiales, cantidades o
              personalización, escríbenos y te orientaremos.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
