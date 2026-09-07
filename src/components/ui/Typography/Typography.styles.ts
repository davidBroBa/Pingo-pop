import { cva } from "class-variance-authority";

export const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "font-heading text-5xl font-bold tracking-tight text-foreground",
      h2: "font-heading text-4xl font-bold tracking-tight text-foreground",
      h3: "font-heading text-3xl font-semibold tracking-tight text-foreground",

      body: "font-body text-base text-foreground",
      "body-lg": "font-body text-lg text-foreground",

      label: "font-body text-sm font-medium text-foreground",

      caption: "font-body text-sm text-foreground-muted",
    },
  },

  defaultVariants: {
    variant: "body",
  },
});
