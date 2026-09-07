import type { HTMLAttributes } from "react";

export type TypographyVariant =
  "h1" | "h2" | "h3" | "body" | "body-lg" | "caption" | "label";

export interface TypographyProps extends HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  variant?: TypographyVariant;
}
