---
description: Résumé de l'état du projet (commits récents, ticket en cours, prochain ticket, état du repo)
allowed-tools: Read, Glob, Grep, Bash(git log:*), Bash(git status), Bash(git branch:*)
---

Donne-moi un **point complet** sur l'état du projet Modulo.

## Procédure

### 1. État Git
- `git status` — y a-t-il du travail en cours non commité ?
- `git log --oneline -10` — les 10 derniers commits
- `git branch --show-current` — branche active

### 2. Lecture des docs clés
- `docs/ROADMAP.md` — identifier :
  - Le **dernier ticket terminé** (basé sur les commits récents et l'état du code)
  - Le **ticket en cours ou suivant** (le prochain non implémenté dans l'ordre du ROADMAP)
  - La **phase actuelle** (Phase 0, 1, 2…)

### 3. État de l'arborescence
- `ls` à la racine
- Liste rapide des modules présents : `ls modules/` si le dossier existe

### 4. Synthèse à produire

Format de sortie obligatoire :

```
# 🛰️ Modulo Standup

## 📍 Position actuelle
- **Phase** : <Phase X — nom>
- **Dernier ticket terminé** : <T_.X — titre>
- **Ticket suivant suggéré** : <T_.X — titre>
- **Branche active** : <branche>

## 📊 État du repo
- Fichiers modifiés non commités : <X fichiers> (ou "aucun")
- Si fichiers en cours : lister brièvement

## 📜 Derniers commits
<liste oneline des 5 derniers commits>

## 🧩 Modules en place
<liste des modules présents dans `modules/`, ou "aucun pour l'instant">

## 🎯 Recommandation pour cette session

<1-3 phrases : suggérer de finir ce qui est en cours OU démarrer le prochain ticket via `/start-ticket T_.X`. Mentionner les éventuels blockers.>

## ⚠️ Points d'attention
<éventuels signaux faibles : fichiers en attente depuis longtemps, conflits potentiels, commits non poussés, etc. Si rien à signaler : "RAS — repo propre.">
```

## Règles

- Concis. Pas de commentaire éditorial inutile.
- Si quelque chose n'est pas clair (ex: dernier ticket ambigu), pose la question à Chris plutôt que de deviner.
- Ne déduis pas plus que ce que tu vois — base-toi sur les commits Git et l'état réel des fichiers, pas sur des suppositions.
