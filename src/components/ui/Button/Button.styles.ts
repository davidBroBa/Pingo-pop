import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[16px] font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "cartoon-border cartoon-shadow cartoon-hover cartoon-focus bg-accent text-primary",

        secondary:
          "cartoon-border cartoon-shadow cartoon-hover cartoon-focus bg-white text-foreground",
      },

      size: {
        sm: "h-10 px-4 text-sm",
        md: "h-12 px-6",
        lg: "h-14 px-8 text-lg",
      },
    },

    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);
