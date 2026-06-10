import * as React from "react";
import { cn } from "../../lib/utils";

type Variant = "warn" | "muted";

const variants: Record<Variant, string> = {
  warn: "bg-amber-200 text-amber-900",
  muted: "bg-white/15 text-sky-50",
};

export function Badge({
  variant = "muted",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-3 py-1 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
