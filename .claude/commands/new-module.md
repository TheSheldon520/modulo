---
description: Scaffold un nouveau module Modulo en respectant strictement MODULE_BLUEPRINT.md
argument-hint: <module-id-en-kebab-case> (ex. crm-light, ai-reports)
allowed-tools: Read, Glob, Grep, Edit, Write, Bash(ls:*), Bash(mkdir:*), Bash(touch:*), Bash(pnpm typecheck), Bash(pnpm install)
---

Création d'un nouveau module : **$ARGUMENTS**

## Procédure obligatoire

### 1. Validation préalable
- Vérifie que `$ARGUMENTS` est bien en **kebab-case** (lettres minuscules, tirets, pas d'espace, pas de underscore)
- Vérifie que le dossier `modules/$ARGUMENTS` **n'existe pas déjà** — si oui, refuse et signale-le
- Vérifie que la phase 0 du ROADMAP est terminée (l'app web et les packages partagés doivent exister)

### 2. Contexte obligatoire
Lis dans cet ordre :
1. `CLAUDE.md` (racine)
2. `docs/MODULE_BLUEPRINT.md` (la référence absolue pour cette tâche)
3. `docs/ARCHITECTURE.md` (sections 2 et 3 : structure monorepo, schéma BDD)
4. `docs/DESIGN_SYSTEM.md` (pour les conventions UI à venir)
5. Un module existant si disponible (ex: `modules/sales-analytics/`) — pour calquer la structure réelle

### 3. Délégation
**Invoque le sub-agent `architect`** pour cette tâche. La création d'un module est structurante et touche plusieurs packages.

### 4. Plan obligatoire (validation requise avant exécution)
Le plan doit lister :
- L'arborescence complète à créer (chemins exacts)
- Le contenu de `module.config.ts` proposé (id, name, slug, icône, pricing, navigation, scopes, defaultRolePermissions)
- Les tables Drizzle initiales prévues (avec `organization_id` indexé)
- L'enregistrement dans `packages/db/schema/index.ts` (re-export)
- L'enregistrement dans le router root tRPC (`apps/web/trpc/router.ts`)
- Le montage dans `apps/web/app/(app)/[orgSlug]/m/<slug>/`

**STOP** : attends "go" de Chris avant d'écrire quoi que ce soit.

### 5. Exécution
Suis exactement la checklist du MODULE_BLUEPRINT.md section "Checklist de validation d'un module" :

- [ ] `module.config.ts` complet
- [ ] Toutes les tables ont `organization_id` indexé + FK cascade
- [ ] Tous les routers utilisent `moduleProcedure("$ARGUMENTS")`
- [ ] Aucun import depuis un autre module
- [ ] Events documentés dans `events.ts`
- [ ] `README.md` du module créé
- [ ] Empty states designés pour chaque liste/page (placeholders OK pour le scaffold)
- [ ] Loading states (skeletons) sur chaque chargement (placeholders OK)
- [ ] Pas de couleur hardcodée (uniquement tokens)
- [ ] Le module peut être désactivé dans `/settings/modules` sans casser le reste de l'app

### 6. Vérifications finales
- `pnpm install` (au cas où nouveau workspace)
- `pnpm typecheck`
- `pnpm lint`
- Lance manuellement `pnpm dev` n'est PAS nécessaire (Chris le fera s'il veut visualiser)

### 7. Rapport final
À la fin, produis :
- Liste des fichiers créés (chemins absolus)
- Confirmation que la checklist est ✅ sur tous les points
- Suggestion de commit : `feat(<id>): scaffold initial module $ARGUMENTS`
- Suggestion d'invoquer `/review-before-commit` avant de commiter

## Règles strictes

- Le module créé doit être **fonctionnel mais minimal** : routers placeholders (1 query `list`, 1 mutation `create`), pages placeholders, tables avec 2-3 champs métier réalistes
- **Pas de feature complète** dans ce scaffold — c'est juste la fondation
- Si tu hésites sur la modélisation métier, **demande à Chris** plutôt que d'inventer
