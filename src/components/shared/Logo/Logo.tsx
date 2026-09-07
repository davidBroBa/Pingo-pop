import Image from "next/image";

import type { LogoProps } from "./Logo.types";

export function Logo({
  width = 140,
  height = 48,
  priority = false,
  ...props
}: LogoProps) {
  return (
    <div className="flex items-center" {...props}>
      <Image
        src="/images/logo/logo.png"
        alt="Pingo"
        width={width}
        height={height}
        priority={priority}
        className="h-auto max-h-12 w-auto object-contain"
      />
    </div>
  );
}
