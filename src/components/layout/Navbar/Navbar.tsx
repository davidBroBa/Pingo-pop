import Link from "next/link";
import { LogIn, User } from "lucide-react";

import { Logo } from "@/components/shared";
import { Button } from "@/components/ui";

import { Container } from "../Container";

import { NAVIGATION } from "@/constants/navigation";

import type { NavbarProps } from "./Navbar.types";

type NavbarExtendedProps = NavbarProps & {
  /**
   * Si hay sesion. Lo decide el servidor y se pasa como propuesta para que el navbar
   * siga siendo un Server Component: leer cookies aqui lo convertiria en cliente.
   */
  haySesion?: boolean;
};

export function Navbar({
  className,
  haySesion = false,
  ...props
}: NavbarExtendedProps) {
  return (
    <header
      className={`sticky top-0 z-50 border-b-2 border-primary bg-white ${
        className ?? ""
      }`}
      {...props}
    >
      <Container className="flex h-20 items-center justify-between">
        <Link href="/" className="cartoon-focus rounded-[12px]">
          <Logo width={140} height={48} priority />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAVIGATION.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="cartoon-focus rounded-[8px] text-sm font-medium text-primary transition-colors hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {/* Con sesion, "Iniciar sesion" no aporta: el sitio entero es publico. */}
          {haySesion ? (
            <Link
              href="/perfil"
              className="cartoon-border cartoon-shadow-sm cartoon-hover cartoon-focus flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-primary"
            >
              <User className="h-4 w-4" aria-hidden />
              Mi perfil
            </Link>
          ) : (
            <Link
              href="/login"
              className="cartoon-border cartoon-shadow-sm cartoon-hover cartoon-focus flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-primary"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Iniciar sesión
            </Link>
          )}
          <Link href="/cotizacion" className="cartoon-focus rounded-[16px]">
            <Button>Mi cotización</Button>
          </Link>
        </div>
      </Container>
    </header>
  );
}
