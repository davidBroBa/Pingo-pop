import Link from "next/link";
import { LogIn } from "lucide-react";

import { Logo } from "@/components/shared";
import { Button } from "@/components/ui";

import { Container } from "../Container";

import { NAVIGATION } from "@/constants/navigation";

import type { NavbarProps } from "./Navbar.types";

export function Navbar({ className, ...props }: NavbarProps) {
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
          <Link
            href="/login"
            className="cartoon-border cartoon-shadow-sm cartoon-hover cartoon-focus flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-primary"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Iniciar sesión
          </Link>
          <Link href="/cotizacion" className="cartoon-focus rounded-[16px]">
            <Button>Mi cotización</Button>
          </Link>
        </div>
      </Container>
    </header>
  );
}
