import type { Metadata } from "next";
import { Fredoka, Manrope } from "next/font/google";

import { QuoteCartProvider } from "@/context/QuoteCartContext";

import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pingo POP",
  description:
    "Productos personalizados, pines, botones, impresión 3D y mucho más.",
};

/**
 * Layout raiz.
 *
 * Las variables de fuente se aplican al `<html>`, no al `<body>`: en
 * `globals.css`, `--font-heading` y `--font-body` se declaran en `:root` y
 * apuntan a ellas. Las propiedades personalizadas heredan hacia abajo, asi que
 * definirlas en el `<body>` dejabathose tokens invalidos en `:root` y ninguna
 * fuente se aplicaba en toda la web.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${fredoka.variable} ${manrope.variable}`}>
      <body>
        <QuoteCartProvider>{children}</QuoteCartProvider>
      </body>
    </html>
  );
}
