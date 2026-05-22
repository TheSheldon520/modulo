/*
 * @modulo/ui — Badge
 *
 * shadcn/ui base, retokenized to the Modulo design system. See
 * `components/README.md` for the full shadcn -> Modulo class mapping.
 */
import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "../lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/50 aria-invalid:border-danger aria-invalid:ring-danger/20 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground [a&]:hover:bg-accent-hover",
        secondary:
          "bg-surface-2 text-text-primary [a&]:hover:bg-surface-3",
        destructive:
          "bg-danger text-danger-foreground focus-visible:ring-danger/20 [a&]:hover:bg-danger/90",
        outline:
          "border-border-default text-text-primary [a&]:hover:bg-surface-3 [a&]:hover:text-text-primary",
        ghost:
          "[a&]:hover:bg-surface-3 [a&]:hover:text-text-primary",
        link: "text-accent underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
