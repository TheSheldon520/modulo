/*
 * @modulo/ui — Toaster (sonner)
 *
 * shadcn/ui base, retokenized to the Modulo design system. See
 * `components/README.md` for the full shadcn -> Modulo class mapping.
 *
 * Modulo ships a single dark theme, so the `next-themes` integration from the
 * stock shadcn component is dropped: `theme` is pinned to "dark" and the
 * sonner CSS variables point straight at Modulo tokens (surface-2 / text /
 * border / radius). When per-tenant theming lands these vars stay live because
 * the tokens themselves are rewritten at runtime.
 */
"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" strokeWidth={1.5} />,
        info: <InfoIcon className="size-4" strokeWidth={1.5} />,
        warning: <TriangleAlertIcon className="size-4" strokeWidth={1.5} />,
        error: <OctagonXIcon className="size-4" strokeWidth={1.5} />,
        loading: (
          <Loader2Icon className="size-4 animate-spin" strokeWidth={1.5} />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--surface-2)",
          "--normal-text": "var(--text-primary)",
          "--normal-border": "var(--border-subtle)",
          "--border-radius": "var(--radius-md)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
