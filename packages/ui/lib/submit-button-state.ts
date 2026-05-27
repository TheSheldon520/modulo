/**
 * @modulo/ui — logique pure de SubmitButton
 *
 * Exporté séparément du composant React pour permettre les tests unitaires
 * sans rendu DOM (pas de jsdom requis). Le composant `submit-button.tsx`
 * ré-exporte cette fonction via son propre barrel.
 */

/**
 * Dérive l'état effectif du bouton à partir des props brutes.
 *
 * Règles :
 * - `asChild=true` + `isLoading=true` → isLoading ignoré silencieusement
 *   (Radix Slot prend le contrôle du rendu des enfants).
 * - `isDisabled` = `isLoading || disabled` (OR logique).
 * - `showSpinner` = true seulement quand isLoading effectif.
 * - `renderedChildren` = `loadingLabel` si chargement + label fourni,
 *   sinon `children` inchangé.
 */
export function deriveSubmitButtonState(props: {
  isLoading?: boolean
  loadingLabel?: string
  disabled?: boolean
  asChild?: boolean
  children: unknown
}): {
  isDisabled: boolean
  showSpinner: boolean
  renderedChildren: unknown
} {
  const { isLoading = false, loadingLabel, disabled = false, asChild = false } = props

  // asChild + isLoading incompatibles — on désactive silencieusement isLoading
  const effectiveLoading = isLoading && !asChild

  const isDisabled = effectiveLoading || disabled
  const showSpinner = effectiveLoading
  const renderedChildren =
    effectiveLoading && loadingLabel ? loadingLabel : props.children

  return { isDisabled, showSpinner, renderedChildren }
}
