import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card text-foreground border border-border",

        accent: "bg-accent text-primary",

        dark: "bg-primary text-white",
      },
    },

    defaultVariants: {
      variant: "default",
    },
  },
);
