# IDEAS.md — Backlog d'idées Modulo

> Fichier append-only pour capturer les idées de modules / features qui méritent d'être tracées sans encombrer la ROADMAP officielle. Une idée passe d'IDEAS.md à ROADMAP.md quand on décide de l'engager.

## Convention
- Format : titre + 1-2 paragraphes max + tags pour faciliter le tri
- On ajoute en bas (chronologique inverse non requise ici, c'est un pool pas un journal)
- On garde les idées même refusées (avec un statut explicite)

---

## Retail Analytics — Module sell-out / sortie caisse PME

**Date d'ajout** : 2026-05-28 (Session 10/11, conversation avec orchestrator)

**Pitch en 1 phrase** : Tableau de bord d'analyse de sell-out pour PME industrielle qui vend via distributeurs retail (Carrefour, Leclerc, Picwic, etc.) et qui doit consolider manuellement les fichiers Excel de chaque enseigne.

**Use case typique (dogfooding Chris / Silverlit)** :
- Une PME industrielle vend ses produits via 5-15 distributeurs retail
- Chaque distributeur envoie un fichier mensuel sell-out (Excel/CSV/PDF/EDIFACT, format heterogene)
- Le commercial passe 2-3h par mois a aggreger manuellement dans un Master Excel
- Au final : un rapport "rotation produit chez Carrefour vs Leclerc" pour la direction commerciale

**Coeur technique du module** :
- Moteur d'ingestion configurable : un mapping colonnes drag-and-drop par distributeur, sauvegarde du mapping pour reusabilite mensuelle
- **Bonus IA** : a la premiere ingestion, Claude infere le mapping depuis les headers et propose une validation. Vraie valeur ajoutee IA, pas du chat decoratif.
- Tables BDD : retail_distributors, retail_products, retail_sellout_uploads, retail_sellout_lines, retail_stores

**Surface UI** :
- Page Vue d'ensemble : 4 KPIs (CA sell-out, rotation, top distributeur, top produit) + carte France heatmap + line chart multi-series
- Page Distributeur (drill-down) : evolution CA chez ce distributeur, repartition par magasin, anomalies detectees
- Page Produit (drill-down par SKU) : repartition vente entre enseignes, saisonnalite
- Export PDF mensuel print-ready

**Pricing pressenti** : 39 EUR/mois/org (plus cher que Sales Analytics 29 EUR car cible plus niche / haute valeur ajoutee)

**Concurrence / positionnement** :
- Nielsen IQ, Circana, GfK : 10k-50k EUR/an, cible grands fournisseurs
- HubSpot / Pipedrive : ne font pas du sell-out
- Excel maison : 90% des PME aujourd'hui, douloureux et source d'erreurs
- **Ocean bleu** : PME fournisseur retail = angle mort, marche francais enorme et mal servi

**Quand l'attaquer** :
- Apres T1.10 (Sales Analytics complet et vendu a 2-3 PME pour valider le pattern module data PME)
- Apres AI Reports (necessaire pour booster generation rapport mensuel auto)
- Module #7 ou #8 de la roadmap
- Scope estime : 2-3 mois de dev

**Statut** : Idee validee par orchestrator, non engagee

**Tags** : module, data, retail, IA, dogfooding-silverlit, ocean-bleu

---
