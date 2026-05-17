# Sub-agents Modulo

Ce dossier contient les **sub-agents** spécialisés que Claude Code utilise pour ce projet.

## Comment ça marche

Claude Code lit chaque fichier `.md` ici et indexe le champ `description` du frontmatter. Quand tu lui demandes quelque chose, il **choisit automatiquement** le sub-agent le plus adapté en se basant sur cette description.

Tu peux aussi forcer un agent explicitement : *"Utilise le code-reviewer pour auditer le module sales"*.

## Set actuel (minimal)

| Agent | Modèle | Rôle |
|-------|--------|------|
| `architect` | Opus | Décisions structurantes, fondations, schémas core, packages partagés |
| `backend-engineer` | Sonnet | Routers tRPC, schémas Drizzle des modules, logique serveur |
| `ui-engineer` | Sonnet | Composants React, pages Next, intégration shadcn/Framer |
| `code-reviewer` | Sonnet | Audit read-only avant commit (sécurité multi-tenant, isolation, conventions) |

## Quand enrichir

Ajouter un agent uniquement quand un **vrai besoin récurrent** apparaît, pas par anticipation. Candidats prévus :

- `module-creator` (Opus) — pour scaffolder un nouveau module depuis MODULE_BLUEPRINT
- `designer` (Opus) — pour les pages où l'esthétique doit "claquer" (landing, dashboard vitrine)
- `tester` (Sonnet) — pour générer Vitest/Playwright
- `debugger` (Opus) — pour les bugs retors avec analyse de logs

## Comment ajouter un agent

Créer un fichier `<name>.md` ici avec ce frontmatter :

```yaml
---
name: <nom-kebab-case>
description: |
  USE THIS AGENT for ... Trigger on tasks like:
  - "exemple 1"
  - "exemple 2"
  Do NOT use for: ... (rediriger vers tel autre agent)
tools: Read, Edit, Write, Bash, Glob, Grep   # ou un sous-ensemble
model: sonnet  # ou opus
---

Tu es ...

## Mandatory reading
1. ...

## Inviolable rules
1. ...

## Methodology
1. ...
```

**Règle d'or pour la `description`** : elle doit être assez **précise** pour que Claude Code choisisse le bon agent automatiquement. Liste des exemples de tâches qui DOIVENT et qui NE DOIVENT PAS déclencher cet agent. C'est ce champ qui pilote la délégation automatique.

## Notes

- Les fichiers ici sont versionnés dans Git → l'équipe partage la même config d'agents
- L'extension officielle Claude Code lit `.claude/agents/` à la racine du repo
- Pour des agents personnels non partagés, utiliser `~/.claude/agents/` (hors de ce repo)
