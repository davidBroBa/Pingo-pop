import { cva } from "class-variance-authority";

export const inputVariants = cva(
  "cartoon-border cartoon-focus h-12 w-full rounded-[16px] bg-white px-4 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-foreground-muted",
);
