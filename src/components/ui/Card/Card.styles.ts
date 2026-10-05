import { cva } from "class-variance-authority";

export const cardVariants = cva(
  "rounded-[24px] bg-card p-6 transition-all duration-200",
  {
    variants: {
      hover: {
        true: "cartoon-border cartoon-shadow cartoon-hover",
        false: "cartoon-border cartoon-shadow",
      },
    },

    defaultVariants: {
      hover: true,
    },
  },
);
