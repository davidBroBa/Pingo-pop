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
  title: "Pingo Pop",
  description:
    "Productos personalizados, pines, botones, impresión 3D y mucho más.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${fredoka.variable} ${manrope.variable}`}>
        <QuoteCartProvider>{children}</QuoteCartProvider>
      </body>
    </html>
  );
}
