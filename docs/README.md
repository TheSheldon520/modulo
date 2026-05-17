# Modulo — Suite Modulaire B2B

> Plateforme SaaS modulaire qui s'adapte à chaque entreprise. Active uniquement les modules dont tu as besoin, personnalise la charte graphique, paie ce que tu utilises.

## 🎯 Pitch en 1 phrase

**Modulo est la suite d'outils digitaux qui se construit autour de votre activité, pas l'inverse.**

## 🧱 Principe fondateur

Là où Notion, Monday ou ClickUp imposent une suite monolithique avec des features que tu n'utiliseras jamais, **Modulo fonctionne en modules indépendants** :

- Chaque client (tenant) compose sa propre suite à la carte
- Chaque module a son propre cycle de vie, son propre code, son propre prix
- L'identité visuelle s'adapte à la charte graphique du client (theming complet)
- Nouveau besoin → nouveau module développé sans casser l'existant

## 📦 Modules prévus (ordre de priorité)

| # | Module | Description | Statut |
|---|--------|-------------|--------|
| 1 | **Sales Analytics** | Dashboard commercial, KPI, suivi performance, import CSV/Excel | 🚧 En cours |
| 2 | Notes & Docs | Éditeur de docs riches type Notion | 📋 Backlog |
| 3 | Kanban & Projets | Gestion de projets style Linear | 📋 Backlog |
| 4 | AI Reports | Génération de rapports IA depuis données | 📋 Backlog |
| 5 | AI Assistant | Chat IA contextuel sur données internes | 📋 Backlog |
| 6 | CRM léger | Pipeline commercial simple | 💡 Idée |
| 7 | Forecast & Budget | Prévisions et budgétisation | 💡 Idée |

## 📚 Documents du dossier de cadrage

| Document | Pour qui | Contenu |
|----------|----------|---------|
| `README.md` | Tout le monde | Vue d'ensemble (ce fichier) |
| `ARCHITECTURE.md` | Dev / Claude Code | Stack technique, schéma BDD, monorepo, conventions |
| `DESIGN_SYSTEM.md` | Dev / Claude Code | Tokens, palette, typo, composants, principes UX |
| `CLAUDE.md` | Claude Code | Instructions racine pour la génération de code |
| `MODULE_BLUEPRINT.md` | Dev / Claude Code | Squelette type pour créer un nouveau module |
| `ROADMAP.md` | Toi (Chris) | Plan d'exécution + tickets du module 1 (Sales Analytics) |

## 🚀 Premier pas

1. Lire `ARCHITECTURE.md` (la stack et pourquoi)
2. Lire `DESIGN_SYSTEM.md` (la direction visuelle)
3. Initialiser le repo avec `CLAUDE.md` à la racine
4. Suivre `ROADMAP.md` ticket par ticket avec Claude Code

## 💡 Mantra de conception

> **"Un module doit pouvoir être supprimé sans que rien d'autre ne casse."**

Si tu te retrouves à câbler deux modules ensemble en dur, c'est un signal d'alarme. La communication inter-modules passe **toujours** par des événements ou des contrats d'API explicites — jamais par des imports directs entre modules.
