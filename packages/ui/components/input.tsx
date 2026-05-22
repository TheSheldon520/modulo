/*
 * @modulo/ui — Input
 *
 * shadcn/ui base, retokenized to the Modulo design system. See
 * `components/README.md` for the full shadcn -> Modulo class mapping.
 */
import type * as React from "react"

import { cn } from "../lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-border-default bg-transparent px-3 py-1 text-base shadow-sm transition-[color,box-shadow] outline-none selection:bg-accent selection:text-accent-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary placeholder:text-text-tertiary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/50",
        "aria-invalid:border-danger aria-invalid:ring-danger/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
