import type { ButtonHTMLAttributes } from "react";
import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "./Button.styles";

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}
