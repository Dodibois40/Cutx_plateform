# Arborescence Métier CutX

Documentation des règles de classification des panneaux dans l'arborescence CutX.
Ce fichier est mis à jour au fur et à mesure des validations utilisateur.

---

## Règles Générales

### ⚠️ RÈGLE FONDAMENTALE
**Le décor dans le nom ≠ le type de produit**

Exemple : "Italian Walnut" dans le nom peut être :
- Un **PLACAGE** noyer véritable → placage-noyer
- Un **MÉLAMINÉ** imitation noyer → mela-bois
- Un **STRATIFIÉ** imitation noyer → strat-bois
- Un **CHANT** décor noyer → chants-abs ou chant-noyer

**→ TOUJOURS regarder le `productType` pour classifier, PAS le décor !**

| productType | Famille de catégories |
|-------------|----------------------|
| PLACAGE | placage-xxx |
| MELAMINE | mela-xxx |
| STRATIFIE | strat-xxx |
| BANDE_DE_CHANT | chants-xxx, abs-xxx |
| CONTREPLAQUE | cp-xxx |
| MDF | mdf-xxx |
| AGGLOMERE | agglo-xxx |

### Priorités de classification (au sein d'une famille)
1. **Usage/Traitement** > **Essence/Matière** (ex: CP Marine > CP Okoumé)
2. **Finition spéciale** > **Matière brute** (ex: CP Filmé > CP Bouleau)
3. **Sécurité** > **Résistance** (ex: Ignifuge > Hydrofuge)

---

## Contreplaqués (CP)

### CP Marine (CTBX)
- **Définition** : Contreplaqué avec collage résistant à l'eau (pas le type de bois)
- **Critères** : isHydrofuge=true OU nom contient "marine" ou "CTBX"
- **Note** : Un CP Marine peut être en Okoumé, Bouleau, etc.

### CP Filmé
- **Définition** : Contreplaqué avec revêtement film (finition)
- **Critères** : Nom contient "filmé"
- **Priorité** : Filmé > Essence (un CP Filmé Bouleau reste dans CP Filmé)

### CP Cintrable
- **Définition** : Contreplaqué flexible pour formes courbes
- **Critères** : Nom contient "cintrable" ou "poflex"

### CP par Essence (Bouleau, Okoumé, Peuplier, Pin)
- **Définition** : Classement par essence de bois dominante
- **Critères** : Nom contient l'essence ET pas de traitement spécial

---

## Mélaminés

### Mélaminé Unis
- **Définition** : Couleur unie (blanc, noir, gris, couleurs)
- **Critères** : decorCategory = UNIS

### Mélaminé Bois
- **Définition** : Décor imitation bois
- **Critères** : decorCategory = BOIS

### Mélaminé Pierre
- **Définition** : Décor imitation pierre/béton
- **Critères** : decorCategory = PIERRE ou BETON

### Mélaminé Fantaisie
- **Définition** : Décors spéciaux (motifs, textures, abstraits)
- **Critères** : decorCategory = FANTAISIE
- **Note** : PAS les imitations bois/pierre, uniquement les motifs créatifs

---

## Stratifiés HPL

### Strat Unis
- **Définition** : Stratifié couleur unie
- **Critères** : decorCategory = UNIS

### Strat Bois / Pierre / Fantaisie
- Même logique que Mélaminés

### FENIX
- **Définition** : Marque spécifique de stratifié mat anti-traces
- **Critères** : Nom contient "FENIX" ou "Fenix"

---

## MDF

### MDF Ignifuge
- **Définition** : Résistant au feu (classement M1 ou équivalent)
- **Critères** : isIgnifuge=true
- **Priorité** : Ignifuge > Hydrofuge

### MDF Hydrofuge
- **Définition** : Résistant à l'humidité
- **Critères** : isHydrofuge=true (et pas ignifuge)

### MDF à Laquer
- **Définition** : MDF préparé pour recevoir une laque
- **Critères** : Nom contient "laquer" ou "laqué"

### MDF Teinté
- **Définition** : MDF coloré dans la masse
- **Critères** : Nom contient "teinté" ou couleur spécifique

---

## Chants

### Chants Mélaminés
- **Définition** : Bandes de chant assorties aux mélaminés
- **Critères** : productType = BANDE_DE_CHANT ET décor mélaminé

### Chants Bois (Chêne, Noyer, etc.)
- **Définition** : Bandes de chant en placage bois véritable
- **Critères** : Nom contient essence bois

### ABS Unis / Fantaisie
- **Définition** : Chants en plastique ABS couleur unie ou fantaisie
- **Critères** : productType = BANDE_DE_CHANT + decorCategory

### ABS Bois (par essence)
- **Définition** : Chants ABS imitation bois
- **Catégories** : abs-chene, abs-noyer, abs-frene, abs-hetre
- **Critères** : productType = BANDE_DE_CHANT + nom contient essence bois
- **Note** : Subdiviser par essence comme les placages (session 4)

---

## Panneaux Spéciaux

### Lamellé-Collé
- **Abouté** : Lamelles assemblées bout à bout (joints visibles)
- **Non abouté** : Lamelles continues sans joint
- **TODO** : Ajouter critères de distinction

### 3 Plis
- **Par essence** : Épicéa, Chêne, etc.
- **Critères** : Nom indique l'essence

---

## Placages (Panneaux Plaqués Bois)

### Nomenclature
- **"Contreplaqué [essence] A/B"** = Base contreplaqué (souvent peuplier) + placage bois [essence]
- **"Aggloméré [essence] A/B"** = Base aggloméré + placage bois [essence]
- **A/B** = Qualité des faces : A = belle face, B = face arrière moins belle
- Le **productType = PLACAGE** est correct car le produit final est un panneau plaqué

### Catégories existantes
- placage-chene, placage-erable, placage-frene, placage-hetre
- placage-merisier, placage-noyer, placage-teck, placage-wenge
- placage-pin (créé session 2)
- placages-divers (pour essences sans catégorie dédiée)

### Marques connues
- **Shinnoki** = Marque de panneaux plaqués bois VRAIS (plusieurs essences)
- **Querkus** = Marque de panneaux plaqués bois VRAIS (plusieurs essences, regarder le décor)
- **Décoflex** = Marque de placages
- **Nuxe** = Marque de placages (vrai bois) - session 4
- **Rauvisio** = Marque de mélaminés unis (couleurs)

### Traductions essences (anglais → français)
- "walnut" = noyer
- "oak" = chêne
- "eucalyptus" = eucalyptus
- "teak/teck" = teck

### Types de support
- **Contreplaqué** = Plis de bois croisés collés
- **Latté** = Lattes de bois longues collées (pas de plis croisés) + placage fin dessus
- **MDF** = Fibres de bois compressées
- **Aggloméré** = Particules de bois compressées

### ⚠️ Règle Shinnoki épaisseur
- Shinnoki **19mm** = **PANNEAU PLAQUÉ** (pas chant) → placage-xxx
- Shinnoki **1-2mm** = **CHANT** → chants-xxx
- Le productType peut être incorrect dans les données, se fier à l'épaisseur

---

## Feuilles de Stratifié vs Panneaux

### Distinction (session 4)
- **Catégorie feuilles-stratifiees** créée pour séparer des panneaux
- **Feuilles** : épaisseur 0.7-1.2mm, grandes dimensions (4100x1300mm)
- **Panneaux** : épaisseur >3mm (10mm, 19mm...)
- **Chants** : épaisseur fine MAIS petite largeur (<50mm)

### Critère de distinction feuille vs chant
- Feuille : largeur >= 1000mm (plaque à coller sur panneau)
- Chant : largeur < 100mm (bande à coller sur chant)

---

## Plans de Travail

### Critères de détection
- Épaisseur **38mm**
- Longueur **>4m** (souvent 4100mm)
- Profondeur standard **650mm**

### Double catégorisation
Un plan de travail mélaminé bois doit apparaître dans :
1. **mela-bois** (par productType)
2. **plans-de-travail** (par usage)

→ TODO: Implémenter système de tags ou double-catégorie

---

## Règles Apprises (Sessions de classification)

### Session 1 - Classification par lots

| # | Panneau | Catégorie initiale | Validation | Action |
|---|---------|-------------------|------------|--------|
| 1 | Contreplaqué pin A/B | placages-divers | ✅ OK | Pas de placage-pin |
| 2 | Pfleiderer loftec 0.8mm | strat-fantaisie | ✅ OK | Décor fantaisie |
| 3 | Contreplaqué hêtre blanc A/B | placage-hetre | ✅ OK | |
| 4 | Aggloméré chêne A/B | placage-chene | ✅ OK | |
| 5 | Shinnoki Frozen walnut 19mm | placages-divers | ❌ → placage-noyer | walnut = noyer |
| 6 | Contreplaqué merisier US A/B | placage-merisier | ✅ OK | |
| 7 | Egger chêne Davenport 0.8mm | strat-bois | ✅ OK | Imitation bois |
| 8 | Pfleiderer bellato gris 0.8mm | strat-fantaisie | ✅ OK | |
| 9 | Egger blanc alpin 1mm CHANT | abs-unis | ✅ OK | Chant blanc |
| 10 | Contreplaqué pin A/B | placages-divers | ✅ OK | Pas de placage-pin |

### Session 2 - Classification par lots

| # | Panneau | Catégorie initiale | Validation | Action |
|---|---------|-------------------|------------|--------|
| 1 | Polyrey chêne Vendôme 38mm | mela-bois | ✅ OK | + plans-de-travail (TODO) |
| 2 | Rauvisio trench coat 0.9mm | melamines | ❌ → mela-unis | Rauvisio = couleur unie |
| 3 | Pfleiderer bellato gris 0.8mm | strat-fantaisie | ✅ OK | |
| 4 | Shinnoki natural oak 19mm | placages-divers | ❌ → placage-chene | oak = chêne |
| 5 | Shinnoki smoked eucalyptus 19mm | chants-abs | ❌ → placages-divers | 19mm = panneau |
| 6 | Rauvisio trench coat 1.2mm | chants-abs | ✅ OK | Chant Rauvisio |
| 7 | Contreplaqué pin A/B | placages-divers | ❌ → placage-pin | Créé catégorie |
| 8 | Egger mélèze naturel 19mm | mela-bois | ✅ OK | |
| 9 | Shinnoki Pure walnut 19mm | chants-abs | ❌ → placage-noyer | 19mm = panneau |
| 10 | Contreplaqué frêne A/B | placage-frene | ✅ OK | |

**Corrections appliquées :**
- 5 panneaux "oak" → placage-chene
- 5 Shinnoki 19mm : productType corrigé BANDE_DE_CHANT → PLACAGE
- 7 Rauvisio MELAMINE → mela-unis
- Catégorie placage-pin créée, 5 panneaux déplacés

### Session 3 - Classification par lots

| # | Panneau | Catégorie initiale | Validation | Action |
|---|---------|-------------------|------------|--------|
| 1 | Shinnoki Pure walnut 19mm | placage-noyer | ✅ OK | |
| 2 | Contreplaqué merisier US A/B | placage-merisier | ✅ OK | |
| 3 | Placage chêne quartier PM 2 ply | placage-chene | ✅ OK | quartier = coupe |
| 4 | Rauvisio trench coat 0.9mm | mela-unis | ✅ OK | |
| 5 | Pfleiderer craie 19mm | mela-unis | ✅ OK | craie = couleur unie |
| 6 | Querkus Vint.Retro Hobken MDF | placages-divers | ❌ → placage-chene | decor=Chêne |
| 7 | Pfleiderer bellato gris 0.8mm | strat-fantaisie | ✅ OK | |
| 8 | Décoflex teck dosse | placage-teck | ✅ OK | |
| 9 | Latté Pin A/B 19mm | placages-divers | ❌ → placage-pin | Latté ≠ Contreplaqué |
| 10 | Shinnoki Frozen walnut 19mm | placage-noyer | ✅ OK | |

**Nouvelles règles :**
- **Querkus** = placages VRAIS, regarder champ `decor` ou `material`
- **Latté** = support lattes de bois + placage fin (différent de contreplaqué)

**Corrections appliquées :**
- 12 Querkus chêne → placage-chene
- 3 Latté Pin → placage-pin

### Session 4 - Classification par lots

| # | Panneau | Catégorie initiale | Validation | Action |
|---|---------|-------------------|------------|--------|
| 1 | Contreplaqué chêne A/B, quartier | placage-chene | ✅ OK | quartier = coupe |
| 2 | Unilin etna oak BST 1mm CHANT | abs-unis | ❌ → abs-chene | Créé sous-catégories ABS |
| 3 | Pfleiderer frêne Portland 0.8mm | stratifies-hpl | ❌ → strat-bois | frêne = bois |
| 4 | Aggloméré Chêne Fil A1st/B 16mm | placage-chene | ✅ OK | |
| 5 | Egger chêne halifax brun 19mm | mela-bois | ✅ OK | |
| 6 | Pfleiderer cerisier havanna 0.8mm | stratifies-hpl | ❌ → strat-bois | cerisier = bois |
| 7 | Pfleiderer bellato gris 0.8mm | strat-fantaisie | ❌ → feuilles-stratifiees | 4100x1300mm = feuille |
| 8 | Nuxe Naturals Mystique | chants-abs | ❌ → placage-noyer | material=Placage |
| 9 | Egger chromix argent 0.8mm CHANT | abs-fantaisie | ✅ OK | |
| 10 | Egger mélèze naturel ST38 19mm | mela-bois | ✅ OK | |

**Nouvelles règles :**
- **Nuxe** = Marque de placages (vrai bois)
- **ABS Bois** = Chants imitation bois, subdiviser par essence comme placages
- **Feuilles stratifiées** ≠ **Panneaux stratifiés** : épaisseur 0.7-1.2mm = feuille à coller
- **Dimensions importantes** : 4100x1300mm avec 0.8mm = feuille stratifié (pas chant)

**Catégories créées :**
- abs-chene, abs-noyer, abs-frene, abs-hetre
- feuilles-stratifiees

**Corrections appliquées :**
- 7 Nuxe → placage-noyer (avec productType corrigé)
- 395 chants chêne → abs-chene
- 58 chants noyer → abs-noyer
- 40 chants frêne → abs-frene
- 26 chants hêtre → abs-hetre
- 1521 feuilles stratifiées → feuilles-stratifiees
- 360 stratifiés bois → strat-bois

