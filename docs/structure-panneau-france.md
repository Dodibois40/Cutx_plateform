# Structure de Classification des Panneaux en France

> Document de référence pour la classification des produits CutX

---

## Vue d'ensemble

La classification CutX est basée sur **4 axes principaux** qui permettent de lier tous les produits entre eux via le **DÉCOR** comme élément central.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    TYPE ──────┐                                                 │
│               │                                                 │
│    DÉCOR ─────┼────► Recherche unifiée                         │
│               │                                                 │
│    FORMAT ────┘                                                 │
│                                                                 │
│    VARIANTES (propriétés techniques)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. TYPE (Matériau)

Le type définit la nature physique du produit.

| Type | Description | Âme/Support |
|------|-------------|-------------|
| **MELAMINE** | Panneau particules + décor mélamine | Particules (P2, P3) |
| **STRATIFIE** | Feuille HPL ou CPL | Feuille seule ou collée |
| **COMPACT** | HPL haute pression auto-porteur | Auto-porteur |
| **PLACAGE** | Bois naturel sur support | Particules, MDF, Contreplaqué |
| **AGGLO_BRUT** | Panneau de particules sans décor | — |
| **MDF** | Fibres moyenne densité | Brut, laqué ou plaqué |
| **CONTREPLAQUE** | Plis de bois croisés | — |
| **OSB** | Lamelles de bois orientées | — |
| **MASSIF** | Bois massif, 3-plis, lamellé-collé | — |
| **CHANT** | Bande de finition pour chants | ABS, PVC, Mélamine, Bois |

### Sous-types

```
STRATIFIE
├── HPL (High Pressure Laminate)
└── CPL (Continuous Pressure Laminate)

CHANT
├── ABS
├── PVC
├── Mélamine
└── Bois véritable

MDF
├── Brut
├── Laqué
└── Plaqué

MASSIF
├── Bois massif
├── 3-plis
└── Lamellé-collé
```

---

## 2. DÉCOR (Aspect visuel)

Le décor est l'élément **central** qui lie tous les produits ensemble. Un même décor peut exister en mélaminé, stratifié, compact ET chant.

### Structure du décor

```
DÉCOR
├── decorCode      : "H1180" (code fabricant)
├── name           : "Halifax Chêne naturel"
├── manufacturer   : "Egger"
├── category       : "BOIS"
├── subCategory    : "Chêne"
├── finish         : "ST37"
└── imageUrl       : "..."
```

### Catégories de décor

| Catégorie | Sous-catégories |
|-----------|-----------------|
| **UNIS** | Blanc, Noir, Gris, Beige, Couleurs vives |
| **BOIS** | Chêne, Noyer, Hêtre, Frêne, Pin, Exotiques |
| **PIERRE** | Marbre, Granit, Ardoise, Travertin |
| **BETON** | Béton brut, Béton ciré, Béton gris |
| **METAL** | Acier, Aluminium, Cuivre, Rouille |
| **TEXTILE** | Lin, Cuir, Tissu |
| **FANTAISIE** | Motifs géométriques, Abstraits |

### Sous-catégories BOIS (détail)

```
BOIS
├── Chêne
│   ├── Chêne naturel
│   ├── Chêne blanchi
│   ├── Chêne grisé
│   └── Chêne foncé
├── Noyer
│   ├── Noyer américain
│   └── Noyer européen
├── Hêtre
├── Frêne
├── Érable
├── Merisier
├── Pin / Sapin
├── Orme
├── Teck
└── Exotiques (Wengé, Zebrano, etc.)
```

### Sens du fil / Type de coupe (innovation USA - Wilsonart/Formica + Inde - Merino)

> **CRITIQUE POUR L'OUTIL DÉCOUPE** : Le sens du fil détermine l'orientation
> des pièces sur le panneau pour un rendu esthétique optimal.

#### Par type de coupe (USA)

| Coupe | Anglais | Description | Aspect |
|-------|---------|-------------|--------|
| **Tangentielle** | Plain | Coupe parallèle aux cernes | Motif cathédrale, flammes |
| **Sur quartier** | Quarter | Coupe perpendiculaire aux cernes | Lignes droites + maillure |
| **Sur dosse** | Rift | Coupe oblique aux cernes | Lignes très droites, pas de maillure |

#### Par type de fil (Inde - Merino)

| Type | Description | Visuel |
|------|-------------|--------|
| **Full Crown** | Cathédrale complète | Arches prononcées |
| **Half Crown** | Demi-cathédrale | Arches légères |
| **Vertical** | Lignes verticales | Fil droit vertical |
| **Horizontal** | Lignes horizontales | Fil droit horizontal |
| **Sawcut** | Aspect sciage | Texture brute, irrégulière |

#### Direction du fil sur le panneau

```
┌─────────────────────────────────────────┐
│                                         │
│  FIL LONGUEUR (standard)               │
│  ════════════════════════►             │
│  Le fil suit la longueur (2800mm)      │
│                                         │
│  Pièces en hauteur → découpe en long   │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ║                                      │
│  ║  FIL LARGEUR (crossgrain)           │
│  ║  Le fil suit la largeur (2070mm)    │
│  ▼                                      │
│                                         │
│  Pièces en largeur → découpe en travers│
│                                         │
└─────────────────────────────────────────┘
```

**Champ en base de données :**
- `grainDirection` : `LENGTH` | `WIDTH` | `NONE` (unis sans fil)

### Sous-catégories UNIS (détail)

```
UNIS
├── Blancs
│   ├── Blanc pur
│   ├── Blanc cassé
│   ├── Blanc crème
│   └── Blanc alpin
├── Noirs
│   ├── Noir mat
│   ├── Noir brillant
│   └── Noir texturé
├── Gris
│   ├── Gris clair
│   ├── Gris moyen
│   ├── Gris anthracite
│   └── Gris taupe
├── Beiges / Sable
├── Couleurs
│   ├── Rouge
│   ├── Bleu
│   ├── Vert
│   ├── Jaune
│   └── Orange
└── Pastels
```

---

## 3. FORMAT (Dimensions)

Les dimensions indiquent naturellement l'usage du produit.

### Panneaux standard

| Format | Longueur | Largeur | Épaisseurs |
|--------|----------|---------|------------|
| Standard | 2800 mm | 2070 mm | 8, 10, 12, 16, 18, 19, 22, 25 mm |
| Grand format | 2800 mm | 2100 mm | 16, 19 mm |

### Plans de travail

| Format | Longueur | Largeur | Épaisseurs |
|--------|----------|---------|------------|
| Compact | 2500-4100 mm | 600-760 mm | 12 mm |
| Massif | 2000-4000 mm | 600-700 mm | 22, 26, 40 mm |
| Mélaminé | 2500-4500 mm | 600-760 mm | 28, 38, 40, 50 mm |

### Stratifiés (feuilles)

| Format | Longueur | Largeur | Épaisseurs |
|--------|----------|---------|------------|
| Standard | 3050 mm | 1320 mm | 0.8, 1.0, 1.3 mm |

### Chants

| Format | Longueur | Largeur | Épaisseurs |
|--------|----------|---------|------------|
| Rouleau | 25-150 m | 19-43 mm | 0.4, 0.8, 1, 2 mm |
| Bande | 5-50 m | 19-43 mm | 0.4, 0.8, 1, 2 mm |

---

## 4. VARIANTES (Propriétés techniques)

### Support/Âme

| Variante | Code | Description |
|----------|------|-------------|
| Particules standard | P2 | Usage intérieur sec |
| Particules hydrofuge | P3 | Milieu humide occasionnel |
| MDF standard | — | Usage intérieur |
| MDF hydrofuge | MDF-H | Milieu humide |
| MDF ignifugé | MDF-FR | Résistant au feu |

### Couleurs d'âme (innovation Japon - AICA)

> Innovation venue du Japon : l'âme du panneau est colorée pour s'assortir au décor.
> Évite la ligne brune visible sur les chants non plaqués.

| Couleur d'âme | Code | Usage recommandé |
|---------------|------|------------------|
| Blanc | W | Décors blancs, clairs |
| Gris | G | Décors gris, béton |
| Beige/Jaune | Y | Décors bois clairs |
| Brun | B | Décors bois foncés |
| Noir | N | Décors noirs, anthracite |

*Note: Pas encore répandu en France, mais à anticiper.*

### Finitions de surface (codes Egger)

| Code | Nom | Description |
|------|-----|-------------|
| ST2 | Office | Lisse mat |
| ST9 | Poretta | Pores fins |
| ST10 | Dexter | Léger brossé |
| ST12 | Excellent | Haut brillant |
| ST15 | Smoothtouch | Mat soyeux |
| ST19 | Feelwood | Bois synchronisé |
| ST28 | Structure brossée | Pores marqués |
| ST37 | Feelwood Nature | Bois naturel |
| ST38 | Deepskin Natura | Bois profond |

### Synchronisation des pores (innovation Europe - Egger/Kronospan)

> Les pores de la texture suivent exactement le fil du bois imprimé.
> Aspect et toucher très proches du bois massif.

| Type | Description | Codes Egger |
|------|-------------|-------------|
| **Non synchronisé** | Texture indépendante du décor | ST2, ST9, ST10, ST12 |
| **Synchronisé** | Pores alignés sur le fil | ST19, ST28, ST37, ST38 |

### Attributs

| Attribut | Applicable à |
|----------|--------------|
| Hydrofuge | Mélaminé, MDF, Agglo |
| Ignifugé | MDF, certains mélaminés |
| Pré-encollé | Chants |
| Contrebalancé | Stratifié |

---

## 5. Exemple de recherche unifiée

```
Recherche: "H1180" ou "Halifax Chêne"

┌─────────────────────────────────────────────────────────────────┐
│  DÉCOR: H1180 Halifax Chêne naturel (Egger)                    │
│  Catégorie: BOIS → Chêne                                        │
│  Finition: ST37 Feelwood Nature                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📦 MÉLAMINÉ                                                    │
│  ├── P2 Standard                                                │
│  │   ├── 2800x2070 - 8mm                                       │
│  │   ├── 2800x2070 - 16mm                                      │
│  │   ├── 2800x2070 - 19mm                                      │
│  │   └── 2800x2070 - 25mm                                      │
│  └── P3 Hydrofuge                                               │
│      ├── 2800x2070 - 16mm                                      │
│      └── 2800x2070 - 19mm                                      │
│                                                                 │
│  🍳 MÉLAMINÉ PLAN DE TRAVAIL                                   │
│  └── P3 Hydrofuge                                               │
│      ├── 4100x600 - 38mm                                       │
│      └── 4100x600 - 40mm                                       │
│                                                                 │
│  📄 STRATIFIÉ HPL                                               │
│  ├── 3050x1320 - 0.8mm                                         │
│  └── 3050x1320 - 1.3mm                                         │
│                                                                 │
│  🧱 COMPACT                                                     │
│  └── 4100x600 - 12mm (plan de travail)                         │
│                                                                 │
│  📏 CHANTS                                                      │
│  ├── ABS 23mm x 0.8mm (rouleau 75m)                            │
│  ├── ABS 23mm x 2mm (rouleau 50m)                              │
│  ├── ABS 43mm x 2mm (rouleau 25m)                              │
│  └── PVC 22mm x 2mm (rouleau 100m)                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Schéma de base de données

```
Panel
├── id
├── reference (ref fournisseur)
├── name
├── type (enum: MELAMINE, STRATIFIE, COMPACT, ...)
├── subType (string nullable: HPL, CPL, ABS, ...)
│
├── decorCode (string: "H1180")
├── decorName (string: "Halifax Chêne naturel")
├── decorCategory (enum: UNIS, BOIS, PIERRE, ...)
├── decorSubCategory (string: "Chêne")
│
├── finish (string: "ST37")
├── manufacturer (string: "Egger")
│
├── defaultLength (int: 2800)
├── defaultWidth (int: 2070)
├── thickness (int[]: [8, 16, 19, 25])
├── defaultThickness (int: 19)
│
├── coreType (string nullable: "P2", "P3", "MDF", ...)
├── isHydrofuge (boolean)
├── isIgnifuge (boolean)
├── isPreglued (boolean) // pour chants
│
├── pricePerM2 (float)
├── pricePerMl (float) // pour chants
├── imageUrl (string)
│
├── catalogueId (relation)
├── categoryId (relation)
└── reviewStatus (enum)
```

---

## 7. Workflow de classification (Review)

Lors de la review d'un panneau :

1. **Identifier le TYPE** → Mélaminé, Stratifié, Chant, etc.
2. **Identifier le DÉCOR** → Code + Nom + Catégorie
3. **Vérifier le FORMAT** → Dimensions standard ou plan de travail
4. **Renseigner les VARIANTES** → Hydrofuge, finition, etc.
5. **Lier les produits** → Tous les produits avec le même decorCode

---

## 8. Fabricants principaux

| Fabricant | Spécialités |
|-----------|-------------|
| **Egger** | Mélaminé, Stratifié, Compact, Chants |
| **Kronospan** | Mélaminé, OSB, Agglo |
| **Finsa** | Mélaminé, MDF |
| **Polyrey** | Stratifié HPL |
| **Abet Laminati** | Stratifié HPL |
| **Unilin** | Mélaminé, MDF |
| **Pfleiderer** | Mélaminé |

---

*Document créé le 10/01/2026 - CutX Platform*
