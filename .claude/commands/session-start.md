---
description: Démarre une session : lit le JOURNAL, l'état Git, et propose un brief pour reprendre proprement
allowed-tools: Read, Glob, Grep, Bash(git log:*), Bash(git status), Bash(git branch:*)
---

Démarrage d'une nouvelle session de travail sur Modulo. Procédure obligatoire.

## 1. Reconstitution du contexte

Lis **dans cet ordre** :
1. `JOURNAL.md` — concentre-toi sur les **2 dernières entrées** (sessions les plus récentes)
2. `CLAUDE.md` (racine) — règles inviolables (toujours)
3. `docs/ROADMAP.md` — pour identifier précisément où on en est dans le plan

Récupère l'état Git :
- `git status` — y a-t-il du travail en cours non commité ?
- `git log --oneline -10` — derniers commits
- `git branch --show-current` — branche active

## 2. Analyse à produire

Format de sortie obligatoire :

```
# 🚀 Modulo — Démarrage Session

## 📍 Où on en était (résumé de la session précédente)
- **Date de la dernière session** : <date depuis JOURNAL.md>
- **Tickets terminés à cette session** : <liste>
- **Décisions importantes prises** : <synthèse en 1-3 bullets>

## ⚠️ Points d'attention reportés
<reprends les "Points d'attention pour les prochaines sessions" de la dernière entrée du JOURNAL>

## 🔧 État technique actuel
- **Branche active** : <branche>
- **Fichiers modifiés non commités** : <X fichiers> (les lister brièvement si applicable)
- **Derniers commits** : <3 derniers en oneline>

## 📋 Ticket suggéré pour cette session
- **Prochain ticket selon la ROADMAP** : <T_.X — titre>
- **Phase actuelle** : <Phase X — nom>
- **Sub-agent recommandé** : <architect / backend-engineer / ui-engineer / autre>

## 🎯 Recommandation

<2-3 phrases concrètes :
- Si du travail est en cours non commité → suggérer de le finir / commiter / décider
- Si tout est propre → suggérer de lancer `/start-ticket <id>` pour le ticket suivant
- Si un point d'attention bloquant est reporté → en parler avant tout
>

## ❓ Questions à clarifier avec Chris avant de démarrer
<si applicable : reformuler les questions ouvertes laissées dans la session précédente. Sinon : "Aucune, prêt à attaquer.">
```

## 3. Règles importantes

- **Ne démarre AUCUN ticket** dans cette commande. Ton job est uniquement de produire le brief de démarrage.
- Si `JOURNAL.md` n'existe pas → signale-le, demande à Chris s'il veut le créer, et propose un brief basé uniquement sur Git et ROADMAP.
- Si la dernière entrée du JOURNAL date de plus de **7 jours** → mentionne-le explicitement (Chris a peut-être perdu le contexte personnellement).
- Si tu détectes une **incohérence** entre le JOURNAL et l'état Git (ex: le JOURNAL dit "T0.1 terminé" mais le repo est vide), **signale-le clairement** — ne couvre pas un problème.
- Concis. Pas de blabla. Chris veut un brief, pas un essai.
