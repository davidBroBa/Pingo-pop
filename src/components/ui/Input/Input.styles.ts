import { cva } from "class-variance-authority";

export const inputVariants = cva(
  "h-12 w-full rounded-[16px] border border-border bg-white px-4 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-foreground-muted focus:border-accent focus:ring-2 focus:ring-accent/20",
);
