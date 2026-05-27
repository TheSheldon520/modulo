# CLAUDE.md — Instructions pour Claude Code

> Ce fichier est la **source de vérité** pour toute génération de code dans le projet Modulo. À lire et respecter à chaque session.

## Contexte du projet

**Modulo** est une suite SaaS B2B **modulaire**. Chaque entreprise cliente compose sa propre suite en activant les modules dont elle a besoin. Le code est organisé en monorepo (pnpm workspaces + Turborepo) avec une séparation stricte entre le **shell applicatif** (`apps/web`), le **code partagé** (`packages/`), et les **modules métier** (`modules/`).

Lire **ARCHITECTURE.md** et **DESIGN_SYSTEM.md** avant toute génération substantielle.

---

## Règles inviolables

### 🔒 Isolation des modules
1. Un module dans `modules/X` **ne doit JAMAIS importer** depuis `modules/Y`.
2. Communication inter-modules **uniquement** via :
   - Events typés (`packages/events`)
   - Routers tRPC publics du module concerné
3. Toute table BDD d'un module **doit** avoir une colonne `organization_id` indexée + FK.
4. Toute query BDD d'un module **doit** filtrer par `organization_id` (via le middleware tRPC `moduleProcedure`).

### 🔐 Sécurité multi-tenant
1. **Jamais** d'API route qui ne vérifie pas l'org du user.
2. Utiliser `moduleProcedure("module-id")` pour toute route appartenant à un module.
3. Les IDs en URL sont **toujours** validés contre l'org active (un user d'org A ne doit pas pouvoir lire les data de l'org B même avec l'ID en main).

### 🎨 Theming
1. **Jamais** de couleur en dur (`bg-green-500`, `text-[#abc]`). Toujours via tokens (`bg-accent`, `text-primary`).
2. **Jamais** de pixel hardcodé pour radius, shadow, font-size — passer par les tokens Tailwind/CSS vars.

### 📦 TypeScript
1. **Jamais** `any`. Si vraiment bloqué, `unknown` + narrowing.
2. **Zod** comme source de vérité pour les schémas (inputs API, formulaires, env vars). Types dérivés via `z.infer`.
3. Fichiers de schéma Drizzle exportent les types via `$inferSelect` et `$inferInsert`.

### ⚛️ React / Next.js
1. **Server Components par défaut**. `"use client"` uniquement si interactivité réelle requise.
2. **Mutations** via tRPC, jamais `fetch` direct côté client.
3. **Suspense + streaming** pour les données lentes (dashboards, listes).
4. **Pas** de `useEffect` pour fetcher des data côté client — utiliser `useQuery` tRPC ou un Server Component.
5. **Mutations tRPC** : tout bouton submit lié à une mutation passe par `<SubmitButton isLoading={mutation.isPending}>` (composant `@modulo/ui`). Convention non négociable pour empêcher les double-submit et signaler clairement l'attente côté UX. Ne jamais utiliser un `<Button>` nu pour une mutation.

### 🏭 Factory pattern pour les clients externes
1. Tout client tiers (DB, Auth, Stripe, SDK Anthropic, …) s'expose via une **factory `getXxx()`** lazy avec cache `globalThis`. Jamais d'instance eager au module-load.
2. Exemples canoniques : `getDb()` dans `packages/db/src/client.ts` et `getAuth()` dans `packages/auth/src/index.ts`.
3. Bénéfices : zéro side-effect d'import (les tests ne crashent pas si les env vars manquent), connexion établie à la première utilisation réelle, compatible HMR Next via le cache `globalThis`.
4. Pour les env vars associées : `requireEnv("X")` est appelé **à l'intérieur** de la factory ou via un getter, pas au top-level du fichier. Le module reste importable même sans config complète.

---

## Conventions de nommage

### Fichiers
- React components : `PascalCase.tsx` (ex: `MetricCard.tsx`)
- Hooks : `useCamelCase.ts` (ex: `useSalesFilters.ts`)
- Helpers / lib : `kebab-case.ts` (ex: `format-currency.ts`)
- Routes tRPC : `kebab-case.router.ts` (ex: `deals.router.ts`)
- Schémas core (transverses) : `core.ts`, `billing.ts`, `auth.ts`, etc. dans `packages/db/schema/`. Naming court, par domaine.
- Schémas modules (par module métier) : `<module>.schema.ts` en kebab-case, dans `packages/<module>/schema/` ou équivalent. Naming explicite avec suffixe `.schema`.

> **Exception** : les composants shadcn/ui dans `packages/ui/components/` suivent le naming `kebab-case.tsx` upstream (`button.tsx`, `dropdown-menu.tsx`) pour rester compatibles avec la CLI `shadcn add`. Le `PascalCase` reste la convention pour tout composant maison ailleurs dans le repo.

### Variables
- React components & types : `PascalCase`
- Fonctions, variables : `camelCase`
- Constantes : `SCREAMING_SNAKE_CASE`
- Tables BDD : `snake_case` (Drizzle convention)

---

## Création d'un nouveau module

**Toujours** partir de `MODULE_BLUEPRINT.md`. Étapes :

1. `pnpm module:new <module-id>` (scaffold automatique depuis le template)
2. Définir `module.config.ts` (id, nom, icône, prix Stripe, scopes…)
3. Définir le schéma BDD dans `modules/<id>/schema.ts` (toujours avec `organizationId`)
4. Ajouter le schéma au barrel `packages/db/schema/index.ts`
5. Générer la migration : `pnpm --filter @modulo/db db:generate --name=<id>_init` (le `--filter` est obligatoire — Turbo root intercepte le flag `--name` sinon)
6. Créer le router tRPC dans `modules/<id>/router.ts` (avec `moduleProcedure("<id>")`)
7. Ajouter le router à `apps/web/trpc/router.ts`
8. Créer les pages dans `modules/<id>/pages/`
9. Monter le module dans `apps/web/app/(app)/[orgSlug]/m/<id>/`
10. Documenter dans `modules/<id>/README.md`

---

## Workflow Claude Code

### Découpage des tâches
- **Un ticket = un commit logique**. Si une tâche dépasse 30 min, la découper.
- Toujours **lire les fichiers existants concernés** avant de proposer une modification.
- Toujours **respecter les conventions du code existant**, même si elles diffèrent de celles ici.

### Modèle à utiliser selon la tâche
- **Sonnet** : CRUD, composants UI simples, helpers, migrations, tests unitaires
- **Opus** : architecture, design de schéma BDD, refactoring large, prompts IA complexes, debug retors

### Avant de coder
- Vérifier que le module/feature n'existe pas déjà (grep dans le repo).
- Confirmer les choix structurants importants avec moi (Chris) avant de les implémenter.

### Après avoir codé
- Lancer `pnpm typecheck` et `pnpm lint` avant de valider.
- Si modif de schéma BDD : générer la migration et la commiter.
- Mettre à jour le `README.md` du module si l'API publique change.

---

## Ce qu'il ne faut PAS faire

- ❌ Ajouter une dépendance npm sans en discuter (et la justifier)
- ❌ Créer un nouveau pattern d'architecture sans valider — réutiliser l'existant
- ❌ Mettre de la logique métier dans `apps/web` — tout va dans `modules/` ou `packages/`
- ❌ Faire des `console.log` dans le code commit (utiliser le logger structuré)
- ❌ Skip les Zod validations pour aller plus vite
- ❌ Mélanger Server et Client Components dans le même fichier
- ❌ Utiliser `getServerSideProps` ou `pages/` (on est en App Router strict)

---

## Stack de référence rapide

| Domaine | Choix | Pourquoi |
|---------|-------|----------|
| Framework | Next.js 15 App Router | RSC + streaming + edge |
| Style | Tailwind v4 + shadcn/ui | Tokens via CSS vars, ownership du code |
| BDD | PostgreSQL (Neon) + Drizzle | Serverless + perf + SQL-first |
| API | tRPC v11 | Type-safety end-to-end |
| Auth | Better Auth | Open-source, orgs natives |
| Billing | Stripe (par module) | Standard B2B + flexibilité |
| IA | SDK Anthropic + prompt caching | Claude est l'IA du projet |
| Jobs | Inngest | Workflows IA durables |
| Email | Resend | DX moderne |
| Hosting | Vercel + Neon | Préview branches + serverless |

---

## Commandes utiles

```bash
pnpm dev                    # Lance l'app
pnpm db:generate            # Génère les migrations Drizzle
pnpm db:migrate             # Applique les migrations
pnpm db:studio              # UI BDD
pnpm module:new <id>        # Scaffold un module
pnpm typecheck              # Vérification TS globale
pnpm lint                   # ESLint
pnpm test                   # Vitest
```

> Le fichier `.env.local` (vraies valeurs) se place à la **racine du repo** — tous les packages du monorepo le lisent depuis là.

---

## En cas de doute

Demander. Toujours mieux 2 min de clarification qu'1h de refactor.
