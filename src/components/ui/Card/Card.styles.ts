import { cva } from "class-variance-authority";

export const cardVariants = cva(
  "rounded-[24px] border border-border bg-card p-6 transition-all duration-200",
  {
    variants: {
      hover: {
        true: "hover:-translate-y-1 hover:shadow-md",
        false: "",
      },
    },

    defaultVariants: {
      hover: true,
    },
  },
);
