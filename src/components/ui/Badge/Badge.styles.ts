import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "cartoon-border cartoon-shadow-sm inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card text-foreground",

        accent: "bg-accent text-primary",

        dark: "bg-primary text-white",

        pink: "bg-cartoon-pink text-primary",

        sky: "bg-cartoon-sky text-primary",

        mint: "bg-cartoon-mint text-primary",

        lavender: "bg-cartoon-lavender text-primary",
      },
    },

    defaultVariants: {
      variant: "default",
    },
  },
);
