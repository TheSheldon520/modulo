/*
 * @modulo/ui — SubmitButton
 *
 * Convention Modulo non négociable : tout bouton lié à une mutation tRPC
 * passe par ce composant. Il empêche le double-submit (disabled pendant
 * isPending), affiche un spinner Loader2, et supporte l'échange de label
 * pendant le chargement via `loadingLabel`.
 *
 * Pattern forwardRef identique à button.tsx (shadcn/ui).
 * `asChild` : incompatible avec `isLoading` — quand asChild=true, le Slot
 * Radix prend le contrôle du rendu des enfants et l'injection du spinner
 * ne peut pas se faire de façon fiable. Si les deux sont fournis en même
 * temps, `isLoading` est silencieusement ignoré.
 *
 * La logique de dérivation des props est isolée dans
 * `packages/ui/lib/submit-button-state.ts` pour être testable
 * sans rendu DOM (purement unitaire, pas de jsdom requis).
 */
import * as React from "react"
import { Loader2 } from "lucide-react"
import type { VariantProps } from "class-variance-authority"

import { Button, type buttonVariants } from "./button"
import { deriveSubmitButtonState } from "../lib/submit-button-state"

// Ré-export de la fonction pure pour les consumers qui veulent la tester
// ou l'utiliser directement (utilitaire partagé).
export { deriveSubmitButtonState } from "../lib/submit-button-state"

export interface SubmitButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Quand true : disabled + spinner + échange de label optionnel. */
  isLoading?: boolean
  /**
   * Label alternatif affiché pendant le chargement.
   * Si absent, les `children` restent visibles et le spinner s'ajoute.
   */
  loadingLabel?: string
}

const SubmitButton = React.forwardRef<HTMLButtonElement, SubmitButtonProps>(
  function SubmitButton(
    {
      isLoading = false,
      loadingLabel,
      disabled,
      asChild = false,
      children,
      ...rest
    },
    ref,
  ) {
    const { isDisabled, showSpinner, renderedChildren } =
      deriveSubmitButtonState({
        isLoading,
        loadingLabel,
        disabled,
        asChild,
        children,
      })

    return (
      <Button
        ref={ref}
        disabled={isDisabled}
        aria-busy={showSpinner}
        asChild={asChild}
        {...rest}
      >
        {renderedChildren as React.ReactNode}
        {showSpinner ? <Loader2 className="size-4 animate-spin" /> : null}
      </Button>
    )
  },
)

SubmitButton.displayName = "SubmitButton"

export { SubmitButton }
