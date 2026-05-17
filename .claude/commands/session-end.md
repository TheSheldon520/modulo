---
description: Termine une session : récapitule ce qui a été fait, capture les décisions, ajoute une entrée au JOURNAL
allowed-tools: Read, Edit, Bash(git log:*), Bash(git status), Bash(git diff:*), Bash(git branch:*)
---

Clôture de la session de travail sur Modulo. Procédure obligatoire.

## 1. Détection automatique de ce qui a été fait

Lance dans cet ordre :
- `git status` — y a-t-il encore du travail non commité ?
- `git log --oneline --since="<date de la dernière entrée du JOURNAL>"` — tous les commits depuis la dernière session
- Si tu ne trouves pas de date de référence : `git log --oneline -20`

Lis aussi :
- `JOURNAL.md` — pour connaître la date de la dernière entrée et le numéro de session à incrémenter

## 2. Synthèse automatique préliminaire

Sur la base des commits récents et des fichiers touchés, produis une **synthèse préliminaire** :

```
📊 Détecté automatiquement depuis Git :
- X commits depuis la dernière session
- Tickets touchés (devinés depuis les messages de commit) : T_.X, T_.Y
- Fichiers principaux modifiés : <liste courte>
- Travail non commité restant : oui/non (lister si oui)
```

## 3. Questions à poser à Chris

Pose ces 4 questions **dans cet ordre, une par une, en attendant la réponse de Chris entre chacune** :

### Q1 — Tickets terminés
*"Quels tickets considères-tu comme **réellement terminés** cette session ? (Liste depuis ce que j'ai détecté ou ajoute-en d'autres)"*

### Q2 — Décisions structurantes
*"Quelles décisions structurantes as-tu prises cette session ? (Choix techniques importants, changements d'orientation, abandons. Si rien de notable, dis 'aucune'.)"*

### Q3 — Points d'attention pour la suite
*"Y a-t-il des points d'attention ou des chantiers à ne pas oublier pour la prochaine session ?"*

### Q4 — Chantiers ouverts
*"Y a-t-il du travail en cours non terminé qu'il faut documenter pour reprendre proprement ?"*

## 4. Génération de l'entrée du JOURNAL

À partir des réponses, construis une nouvelle entrée au format **exact** du modèle dans `JOURNAL.md`. L'entrée doit être :

- Datée du jour (format `YYYY-MM-DD`)
- Numérotée (lis le numéro de la dernière session et incrémente : Session 1 → Session 2 → …)
- Avec un **titre court** que tu proposes (3-5 mots) — exemple : "Démarrage app Next.js", "Module Sales backend", etc. Demande validation à Chris.

Format à respecter strictement :

```markdown
## 📅 YYYY-MM-DD — Session N — <titre court>

### 🎯 Objectif de la session
<1-2 phrases, déduites du contexte>

### ✅ Tickets terminés
- T_._ — <titre du ticket depuis ROADMAP.md>

### 🧠 Décisions structurantes prises
- <décision et pourquoi (de Q2)>

### ⚠️ Points d'attention pour les prochaines sessions
- <de Q3>

### 🚧 En cours / pas fini
- <de Q4, ou "Aucun chantier ouvert.">

### 🔜 Prochain ticket
- T_._ — <le suivant logique dans ROADMAP.md, à déduire>

### 💬 Notes libres
<si Chris a ajouté des choses qui ne rentrent pas ailleurs>
```

## 5. Insertion dans JOURNAL.md

**IMPORTANT** : la nouvelle entrée s'insère **en haut** du fichier, **juste après le header et avant l'entrée la plus récente précédente**. Le fichier reste en ordre antichronologique (sessions récentes en premier).

Avant d'écrire dans le fichier, **affiche l'entrée à Chris** et demande sa validation explicite ("ok" / "modifie X" / etc.).

## 6. Suggestion de commit

Une fois l'entrée ajoutée au JOURNAL, propose à Chris :

```
git add JOURNAL.md
git commit -m "docs: journal session N — <titre court>"
git push
```

**Ne lance pas le commit toi-même** — c'est à Chris de le faire.

## 7. Vérification finale

Si du travail non commité a été détecté à l'étape 1 et que Chris n'a pas confirmé ce qu'il en fait, **rappelle-le-lui explicitement** :

> "⚠️ Il reste X fichiers non commités. Veux-tu les commiter, les stash, ou les laisser pour demain ?"

## Règles importantes

- **Ne modifie aucun autre fichier que `JOURNAL.md`** dans cette commande
- **Sois concis** dans les questions — Chris est en fin de session, il est fatigué, il veut juste documenter et partir
- **Ne lance jamais de commit automatique** — c'est lui qui valide à la fin
- Si Chris répond "passe" ou "skip" à une question, mets simplement "—" ou "RAS" dans la section correspondante. Ne le harcèle pas.
