// apps/web/lib/submit-button.test.ts
//
// Tests unitaires purs sur `deriveSubmitButtonState` — aucun rendu DOM requis.
// La logique métier du SubmitButton (disabled, spinner, swap de label) est
// isolée dans `packages/ui/lib/submit-button-state.ts`, un module `.ts` pur
// sans JSX, importable directement dans l'environnement Vitest node de apps/web.
//
// Pas de jsdom requis : zéro nouvelle dépendance (règle T1.0 Chantier B).
// Ces 6 tests couvrent tous les cas comportementaux spec'd dans T1.0.

import { describe, expect, it } from "vitest"

import { deriveSubmitButtonState } from "@modulo/ui/lib/submit-button-state"

describe("deriveSubmitButtonState", () => {
  it("est disabled quand isLoading=true", () => {
    const { isDisabled } = deriveSubmitButtonState({
      isLoading: true,
      children: "Enregistrer",
    })
    expect(isDisabled).toBe(true)
  })

  it("affiche le spinner quand isLoading=true", () => {
    const { showSpinner } = deriveSubmitButtonState({
      isLoading: true,
      children: "Enregistrer",
    })
    expect(showSpinner).toBe(true)
  })

  it("n'affiche pas le spinner quand isLoading=false", () => {
    const { showSpinner } = deriveSubmitButtonState({
      isLoading: false,
      children: "Enregistrer",
    })
    expect(showSpinner).toBe(false)
  })

  it("remplace les children par loadingLabel quand isLoading=true et loadingLabel fourni", () => {
    const { renderedChildren } = deriveSubmitButtonState({
      isLoading: true,
      loadingLabel: "Création en cours…",
      children: "Créer",
    })
    expect(renderedChildren).toBe("Création en cours…")
  })

  it("conserve les children originaux quand isLoading=true mais sans loadingLabel", () => {
    const { renderedChildren } = deriveSubmitButtonState({
      isLoading: true,
      children: "Enregistrer",
    })
    expect(renderedChildren).toBe("Enregistrer")
  })

  it("est disabled via la prop native disabled même si isLoading=false", () => {
    const { isDisabled, showSpinner } = deriveSubmitButtonState({
      isLoading: false,
      disabled: true,
      children: "Supprimer",
    })
    expect(isDisabled).toBe(true)
    expect(showSpinner).toBe(false)
  })
})
