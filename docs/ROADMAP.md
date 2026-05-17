# ROADMAP — Modulo

> Plan d'exécution séquentiel. Chaque ticket est conçu pour être confié à Claude Code en une session.

## Phase 0 — Fondations (avant tout module)

L'objectif de cette phase : avoir un shell applicatif fonctionnel sur lequel on peut greffer des modules. **Ne pas commencer Sales Analytics tant que la phase 0 n'est pas terminée.**

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
- Better Auth avec providers Email magic link + Google OAuth
- Tables auth générées via Drizzle
- Pages `/login`, `/signup`, `/logout`
- Middleware Next qui protège `/(app)/*`
- Création automatique d'une "Personal Organization" à la première connexion

**Critères d'acceptation** : un user peut créer un compte, se connecter, accéder à `/dashboard`.

---

### T0.7 — Setup tRPC
**Goal** : API typée bout-en-bout.
- `packages/api` avec init tRPC v11
- `createContext` qui résout user + org active
- Procédures : `publicProcedure`, `authedProcedure`, `orgProcedure`, `moduleProcedure(id)`
- Route handler dans `apps/web/app/api/trpc/[trpc]/route.ts`
- Client React Query côté frontend

**Critères d'acceptation** : une procédure de test `hello.world` est appelable depuis un composant client avec types complets.

---

### T0.8 — Shell applicatif multi-tenant
**Goal** : structure de navigation + theming par tenant.
- Routes `/(app)/[orgSlug]/*` avec résolution de l'org via le slug
- Sidebar dynamique : affiche uniquement les modules **activés** pour cette org
- Topbar : switcher d'org, avatar user, command palette (Cmd+K)
- Layout qui injecte les CSS variables du thème de l'org

**Critères d'acceptation** : on peut switcher entre orgs, la sidebar s'adapte, le thème s'applique.

---

### T0.9 — Settings de l'org + theming
**Goal** : page de paramètres pour personnaliser l'apparence.
- `/settings/general` : nom, logo, slug
- `/settings/appearance` : sélecteur de couleur d'accent (color picker OKLCH), preset de radius, density
- `/settings/modules` : liste des modules avec toggle on/off (mock du billing pour l'instant)
- `/settings/members` : invitations, gestion des rôles

**Critères d'acceptation** : changer la couleur d'accent met à jour toute l'app en temps réel.

---

### T0.10 — Système de modules
**Goal** : registre des modules + activation conditionnelle.
- `packages/api` : registre des modules + résolution dynamique
- Helpers `isModuleEnabled(orgId, moduleId)` et middleware tRPC `requireModuleEnabled`
- Pages d'erreur 403 si module non activé
- Script `pnpm module:new <id>` qui scaffold un module depuis `MODULE_BLUEPRINT.md`

**Critères d'acceptation** : on peut créer un module vide via le script, il apparaît dans `/settings/modules`, on peut l'activer/le désactiver.

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
