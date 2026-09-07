import Link from "next/link";

import { Container } from "../Container";
import { Logo } from "@/components/shared";

import { NAVIGATION } from "@/constants/navigation";

import type { FooterProps } from "./Footer.types";

export function Footer({ className, ...props }: FooterProps) {
  return (
    <footer
      className={`border-t border-border bg-background-secondary py-12 ${
        className ?? ""
      }`}
      {...props}
    >
      <Container className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-4">
          <Logo width={140} height={48} />

          <p className="max-w-xs text-sm text-foreground-muted">
            Pines, accesorios e impresión 3D personalizados para tus ideas.
          </p>
        </div>

        <nav className="flex flex-wrap gap-6">
          {NAVIGATION.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-foreground-muted transition-colors hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </Container>
    </footer>
  );
}
