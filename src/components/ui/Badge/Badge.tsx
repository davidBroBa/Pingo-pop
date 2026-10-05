import { cn } from "@/lib/utils";

import { badgeVariants } from "./Badge.styles";
import type { BadgeProps } from "./Badge.types";

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
