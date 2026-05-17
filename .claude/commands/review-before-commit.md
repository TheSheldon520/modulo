---
description: Audit complet du code modifié avant commit (multi-tenant, isolation, conventions)
allowed-tools: Read, Glob, Grep, Bash(git status), Bash(git diff:*), Bash(git log:*)
---

Je vais commiter. Avant ça, **audit complet** des changements en cours.

## Procédure

### 1. Inventaire des changements
Lance dans cet ordre :
- `git status` — voir les fichiers modifiés / ajoutés / supprimés
- `git diff --stat` — vue d'ensemble des modifs
- `git diff` — contenu détaillé (ou `git diff <fichier>` par fichier si trop long)

### 2. Invocation du code-reviewer
**Invoque obligatoirement le sub-agent `code-reviewer`** avec le scope :
- Liste exhaustive des fichiers modifiés
- Le contexte du ticket en cours (lire `docs/ROADMAP.md` si nécessaire)

Le code-reviewer doit :
- Lire chaque fichier modifié intégralement
- Dérouler **toute la checklist** définie dans son prompt système (multi-tenant, isolation, types, design system, conventions, tests/build)
- Produire un rapport au format imposé : Summary → Verdict → Findings (Critical/Important/Nits) → Checklist → Next steps

### 3. Verdict
À la fin du rapport :

- **✅ READY TO MERGE** : suggère à Chris la commande de commit complète avec un message conventionnel approprié, exemple :
  ```
  git add .
  git commit -m "feat(<scope>): <description>"
  git push
  ```
  Le `<scope>` est typiquement le ticket (ex: `T0.1`, `T1.4`) ou le module (`sales`, `auth`).

- **⚠️ MERGE WITH FIXES** : liste les fixes mineurs à appliquer. Propose de les corriger avant commit, ou de commiter en l'état avec un TODO explicite.

- **❌ DO NOT MERGE** : refus de commit. Liste les problèmes critiques. Propose de corriger immédiatement (en invoquant le bon sub-agent) avant tout commit.

## Règles importantes

- Ne lance JAMAIS `git commit` ou `git push` automatiquement. Toujours laisser Chris valider.
- Sois honnête : un audit complaisant ne sert à rien. Si quelque chose viole les règles, signale-le clairement, même si c'est gênant.
- Si la review révèle un problème d'architecture (pas juste un bug local), **escalade à l'architect** plutôt que de proposer un patch superficiel.

## À la fin de l'audit

Quel que soit le verdict, **toujours créer/toucher le fichier témoin `.claude/.last-review`** pour signaler au hook `PreToolUse` que la review a été effectuée (silence le warning anti-oubli pendant 30 min).

PowerShell : `New-Item -ItemType File -Force .claude/.last-review`
Bash : `touch .claude/.last-review`
