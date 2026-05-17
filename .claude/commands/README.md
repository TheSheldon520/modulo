# Slash commands Modulo

Ce dossier contient les **slash commands** personnalisées du projet.

## Comment ça marche

Dans Claude Code, tape `/` pour voir la liste des commandes disponibles. Tu peux ensuite invoquer une commande :

- `/session-start` → démarre une session : lit le JOURNAL + l'état Git, propose un brief
- `/start-ticket T0.2` → démarre le ticket T0.2 du ROADMAP avec délégation auto au bon sub-agent
- `/review-before-commit` → audit complet du diff actuel avant commit
- `/new-module crm-light` → scaffold un nouveau module nommé `crm-light`
- `/standup` → résumé rapide de l'état (alternative légère à `/session-start`)
- `/session-end` → clôture une session : capture les décisions, écrit l'entrée du JOURNAL

## Set actuel

| Commande | Quand l'utiliser |
|----------|------------------|
| `/session-start` | **Au tout début** de chaque session — reconstitue le contexte |
| `/start-ticket <id>` | Pour démarrer un ticket précis de la ROADMAP |
| `/review-before-commit` | Avant chaque `git commit` substantiel |
| `/new-module <id>` | Quand on attaque un nouveau module (Phase 1+) |
| `/standup` | Rappel rapide de l'état sans toucher au JOURNAL |
| `/session-end` | **À la toute fin** de chaque session — documente avant de partir |

## Le workflow quotidien type

```
[Début de session]
   /session-start
   → Claude résume où on en était, suggère le ticket suivant

[Travail]
   /start-ticket T0.X
   → Délégation auto au bon sub-agent, plan + validation + exécution

   /review-before-commit
   → Audit avant commit

   git add . / git commit / git push

[Fin de session]
   /session-end
   → Capture interactive des décisions, écrit dans JOURNAL.md
   → Suggère le commit de doc final
```

## Différence /standup vs /session-start

- **`/standup`** = vue rapide, basée uniquement sur Git + ROADMAP. Ne lit pas le JOURNAL. Pas de mémoire long terme.
- **`/session-start`** = vue complète, lit le JOURNAL pour retrouver les décisions et les points d'attention de la session précédente. À utiliser **en début de session sérieuse**.

Tu peux utiliser `/standup` au milieu d'une session si tu veux un rappel rapide sans tout le contexte.

## Comment en ajouter une

Créer un fichier `<nom>.md` ici avec ce frontmatter :

```yaml
---
description: Brève description de ce que fait la commande (visible dans le menu /)
argument-hint: <format-des-arguments-si-applicable>
allowed-tools: Read, Glob, Grep, Bash(commande:*), Edit, Write
---

Le contenu du prompt qui sera envoyé à Claude Code quand la commande est invoquée.
Utiliser $ARGUMENTS pour interpoler les arguments passés.
```

### Bonnes pratiques

- **Restreindre les outils autorisés** au strict nécessaire (`allowed-tools`).
- **Procédure explicite** : décrire les étapes dans l'ordre.
- **Format de sortie imposé** : si pertinent, donner un template strict.
- **Délégation automatique** : invoquer le bon sub-agent quand applicable.

## Notes

- Les commandes sont versionnées dans Git → partagées par l'équipe
- Pour des commandes personnelles non partagées, utiliser `~/.claude/commands/`
- Une commande peut être réécrite à tout moment — pas d'effet de bord, juste un prompt
