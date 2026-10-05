import type { HTMLAttributes } from "react";

export interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  width?: number;
  height?: number;
  priority?: boolean;
}
