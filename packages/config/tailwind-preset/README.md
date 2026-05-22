# @modulo/tailwind-preset

⚠️ **API Tailwind v3 — placeholder T0.1.**

Ce preset est actuellement écrit en API Tailwind v3 (objet JS via
`Partial<Config>`). Il n'est PAS importé dans `apps/web` — le câblage
a été reporté à T0.3.

## Décision T0.2 (à respecter en T0.3)

Le portage doit suivre l'approche **CSS-first Tailwind v4** :

- Créer `packages/config/tailwind-preset/theme.css` avec un bloc
  `@theme { ... }` qui expose les design tokens
- Câbler depuis `apps/web/globals.css` via :
  `@import "@modulo/tailwind-preset/theme.css";`
- NE PAS recréer un `tailwind.config.ts` dans `apps/web` — c'est
  l'anti-pattern v4
- Le fichier `index.ts` actuel peut rester comme legacy (ou être
  supprimé une fois le portage validé)

Référence : décision tranchée à la question "Action 1 — Tailwind
v4 ne charge pas tailwind.config.ts" en T0.2.
