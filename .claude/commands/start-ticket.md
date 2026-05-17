---
description: Démarre un ticket de la ROADMAP avec délégation automatique au bon sub-agent
argument-hint: <ticket-id> (ex. T0.2, T1.4)
allowed-tools: Read, Glob, Grep
---

Je veux démarrer le ticket **$ARGUMENTS** du projet Modulo.

## Procédure obligatoire

### 1. Contexte
Lis **dans cet ordre** les fichiers suivants :
1. `CLAUDE.md` (racine) — règles inviolables
2. `docs/ROADMAP.md` — trouve la section précise du ticket $ARGUMENTS
3. `docs/ARCHITECTURE.md` — pour la stack et les patterns
4. Si le ticket touche un module existant : tout le dossier `modules/<id>/`
5. Si le ticket touche le design : `docs/DESIGN_SYSTEM.md`
6. Si le ticket crée un module : `docs/MODULE_BLUEPRINT.md`

### 2. Délégation automatique
En te basant sur la nature du ticket, **choisis et invoque le sub-agent le plus approprié** :
- Ticket structurel / fondation / packages partagés → `architect`
- Ticket de routeur tRPC / schéma Drizzle module / logique serveur → `backend-engineer`
- Ticket de composant / page / UI → `ui-engineer`
- Si le ticket combine plusieurs domaines, propose un plan multi-agents séquentiel

### 3. Plan
Avant TOUTE écriture de code, produis un plan structuré :
- **Sub-agent retenu** et justification (1 ligne)
- **Fichiers à créer / modifier** (liste avec chemins)
- **Dépendances à ajouter** (si applicable, justifiées)
- **Critères d'acceptation** repris du ROADMAP
- **Risques identifiés** et mitigations

### 4. Validation
**ATTENDS la validation explicite de Chris** ("go", "vas-y", "ok") avant d'exécuter.

### 5. Exécution
Une fois validé, exécute le plan. Si tu découvres un blocage en cours, **arrête-toi et signale-le** — n'improvise pas.

### 6. Vérification
À la fin :
- Lance `pnpm typecheck` et `pnpm lint`
- Rapporte les résultats
- Liste les fichiers modifiés
- **Suggère de lancer `/review-before-commit`** avant le commit

## Règles importantes

- Strictement scoper au ticket $ARGUMENTS. Pas de "tant qu'on y est"
- Aucun `any` TypeScript
- Aucun import inter-module
- Aucune couleur hardcodée (uniquement tokens du design system)
- Toutes les tables de module ont `organization_id` indexé
- Toutes les procédures de module passent par `moduleProcedure("<id>")`
