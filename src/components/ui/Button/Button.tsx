import { cn } from "@/lib/utils";

import { buttonVariants } from "./Button.styles";
import type { ButtonProps } from "./Button.types";

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
