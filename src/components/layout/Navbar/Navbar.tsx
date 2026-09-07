import Link from "next/link";

import { Logo } from "@/components/shared";
import { Button } from "@/components/ui";

import { Container } from "../Container";

import { NAVIGATION } from "@/constants/navigation";

import type { NavbarProps } from "./Navbar.types";

export function Navbar({ className, ...props }: NavbarProps) {
  return (
    <header
      className={`sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md ${
        className ?? ""
      }`}
      {...props}
    >
      <Container className="flex h-20 items-center justify-between">
        <Link href="/">
          <Logo width={140} height={48} priority />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAVIGATION.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-foreground transition-colors hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/cotizacion">
          <Button>Mi cotización</Button>
        </Link>
      </Container>
    </header>
  );
}
