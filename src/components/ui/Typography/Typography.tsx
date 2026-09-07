import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type TypographyProps = HTMLAttributes<HTMLElement> & {
  variant?: "h1" | "h2" | "h3" | "body" | "body-lg" | "small";
};

const variants = {
  h1: "font-heading text-5xl font-bold leading-tight tracking-tight md:text-6xl",
  h2: "font-heading text-4xl font-bold leading-tight tracking-tight md:text-5xl",
  h3: "font-heading text-2xl font-bold leading-tight md:text-3xl",
  "body-lg": "text-lg leading-8",
  body: "text-base leading-7",
  small: "text-sm leading-6",
};

const elements = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  "body-lg": "p",
  body: "p",
  small: "span",
} as const;

export function Typography({
  variant = "body",
  className,
  ...props
}: TypographyProps) {
  const Component = elements[variant];

  return <Component className={cn(variants[variant], className)} {...props} />;
}
