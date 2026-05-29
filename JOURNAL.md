# Journal de bord — Modulo

> Fichier append-only mis à jour à chaque fin de session via la slash command `/session-end`.
> Au début de chaque session, `/session-start` lit ce fichier pour rappeler à Claude Code (et à toi) où on en était.
>
> **Règle d'or** : on ajoute en haut (les sessions récentes d'abord). On ne supprime jamais une entrée passée.
> Pour les décisions d'architecture significatives, créer une entrée séparée dans `DECISIONS.md` (à créer le jour où on en aura besoin).

---

## 📅 2026-05-29 — Session 12 — T1.3 premier CRUD réel Sales Analytics + passage Opus 4.8

### 🎯 Objectif de la session
Livrer T1.3, le premier vrai code métier de Modulo end-to-end : router tRPC CRUD multi-tenant + page UI deals + seed démo, en 5 phases séquentielles avec checkpoints. Première session sous Claude Opus 4.8 (sorti la veille) — échange préalable sur les nouvelles features (effort control, dynamic workflows) et leur pertinence pour le workflow Modulo.

### ✅ Tickets terminés
- **T1.3 (commit `4ed8671`)** — Premier CRUD réel Sales Analytics + UI deals + seed démo. **30 fichiers, 3642 insertions / 120 deletions. Plus gros commit du projet à date** (devant T1.2 et ses 3048). Détail des 5 phases :
  - **Phase 1 — Fix dettes T1.2** : migration `0006_add_pipeline_stage_color` (colonne `color` text nullable sur `sales_pipeline_stages`) + migration `0007_add_deals_org_stage_idx` (index composite `org_stage_idx` sur `sales_deals(organization_id, stage)` pour préparer le Kanban T1.5). Les 2 appliquées sur Neon. Les 2 dettes inline T1.2 retirées.
  - **Phase 2 — Centralisation type** : `packages/api/src/modules/types.ts` créé (`ModuleConfig` + `NavigationItem` + `RolePermissions`), re-export depuis `packages/api/src/index.ts`, sub-export `./modules/types`. `module.config.ts` du module migré (import type centralisé au lieu du type local). Template `scripts/module-new.ts` aligné.
  - **Phase 3 — Router tRPC** : router CRUD complet (10 procedures : 4 deals + 4 contacts + 2 pipelineStages) via `moduleProcedure("sales-analytics")`. 5 schemas Zod exportés. `DEAL_STAGES` lowercase strict (5 stages : lead/qualified/proposal/won/lost). Branchement du `salesAnalyticsRouter` dans le root router `packages/api/src/router.ts` (clé `"sales-analytics"`). Defense multi-tenant exhaustive : 10/10 procedures filtrent ou set `organizationId` (belt-and-suspenders).
  - **Phase 4 — Page UI** : `/[orgSlug]/m/sales/deals` (Server Component prefetch + Suspense), `<DealsTable>` (Client, badges colorés par stage, montants EUR, empty/skeleton/error states), `<NewDealDialog>` (validation Zod `safeParse` avant mutate, `<SubmitButton isLoading>` convention règle 5). Lib pure `deal-format.ts` (+ tests). i18n fr/en mirror. Section styleguide "Sales Stages · badges sémantiques".
  - **Phase 5 — Seed** : `scripts/seed-sales-demo.ts` (tsx, arg `--org-slug`, idempotent), script `seed:sales` racine. 25 rows seedées sur Chris Onboarding : 5 stages + 5 contacts + 10 deals contexte Silverlit B2B retail (Carrefour, Leclerc, Picwic, Boulanger, JouéClub).
  - **Fix critique @trpc/server fuite client** : le Client Component `new-deal-dialog.tsx` importait en valeur depuis `router.ts` → tirait `@trpc/server` dans le bundle navigateur → Runtime Error à l'hydratation. **Non détecté par typecheck/lint/build** (garde runtime, pas erreur de compil), attrapé uniquement en validation visuelle navigateur. Fix : extraction des schemas Zod + `DEAL_STAGES` dans `modules/sales-analytics/schemas.ts` (100% isomorphe, zéro import serveur), router importe + ré-exporte, Client Components importent depuis `@modulo/sales-analytics/schemas`. Template `module-new.ts` généralisé pour scaffolder un `schemas.ts` séparé sur tous les futurs modules.
  - **6 fixes post-review** : (1) badge `qualified` token inexistant `bg-primary/10 text-primary` → `bg-text-tertiary/10 text-text-secondary` (3 endroits), (2) `deal-format.ts` import type `DealStage` depuis `/schemas` (convention), (3) `useState<DealStage>` au lieu de `<string>`, (4) DRY `uuidSchema` importé depuis `schemas.ts`, (5) error state i18n hardcodé → clé `modules.salesAnalytics.deals.error.loadingFailed`, (6) commentaire obsolète `schema.ts` "T1.3 will revisit" → "T1.5+".
  - **Tests : 68 verts** (49 baseline + schemas Zod + deal-format helpers + badge qualified). `pnpm typecheck` 6/6, `lint` 5/5, `build` propre.

### 🧠 Décisions structurantes prises
- **Casing `DEAL_STAGES` lowercase strict** (vs PascalCase proposé par l'architect) : **principe valeur persistée ≠ label affiché**. On stocke `"won"`, on affiche "Gagné" via i18n. Le casing d'affichage se gère par les labels next-intl, JAMAIS par la valeur enum stockée. Cohérence avec l'enum BDD lowercase de T1.2 + seed + badges. Principe à généraliser pour tout enum métier affiché.
- **5 stages strict, "Negotiation" retiré** : respect du brief + YAGNI. Les stages sont conceptuellement destinés à devenir personnalisables par org (table `sales_pipeline_stages`, UI T1.5) — ajouter un stage plus tard = migration enum triviale. Pas d'anticipation.
- **Pattern "schemas Zod purs isolés du router" = nouvelle convention modules** : les schemas Zod + constantes vivent dans `<module>/schemas.ts` (isomorphe, zéro import serveur). Le router les importe + ré-exporte. Les Client Components importent TOUJOURS depuis `@modulo/<module>/schemas`, jamais depuis `router.ts` (qui tire `@trpc/server`). Évite la fuite serveur dans le bundle client. Généralisé dans le template `module-new.ts`. S'aligne avec la convention "lib pure isolée" déjà établie (T1.0b, T1.1b).
- **Sub-paths `@modulo/api/trpc` + `@modulo/api/procedures` + `@modulo/api` en `peerDependencies` de sales-analytics** : casse un cycle ES module (appRouter → salesAnalyticsRouter → barrel) + un cycle Turbo. Le module importe via sub-paths, déclare son host en peer dep. Pattern "module-plugin" idiomatique. `WARN cyclic workspace dependencies` pnpm cosmétique non-bloquant.
- **Type `ModuleConfig` centralisé dans `@modulo/api/modules/types`** : le root router est le vrai consommateur, fin du type local T1.2. Pattern à reproduire pour tout type partagé shell ↔ modules.
- **Mapping badge stages** : lead=info (bleu), qualified=neutre (`bg-text-tertiary/10 text-text-secondary`), proposal=warning (orange), won=success (vert), lost=danger (rouge). Qualified volontairement neutre (état intermédiaire sans connotation sémantique forte), mais avec fond visible pour cohérence du funnel.
- **Périmètre T1.3 = Option B étendu en 1 commit atomique** + **seed Drizzle programmatique idempotent** (vs mock ou mutation tRPC) : arbitrages orchestrator tranchés seul (techniques), conformes à la nouvelle convention de délégation.

### ⚠️ Points d'attention pour les prochaines sessions
- **Empty state "org avec module activé + 0 data" jamais testé visuellement** : aucune 2ème org n'a le module sales-analytics activé (l'org "Chris" affiche "Aucun module activé"). L'empty state EST implémenté dans `deals-table.tsx` (confirmé par le reviewer), à valider visuellement quand une 2ème org activera le module (ou via test d'intégration futur).
- **Warning hydration `bis_skin_checked` = extension Bitdefender**, PAS notre code (confirmé en navigation privée : zéro erreur). Notre formatage de date est cohérent serveur/client (next-intl). Si le warning réapparaît en navigation normale, c'est l'extension navigateur — ignorer.
- **Cache `.next` corrompu Windows = symptôme récurrent** : erreur `Cannot find module './XXX.js'` (chunk webpack manquant) + styleguide rendu sans CSS, après une série de modifs/HMR. Fix : `Remove-Item -Recurse -Force apps\web\.next` puis relancer `pnpm dev`. À tracer dans README troubleshooting (2ème occurrence après Session 10).
- **Validation HTML5 native (`min=0`) masque la validation Zod côté client** dans le dialog deal : les deux coexistent (défense en profondeur), Zod `safeParse` bloque bien la mutation, mais c'est le message HTML natif qui s'affiche en premier. Acceptable, à garder en tête si on veut un message d'erreur custom uniforme plus tard.
- **Dette T1.4** : page Vue d'ensemble (KPIs) + sidebar sub-items navigation (les nav items du module.config ne sont pas encore consommés par la sidebar).
- **Dette T1.5** : Kanban drag&drop, édition inline deal, bouton delete UI, page Pipeline stages settings (+ reorder), page Contacts UI, alignement couleurs hex seed → OKLCH.
- **Rappels reportés (toujours valides)** :
  - Refacto webhook handlers ~65% duplication + tests d'intégration webhook → **candidat idéal pour un premier essai des dynamic workflows Opus 4.8** (tâche horizontale, multi-fichiers, parallélisable, enjeu modéré). Brief dynamic workflow dédié à préparer le jour où on l'attaque.
  - Cleanup cookie `modulo-active-org` périmé (Route Handler / middleware)
  - `CLAUDE.md:84` obsolète (`apps/web/trpc/router.ts` inexistant, vrai = `packages/api/src/router.ts`)
  - Stripe Price réel sales-analytics à créer dans Stripe Dashboard avant checkout non-test
  - `NEXT_PUBLIC_BETTER_AUTH_URL` avant staging
  - Sub-export `./active-org` partiellement consommé (trpc.ts redéclare encore les constantes cookie)

### 🚧 En cours / pas fini
Aucun chantier de code ouvert. Working tree propre après `4ed8671`. `pnpm dev` sur localhost:3000.

### 🔜 Prochain ticket
- **T1.4 — Page "Vue d'ensemble" (dashboard Sales Analytics)** : 4 cartes KPI (CA total, Deals gagnés, Taux de conversion, Pipeline value) avec variation + sparkline, graphique CA 12 mois (Recharts area), donut répartition par étape, table "Deals récents", filtres période (7j/30j/90j/YTD/custom). Skeletons sur chargement. En parallèle : brancher les sub-items de navigation du `module.config` dans la sidebar (dette T1.3). Ajout des tokens dataviz `--chart-1..5` dans `colors.css` (reporté depuis Session 3). Le funnel sur 5 stages (avec "lost") permet le calcul du taux de conversion.

### 💬 Notes libres
Première session sous **Claude Opus 4.8** (sorti 2026-05-28). Échange informatif en ouverture : effort control (défaut high, "extra"/"max" pour tâches dures), dynamic workflows (centaines de sous-agents parallèles, gated Max/Team/Enterprise). **Décision : les 4 sub-agents Claude Code bénéficient automatiquement d'Opus 4.8 (rien à reconfigurer). Dynamic workflows gardés pour les futures tâches horizontales/parallélisables (refacto webhook = premier candidat), pas adoptés sur les tranches verticales à dépendances comme T1.3** où la discipline séquentielle par phases avec checkpoints reste reine. Confusion PATH résolue : Chris utilise l'extension VS Code `anthropic.claude-code` (auto-update), pas le package npm CLI.

T1.3 = plus gros commit du projet (3642 insertions). La session a **prouvé la valeur de la validation visuelle** : 2 bugs runtime (fuite `@trpc/server` + cache `.next` corrompu) invisibles à typecheck/lint/build, attrapés uniquement en chargeant la page navigateur. Le checkpoint qu'on a refusé de sacrifier pour la vitesse a fait son job 2 fois. Méthode bisect (navigation privée) utilisée pour isoler le faux positif hydration. Nouvelle convention de délégation actée : l'orchestrator tranche les décisions techniques seul (casing, stages, périmètre, seed), Chris arbitre produit/stratégique. **Phase 1 à ~67%** (T1.0 → T1.3 livrés, 6 tickets sur ~9). Prochain : T1.4 dashboard, premier dataviz du projet.

---

## 📅 2026-05-28 — Session 11 — T1.2 premier module métier + IDEAS.md

### 🎯 Objectif de la session
Construire le tooling de scaffold de modules (`pnpm module:new`) + l'utiliser immédiatement pour livrer le premier module métier Sales Analytics (config, schema 3 tables, router vide, smoke test). Effet de levier majeur : le script servira pour tous les modules futurs. En bonus, formalisation d'un `IDEAS.md` racine pour le backlog d'idées non engagées (vs ROADMAP qui = tickets engagés).

### ✅ Tickets terminés
- **T1.2 (commit `4d96568`)** — `pnpm module:new` script + scaffold Sales Analytics. **18 fichiers, ~3048 insertions**. Détail :
  - **Partie 1 — Tooling** : `scripts/module-new.ts` (tsx, regex kebab-case strict `^[a-z][a-z0-9-]*[a-z0-9]$`, 6 substitutions de tokens triées longueur DESC pour éviter collisions, 6 templates in-file). `tsx@4.19.2` ajouté en devDep root. Script `"module:new": "tsx scripts/module-new.ts"` dans `package.json` racine. Tests CLI validés : no-arg (help+exit1), BadCase (refus regex), already-exists (refus). `pnpm-workspace.yaml allowBuilds: { esbuild: true }` ajouté automatiquement par pnpm 11 (requis par tsx peer esbuild natif, accepté comme mécanisme pnpm 11 officiel).
  - **Partie 2 — Sales Analytics** : `modules/sales-analytics/` complet (6 fichiers). `module.config.ts` niveau intermédiaire avec type local `ModuleConfig` + pattern `as const satisfies` (slug=`sales`, shortName, description, category `data`, 4 nav items incluant Paramètres avec `adminOnly`, defaultRolePermissions 4 rôles). `schema.ts` avec 3 tables (`salesPipelineStages`, `salesContacts`, `salesDeals`) — toutes avec `organization_id` FK CASCADE + index btree. `router.ts` vide (placeholder `_placeholder` query, sera enrichi T1.3). `package.json` workspace `@modulo/sales-analytics`. `README.md` + smoke test (2 asserts sur `salesAnalyticsConfig`).
  - **Migrations** : `0004_sales_analytics_init.sql` (CREATE TABLE × 3 + FK + indexes) + `0005_rename_deal_title_contact_fullname.sql` (réécrite manuellement en ALTER RENAME au lieu de DROP+ADD généré par Drizzle, pour cross-env safety). Les 2 appliquées sur Neon. Renommages `title → name` sur `sales_deals`, `full_name → name` sur `sales_contacts`, ajout `phone` sur `sales_contacts`.
  - **Re-export schema** : `packages/db/schema/index.ts` étendu (`export * from "../../../modules/sales-analytics/schema"`).
  - **Registry inchangé** : `packages/api/src/modules/registry.ts` non modifié (sales-analytics y est déjà `status: "available"` depuis T0.9, pas d'extension prématurée — décision arbitrée).
  - **5 fixes post-review** : (1) README chemin `../../` → `../../../` dans le module + template, (2) double import `@modulo/api` fusionné dans `router.ts` + template, (3+4) commentaires dette inline T1.3 pour `color` manquant sur `salesPipelineStages` + `orgStageIdx` composite manquant sur `salesDeals`, (5) CLAUDE.md step 5 augmenté avec workaround Turbo `pnpm --filter @modulo/db db:generate --name=<id>_init`.

- **IDEAS.md (commit `95ac0fd`)** — Backlog d'idées Modulo créé à la racine. Premier entry : Retail Analytics (module concept pour les retailers Silverlit/distribution). Pattern : `IDEAS.md` = idées non engagées (brainstorm, opportunités, fertilisation croisée), `ROADMAP.md` = tickets engagés avec critères d'acceptation. Évite de polluer la ROADMAP avec des concepts non priorisés.

### 🧠 Décisions structurantes prises
- **`pnpm module:new` script en tsx via `scripts/module-new.ts`** (racine), pas de nouveau package npm. Templates in-file (tagged literals + substitution `replaceAll` triée DESC par longueur de token pour éviter les collisions). Pattern à reproduire pour tout futur script de tooling racine.
- **`module.config.ts` niveau intermédiaire validé comme convention Modulo** pour tous les futurs modules : `slug` + `shortName` + `description` + `category` + `navigation` + `defaultRolePermissions`. Plus que minimaliste, moins que full BLUEPRINT (pas de `commands`, `trial`, `monthlyPrice` redondant). Template `scripts/module-new.ts` aligné avec 6 TODO inline pour personnalisation Chris.
- **`icon: string`** (pas import lucide direct) pour éviter peer dep React côté module package. Le shell résoudra string → Component côté client quand T1.3+ consommera réellement le config.
- **Type `ModuleConfig` local au module** pour T1.2. Centralisation T1.3+ probablement dans `@modulo/api/modules` quand le shell aura un vrai consommateur (sub-items sidebar, RBAC). JSDoc en-tête de `module.config.ts` planifie la migration.
- **Pattern `as const satisfies ModuleConfig`** : narrowing littéral préservé + shape enforce. `type SalesAnalyticsScope = (typeof config.scopes)[number]` reste `"sales:read" | "sales:write" | "sales:admin"` (pas `string`). Convention à reproduire pour tout config typé strict.
- **Registry `packages/api/src/modules/registry.ts` non touché** : sales-analytics déjà `status: "available"` depuis T0.9 (`b7d9a13`). Pas d'extension `ModuleDescriptor` prématurée — la richesse vit dans `module.config.ts` local, le registry minimaliste reste pour Stripe/availability uniquement. Pont entre les 2 viendra T1.3+ avec un vrai consommateur.
- **Migration 0005 réécrite manuellement** en ALTER RENAME (3 statements) au lieu de DROP+ADD (5 statements généré par Drizzle). Cross-env safe — si une prod avait des données, le DROP+ADD pétait sur le `NOT NULL` sans default. Drizzle-kit interactif (prompts ↑↓+Enter) difficile à scripter en non-TTY sur Windows → bascule sur mode défaut + réécriture manuelle SQL. Snapshot reste cohérent (même état final).
- **`pnpm-workspace.yaml allowBuilds: esbuild: true`** accepté (requis par tsx peer esbuild natif). Mécanisme pnpm 11 officiel, cohabite avec `onlyBuiltDependencies` existant sans conflit. À tracer dans README troubleshooting si la question revient sur d'autres machines.
- **`IDEAS.md` à la racine** : nouveau pattern projet pour backlog d'idées non engagées (brainstorm, opportunités, fertilisation croisée modules). Séparation nette avec `ROADMAP.md` (= tickets engagés avec AC). Premier entry : Retail Analytics.

### ⚠️ Points d'attention pour les prochaines sessions
- **Dette inline `color`** manquant sur `sales_pipeline_stages` (ROADMAP T1.2 spec) : à ajouter en T1.3 quand l'UI gestion pipeline arrivera (1 colonne + migration 0006). Commentaire JSDoc inline planifie déjà.
- **Dette inline `orgStageIdx`** composite manquant sur `sales_deals` : à ajouter en T1.5 quand le Kanban arrivera (perf hot path `WHERE org_id = ? AND stage = ?`). Commentaire inline dans le bloc indexes.
- **`CLAUDE.md:84` obsolète** : référence `apps/web/trpc/router.ts` qui n'existe pas (vrai = `packages/api/src/router.ts`). Ticket doc séparé Phase 1+ (hors scope T1.2).
- **`module.config.ts` type local** sera centralisé en T1.3+ probablement dans `@modulo/api/modules` quand le shell le consommera réellement (sidebar sub-items, RBAC).
- **Stripe Price réel pour Sales Analytics** à créer manuellement par Chris dans Stripe Dashboard avant le 1er checkout en environnement non-test. Placeholder env aujourd'hui OK pour dev.
- **Migration Drizzle Turbo issue** : `pnpm db:generate --name=X` intercepté par Turbo. Workaround `pnpm --filter @modulo/db db:generate --name=X` documenté dans `CLAUDE.md` step 5. Solution alternative `turbo.json passThroughArgs` reportée Phase 1+ (plus invasive).
- **`pnpm-workspace.yaml allowBuilds`** : à tracer également dans README troubleshooting si la question revient sur d'autres machines.
- **Rappels reportés des sessions précédentes** (toujours valides) :
  - `NEXT_PUBLIC_BETTER_AUTH_URL` avant staging
  - Refacto webhook handlers ~65% duplication (Phase 1+)
  - Tests d'intégration webhook (testcontainers ou Neon branches)
  - Vérifier tokens `*-muted` symétriques aux `*-foreground`
  - Cleanup cookie `modulo-active-org` périmé via Route Handler ou middleware Phase 1+
  - Sub-export `./active-org` pleinement consommé dans `trpc.ts` Phase 1+
  - Découpage `@modulo/auth-server` / `@modulo/auth-client` si worker server-only émerge

### 🚧 En cours / pas fini
Aucun chantier de code ouvert. Working tree propre après `4d96568`. `pnpm dev` tourne sur `localhost:3000`.

### 🔜 Prochain ticket
- **T1.3 — Premier CRUD réel Sales Analytics**. Router tRPC procedures (`list` / `create` / `update` / `delete`) sur `sales_deals` + `sales_contacts` + `sales_pipeline_stages` via `moduleProcedure("sales-analytics")` + page UI minimale `/m/sales/deals` (vue table + dialog création via `<SubmitButton>` convention T1.0b) + seed des 3 premières pipeline stages par défaut (Lead, Qualified, Won) + premières données démo pour Chris Onboarding (pour valider le dogfooding Silverlit en parallèle).

  T1.3 va aussi ajouter :
  - Colonne `color` à `sales_pipeline_stages` (migration 0006) — fix de la dette T1.2 inline
  - Index composite `orgStageIdx` sur `sales_deals` (migration 0007 ou intégrée à 0006) pour préparer le Kanban T1.5
  - Branchement du router `sales-analytics` dans `packages/api/src/router.ts` (le root router tRPC)
  - Centralisation potentielle du type `ModuleConfig` dans `@modulo/api/modules` si le shell commence à consommer `navigation[]` ou `defaultRolePermissions` (à arbitrer en début T1.3)

### 💬 Notes libres
Session enchainée immédiatement après Session 10 (T1.1 shell multi-tenant). 6 commits aujourd'hui au total : T1.0a → T1.0b → JOURNAL S9 → T1.1a → T1.1b → JOURNAL S10 (la veille) puis T1.2 + IDEAS.md (aujourd'hui 2026-05-28). T1.2 est le plus gros ticket Phase 1 livré à date (~3048 lignes, 18 fichiers). Le `pnpm module:new` est un effet de levier majeur — tous les futurs modules métier seront scaffoldés en 30 secondes au lieu de copier-coller du Silverlit Phase 0 manuellement. Le pattern `module.config.ts` niveau intermédiaire + `as const satisfies` + type local est désormais **convention Modulo documentée** dans le template. **Phase 1 à 57%** (5 tickets sur ~8-9 estimés pour finir le shell + module Sales). Prochain milestone : T1.3 CRUD réel — première vraie UI métier avec dogfooding live sur les données Silverlit.

---

## 📅 2026-05-27 — Session 10 — T1.1 shell multi-tenant + Cmd+K

### 🎯 Objectif de la session
Premier ticket structurant majeur Phase 1 : transformer l'app authentifiée du `/dashboard` plat T0.X vers un shell multi-tenant `/[orgSlug]/*` avec sidebar dynamique, topbar, theme injection, et command palette Cmd+K. Greffon préparatoire pour T1.2 (premier module métier Sales Analytics).

### ✅ Tickets terminés
- **T1.1a (commit `bb3d3f2`)** — Shell multi-tenant routing + sidebar + topbar + theme injection. **29 fichiers** touchés (19 créés + 12 modifiés + 2 supprimés). Routing complet `/[orgSlug]/*` (layout RSC qui valide slug+membership, 404 unifié sans timing attack, redirection racine `/` via cookie). Server Action `setActiveOrgCookie` (resync URL→cookie quand divergence, validée membership server-side). Sidebar Client Component collapsible (state `localStorage`), Topbar avec OrgSwitcher + UserMenu + bouton Cmd+K inerte. Theme injection mock via colonne `theme jsonb` ajoutée (migration `0003_add_org_theme.sql` appliquée par Chris). Procedure tRPC `organizations.list` créée. Page placeholder modules (3 cas : unknown 404 / non activé empty state / activé titre+desc). Tokens `*-muted` complets, focus-visible ring ajouté sidebar. Sub-export `./active-org` finalement ajouté dans `packages/auth/package.json`. Tests Vitest sur `theme-vars` (+3, total 46). Validation visuelle Chris : 8/8 scénarios OK. Review post-implémentation : 1 Critical (Server Action validation membership, fix appliqué) + 1 Important (page.tsx WHERE SQL au lieu de filter JS, cleanup cookie périmé documenté impossible en RSC Next 15) + 1 Nit a11y focus-visible.
- **T1.1b (commit `fc99bb9`)** — Command palette Cmd+K avec registre extensible. **12 fichiers** touchés (6 créés + 6 modifiés). Composant `<CommandPalette>` Client Component avec listener global `Cmd+K`/`Ctrl+K`. Registre `ModuloCommand[]` (sections navigation/organization/module/action, dernière réservée T1.2+). Fonction pure `buildCommands(args, t)` + hook thin wrapper `useCommands` (pattern T1.0b lib pure isolée confirmé). Custom event `OPEN_EVENT` pour découpler topbar ↔ palette (sans prop drilling ni Context React). Interface structurelle `MinimalRouter` (évite import `next` depuis `packages/ui`). 3 sections de commandes : Navigation (dashboard, billing), Organizations (autres orgs du user via query `allOrgRows` dans layout), Modules (modules activés). i18n scope `app.commandPalette` complet (fr + en mirror). Démo styleguide avec mock data. 4 tests Vitest sur `buildCommands` (+4, total 47). Validation visuelle Chris : 8/8 scénarios OK. Review post-implémentation : 0 Critical, 2 Important + 2 Nits (`useMemo` deps stables via `orgsKey`/`modulesKey` projections d'ids, `CommandTranslator values` typage `Record<string, string | number | Date>`, TODO inline migration `/settings/billing` Phase 1+, commentaire section `"action"` réservée T1.2+). Aller-retour notable : élargissement `Record<string, unknown>` cassait next-intl, rétréci à `string | number | Date` après 5 erreurs typecheck.

### 🧠 Décisions structurantes prises
- **Routing `/[orgSlug]/*` — Option A "slug dans URL = source de vérité primaire"** : le slug en URL gagne contre le cookie en cas de divergence (User Intent first). Le cookie reste fast-path edge pour le middleware, mais la Server Action `setActiveOrgCookie` resync proprement. Pattern qui scale naturellement quand un user appartient à N orgs.
- **Server Action `setActiveOrgCookie` avec validation membership server-side** : `getAuth().api.getSession()` + `SELECT memberships WHERE user_id=? AND organization_id=?` avant `cookies().set()`, throw si KO. Defense in depth multi-tenant — une Server Action est publiquement appelable depuis n'importe quel Client Component, donc validation au point d'entrée obligatoire. Pattern à reproduire pour TOUTE Server Action mutant du state cross-tenant en Phase 1+.
- **Theme injection mock via `org.theme jsonb`** : la machinerie technique est en place (colonne DB, type `TenantTheme = Record<string, string> | null`, helper `generateThemeVars`, injection via `style={...}` dans le layout RSC). L'UI de modification (color picker OKLCH, `/settings/appearance`) est reportée T1.1.5 dédié. Séparation propre infra vs UX.
- **Command palette `OPEN_EVENT` custom event window** : `topbar.tsx` dispatch `new CustomEvent("modulo:open-cmdk")`, `command-palette.tsx` écoute via `window.addEventListener`. Découplage parent/enfant à 3 niveaux de profondeur sans prop drilling ni Context React. Le nom d'event est exporté comme `OPEN_EVENT` const pour éviter le string hardcodé.
- **`MinimalRouter` interface structurelle** dans `packages/ui/lib/commands/types.ts` au lieu d'importer `AppRouterInstance` depuis `next/dist/shared/lib/app-router-context.shared-runtime` : `packages/ui` reste découplée de Next (cohérent avec l'isolation du package design system). Duck typing TypeScript structurel safe. Risque évolution (Next 16 ajoute une méthode) acceptable car forward-compatible.
- **`buildCommands` lib pure + thin hook wrapper** : pattern T1.0b SubmitButton confirmé comme **convention Modulo**. Logique pure isolée dans `packages/ui/lib/*` (testable sans jsdom/React), hook colocated `apps/web/.../use-*.ts` qui passe `useTranslations` au builder. À reproduire systématiquement pour toute logique complexe testable dans un composant Client.

### ⚠️ Points d'attention pour les prochaines sessions
- **Cleanup cookie `modulo-active-org` périmé** : impossible dans un Server Component Next 15 (`cookies().set()` y est interdit). Aujourd'hui un cookie pointant vers une org non-membre de l'user déclenche un redirect bénin sans cleanup (`page.tsx` ligne ~90). Fix via Route Handler `/api/cookie/clear-active-org` OU déplacer la résolution dans le middleware (qui peut écrire des cookies). À traiter Phase 1+.
- **Query `allOrgRows` dans layout RSC** : 1 query DB supplémentaire par page render sur les routes `/[orgSlug]/*` (total 3 queries séquentielles). Acceptable T1.1 (latence ~150-450ms cumulés, hors zone rouge) mais à surveiller si volume monte. Optimisation possible via `unstable_cache` Next 15 ou parallélisation partielle (`Promise.all`) en Phase 1+.
- **Cookie `sameSite` Lax vs lax** : `getActiveOrgCookieOptions()` retourne `"Lax"` (format Better Auth), Next 15 `cookies().set()` exige `"lax"` minuscule. La Server Action normalise inline. 2 consommateurs aujourd'hui (BA hook + Server Action). Extraire `getNextCookieOptions()` si un 3ème consommateur arrive (Phase 1+).
- **Sub-export `./active-org` partiellement consommé** : Server Action + Server Component layout l'utilisent, mais `packages/api/src/trpc.ts` redéclare encore `ACTIVE_ORG_COOKIE_NAME` + `ACTIVE_ORG_COOKIE_MAX_AGE`. Dette DRY déjà documentée Session 9. Ticket dédié Phase 1+.
- **`LogoutButton` flottant nu** sur le dashboard `/[orgSlug]/dashboard` — esthétique, à intégrer dans une vraie home org T1.2+.
- **Migration routes `/settings/*` sous slug** : `/settings/billing` reste hors `[orgSlug]` aujourd'hui (décision T1.1a pour simplifier le scope). À migrer vers `/[orgSlug]/settings/billing` quand on ajoutera `/settings/general` ou `/settings/members` (Phase 1+).
- **Cache Next.js corrompu sur Windows** : si comportement bizarre après touche à `app/`, `Remove-Item -Recurse -Force .next` puis `pnpm dev`. Symptôme observé Session 10. À documenter dans le README troubleshooting si ça revient.
- **Rappels reportés des sessions précédentes** (encore valides) : tokens dataviz `--chart-*` en T1.4 · refacto webhook handlers ~65% duplication · tests d'intégration webhook (testcontainers ou Neon branches) · vérifier que les tokens `*-muted` sont symétriques aux `*-foreground` · `NEXT_PUBLIC_BETTER_AUTH_URL` avant staging · script `pnpm module:new` (T0.10 original reporté Phase 1) — à vérifier en début T1.2 si existe ou à créer.

### 🚧 En cours / pas fini
Aucun chantier de code ouvert. Working tree propre après `fc99bb9`. `pnpm dev` tourne sur `localhost:3000` (terminal `apps/web`).

### 🔜 Prochain ticket
- **T1.2 — Scaffold du module Sales Analytics** (premier module métier Phase 1). Étapes prévues :
  - Vérifier si `pnpm module:new` (T0.10 original) existe — sinon le créer en début de T1.2 (script qui scaffold le dossier `modules/<id>/` depuis `MODULE_BLUEPRINT.md`)
  - `pnpm module:new sales-analytics` (ou création manuelle si pas de script)
  - `modules/sales-analytics/module.config.ts` (id, nom, icône `BarChart3`, pricing 29€/mois, scopes `sales:read|write|admin`, navigation items)
  - Le module apparaît dans `/settings/billing` comme module activable (registry MODULES T0.9 à enrichir)
  - Activation Stripe : flow déjà testé en T0.9 sur l'org "Chris Onboarding" — vérifier que `enabled_modules.status="active"` débloque l'item sidebar
  - Page placeholder `/(app)/[orgSlug]/m/sales-analytics/page.tsx` (déjà couverte par placeholder générique T1.1a)
  - Premières pages CRUD (overview / deals / contacts) en T1.3+ (ticket séparé)

### 💬 Notes libres
Session marathon : 2 gros commits enchaînés (T1.1a 29 fichiers + T1.1b 12 fichiers) immédiatement après Session 9 (T0.10 clôture Phase 0 + T1.0). 41 fichiers touchés au total sur T1.1, 2348 lignes ajoutées. Le pattern lib pure isolée + thin hook wrapper (`buildCommands` + `useCommands`) est désormais une **convention Modulo** documentée et appliquée 2× (T1.0b SubmitButton + T1.1b CommandPalette). Le shell multi-tenant est prod-ready (validations visuelles 16/16 sur les 2 chantiers, 47 tests verts, `pnpm build` propre). **Phase 1 à 50%** (4 tickets sur ~8 estimés pour finir le shell + scaffolding du premier module). Prochaine session = T1.2 scaffold Sales Analytics, première vraie greffe de code métier.

---

## 📅 2026-05-27 — Session 9 — T1.0 polish dette critique Phase 0

### 🎯 Objectif de la session
Premier ticket Phase 1 : éliminer 2 dettes critiques bloquantes pour le dogfooding et la démo (cookie staleness post-login + pattern UX disable submit pendant mutation). 2 commits atomiques exigés par Chris (Chantier A et B séparés).

### ✅ Tickets terminés
- **T1.0** — Polish dette critique Phase 0 (Chantiers A + B en 2 commits atomiques). Détail :
  - **T1.0a (commit `e8b9fda`)** — Fix cookie staleness post-login. Hook Better Auth `databaseHooks.session.create.after` ajouté dans `packages/auth/src/index.ts` (à l'intérieur de la factory `createAuth()`, pattern Session 8 préservé). Helper `resolveActiveOrgForUser(db, userId)` isolé dans `packages/auth/src/active-org.ts` (query Drizzle `ORDER BY memberships.created_at DESC LIMIT 1` — la plus récente pour le cas multi-org) + helpers `ACTIVE_ORG_COOKIE_NAME` et `getActiveOrgCookieOptions()` (attributs strictement identiques à `buildActiveOrgCookie` côté tRPC, 6/6 match vérifié par reviewer). 3 tests Vitest sur le helper (1/N/0 memberships). Mini-fix dep `drizzle-orm@0.38.3` déplacée de `devDependencies` → `dependencies` (sémantiquement correct, c'est une dep runtime de `active-org.ts`). Validation visuelle Chris : S1 signup neuf → /create-org OK, S2 login email/pwd user existant → /dashboard direct OK (= bug bisecté Session 8 corrigé), S3 GitHub OAuth → /dashboard direct OK, S5 logout + re-login → /dashboard direct OK. Bonus multi-org : la plus récente correctement sélectionnée.
  - **T1.0b (commit `46c81dd`)** — Pattern UX `<SubmitButton />` + applications. Composant `packages/ui/components/submit-button.tsx` (forwardRef, étend strictement `ButtonProps`, ajoute `isLoading` + `loadingLabel`, spinner `<Loader2 className="size-4 animate-spin" />`, `aria-busy={showSpinner}` aligné sémantiquement). **Logique pure isolée** dans `packages/ui/lib/submit-button-state.ts` (zéro JSX) → testable depuis `apps/web/lib/submit-button.test.ts` (6 tests Vitest) sans installer jsdom dans `packages/ui` (qui n'a pas l'infra). Sub-export `./lib/submit-button-state` ajouté dans `packages/ui/package.json` (cohérent avec le précédent `./lib/utils`). Applications aux 3 mutations cibles : `organizations.create` (page onboarding), `billing.createCheckoutSession` (cards modules), `billing.createPortalSession` (bouton portail + `type="button"` ajouté post-review pour cohérence convention repo). Section "SubmitButton" ajoutée dans `/styleguide` (5 démos couvrant variants default/destructive/outline avec/sans `loadingLabel`). Règle 5 ajoutée dans `CLAUDE.md` section "⚛️ React / Next.js" : convention non négociable.

### 🧠 Décisions structurantes prises
- **Hook BA `databaseHooks.session.create.after` = point unique transverse providers** : couvre TOUS les sign-in (email/pwd + OAuth GitHub + futurs OAuth Google etc.) sans énumération. Pattern à reproduire pour toute logique transverse aux providers BA (futur : analytics login, audit log, populate user preferences au premier sign-in, etc.).
- **Pattern "logique pure isolée" pour packages sans infra de test** : extraire la logique testable dans une lib TypeScript pur (zéro JSX), garder le `.tsx` comme thin wrapper. Cohérent avec `requireEnv` extrait dans `env.ts` et factories Zod `make{Login,Signup,CreateOrg}Schema(t)`. Exemple canonique : `packages/ui/lib/submit-button-state.ts` testé depuis `apps/web`. À reproduire pour tout futur composant complexe qui ne justifie pas de monter jsdom dans `packages/ui`.
- **Convention `<SubmitButton isLoading={mutation.isPending}>` NON NÉGOCIABLE** pour toute mutation tRPC. Documentée `CLAUDE.md` section React/Next règle 5. Tout PR Phase 1+ doit la respecter — interdiction d'utiliser un `<Button>` nu pour une mutation. Code-reviewer doit flagger en Critical.
- **Edge case `asChild + isLoading` ignoré silencieusement** plutôt que throw runtime (Radix Slot incompatible avec spinner injecté dans un children arbitraire). `effectiveLoading = isLoading && !asChild`. Documenté JSDoc. `aria-busy={showSpinner}` (pas `isLoading` brut) pour cohérence a11y — fix appliqué post-review.
- **Helper `getActiveOrgCookieOptions()` + constante `ACTIVE_ORG_COOKIE_NAME` extraits dans `packages/auth/src/active-org.ts`** pour réutilisabilité future. Aujourd'hui **dette DRY consciente** : `packages/api/src/trpc.ts` redéclare encore `ACTIVE_ORG_COOKIE` + `ACTIVE_ORG_COOKIE_MAX_AGE` (valeurs identiques 6/6, tracée par commentaire). Sub-export `./active-org` à ajouter dans `packages/auth/package.json` quand on factorisera (ticket Phase 1 TBD).
- **Workaround Windows "pnpm dev direct dans `apps/web`"** quand Turbo plante silencieusement (cas observé Session 9 : Turbo capture stdout et ne forward pas le `Ready in X.Xs`, serveur quitte). `cd apps/web && pnpm dev` bypasse Turbo et permet de débugger. Pas un fix définitif, workaround pratique à garder en mémoire.
- **Méthode "bisect en live" sur incertitude diagnostic** : quand un test visuel échoue pendant la validation d'un ticket (Chantier A ici, suspect sur le hook BA), réflexe `git stash push -u` + `git checkout <commit-précédent>` + reproduce + `git stash pop` permet de prouver en 5 minutes si le bug est nouveau ou pré-existant. À enforcer systématiquement avant de basculer en mode debug profond — évite les fausses pistes coûteuses. Utilisé Session 9 pour confirmer que le bug cookie staleness venait bien de T0.8 (commit `b7d9a13`) et pas de la refacto getAuth Vague 1 T0.10.

### ⚠️ Points d'attention pour les prochaines sessions
- **Dette DRY tracée** : `trpc.ts` redéclare `ACTIVE_ORG_COOKIE` + `MAX_AGE` au lieu d'importer depuis `@modulo/auth/active-org`. Sub-export à ajouter dans `packages/auth/package.json` quand on factorisera (ticket Phase 1 TBD).
- **Edge case Windows ports** : `pnpm dev` bascule sur 3001 si 3000 zombie. Réflexe : `taskkill /F /IM node.exe` avant `pnpm dev` pour rester sur 3000, OU `Get-NetTCPConnection -LocalPort 3000` pour identifier le PID.
- **Turbo + Windows fragile** : si serveur dev quitte silencieusement, bypasser Turbo via `cd apps/web && pnpm dev`. Pas un fix définitif, juste un workaround pratique.
- **Convention `<SubmitButton />` à enforcer** sur tous les futurs forms Phase 1+. Code-reviewer doit flagger un `<Button>` nu sur une mutation comme **Critical**.
- **`asChild + isLoading` silent ignore** : si un dev se fait piéger (spinner attendu mais pas affiché), `console.warn` dev-only à considérer. Aujourd'hui JSDoc seul — acceptable vu la rareté du cas.
- **Rappels reportés des sessions précédentes** (encore valides) :
  - ✅ ~~Cookie staleness post-login~~ **FIXÉ T1.0a**
  - `NEXT_PUBLIC_BETTER_AUTH_URL` avant staging
  - Skeleton / error states `/settings/billing`
  - Tests d'intégration webhook (testcontainers ou Neon branches)
  - Refacto 5 webhook handlers (~65% duplication) — helpers `validateOrgExists` + `updateModuleBySubscription`
  - `stripeCustomerId` atomicité (table `organizations_billing` dédiée)
  - Découpage `@modulo/auth-server` / `@modulo/auth-client` si worker server-only émerge

### 🚧 En cours / pas fini
Aucun chantier de code ouvert. Working tree propre après les 2 commits T1.0 (`e8b9fda` + `46c81dd`). T1.0 officiellement clôturé en 2 commits atomiques.

### 🔜 Prochain ticket
- **T1.1 — Shell multi-tenant** (anciennement T0.8, reporté Phase 1 par décision T0.10). Routes `/(app)/[orgSlug]/*` avec résolution org via slug, sidebar dynamique listant les modules activés, topbar (switcher d'org, avatar user, command palette Cmd+K), layout qui injecte les CSS vars du thème de l'org. Justification de la priorité : `/dashboard` plat suffisait pour Phase 0, mais le shell devient nécessaire dès qu'on monte le premier module (`/(app)/[orgSlug]/m/sales/*` en T1.2).

### 💬 Notes libres
Session courte mais dense : 2 commits atomiques propres, 2 audits `/review-before-commit` (T1.0a et T1.0b), 3 fixes post-review au total (mini-fix dep `drizzle-orm` dev→deps + a11y `aria-busy` + défense en profondeur `type="button"`), 1 décision technique forte (lib pure isolée pour contourner l'absence d'infra Vitest dans `packages/ui`), 1 convention non négociable posée dans `CLAUDE.md`. Phase 1 officiellement démarrée — premier ticket bouclé proprement. Le pattern `<SubmitButton />` sera réutilisé dans tous les forms Sales Analytics (T1.3+ CRUD deals/contacts).

---

## 📅 2026-05-27 — Session 8 — T0.10 + clôture Phase 0

### 🎯 Objectif de la session
Boucler la Phase 0 en éliminant la dette consciente accumulée pendant T0.5 → T0.9 (refactos lazy, trous webhook, hardening prod, cleanup legacy, réconciliation doc) sans introduire de nouvelle complexité. Tout en 1 commit.

### ✅ Tickets terminés
- **T0.10** — Hardening + refactos pré-Phase 1 (clôt Phase 0). Découpé en **4 vagues séquentielles + 1 sous-tâche bonus** par l'orchestrator, validation visuelle imposée entre Vague 1 (refacto auth) et Vague 2. Détail :
  - **Vague 1** : `@modulo/auth` eager → `getAuth()` factory lazy avec cache `globalThis.__moduloAuth` (pattern identique `getDb()`). 5 call-sites migrés (`auth/index.ts`, `api/trpc.ts`, `api/auth/[...all]/route.ts`, `dashboard/page.tsx`, `vitest.config.ts`). Suppression complète de `packages/api/src/test-setup.ts` (plus aucune env factice au test runner). `registry.test.ts` ajusté avec scope local `STRIPE_PRICE_*` via `beforeAll/afterAll`. Validation visuelle live : login email/pwd + GitHub OAuth + logout + cookie cleanup OK.
  - **Vague 2** : helper pur `mapStripeStatusToModuleStatus(Stripe.Subscription.Status): ModuleStatus` colocated avec le webhook (`_helpers.ts`) + 8 tests unitaires couvrant les 8 statuts Stripe → 4 statuts modulo. Type `ModuleStatus` exporté pour la première fois depuis `packages/db/schema/billing.ts` (`typeof moduleStatusEnum.enumValues[number]`, source de vérité = pgEnum). Case `customer.subscription.updated` ajouté au switch du webhook handler avec pattern strictement identique aux 4 handlers T0.9 (idempotency, transaction, pre-flight SELECT org, warn structuré).
  - **Vague 3** : guards `process.env.NODE_ENV !== "development"` sur `/healthcheck` (via Server Component wrapper `layout.tsx` car la page elle-même est Client) et `/styleguide`. 4 tokens sémantiques `*-muted` ajoutés (OKLCH ~0.30-0.32 lightness, chroma ~0.04-0.06) avec mapping `@theme inline` Tailwind v4 + paragraphe DESIGN_SYSTEM.md §5 "muted vs /10". Suppression `packages/config/tailwind-preset/index.ts` legacy v3 remplacé par un `index.d.ts` ambient minimal (déclare le module CSS `/theme`, package désormais CSS-only).
  - **Sous-tâche bonus 3.4** : fix `useSearchParams()` Suspense boundary sur `/settings/billing` (régression T0.9 qui cassait `pnpm build`). Extraction en sous-composant `BillingToastWatcher` qui rend `null`, wrapping `<Suspense fallback={null}>`. Build prod désormais propre, `/settings/billing` en `○ Static`.
  - **Vague 4** : réconciliation doc complète. ROADMAP restructurée (note de réconciliation header Phase 0 + T0.6.5 i18n inséré + T0.8 reporté Phase 1 + T0.8.5 onboarding strict ajouté + T0.9 reformulé Stripe + T0.10 reformulé hardening). ARCHITECTURE §3 aligné sur le code réel (uuid+uuidv7, timestamptz, pgEnum module_status, table stripe_webhook_events). MODULE_BLUEPRINT:55 corrigé (process.env.X! → getter lazy requireEnv). CLAUDE.md augmenté d'une sous-section "🏭 Factory pattern pour les clients externes".
  - **3 fixes post-review** : commentaire inline dans `subscription.updated` documentant le choix de ne pas ajouter `AND organization_id` (cohérence T0.9, refacto dette Phase 1) + `enabledAt`/retrait `updatedAt` dans ARCHITECTURE.md (mes erreurs Vague 4) + commentaire `any` → `unknown` dans `billing.ts`. Commit `7e5fde7`.

### 🧠 Décisions structurantes prises
- **Factory pattern systématique pour les clients externes** : tout client tiers (DB, Auth, Stripe, futurs SDKs) s'expose via une fonction `getXxx()` lazy avec cache `globalThis`. Zéro side-effect d'import, compatible HMR Next, instance créée au premier usage réel. `getDb()` et `getAuth()` deviennent les exemples canoniques. Documenté dans CLAUDE.md. À reproduire en T1.X.
- **`ModuleStatus` exporté depuis le pgEnum Drizzle** : `typeof moduleStatusEnum.enumValues[number]`. Source de vérité unique = schéma DB, pas de duplication entre webhook handler / UI / tests. Pattern à reproduire pour tout enum métier en Phase 1.
- **Helper colocated tant qu'il y a un seul consommateur** : `_helpers.ts` resté dans `apps/web/app/api/webhooks/stripe/` plutôt que promu en `packages/api/src/billing/`. YAGNI — déplacement trivial si un second consommateur émerge. Principe à appliquer par défaut Phase 1.
- **`Stripe.Subscription.Status` direct depuis le SDK** : pas de type maison à dupliquer (qui divergerait silencieusement si Stripe ajoute un statut). Le compilateur signale la divergence au point d'utilisation via le `default` exhaustif avec `_exhaustiveCheck: never`. Pattern à reproduire pour toute intégration SDK externe (Inngest, Resend, Anthropic, etc.).
- **Guard `NODE_ENV !== "development"`** (pas `=== "production"`) : safe default — refuse l'accès si `NODE_ENV` est `undefined`, `"test"`, `"preview"`, etc. Next garantit `NODE_ENV` défini dans tous ses runtimes. Pattern uniformisé sur `/healthcheck` et `/styleguide`, à appliquer pour toute future page dev-only.
- **`pnpm build` désormais étape obligatoire de `/review-before-commit`** : la régression T0.9 sur `useSearchParams` n'aurait pas été détectée sans `pnpm build`. Le typecheck/lint/test ne suffisent pas — le build prod a sa propre passe de prerender CSR. Skill `/review-before-commit` à étendre.

### ⚠️ Points d'attention pour les prochaines sessions
- **Cookie staleness post-login bisecté en live** pendant la validation visuelle Vague 1 — confirmé comme **bug pré-existant T0.8** (déjà documenté Sessions 6 et 7). Pas une régression T0.10. Solution Phase 1 : pré-populer cookie au sign-in via BA hook OU basculer `/dashboard` en server-side check DB (abandon du fast-path cookie).
- **Dette Phase 1 trackée** : (1) refacto 5 webhook handlers (~65% duplication, helpers `validateOrgExists` + `updateModuleBySubscription`) ; (2) `listAvailableModules()` invoque tous les getters lazy via `Object.values(MODULES)` — lazy partiellement défait, à reconsidérer (`getStripePriceId(slug)`) ; (3) `packages/auth/package.json` peer dep React (à découper en `@modulo/auth-server` / `@modulo/auth-client` si un worker server-only émerge) ; (4) `stripeCustomerId` non atomique (table `organizations_billing` dédiée avec upsert) ; (5) UX disable submit côté forms billing pendant la mutation Stripe.
- **Rappels reportés des sessions précédentes** (encore valides) : `NEXT_PUBLIC_BETTER_AUTH_URL` avant staging · tokens dataviz `--chart-*` en T1.4 · démo `sonner` (✅ faite côté billing T0.9) · README packages partagés Phase 1 · tests d'intégration webhook (testcontainers ou Neon branches) · script `pnpm module:new` (T0.10 original reporté Phase 1).

### 🚧 En cours / pas fini
Aucun chantier de code ouvert. Working tree propre après le commit T0.10 (`7e5fde7`). **Phase 0 officiellement clôturée — 8 sessions, 10 tickets (T0.1 → T0.10), ~10 jours calendaires depuis l'init du repo.**

### 🔜 Prochain ticket
- **T1.0 — Polish dette critique Phase 0** (à créer en début Phase 1). Premier ticket pour traiter 2 dettes bloquantes pour le dogfooding et la démo :
  (a) Fix cookie staleness post-login bisecté en Session 8 — user existant + logout/re-login → bounce `/create-org`. Solution candidate : pré-populer cookie `modulo-active-org` via Better Auth hook `onSignIn` OU abandonner le fast-path cookie au profit d'un server-side check DB dans `createTRPCContext`.
  (b) Pattern UX disable submit pendant mutation sur forms billing et `organizations.create` (409 Conflict observé V1 sur double-clic). Convention à généraliser : tout bouton submit lié à une mutation tRPC = `disabled` + label loading pendant `isPending`.

- **T1.1 — Shell multi-tenant** (anciennement T0.8, reporté Phase 1). Routes `/(app)/[orgSlug]/*` avec résolution org via slug, sidebar dynamique listant les modules activés, topbar (switcher d'org, avatar user, command palette Cmd+K), layout qui injecte les CSS vars du thème de l'org. Justification de la priorité : `/dashboard` plat suffisait pour Phase 0 (1 org, 0 module), mais le shell devient nécessaire dès qu'on monte le premier module (`/(app)/[orgSlug]/m/sales/*`).

- **T1.2 — Scaffold du module Sales Analytics**. `pnpm module:new sales-analytics` (créer le script si pas fait), `module.config.ts` (icône BarChart3, pricing 29€, scopes, navigation), apparition dans `/settings/modules`, activation → entrée sidebar + page placeholder.

### 💬 Notes libres
**Phase 0 à 100 %.** Session marathon mais maîtrisée : 4 vagues séquentielles + 1 sous-tâche bonus + 1 audit complet + 3 fixes post-review, le tout en un seul commit propre. Discipline orchestrator : briefs ultra-détaillés aux sub-agents, STOP forcé entre Vague 1 et Vague 2 pour validation visuelle Chris, audit reviewer challengé honnêtement (1 Important downgradé à Nit après analyse cohérence T0.9). Le pattern factory `getXxx()` validé en Vague 1 sera la fondation de toutes les intégrations SDK externes en Phase 1. Premier sprint Phase 1 conseillé : T1.0 polish dette → T1.1 shell multi-tenant → T1.2 scaffold Sales Analytics.

---

## 📅 2026-05-27 — Session 7 — Billing Stripe + activation modules

### 🎯 Objectif de la session
Intégrer Stripe (Checkout + Customer Portal + Webhooks) et brancher l'activation des modules — premier flow business du projet, fondation du modèle économique modulaire.

### ✅ Tickets terminés
- **T0.9** — Stripe billing + module activation. Stripe SDK pin exact (`stripe@22.1.1`) + `apiVersion: "2026-04-22.dahlia"`. Schéma `billing.ts` étendu (`pgEnum module_status`, colonnes `status` / `stripe_subscription_id` UNIQUE / `stripe_customer_id`, table `stripe_webhook_events` pour idempotency). Migration `0002_brief_hellcat.sql` appliquée. Registry MODULES statique côté code (`packages/api/src/modules/registry.ts`, `sales-analytics` available + `crm` coming_soon). Router tRPC `billing` (3 procedures : `listAvailableModules` / `createCheckoutSession` / `createPortalSession`, toutes en `orgProcedure`). Webhook handler `/api/webhooks/stripe` : raw body + signature `constructEvent` + idempotency `event_id` PK + rollback DELETE si handler throw + transactions Drizzle uniformes sur les 4 handlers (`checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`) + validation `orgId` DB pré-INSERT (defense contre session forgée). Filtre `eq(status, "active")` ajouté dans `createTRPCContext` → `past_due` n'unlock plus les routes module. UI `/settings/billing` (Client Component, status badges semantic `bg-{token}/10 text-{token}`, toasts sonner). Toaster monté dans layout. Middleware étendu `/settings/:path*`. Scope i18n `settings.billing` (fr+en). 4 tests registry (23 total). Commit `b7d9a13`.

### 🧠 Décisions structurantes prises
- **Stripe SDK pin EXACT + `apiVersion` pinée** (`22.1.1` + `2026-04-22.dahlia`). Évite les breaking changes silencieux côté API Stripe. Pattern à reproduire pour toute intégration SDK externe critique.
- **Module registry pattern** : MODULES défini statiquement côté code (typé via `satisfies Record<string, ModuleDescriptor>`), pas de fetch Stripe Products en runtime. Foundational pour scaler à N modules sans appels Stripe parasites. Les Price IDs viennent de l'env (lazy via getter), pas hardcodés.
- **Webhook = seule source de vérité** pour l'état d'activation. Aucun set côté frontend post-redirect (`?success=true` est purement cosmétique, ne déclenche pas d'écriture DB). Idempotency table `stripe_webhook_events` (PK `event_id`) + ON CONFLICT DO NOTHING + DELETE rollback si handler throw → Stripe retry. Transactions Drizzle uniformes sur les 4 handlers (contrat strict).
- **Sécurité webhook = 3 garde-fous combinés** : (1) signature Stripe vérifiée sur raw body via `constructEvent`, jamais bypassée même en dev — (2) `orgId` extrait de `session.metadata` re-vérifié contre la table `organizations` AVANT INSERT (defense contre session forgée si clé Stripe fuite) — (3) `requireEnv` lazy (getter sur `stripePriceId` + check au runtime du webhook) pour ne pas crasher le process si une var manque au boot.

### ⚠️ Points d'attention pour les prochaines sessions
- **Edge case cookie staleness post-login** : toujours reporté Phase 1 (documenté Session 6 ET 7). Pré-populer cookie au sign-in via BA hook OU basculer `/dashboard` en server-side check DB.
- **`customer.subscription.updated` handler manquant** : à ajouter T0.10/Phase 1 quand `trial` sera réellement implémenté (transitions `trialing → active`, `past_due → active` post-portal).
- **`stripeCustomerId` atomique** : aujourd'hui création non-atomique = doublon Customer possible si double-tab. À extraire en table `organizations_billing` dédiée avec upsert atomique en Phase 1.
- **Skeleton loading `/settings/billing`** : pas de loading state ni d'error state (liste vide silencieuse). Dette UI Phase 1.
- **Tests Vitest webhook handler** : aucun test sur signature/idempotency/handlers (test d'intégration → infra DB de test nécessaire, testcontainers ou Neon branches en Phase 1).
- **`docs/MODULE_BLUEPRINT.md:55`** divergent du nouveau pattern lazy (`process.env.X!` au lieu de getter `requireEnv`). Ticket doc à part.
- **Rappels reportés des sessions précédentes** : `NEXT_PUBLIC_BETTER_AUTH_URL` avant staging · refacto `@modulo/auth` → `getAuth()` factory (T0.10) · tokens `*-muted` symétriques aux `*-foreground` · guards `NODE_ENV !== 'development'` sur `/healthcheck` + `/styleguide` avant 1er deploy · `packages/config/tailwind-preset/index.ts` legacy à supprimer · démo `sonner` (faite côté billing, ✅) · `ARCHITECTURE.md` §3 à réconcilier · README packages partagés Phase 1 · ROADMAP désynchronisée par intercalaires T0.6.5 + T0.8 à réconcilier en début Phase 1.

### 🚧 En cours / pas fini
Aucun chantier ouvert. Working tree propre après le commit T0.9 (`b7d9a13`).

### 🔜 Prochain ticket
- **T0.10** — Dernier ticket Phase 0 : hardening + refactos pré-Phase 1. Notamment refacto `@modulo/auth` en `getAuth()` factory (lazy comme `getDb()`, supprime le besoin de `test-setup.ts` côté API), guards `NODE_ENV !== 'development'` sur `/healthcheck` + `/styleguide`, cleanup `packages/config/tailwind-preset/index.ts` legacy, ajout handler `customer.subscription.updated`, tokens `*-muted` symétriques. Ticket de doc en parallèle pour réconcilier ROADMAP + ARCHITECTURE.md + MODULE_BLUEPRINT.md.

### 💬 Notes libres
Phase 0 à **90 %** (T0.1 → T0.9 sur 10 tickets, en comptant T0.6.5 comme intercalaire). Session courte mais dense : un seul gros ticket, 1 commit. Le `/review-before-commit` a attrapé 2 vrais bloquants (validation orgId DB + lazy `requireEnv` sur `STRIPE_PRICE_*`) + 1 inconsistance (transactions non uniformes) — tous fixés avant push. Pattern qui se confirme : reviewer agressif sur les Critical, à recadrer en orchestrator avec analyse honnête.

---

## 📅 2026-05-23 — Session 6 — Fondations API — tRPC + onboarding

### 🎯 Objectif de la session
Poser la couche API typée bout-en-bout (tRPC v11 + middlewares multi-tenant), boucler les fondations transverses (i18n + Vitest), et implémenter le flow d'onboarding strict qui rend la chaîne signup → org → dashboard utilisable end-to-end.

### ✅ Tickets terminés
- **fix(auth)** — bugfix d'ouverture de session : `router.push("/dashboard")` manquant après `authClient.signIn.email` / `signUp.email` (le `callbackURL` côté client BA est inerte pour email/password) + bonus clear-error-on-input-change. Commit `e0be64f`.
- **T0.6.5** — Setup i18n minimum viable (`next-intl@4.12.0` pin exact). Locale `fr` en dur, pas de routing URL ni de switcher. Messages `fr.json`/`en.json` mirror strict, extraction de toutes les strings (home, login, signup, dashboard). Schémas Zod déplacés dans les composants (`makeXxxSchema(t)`). Commit `2453e3b`.
- **T0.7** — Setup tRPC v11 + middlewares multi-tenant + infra Vitest. Package `@modulo/api` (tRPC 11.17.0 + superjson + react-query 5.100.13, pin exact), 4 procédures (`publicProcedure`/`authedProcedure`/`orgProcedure`/`moduleProcedure(id)`) avec narrowing TS, `createTRPCContext` qui résout user + active org via cookie + enabledModules, client tRPC + provider React Query côté `apps/web`, page `/healthcheck` smoke test, infra Vitest 11 tests, refacto léger (`requireEnv` extrait dans `env.ts`, factories `make{Login,Signup}Schema(t)`). Pattern Status badges documenté dans `DESIGN_SYSTEM.md` §5. Commit `1447bc5`.
- **T0.8** — Flow d'onboarding strict création organization. Mutation `organizations.create` (`authedProcedure` + transaction atomique org+membership, cookie posé post-commit, narrow `unknown→23505` → CONFLICT). Page `/onboarding/create-org` (auto-slugify avec flag `userEditedSlug`, validation Zod via factory, logout fallback). Utilitaire `slugify` + factory `makeCreateOrgSchema(t)` (8 nouveaux tests). Middleware étendu (matcher `/login`/`/signup`/`/dashboard/*`/`/onboarding/*`, 4 cas explicites sans boucle). Wrap BA route handler qui clear `modulo-active-org` sur `/sign-out` + defense in depth dans `createTRPCContext`. Scope i18n `onboarding.createOrg`. 2 bugs attrapés et fixés pendant le ticket : route group `(onboarding)` qui stripait l'URL → renommé en dossier normal ; cookie qui persistait après logout. Commit `41c1e92`.

### 🧠 Décisions structurantes prises
- **i18n sans URL routing** : locale `fr` en dur, pas de préfixe URL `/fr|/en`, pas de switcher UI. Future-proof simple, le locale-routing arrivera en Phase 1 si besoin (Phase 1 = onboarding marketing multilingue).
- **Cookie `modulo-active-org` = fast-path multi-tenant** : middleware Option A cookie-only (pas de DB call, edge-safe). `createTRPCContext` valide réellement la membership côté serveur (le cookie est un hint, pas la vérité). Set/clear défensif via `resHeaders`. Wrap BA route handler clear le cookie sur `/sign-out` + defense in depth quand `rows.length === 0` et cookie pourri présent.
- **Status badges = pattern subtil** : `bg-{semantic}/10 text-{semantic}` pour les indicateurs d'état multiples (cohérent avec `dropdown-menu` shadcn). Complète le composant `<Badge>` solid de `@modulo/ui` (label/action). Documenté dans `DESIGN_SYSTEM.md` §5.
- **Tests via factory pattern** : schémas Zod = `make{Login,Signup,CreateOrg}Schema(t)`, `requireEnv` extrait dans `env.ts`. Tout testable avec un translator identité `(k) => k`. **Pattern à reproduire systématiquement** pour tous les forms futurs.

### ⚠️ Points d'attention pour les prochaines sessions
- **Edge cases cookie staleness (multi-tenant fast-path)** : (1) user avec org se reconnecte sur un nouveau navigateur → cookie absent → middleware le bounce vers `/onboarding` par erreur ; (2) OAuth callback ne déclenche PAS le clear-cookie (wrap fire uniquement sur `/sign-out`). **Solution Phase 1** : pré-populer cookie au sign-in via BA hook ou endpoint custom, OU basculer `/dashboard` en server-side check DB (abandon du fast-path cookie).
- **Hardening `/healthcheck` + `/styleguide`** : guard `NODE_ENV !== 'development'` avant 1er déploiement staging. Ticket dédié avant le 1er deploy.
- **Refacto `@modulo/auth` → `getAuth()` factory** : `betterAuth()` s'instancie au module-load → oblige un `test-setup.ts` avec env factices côté `@modulo/api`. À refactorer en lazy `getAuth()` (comme `getDb()`). Prévu T0.10.
- **Test d'intégration `organizations.create`** : pas de test Vitest aujourd'hui (mutation avec transaction DB = test d'intégration). À planifier quand l'infra de test BDD arrive (testcontainers ou Neon branches en Phase 1).
- **Rappels reportés des sessions précédentes** : `NEXT_PUBLIC_BETTER_AUTH_URL` avant staging (Session 5) · tokens dataviz `--chart-*` en T1.4 (Session 3) · `ARCHITECTURE.md` §3 à réconcilier (Sessions 4-5) · démo `sonner` à câbler dès qu'une vraie mutation à notifier · `packages/config/tailwind-preset/index.ts` legacy à supprimer · README packages partagés en Phase 1 · tokens `*-muted` symétriques aux `*-foreground` · status filter sur `enabled_modules` quand colonne `status` ajoutée en T0.10.

### 🚧 En cours / pas fini
Aucun chantier de code ouvert. Working tree propre après le commit T0.8 (`41c1e92`).

### 🔜 Prochain ticket
- **T0.9** — Stripe + billing + activation modules. Setup Stripe en mode test (clés env). Schéma : ajout colonne `status` enum sur `enabled_modules` (`active`/`trial`/`past_due`/`canceled`). Webhook handler `/api/webhooks/stripe` avec signing secret verification. Mapping Stripe Subscription → `enabled_modules` (insert/update via webhook events `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `subscription.deleted`). Procédure tRPC `billing.*` pour créer Checkout sessions et Customer Portal. UI minimale : page `/settings/billing` avec liste modules disponibles + bouton « Activer » qui ouvre Stripe Checkout. Tests Vitest sur la logique de mapping. **Note** : la ROADMAP est désynchronisée par les intercalaires T0.6.5 et T0.8 onboarding — à réconcilier en début de Phase 1 (ticket de doc).

### 💬 Notes libres
Phase 0 à **80 %** (T0.1 → T0.8 sur 10 tickets, en comptant T0.6.5 comme intercalary). Session marathon : 4 commits, ~50 fichiers touchés, 3 fix-après-test attrapés en flux (signup redirect, route group onboarding, cookie persistant après logout). La discipline `/review-before-commit` + tests Vitest + DevTools manuel a payé — chaque bug attrapé avant push.

---

## 📅 2026-05-23 — Session 5 — Fondations auth — Better Auth

### 🎯 Objectif de la session
Mettre en place la couche authentification : package `@modulo/auth`, schéma BD étendu (sessions/accounts/verifications + colonnes sur users), pages `/login`/`/signup`, middleware de protection, providers email+password + GitHub/Google OAuth.

### ✅ Tickets terminés
- **T0.6** — Setup Better Auth complet. Package `@modulo/auth` (`better-auth@1.4.22`) avec sous-exports `/`, `/client`, `/next`, `/cookies`. Schéma `packages/db/schema/auth.ts` (sessions/accounts/verifications, FK `ON DELETE cascade` vers users) + ALTER `users` (`email_verified` + `image`). Migration **`0001_youthful_shatterstar.sql` appliquée sur Neon eu-west-2**. Handler API `[...all]/route.ts` exportant les 5 méthodes. Middleware `apps/web/middleware.ts` (matcher `/dashboard`). Pages `/login` et `/signup` (Client Components, validation **Zod**, OAuth + email/password). Page `/dashboard` protégée (Server Component lisant `auth.api.getSession()`) + `LogoutButton`. **3 users créés en BDD avec accounts + sessions actives**, login + dashboard + logout testés end-to-end.

### 🧠 Décisions structurantes prises
- **`better-auth@1.4.22` pin exact** (pas le `1.6.x` latest) — évite un bump `drizzle-orm` hors scope. Séparation des chantiers confirmée comme principe.
- **3 adaptations API Better Auth 1.4 validées** au planning : `advanced.database.generateId: "uuid"` (obligatoire — sans ça BA génère des nanoid 32-chars incompatibles avec nos colonnes uuid PG) · `usePlural: true` + barrel `@modulo/db/schema` à plat (l'adapter veut le namespace flat, pas un mapping `{ user, session, ... }`) · `toNextJsHandler` exporte les 5 méthodes (`GET, POST, PATCH, PUT, DELETE`) pour rester future-proof aux plugins BA.
- **`@modulo/auth` = single source of truth** pour Better Auth. `apps/web` ne dépend QUE de `@modulo/auth/*` via les sous-exports (`/client`, `/next`, `/cookies`), jamais directement de `better-auth/*`. Évite le couplage redondant.
- **Forms = Zod côté client** (1ère utilisation Zod du projet, `zod@4.4.3` pin exact). Schémas définis hors composant, `safeParse` au submit, message d'erreur affiché. **Pattern à reproduire systématiquement en T1.X**.
- **2 fixes pré-commit attrapés par le reviewer** : `requireEnv` symétrique sur `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` (évite un secret éphémère en prod / callbacks OAuth silencieusement cassés) · `try/finally` autour de `signOut()` dans `LogoutButton` (évite le `disabled` éternel si la navigation échoue).
- **Workaround Windows** : Next + Turbo ne lisent pas le `.env.local` racine. **Modulo a désormais 2 `.env.local`** : un à la racine pour Drizzle Kit / migrations, un dans `apps/web/` pour Next runtime. Les deux sont gitignorés. Synchronisation manuelle.

### ⚠️ Points d'attention pour les prochaines sessions
- **Bug `/signup` redirect** : après création réussie (user bien créé en BD), la page ne redirige PAS vers `/dashboard`. Probable détail `callbackURL` / `autoSignIn` / réaction client BA à investiguer en début de Session 6.
- **`NEXT_PUBLIC_BETTER_AUTH_URL` à exposer avant le 1er déploiement staging** : `createAuthClient()` actuel utilise `window.location.origin`, OK en dev, peut diverger en staging/prod. Important #2 du reviewer T0.6, non bloquant en local.
- **Synchronisation des 2 `.env.local`** : à documenter dans `CLAUDE.md` ou `README` pour éviter qu'une future instance Claude prenne ça pour un bug.
- **Vitest à installer en T0.7** (déjà reporté Sessions 3/4) — la fondation auth ne devrait pas rester sans couverture de tests (`requireEnv`, schémas Zod login/signup).
- Rappels reportés : tokens dataviz `--chart-*` en T1.4 · ARCHITECTURE.md §3 à réconcilier · démo `sonner` à câbler quand vraie mutation à notifier (T0.7/T0.8) · `packages/config/tailwind-preset/index.ts` legacy à supprimer après T0.7.

### 🚧 En cours / pas fini
Aucun chantier de code ouvert. Working tree propre après le commit T0.6 (`24f5382`). Le bug `/signup` redirect est noté comme point d'attention à investiguer en début de Session 6.

### 🔜 Prochain ticket
- **T0.7** — Setup tRPC + middlewares multi-tenant. `packages/api` avec init tRPC v11, `createContext` qui résout user + org active, procédures `publicProcedure`/`authedProcedure`/`orgProcedure`/`moduleProcedure(id)`, route handler `apps/web/app/api/trpc/[trpc]/route.ts`, client React Query côté frontend. **Infra Vitest** à mettre en place dans le même ticket.

### 💬 Notes libres
Phase 0 à **60 %** (T0.1 → T0.6 sur 10 tickets). Première session avec signup OAuth réel testé en live — la chaîne `Better Auth → adapter Drizzle → Neon Postgres → cookies HttpOnly → session validée par auth.api.getSession()` est désormais opérationnelle de bout en bout.

---

## 📅 2026-05-22 — Session 4 — Fondations BDD — Drizzle + Neon

### 🎯 Objectif de la session
Poser la couche base de données du projet : package `@modulo/db`, schémas `core` et `billing`, client Neon, et appliquer la première migration sur Neon Postgres.

### ✅ Tickets terminés
- **T0.5** — Setup Drizzle ORM + Neon Postgres. Package `@modulo/db` créé, schéma `core.ts` (users, organizations, memberships + enum `role`) et `billing.ts` (enabled_modules), `client.ts` avec `getDb()` lazy + `@neondatabase/serverless`, `drizzle.config.ts` avec `dotenv` pour `.env.local` racine, migration initiale générée (`0000_small_black_queen.sql`) avec UUID v7 côté app, FK `ON DELETE CASCADE`, index sur `memberships.organization_id` ajouté avant commit (fix attrapé par le code-reviewer). `.env.example` commité, `.env.local` créé à la racine (gitignored), **migration appliquée sur Neon eu-west-2**, 4 tables vérifiées dans Drizzle Studio.

### 🧠 Décisions structurantes prises
- **Séparation par domaine fonctionnel** : `core.ts` (transverse) + `billing.ts` (commercial). Convention `<module>.schema.ts` réservée aux schémas par module métier (T1.X). `CLAUDE.md` étendu pour documenter la distinction.
- **UUID v7 côté app** via lib `uuidv7` + Drizzle `$defaultFn` — PG 17 n'a pas `uuidv7()` natif. Choix : portable (pas lié à Neon), triable temporellement (meilleure localité d'index), fail-fast si insert sans ID (pas de `DEFAULT` SQL).
- **`timestamptz` partout** (`timestamp with time zone`) — best practice SaaS B2B, évite les bugs de DST.
- **Client BDD via `getDb()`** (fonction lazy) — évite de déclencher la connexion à l'import, compatible serverless et tests unitaires. Cache `globalThis` pour Next HMR.
- **Driver `@neondatabase/serverless`** (WebSocket optimisé) plutôt que `pg` classique.
- **Pooled URL** (`DATABASE_URL`) pour app runtime ; **unpooled URL** (`DATABASE_URL_UNPOOLED`) pour migrations (transactions longues).
- **Index BDD posé dès T0.5** sur `memberships.organization_id` pour anticiper les requêtes multi-tenant (T0.7).
- **4 divergences avec `ARCHITECTURE.md §3` acceptées** : uuid (pas text), pas de `theme` jsonb sur organizations, `updated_at` partout, `timestamptz`. Doc à mettre à jour hors scope T0.5.
- **Better Auth (T0.6) anticipé** : `users.email` unique + non-null, `users.name` nullable, prêt pour l'adaptateur Better Auth.
- **Discipline review confirmée** : `/review-before-commit` AVANT commit, index manquant attrapé et corrigé, migration `0000` régénérée propre (pas de `0001` parasite).

### ⚠️ Points d'attention pour les prochaines sessions
- **`ARCHITECTURE.md §3` à réconcilier** : uuid (pas text) pour PK, `timestamptz` (pas `timestamp`), `updated_at` partout, `theme` jsonb reporté à T0.9. Mise à jour à faire indépendamment des tickets.
- **T0.6 Better Auth** : configurer l'adaptateur Drizzle, anticiper la création des tables `sessions`/`accounts`/`verification`, **ne pas dupliquer `users`**.
- **Drizzle Studio** = outil dev BDD : `pnpm db:studio` pour explorer la BDD localement.
- Rappels reportés de la Session 3 : infra Vitest avant T0.7 · tokens dataviz `--chart-1..5` en T1.4 · démo `sonner` à câbler dès qu'on aura une vraie mutation à notifier — probablement T0.7 (tRPC) ou T0.8 (shell) · `packages/config/tailwind-preset/index.ts` legacy à supprimer après T0.6/T0.7.

### 🚧 En cours / pas fini
Aucun chantier de code ouvert. Working tree propre après le commit T0.5 (`6bc5bd6`).

### 🔜 Prochain ticket
- **T0.6** — Setup Better Auth : adaptateur Drizzle sur le schéma core, signup/login email+password, sessions sécurisées via cookies HTTPOnly, middleware Next protégeant les routes authentifiées. Provider GitHub OAuth en bonus si pas de friction. Magic link et Personal Organization reportés (SMTP non configuré, shell multi-tenant en T0.8).

### 💬 Notes libres
Phase 0 à **50 %** (T0.1 → T0.5 sur 10 tickets). Session courte et ciblée, attaquée immédiatement après la clôture de Session 3 le même jour. La migration appliquée et vérifiée dans Drizzle Studio sur Neon eu-west-2 confirme que la chaîne complète (Drizzle TS → drizzle-kit generate → SQL → Neon) est opérationnelle.

---

## 📅 2026-05-22 — Session 3 — Fondations frontend — app, tokens, shadcn

### 🎯 Objectif de la session
Boucler le socle frontend de la Phase 0 : application Next.js opérationnelle, design system tokenisé, et librairie de composants.

### ✅ Tickets terminés
- **T0.2** — Init app Next.js (`apps/web` : Next 15.5.18, App Router, Tailwind v4 CSS-first, Geist via next/font, page d'accueil éditoriale sobre)
- **T0.3** — Setup design tokens dans `packages/ui` (palette OKLCH complète, échelle typo 10 tailles, page `/styleguide` dev-only, preset Tailwind porté en v4 CSS-first avec `@theme inline`)
- **T0.4** — Installation de shadcn/ui (19 composants retokenisés sur le design system Modulo, démo `/styleguide` complète, 4 tokens sémantiques `-foreground` ajoutés)
- Hors-ticket : `docs(tailwind-preset)` — README de transmission posé entre T0.2 et T0.3

### 🧠 Décisions structurantes prises
- **Tailwind v4 CSS-first** : preset = `theme.css` avec `@theme inline` (pas de `tailwind.config.ts`), valeurs des tokens dans `@modulo/ui`, mapping dans le preset. Theming par tenant préservé même après l'intégration des 19 composants.
- **`DESIGN_SYSTEM.md` = source de vérité unique** en cas de conflit avec un brouillon donné en chat.
- **`suppressHydrationWarning` sur `<body>`** = solution officielle Next.js pour les attributs injectés par les extensions Chrome (pas un workaround).
- **Convention shadcn `-foreground`** adoptée pour les couleurs sémantiques (success/warning/danger/info), documentée dans `DESIGN_SYSTEM.md`. Design system étendu avant le commit plutôt que d'accumuler de la dette.
- **shadcn = adapter, pas bridge** : composants retokenisés manuellement vers les tokens Modulo. Mono-thème dark, `next-themes` retiré.
- **Directive `@source` dans le preset partagé** (pas dans `globals.css`) — DRY : toute future `apps/*` hérite automatiquement de la zone de scan.
- **Exception kebab-case** pour `packages/ui/components/` (compat CLI `shadcn add`) ; `PascalCase` reste la règle ailleurs.
- **Discipline review** : `/review-before-commit` lancée AVANT le commit (T0.3, T0.4). Règle confirmée : une consigne donnée en chat a la même force qu'une consigne documentée — l'agent signale avant d'improviser (4 dérives détectées et corrigées sur la session).

### ⚠️ Points d'attention pour les prochaines sessions
- **Infra Vitest absente** — à mettre en place au plus tard en T0.7 (tests des procédures tRPC et middlewares multi-tenant).
- **Tokens dataviz `--chart-1..5`** (DESIGN_SYSTEM §7) — à ajouter à `colors.css` en T1.4 (dashboard Sales Analytics).
- **`packages/config/tailwind-preset/index.ts`** (legacy v3) — à supprimer après T0.5/T0.6 une fois la stabilité Tailwind v4 confirmée.
- **Démo `sonner`** dans `/styleguide` — placeholder actuel, à câbler quand on aura une vraie mutation à notifier (probablement T0.6 ou T0.7).
- **Hooks Claude Code** — définitivement abandonnés (workflow manuel suffit ; test WSL ou pwsh MSI à explorer un jour si curiosité).

### 🚧 En cours / pas fini
Aucun chantier de code ouvert. Working tree propre après le commit T0.4.

### 🔜 Prochain ticket
- **T0.5** — Setup Drizzle + Neon : schéma `core` (users, organizations, memberships, enabledModules), migrations, `db:studio`, `.env.example`.

### 💬 Notes libres
Phase 0 à 40 % (T0.1 → T0.4 sur 10 tickets). Session dense et productive. Le `code-reviewer` a attrapé un bug majeur en T0.4 (Tailwind ne scannait pas les composants → `@source` manquant) et plusieurs fixes mineurs avant chaque commit — la discipline d'audit systématique paie.

---

## 📅 2026-05-18 — Session 2 — Debug hooks Claude Code

### 🎯 Objectif de la session
Faire fonctionner les hooks Claude Code (SessionStart / PostToolUse / PreToolUse / Stop) configurés en session 1 mais qui ne se déclenchaient pas.

### ✅ Tickets terminés
- Aucun ticket roadmap. Session 100 % debug environnement Claude Code.

### 🧠 Décisions structurantes prises
- **Hooks Claude Code installés mais désactivés temporairement.** Bug d'encodage UTF-8 dans le canal hooks → `systemMessage` côté Windows : les emojis et caractères Unicode sont corrompus dans le pipe stdout du hook. Tentative de basculer sur pwsh 7 échouée (stub WindowsApps non résolvable par les sous-processes spawnés par Claude Code, install machine refusée par winget). Bascule en ASCII pur tentée, n'a pas non plus déclenché l'affichage. Décision finale : désactiver complètement la section `hooks`, garder le `settings.json.with-hooks` en backup local (gitignored) pour debug ultérieur. Les agents et commands continuent de fonctionner normalement.

### ⚠️ Points d'attention pour les prochaines sessions
- **Hooks à débugger fresh ou abandonner.** Pistes restantes : install pwsh 7 via MSI direct depuis github.com/PowerShell/PowerShell/releases, ou tester sur WSL Linux où l'encodage UTF-8 n'a pas ces problèmes. Si le debug s'éternise > 30 min en session 3, abandonner les hooks définitivement — le workflow manuel (lancer `/session-start` + `/review-before-commit` + `/session-end` manuellement) reste parfaitement viable.
  - → [ACTÉ Session 3] Hooks abandonnés. Workflow manuel adopté définitivement. `settings.json.with-hooks` conservé en local comme archive.

### 🚧 En cours / pas fini
- Hooks Claude Code en pause. Config préservée dans `.claude/settings.json.with-hooks` (gitignored). `.claude/settings.json` actif ne contient que `$schema`, `permissions`, `outputStyle`.

### 🔜 Prochain ticket
- **T0.2** — Init app Next.js (`apps/web` avec App Router, Tailwind v4, page d'accueil de démo). À attaquer dès que la décision hooks est prise (debug ou abandon).

### 💬 Notes libres
Session frustrante côté hooks mais le contournement est propre : config cassée préservée en local pour debug à tête reposée, rien de cassé sur le repo distant.

---

## 📅 2026-05-17 — Session 1 — Mise en place du projet

### 🎯 Objectif de la session
Cadrer le projet Modulo, poser les fondations Git et la configuration Claude Code, démarrer le ticket T0.1.

### ✅ Tickets terminés
- **T0.1** — Init monorepo (pnpm workspaces + Turborepo + configs partagées dans `packages/config/`)

### 🧩 Hors-tickets (mise en place initiale)
- Cadrage complet : `README.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `CLAUDE.md`, `MODULE_BLUEPRINT.md`, `ROADMAP.md`
- Git configuré (nom + email), repo local initialisé, repo distant `TheSheldon520/modulo` créé sur GitHub
- Node 24.15.0 + pnpm 11.1.2 installés
- Sub-agents Claude Code installés : `architect`, `backend-engineer`, `ui-engineer`, `code-reviewer`
- Slash commands installées : `/start-ticket`, `/review-before-commit`, `/standup`, `/new-module`
- `settings.json` Claude Code avec permissions calibrées (allow / deny / ask)

### 🧠 Décisions structurantes prises
- **Stack** : Next.js 15 + tRPC v11 + Drizzle + PostgreSQL (Neon) + Better Auth + Stripe + Anthropic SDK
- **Direction visuelle** : "Editorial Tech" — inspirée Linear / Vercel / Arc, palette OKLCH, theming par tenant via CSS variables
- **Positionnement produit** : suite SaaS modulaire universelle, customisable par activité (modules à la carte + charte graphique par tenant)
- **Module #1 à développer** : Sales Analytics
- **Discipline** : code-review systématique avant chaque commit via `/review-before-commit`
- **Versions des outils** : pinning strict (turbo, eslint, typescript, prettier) pour reproductibilité

### ⚠️ Points d'attention pour les prochaines sessions
- **PATH PowerShell** : Node et pnpm fonctionnent mais peuvent ne pas être dans le PATH système. À tester après reboot avec `node --version` + `pnpm --version` dans une nouvelle fenêtre PowerShell.
- **Lockfile pnpm** : généré à T0.1. Toujours le commiter, ne jamais le régénérer sans raison.
- **Versions plus récentes signalées** : prettier 3.8.3, turbo 2.9.14, typescript 6.0.3 — non adoptées. À reconsidérer si besoin futur (faille de sécu, feature requise).

### 🚧 En cours / pas fini
- Aucun chantier ouvert. Ticket T0.1 entièrement terminé.

### 🔜 Prochain ticket
- **T0.2** — Init app Next.js (`apps/web` avec App Router, Tailwind v4, page d'accueil de démo)
- Sub-agent attendu : `architect` (encore du structurel)

### 💬 Notes libres
Première session intense mais propre. Fondations posées au-dessus du niveau habituel pour un side-project solo. La discipline "cadrage avant code" a coûté du temps mais va payer sur la durée.

---

<!-- Modèle pour les futures sessions — à dupliquer en tête de fichier -->
<!--
## 📅 YYYY-MM-DD — Session N — <titre court>

### 🎯 Objectif de la session
<1-2 phrases>

### ✅ Tickets terminés
- T_._ — <titre>

### 🧠 Décisions structurantes prises
- <décision et pourquoi>

### ⚠️ Points d'attention pour les prochaines sessions
- <chose qu'on ne doit pas oublier>

### 🚧 En cours / pas fini
- <chantier ouvert avec son état>

### 🔜 Prochain ticket
- T_._ — <titre>

### 💬 Notes libres
<rien d'obligatoire ici>
-->
