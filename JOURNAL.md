# Journal de bord — Modulo

> Fichier append-only mis à jour à chaque fin de session via la slash command `/session-end`.
> Au début de chaque session, `/session-start` lit ce fichier pour rappeler à Claude Code (et à toi) où on en était.
>
> **Règle d'or** : on ajoute en haut (les sessions récentes d'abord). On ne supprime jamais une entrée passée.
> Pour les décisions d'architecture significatives, créer une entrée séparée dans `DECISIONS.md` (à créer le jour où on en aura besoin).

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
