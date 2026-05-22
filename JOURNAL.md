# Journal de bord — Modulo

> Fichier append-only mis à jour à chaque fin de session via la slash command `/session-end`.
> Au début de chaque session, `/session-start` lit ce fichier pour rappeler à Claude Code (et à toi) où on en était.
>
> **Règle d'or** : on ajoute en haut (les sessions récentes d'abord). On ne supprime jamais une entrée passée.
> Pour les décisions d'architecture significatives, créer une entrée séparée dans `DECISIONS.md` (à créer le jour où on en aura besoin).

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
