# Nouvelle Arborescence CutX

Structure pensée métier pour agenceurs et menuisiers.

## 1. PANNEAUX BRUTS (Support / Substrats)

Ce sont les panneaux de base, non décorés.

```
📂 Panneaux Bruts
├── 📁 MDF
│   ├── MDF Standard
│   ├── MDF Hydrofuge (vert)
│   ├── MDF Ignifugé
│   ├── MDF Léger (allégé)
│   └── MDF Teinté masse
├── 📁 Aggloméré / Particule
│   ├── Agglo Standard
│   ├── Agglo Hydrofuge (P3/P5)
│   └── Agglo Ignifugé
├── 📁 Contreplaqué
│   ├── CP Okoumé
│   ├── CP Peuplier
│   ├── CP Bouleau (multiplis)
│   ├── CP Pin Maritime
│   ├── CP Marine (CTBX)
│   ├── CP Filmé
│   └── CP Cintrable
├── 📁 OSB
│   ├── OSB Standard
│   └── OSB Hydrofuge
├── 📁 Latté
│   ├── Latté Standard
│   └── Latté Léger (allégé)
└── 📁 Spéciaux
    ├── Panneau Bois-Ciment
    ├── Panneau Isolant
    └── Panneau Alvéolaire
```

## 2. PANNEAUX DÉCORÉS (Surfacés)

Panneaux avec une surface décorative appliquée.

```
📂 Panneaux Décorés
├── 📁 Mélaminés
│   ├── Décors Unis
│   ├── Décors Bois
│   ├── Décors Fantaisie
│   └── Décors Pierre/Béton
├── 📁 Stratifiés HPL
│   ├── Décors Unis
│   ├── Décors Bois
│   ├── Décors Fantaisie
│   └── Décors Pierre/Métal
├── 📁 Compacts HPL
│   └── Tous décors
├── 📁 Placages
│   ├── Chêne
│   ├── Noyer
│   ├── Frêne
│   └── Essences diverses
└── 📁 Panneaux Déco Spéciaux
    ├── Fenix (anti-trace)
    ├── Cleaf (texture 3D)
    └── Autres
```

## 3. BOIS MASSIFS

Panneaux en bois massif ou lamellé.

```
📂 Bois Massifs
├── 📁 3 Plis
│   ├── Épicéa
│   ├── Chêne
│   └── Autres essences
├── 📁 Lamellés-Collés (aboutés)
│   ├── Épicéa
│   ├── Chêne
│   ├── Hêtre
│   └── Autres essences
└── 📁 Panneautés (non aboutés)
    └── Toutes essences
```

## 4. CHANTS

Bandes de chant pour finition.

```
📂 Chants
├── 📁 Chants ABS
│   ├── Décors Unis
│   ├── Décors Bois
│   └── Décors Fantaisie
├── 📁 Chants PVC
│   └── Tous décors
├── 📁 Chants Mélaminés
│   └── Tous décors
└── 📁 Chants Bois
    ├── Chêne
    ├── Noyer
    └── Autres essences
```

## 5. PLANS DE TRAVAIL

Plans de travail cuisine/salle de bain.

```
📂 Plans de Travail
├── 📁 Stratifiés HPL
│   ├── Décors Unis
│   └── Décors Bois/Pierre
├── 📁 Compacts
│   └── Tous décors
├── 📁 Solid Surface (Corian, etc.)
│   ├── Unis
│   └── Effets
└── 📁 Bois Massif
    └── Chêne, Hêtre, etc.
```

## 6. PANNEAUX MURAUX

Revêtements muraux techniques.

```
📂 Panneaux Muraux
├── 📁 Panneaux Étanches
│   └── Salle de bain, cuisine
└── 📁 Panneaux Acoustiques
```

---

## Règles de classement

### Par `panelType` (type principal)
| panelType | Catégorie niveau 1 |
|-----------|-------------------|
| MDF | Panneaux Bruts > MDF |
| AGGLO_BRUT | Panneaux Bruts > Aggloméré |
| CONTREPLAQUE | Panneaux Bruts > Contreplaqué |
| OSB | Panneaux Bruts > OSB |
| MELAMINE | Panneaux Décorés > Mélaminés |
| STRATIFIE | Panneaux Décorés > Stratifiés HPL |
| COMPACT | Panneaux Décorés > Compacts |
| PLACAGE | Panneaux Décorés > Placages |
| MASSIF | Bois Massifs |
| CHANT | Chants |
| SOLID_SURFACE | Plans de Travail > Solid Surface |
| PANNEAU_DECO | Panneaux Décorés > Spéciaux |

### Par `decorCategory` (sous-catégorie décor)
| decorCategory | Sous-catégorie |
|---------------|----------------|
| UNIS | Décors Unis |
| BOIS | Décors Bois |
| FANTAISIE | Décors Fantaisie |
| PIERRE | Décors Pierre/Béton |
| METAL | Décors Métal |
| SANS_DECOR | (pas de sous-catégorie) |

### Par `panelSubType` (spécialisation)
| panelSubType | Affectation |
|--------------|-------------|
| CHANT_ABS | Chants > ABS |
| CHANT_PVC | Chants > PVC |
| CHANT_BOIS | Chants > Bois |
| CHANT_MELAMINE | Chants > Mélaminés |
| HPL | Stratifiés HPL ou Compacts |
| MDF_BRUT | MDF > Standard |
| MDF_HYDRO | MDF > Hydrofuge |
| MASSIF_3_PLIS | Bois Massifs > 3 Plis |
| LAMELLE_COLLE | Bois Massifs > Lamellés-Collés |

---

## Migration

Script de migration qui :
1. Crée les nouvelles catégories
2. Assigne chaque panel à sa nouvelle catégorie basé sur `panelType` + `decorCategory` + `panelSubType`
3. Supprime les anciennes catégories vides
4. Fusionne les doublons

### Statistiques attendues après migration

| Catégorie niveau 1 | Produits estimés |
|-------------------|------------------|
| Panneaux Bruts | ~1800 |
| Panneaux Décorés | ~4700 |
| Bois Massifs | ~400 |
| Chants | ~2200 |
| Plans de Travail | ~300 |
| Panneaux Muraux | ~100 |
