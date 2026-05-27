# ROADMAP — Modulo

> Plan d'exécution séquentiel. Chaque ticket est conçu pour être confié à Claude Code en une session.

## Phase 0 — Fondations (avant tout module)

L'objectif de cette phase : avoir un shell applicatif fonctionnel sur lequel on peut greffer des modules. **Ne pas commencer Sales Analytics tant que la phase 0 n'est pas terminée.**

> **Note de réconciliation T0.10** (2026-05-27) — la ROADMAP initiale a évolué pendant l'exécution. Tickets réellement livrés Phase 0 :
> - **T0.1 → T0.5** livrés conformes au plan initial.
> - **T0.6** livré sans la « Personal Organization à la première connexion » — remplacée par un flow d'onboarding explicite (T0.8.5).
> - **T0.6.5** ajoutée comme intercalaire pour poser l'i18n (next-intl, locale `fr` en dur) **avant** tRPC, parce que les schémas Zod consomment `t(...)`.
> - **T0.7** livré conforme.
> - **T0.8** original (Shell multi-tenant : sidebar dynamique, topbar, switcher d'org, command palette) **reporté Phase 1** — le shell minimal actuel suffit tant qu'il n'y a qu'une org active par user, et le shell complet a plus de valeur juste avant le premier module.
> - **T0.8.5** ajoutée pour l'onboarding strict de création d'organisation, livrée Session 6 (`organizations.create` + middleware org-gate + cookie cleanup).
> - **T0.9** réorienté : « Settings org + theming » → « Stripe billing + module activation ». Le color picker OKLCH et le theming par tenant sont reportés Phase 1.
> - **T0.10** réorienté : « Système de modules » (registry + script `pnpm module:new`) → « Hardening + refactos pré-Phase 1 ». Le `moduleProcedure(id)` et le registry MODULES sont déjà en place (livrés T0.7 + T0.9). Le script `pnpm module:new` est reporté Phase 1.

### T0.1 — Init monorepo
**Goal** : créer la structure pnpm + Turborepo avec les workspaces vides.
- `pnpm init` + `pnpm-workspace.yaml`
- `turbo.json` avec pipelines de base (`dev`, `build`, `lint`, `typecheck`)
- Dossiers : `apps/web`, `packages/{ui,db,auth,api,ai,events,config}`, `modules/`
- Configs partagées dans `packages/config` : `eslint`, `tsconfig.base.json`, `tailwind.preset.ts`
- `.gitignore`, `.editorconfig`, `.nvmrc`

**Critères d'acceptation** : `pnpm install` fonctionne, `pnpm typecheck` passe sur un repo vide.

---

### T0.2 — Init app Next.js
**Goal** : `apps/web` opérationnelle avec App Router.
- `create-next-app` dans `apps/web` (TS, App Router, Tailwind)
- Setup Tailwind v4 avec import du preset partagé
- Page `/` avec un "Hello Modulo" stylé
- Setup ESLint avec le config partagé

**Critères d'acceptation** : `pnpm dev` lance Next, la page d'accueil s'affiche.

---

### T0.3 — Setup design tokens dans `packages/ui`
**Goal** : poser les CSS variables du design system.
- `packages/ui/tokens/colors.css` avec toute la palette OKLCH du `DESIGN_SYSTEM.md`
- `packages/ui/tokens/index.css` qui agrège tout
- Import dans `apps/web/app/globals.css`
- Configuration Tailwind v4 qui lit ces variables (`@theme`)
- Page de démo `/styleguide` (dev only) qui affiche tous les tokens

**Critères d'acceptation** : `/styleguide` montre la palette, les radius, les ombres, l'échelle typo.

---

### T0.4 — Installation de shadcn/ui
**Goal** : composants de base disponibles.
- `pnpm dlx shadcn@latest init` dans `packages/ui`
- Installer : button, input, dialog, dropdown-menu, sheet, tabs, card, badge, tooltip, sonner, command
- Tous les composants utilisent les CSS variables du design system (pas de couleurs hardcodées)
- Ajouter à `/styleguide` une démo de chaque composant

**Critères d'acceptation** : tous les composants rendent avec la palette Modulo.

---

### T0.5 — Setup Drizzle + Neon
**Goal** : connexion BDD opérationnelle.
- `packages/db` avec Drizzle + driver Neon serverless
- Schéma initial dans `packages/db/schema/core.ts` (users, organizations, memberships)
- Schéma `packages/db/schema/billing.ts` (enabledModules)
- Scripts : `db:generate`, `db:migrate`, `db:studio`
- `.env.example` documenté

**Critères d'acceptation** : migration initiale créée, `db:studio` se connecte, les tables existent.

---

### T0.6 — Setup Better Auth
**Goal** : login / signup / sessions.
- Better Auth avec providers Email + GitHub OAuth + Google OAuth
- Tables auth générées via Drizzle (`sessions`, `accounts`, `verifications` + colonnes `email_verified`, `image` sur `users`)
- Pages `/login`, `/signup` + `LogoutButton`
- Middleware Next qui protège `/dashboard`

**Critères d'acceptation** : un user peut créer un compte, se connecter, accéder à `/dashboard`.

> **Livré** Session 5 (`24f5382`). Note : la « Personal Organization à la première connexion » initialement prévue ici a été retirée au profit d'un onboarding explicite — voir T0.8.5.

---

### T0.6.5 — Setup i18n minimum viable (intercalaire)
**Goal** : poser la couche internationalisation avant tRPC, parce que les schémas Zod consomment `t(...)`.
- `next-intl@4.12.0` pin exact
- Locale `fr` en dur (pas de routing URL `/fr|/en`, pas de switcher UI)
- Messages `fr.json` + `en.json` mirror strict (préparation Phase 1 multilingue)
- Pattern factory pour les schémas Zod : `make{Login,Signup}Schema(t)` testables avec un translator identité

**Critères d'acceptation** : toutes les strings UI (`/`, `/login`, `/signup`, `/dashboard`) passent par `useTranslations`. Aucune string hardcodée.

> **Livré** Session 6 (`2453e3b`).

---

### T0.7 — Setup tRPC + middlewares multi-tenant + infra Vitest
**Goal** : API typée bout-en-bout.
- `packages/api` avec init tRPC v11 + superjson + `@tanstack/react-query`
- `createTRPCContext` qui résout user + org active (via cookie `modulo-active-org`) + `enabledModules`
- 4 procédures : `publicProcedure`, `authedProcedure`, `orgProcedure`, `moduleProcedure(id)`
- Route handler dans `apps/web/app/api/trpc/[trpc]/route.ts`
- Provider React Query + client tRPC côté `apps/web`
- Page `/healthcheck` smoke test (3 procedures : `ping`, `dbCheck`, `whoami`)
- Infra Vitest (11 tests : env helper + schemas)

**Critères d'acceptation** : une procédure de test est appelable depuis un composant client avec types complets. `pnpm test` vert.

> **Livré** Session 6 (`1447bc5`).

---

### T0.8 — Shell applicatif multi-tenant — **reporté Phase 1**
**Goal initial** : structure de navigation par tenant.
- Routes `/(app)/[orgSlug]/*` avec résolution de l'org via le slug
- Sidebar dynamique affichant les modules **activés** pour cette org
- Topbar : switcher d'org, avatar user, command palette (Cmd+K)
- Layout qui injecte les CSS variables du thème de l'org

> **Décision T0.10** : reporté Phase 1, juste avant T1.1 (scaffold Sales Analytics). Justification : tant qu'il n'y a qu'une org active par user et zéro module, le shell minimal actuel (route plate `/dashboard`, pas de sidebar, pas de switcher) suffit. Le shell multi-tenant prend toute sa valeur le jour où la sidebar doit afficher les modules activés et où le switcher d'org devient utile (i.e. quand un user appartient à 2+ orgs).

---

### T0.8.5 — Onboarding strict + middleware org-gate
**Goal** : tout user qui n'appartient à aucune org est forcé sur `/onboarding/create-org` avant d'atteindre `/dashboard`.
- Mutation tRPC `organizations.create` (`authedProcedure` + transaction atomique org + membership + cookie posé)
- Page `/onboarding/create-org` (Client Component, auto-slugify avec flag `userEditedSlug`)
- Middleware Next étendu (matcher `/login`, `/signup`, `/dashboard/*`, `/onboarding/*`) avec 4 cas explicites sans boucle
- Cleanup cookie `modulo-active-org` post-logout (wrap BA route handler + defense in depth dans `createTRPCContext`)

**Critères d'acceptation** : un user fraîchement signup → atterrit sur `/onboarding/create-org`. Création org → atterrit sur `/dashboard`. Logout → cookie clearé.

> **Livré** Session 6 (`41c1e92`).

---

### T0.9 — Stripe billing + module activation
**Goal** : premier flow business — souscription Stripe par module + activation conditionnelle des routes.
- Stripe SDK pin exact (`stripe@22.1.1`) + `apiVersion` pinée
- Schéma `billing.ts` : `pgEnum module_status` + colonnes `status`/`stripe_subscription_id`/`stripe_customer_id` sur `enabled_modules` + table `stripe_webhook_events` (idempotency)
- Registry MODULES statique côté code (`packages/api/src/modules/registry.ts`)
- Router tRPC `billing` (3 procedures : `listAvailableModules` / `createCheckoutSession` / `createPortalSession`)
- Webhook handler `/api/webhooks/stripe` : raw body + signature `constructEvent` + idempotency PK + rollback DELETE si throw + transactions Drizzle uniformes sur les handlers (`checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`) + validation `orgId` DB pré-INSERT
- Filtre `eq(status, "active")` dans `createTRPCContext` → `past_due` n'unlock plus les routes module
- UI `/settings/billing` (status badges semantic + toasts sonner)
- Scope i18n `settings.billing`

**Critères d'acceptation** : on peut souscrire en test mode via Stripe Checkout, le module s'active automatiquement via webhook, le Customer Portal est accessible.

> **Livré** Session 7 (`b7d9a13`). Note : « Settings org + theming » initialement prévu ici (color picker OKLCH, `/settings/appearance`, `/settings/general`, `/settings/members`) est reporté Phase 1.

---

### T0.10 — Hardening + refactos pré-Phase 1
**Goal** : éliminer la dette consciente accumulée pendant T0.5 → T0.9 et boucler la Phase 0 prod-ready.
- Refacto `@modulo/auth` : `export const auth` eager → `getAuth()` factory lazy avec cache `globalThis` (pattern identique `getDb()`). Suppression du `test-setup.ts` côté `@modulo/api`.
- Handler webhook `customer.subscription.updated` + helper pur `mapStripeStatusToModuleStatus()` (mapping 8 statuts Stripe → 4 statuts modulo, tests unitaires)
- Guards `NODE_ENV !== "development"` sur `/healthcheck` et `/styleguide` (via Server Component wrapper pour `/healthcheck` qui est Client)
- Tokens sémantiques `*-muted` (success / warning / danger / info) calibrés OKLCH + mapping `@theme inline` Tailwind v4
- Suppression `packages/config/tailwind-preset/index.ts` legacy v3 (remplacé par un `index.d.ts` ambient déclarant le module `/theme` CSS-only)
- Fix `useSearchParams()` Suspense boundary sur `/settings/billing` → `pnpm build` propre, page en static prerender
- Réconciliation doc : ROADMAP + ARCHITECTURE §3 + MODULE_BLUEPRINT + CLAUDE (section Factory pattern)

**Critères d'acceptation** : `pnpm typecheck` + `pnpm lint` + `pnpm test` (31+) verts. `pnpm build` propre. `/healthcheck` et `/styleguide` → 404 en prod. Phase 0 prod-ready.

> **Livré** Session 7 (`<commit T0.10>`). Note : le « registre des modules + script `pnpm module:new` » initialement prévu ici (T0.10 original) est partiellement déjà en place (`moduleProcedure(id)` livré T0.7, registry MODULES livré T0.9) — le script `pnpm module:new` est reporté Phase 1.

---

## Phase 1 — Module Sales Analytics (premier module)

L'objectif : un module **terminé**, esthétique, utile, qui sert de **vitrine** pour vendre Modulo.

### T1.1 — Scaffold du module
**Goal** : créer le squelette via `pnpm module:new sales-analytics`.
- Vérifier que `module.config.ts` est rempli (icône BarChart3, pricing à 29€)
- Le module apparaît dans `/settings/modules`
- L'activer → la sidebar montre l'entrée "Sales", clic → page placeholder

---

### T1.2 — Schéma BDD Sales
**Goal** : tables Drizzle pour deals, contacts, étapes du pipeline.
- `salesDeals` (id, orgId, name, amount, stage, contactId, ownerId, closedAt, createdAt)
- `salesContacts` (id, orgId, name, email, company, phone)
- `salesPipelineStages` (id, orgId, name, order, color) — étapes personnalisables par org
- Migrations + seed de données démo (10 deals, 5 contacts) pour le dev

**Critères d'acceptation** : `db:studio` montre les tables avec des données.

---

### T1.3 — Router tRPC Sales (CRUD)
**Goal** : API complète pour les deals et contacts.
- `sales.deals.list / get / create / update / delete`
- `sales.contacts.list / get / create / update / delete`
- `sales.pipeline.stages.list / reorder`
- Toutes les procédures via `moduleProcedure("sales-analytics")`
- Tests Vitest sur les mutations critiques

---

### T1.4 — Page "Vue d'ensemble" (dashboard)
**Goal** : page d'accueil du module avec les KPI clés.
- 4 cartes KPI en haut : CA total, Deals gagnés, Taux de conversion, Pipeline value
- Chaque carte : valeur, variation vs période précédente, sparkline mini
- Graphique principal : évolution du CA sur 12 mois (Recharts area chart)
- Graphique secondaire : répartition par étape (donut)
- Table "Deals récents" en bas (10 derniers)
- Filtres période : 7j / 30j / 90j / YTD / custom

**Critères d'acceptation** : la page charge sous 1s, les graphes sont esthétiques, le mode "loading" est skeletonné.

---

### T1.5 — Page "Deals" (pipeline kanban)
**Goal** : vue kanban des deals par étape.
- Colonnes = étapes du pipeline (configurables)
- Cartes = deals (nom, montant, contact, avatar owner)
- Drag & drop entre étapes (dnd-kit)
- Side panel à droite quand on clique sur un deal (détails + édition inline)
- Bouton "Nouveau deal" → dialog de création
- Filtres : owner, période, montant min/max
- Toggle vue kanban / vue table

**Critères d'acceptation** : drag & drop fluide, optimistic updates, undo possible.

---

### T1.6 — Import CSV/Excel
**Goal** : permettre l'import en masse de deals.
- Page `/m/sales/import` avec upload
- Parsing CSV (Papaparse) ou XLSX (SheetJS)
- Étape de mapping colonnes → champs (nom, montant, étape, contact…)
- Preview avec erreurs de validation par ligne
- Import effectif avec progress bar
- Génération d'un rapport d'import (X créés, Y skipped, Z erreurs)

**Critères d'acceptation** : un fichier de 1000 lignes s'importe en moins de 10s avec feedback clair.

---

### T1.7 — Page "Performance"
**Goal** : analyse fine de la performance commerciale.
- Performance par commercial (table avec : deals gagnés, CA, taux conversion, deal size moyen)
- Funnel de conversion par étape
- Cycle de vente moyen
- Cohort analysis (deals créés en M ferment en M+N en moyenne)

**Critères d'acceptation** : graphes lisibles, exportables en PNG.

---

### T1.8 — Export PDF des rapports
**Goal** : générer un rapport PDF mensuel imprimable.
- Bouton "Export rapport" sur le dashboard
- Génération via Playwright server-side (cohérent avec ton workflow habituel)
- Template HTML/CSS éditorial avec logo de l'org, charte couleurs du tenant
- Inclut : KPI, graphique CA, top deals, performance par commercial
- Téléchargement direct + envoi optionnel par email (Resend)

**Critères d'acceptation** : le PDF est print-ready A4, mise en page éditoriale soignée.

---

### T1.9 — Intégration Stripe (billing)
**Goal** : activation payante du module via Stripe.
- Création produit + price Stripe pour "Sales Analytics" (29€/mois)
- Page `/settings/modules` → bouton "Activer" → Stripe Checkout
- Webhook Stripe `customer.subscription.{created,updated,deleted}` → mise à jour de `enabledModules`
- Période d'essai 14j configurable
- Gestion du past_due (alerte UI + restriction d'écriture)

**Critères d'acceptation** : on peut souscrire en test mode, le module s'active automatiquement, on peut annuler.

---

### T1.10 — Polish & QA
**Goal** : rendre le module "vendable".
- Audit accessibilité (WCAG AA minimum : focus visible, contrastes, ARIA)
- Optimisation perf : `React.memo` sur les cartes, virtualisation des longues listes
- Empty states soignés sur chaque liste/page
- Onboarding tour (intro.js ou shepherd.js) à la première utilisation
- Documentation utilisateur dans `/help/sales`
- Vidéo de démo de 90 secondes pour la landing

---

## Phase 2 — Marketing & acquisition

Pré-requis : Phase 1 terminée et déployée sur un domaine.

### T2.1 — Landing page
- Hero avec démo intégrée (video ou animation Framer)
- Section "Composez votre suite" — grille interactive des modules
- Section "Adaptez à votre marque" — démo de theming live
- Section "Pour qui" — 3 personas (PME industrielle, agence, freelance avancé)
- Pricing transparent (base 0€ + modules à la carte)
- FAQ
- Footer

### T2.2 — Stratégie de lancement
- Product Hunt
- LinkedIn (posts Chris + démos)
- Outreach 50 PME via ton réseau (Silverlit, Neoma, etc.)
- Article de blog technique sur l'architecture modulaire

---

## Phase 3 — Modules suivants (par ordre de priorité commerciale)

| Ordre | Module | Justification |
|-------|--------|---------------|
| 2 | **AI Reports** | Multiplie la valeur de Sales Analytics (rapports auto) |
| 3 | **Notes & Docs** | Module "horizontal" qui plaît à tout le monde |
| 4 | **CRM léger** | Boucle naturelle avec Sales Analytics |
| 5 | **Kanban & Projets** | Couvre la gestion de projet |
| 6 | **AI Assistant** | Différenciateur lourd (chat sur données internes) |

Chaque module suivant doit prendre **moins de temps** que le précédent grâce aux fondations.

---

## Cadence recommandée

- **Phase 0** : 2-3 semaines en intensif (les fondations payent à long terme, ne pas brader)
- **Phase 1 (Sales Analytics)** : 3-4 semaines
- **Phase 2 (Marketing)** : 1 semaine
- **Phases 3+** : 2-3 semaines par module

Premier MVP commercialisable : **~2 mois** depuis le jour 1.

---

## Métriques de succès

- **Technique** : 0 hot path > 1s, lighthouse > 90, 0 erreur TS
- **Produit** : 5 PME en essai avant fin de phase 2, 1 conversion payante avant fin de phase 3
- **Personnel** : Chris peut utiliser Sales Analytics sur ses données Silverlit pour son apprentissage (dogfooding interne)
