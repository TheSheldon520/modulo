/*
 * @modulo/ui — Textarea
 *
 * shadcn/ui base, retokenized to the Modulo design system. See
 * `components/README.md` for the full shadcn -> Modulo class mapping.
 */
import type * as React from "react"

import { cn } from "../lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-border-default bg-transparent px-3 py-2 text-base shadow-sm transition-[color,box-shadow] outline-none placeholder:text-text-tertiary focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-danger/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
