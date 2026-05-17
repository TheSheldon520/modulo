# Journal de bord — Modulo

> Fichier append-only mis à jour à chaque fin de session via la slash command `/session-end`.
> Au début de chaque session, `/session-start` lit ce fichier pour rappeler à Claude Code (et à toi) où on en était.
>
> **Règle d'or** : on ajoute en haut (les sessions récentes d'abord). On ne supprime jamais une entrée passée.
> Pour les décisions d'architecture significatives, créer une entrée séparée dans `DECISIONS.md` (à créer le jour où on en aura besoin).

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
