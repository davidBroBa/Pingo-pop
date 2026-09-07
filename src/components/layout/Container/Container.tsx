import { cn } from "@/lib/utils";

import type { ContainerProps } from "./Container.types";

export function Container({ className, ...props }: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-6", className)}
      {...props}
    />
  );
}
