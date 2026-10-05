import { cn } from "@/lib/utils";

import { inputVariants } from "./Input.styles";
import type { InputProps } from "./Input.types";

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(inputVariants(), className)} {...props} />;
}
