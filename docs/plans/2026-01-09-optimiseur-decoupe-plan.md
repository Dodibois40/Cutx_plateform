# Plan de Developpement - Optimiseur de Decoupe CutX

**Date**: 9 janvier 2026
**Objectif**: Creer le meilleur optimiseur de decoupe du marche
**Inspiration**: MaxCut + innovations CutX

---

## Vision

L'optimiseur de decoupe est le COEUR de CutX. Il doit etre :
- **Performant** : Meilleur taux de remplissage possible
- **Professionnel** : Exports PDF, DXF, etiquettes
- **Configurable** : Parametres fins pour chaque usage
- **Fiable** : Tests exhaustifs, zero bug

---

## Architecture Cible

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  OptimiseurPage                                             │
│  ├── ParametresPanel (config utilisateur)                   │
│  ├── VisualisationInteractive (SVG/Canvas avec zoom/pan)    │
│  ├── ResultatsPanel (stats, comparaison algos)              │
│  └── ExportsPanel (PDF, DXF, etiquettes)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (NestJS)                        │
├─────────────────────────────────────────────────────────────┤
│  OptimizationModule                                         │
│  ├── Algorithmes (Guillotine, Shelf, MaxRects, Genetique)   │
│  ├── Comparateur (execute tous les algos, garde le meilleur)│
│  ├── GestionChutes (stock, reutilisation)                   │
│  ├── Exports (PDF, DXF, etiquettes)                         │
│  └── Tests (unitaires, integration, benchmarks)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL)                   │
├─────────────────────────────────────────────────────────────┤
│  - Plans de decoupe sauvegardes                             │
│  - Stock de chutes reutilisables                            │
│  - Historique des optimisations                             │
│  - Parametres utilisateur                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## PHASE 1 : Algorithmes d'Optimisation (2-3 semaines)

### Objectif
Implementer plusieurs algorithmes et les comparer pour toujours obtenir le meilleur resultat.

### 1.1 Algorithme Guillotine (FAIT)
- [x] Implementation de base
- [x] Heuristiques : Best Area Fit, Best Short Side Fit
- [x] Strategies de split : horizontal/vertical first, shorter leftover
- [ ] **Tests unitaires complets**
- [ ] **Tests de performance (benchmarks)**

### 1.2 Algorithme Shelf (FFDH) - Amelioration
- [ ] Analyser l'algo existant (binpackingjs)
- [ ] Reimplementer en TypeScript pur (sans dependance externe)
- [ ] Ajouter variantes : Next Fit, Best Fit, Worst Fit
- [ ] Tests unitaires
- [ ] Benchmarks comparatifs

### 1.3 Algorithme MaxRects
- [ ] Implementer MaxRects (rectangles maximaux)
- [ ] Heuristiques : BSSF, BLSF, BAF, BL, CP
- [ ] Tests unitaires
- [ ] Benchmarks comparatifs

### 1.4 Algorithme Genetique (optionnel, phase avancee)
- [ ] Population initiale avec algos precedents
- [ ] Mutations (swap, rotation, deplacement)
- [ ] Selection des meilleurs
- [ ] Convergence vers optimum

### 1.5 Comparateur Multi-Algorithmes
- [ ] Executer tous les algos sur le meme jeu de pieces
- [ ] Comparer : taux remplissage, nb panneaux, temps calcul
- [ ] Retourner automatiquement le meilleur resultat
- [ ] Option : montrer les resultats de chaque algo a l'utilisateur

### Tests Phase 1
```
- [ ] Test : 10 pieces simples (rectangles)
- [ ] Test : 50 pieces mixtes
- [ ] Test : 100+ pieces (stress test)
- [ ] Test : pieces avec contraintes de fil
- [ ] Test : pieces avec rotation interdite
- [ ] Test : pieces tres grandes (proche taille panneau)
- [ ] Test : pieces tres petites
- [ ] Benchmark : temps < 1s pour 100 pieces
- [ ] Benchmark : efficacite > 85% en moyenne
```

### Criteres de validation Phase 1
- [ ] Tous les tests passent
- [ ] Efficacite moyenne > 85%
- [ ] Temps de calcul < 2s pour 100 pieces
- [ ] Code documente et revise

---

## PHASE 2 : Gestion Avancee des Materiaux (1-2 semaines)

### 2.1 Sens du Fil (Grain)
- [ ] Detection automatique (essence bois dans le nom)
- [ ] Configuration manuelle par piece
- [ ] Rotation contrainte selon le fil
- [ ] Visualisation du sens du fil sur le panneau
- [ ] Tests : pieces avec/sans fil, mix

### 2.2 Marges de Panneau (Trim)
- [ ] Configuration par panneau (haut, bas, gauche, droite)
- [ ] Marges par defaut configurables
- [ ] Exclusion du trim du calcul de prix
- [ ] Tests : differentes configs de trim

### 2.3 Trait de Scie (Kerf/Blade)
- [ ] Epaisseur configurable (defaut 4mm)
- [ ] Par materiau ou global
- [ ] Impact sur le placement
- [ ] Tests : differentes epaisseurs

### 2.4 Surcotes (Expansion)
- [ ] Par piece (longueur + largeur)
- [ ] Pour usinage ulterieur
- [ ] Affichage dimensions finies vs dimensions de coupe
- [ ] Tests : pieces avec surcotes

### 2.5 Gestion des Chutes
- [ ] Identification des chutes reutilisables (taille min)
- [ ] Stockage en base de donnees
- [ ] Reutilisation dans les optimisations futures
- [ ] Interface de gestion du stock de chutes
- [ ] Tests : ajout, utilisation, suppression chutes

### Tests Phase 2
```
- [ ] Test : panneau avec trim 10mm chaque cote
- [ ] Test : pieces bois avec sens du fil
- [ ] Test : trait de scie 3mm vs 5mm
- [ ] Test : surcotes 2mm sur pieces
- [ ] Test : reutilisation de chutes existantes
- [ ] Test : mix de toutes les contraintes
```

### Criteres de validation Phase 2
- [ ] Sens du fil respecte a 100%
- [ ] Marges correctement appliquees
- [ ] Chutes > 300x100mm identifiees
- [ ] Stock de chutes fonctionnel

---

## PHASE 3 : Parametrage et Configuration (1 semaine)

### 3.1 Types d'Optimisation
- [ ] Minimiser les chutes (defaut)
- [ ] Minimiser le nombre de panneaux
- [ ] Minimiser les coupes (temps machine)
- [ ] Interface de selection

### 3.2 Strategies de Tri
- [ ] Par surface decroissante (defaut)
- [ ] Par perimetre decroissant
- [ ] Par plus grand cote
- [ ] Par priorite utilisateur

### 3.3 Groupement
- [ ] Par materiau (automatique)
- [ ] Par epaisseur (automatique)
- [ ] Par chants (optionnel)
- [ ] Par projet/meuble

### 3.4 Interface de Parametres
- [ ] Panel de configuration dans l'UI
- [ ] Presets (rapide, equilibre, maximum)
- [ ] Sauvegarde des preferences utilisateur
- [ ] Reset aux valeurs par defaut

### Tests Phase 3
```
- [ ] Test : optimisation "moins de chutes"
- [ ] Test : optimisation "moins de panneaux"
- [ ] Test : changement de strategie de tri
- [ ] Test : sauvegarde/chargement preferences
```

---

## PHASE 4 : Interface Utilisateur Pro (2 semaines)

### 4.1 Visualisation Interactive
- [ ] Zoom avec molette souris
- [ ] Pan (deplacement) avec clic-drag
- [ ] Mode plein ecran
- [ ] Selection d'une piece (highlight)
- [ ] Info-bulle au survol (dimensions, reference)
- [ ] Legende des couleurs (chants, fil)

### 4.2 Navigation Multi-Panneaux
- [ ] Miniatures de tous les panneaux
- [ ] Navigation rapide (fleches + miniatures)
- [ ] Vue d'ensemble (tous les panneaux)

### 4.3 Panneau de Resultats
- [ ] Statistiques detaillees
  - Taux de remplissage par panneau
  - Taux global
  - Surface utilisee / perdue
  - Nombre de coupes
  - Longueur totale de coupe
- [ ] Comparaison des algorithmes (si active)
- [ ] Estimation du prix
  - Prix panneaux
  - Prix decoupe (ml x tarif)
  - Prix chants
  - Total

### 4.4 Liste des Pieces
- [ ] Tableau triable
- [ ] Localisation sur le panneau au clic
- [ ] Statut : place / non place
- [ ] Filtres

### Tests Phase 4
```
- [ ] Test : zoom 50% a 200%
- [ ] Test : pan sur grand panneau
- [ ] Test : selection piece -> highlight
- [ ] Test : navigation 10 panneaux
- [ ] Test : calcul prix correct
```

---

## PHASE 5 : Exports Professionnels (2 semaines)

### 5.1 Export PDF - Plan de Decoupe
- [ ] Un PDF par panneau
- [ ] Ou un PDF multi-pages
- [ ] Contenu :
  - Dessin a l'echelle
  - Dimensions cotees
  - Liste des pieces
  - Sens du fil indique
  - Chants indiques
  - Statistiques
- [ ] En-tete personnalisable (logo, entreprise)
- [ ] Format A4 ou A3

### 5.2 Export PDF - Liste de Coupe
- [ ] Tableau de toutes les pieces
- [ ] Groupees par panneau
- [ ] Colonnes : ref, dimensions, quantite, chants, fil
- [ ] Totaux

### 5.3 Export DXF - Pour CNC
- [ ] Format DXF standard
- [ ] Un fichier par panneau
- [ ] Calques separes :
  - Contours pieces
  - Chants
  - Textes references
- [ ] Compatible avec machines CNC courantes

### 5.4 Export Etiquettes
- [ ] Format configurable (ex: Avery)
- [ ] QR code ou code-barres
- [ ] Infos : reference, dimensions, panneau, chants
- [ ] Impression directe ou PDF

### 5.5 Export CSV/Excel
- [ ] Liste complete des pieces
- [ ] Pour integration autres logiciels

### Tests Phase 5
```
- [ ] Test : PDF 1 panneau lisible
- [ ] Test : PDF 10 panneaux multi-pages
- [ ] Test : DXF ouvrable dans AutoCAD/LibreCAD
- [ ] Test : etiquettes format Avery
- [ ] Test : CSV importable dans Excel
```

---

## PHASE 6 : Integration et Polish (1 semaine)

### 6.1 Integration Configurateur
- [ ] Bouton "Optimiser" dans le configurateur
- [ ] Modal/page dediee
- [ ] Retour des resultats dans le devis

### 6.2 Sauvegarde et Historique
- [ ] Sauvegarder un plan de decoupe
- [ ] Historique des optimisations
- [ ] Recharger un plan precedent
- [ ] Comparer deux plans

### 6.3 Performance
- [ ] Optimisation du rendu SVG
- [ ] Lazy loading des panneaux
- [ ] Cache des resultats
- [ ] Web Worker pour calculs lourds

### 6.4 Accessibilite et i18n
- [ ] Traductions FR/EN
- [ ] Raccourcis clavier
- [ ] Mode sombre/clair

### Tests Phase 6
```
- [ ] Test : workflow complet configurateur -> optimisation -> devis
- [ ] Test : sauvegarde et rechargement plan
- [ ] Test : performance avec 500 pieces
- [ ] Test : traductions completes
```

---

## Recapitulatif des Phases

| Phase | Nom | Duree estimee | Priorite |
|-------|-----|---------------|----------|
| 1 | Algorithmes d'Optimisation | 2-3 sem | CRITIQUE |
| 2 | Gestion Materiaux | 1-2 sem | CRITIQUE |
| 3 | Parametrage | 1 sem | HAUTE |
| 4 | Interface Pro | 2 sem | HAUTE |
| 5 | Exports | 2 sem | HAUTE |
| 6 | Integration | 1 sem | MOYENNE |

**Total estime : 9-11 semaines**

---

## Definition of Done (pour chaque feature)

- [ ] Code implemente
- [ ] Tests unitaires ecrits et passants
- [ ] Tests d'integration passants
- [ ] Code revise (pas de TODO, pas de console.log)
- [ ] Documentation mise a jour
- [ ] Traductions ajoutees
- [ ] Merge dans main

---

## Prochaine Etape

**Commencer par Phase 1.1** : Finaliser et tester l'algorithme Guillotine deja implemente.

Questions a valider :
1. Ce plan te convient-il ?
2. On commence par les tests de l'algo Guillotine ?
