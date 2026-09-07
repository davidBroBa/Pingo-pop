import { cn } from "@/lib/utils";

import { cardVariants } from "./Card.styles";
import type { CardProps } from "./Card.types";

export function Card({ className, ...props }: CardProps) {
  return <div className={cn(cardVariants(), className)} {...props} />;
}
