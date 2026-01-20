# ANALYSE EXHAUSTIVE DU SYSTEME CUTX
## Moteur de Recherche + Arborescence + Base de Donnees

**Date**: 18 janvier 2026
**Version**: 1.0 - Analyse Complete

---

## RESUME EXECUTIF

| Metrique | Valeur |
|----------|--------|
| Total panneaux actifs | **9 446** |
| ProductTypes distincts | **29** |
| ProductTypes SANS mapping frontend | **16** |
| ProductTypes SANS synonyme backend | **16** |
| Panneaux SANS productType | **466** (4.9%) |
| Panneaux SANS image | **522** (5.5%) |
| Panneaux SANS prix | **769** (8.1%) |
| Decores SANS decorName | **4 160** |
| Categories vides | **33** |

---

## PARTIE 1: ARCHITECTURE DU MOTEUR DE RECHERCHE

### 1.1 Fichiers Backend

| Fichier | Role |
|---------|------|
| `smart-search-parser.ts` | Parse la requete en langage naturel |
| `smart-search.service.ts` | Execute la recherche SQL |
| `facets.service.ts` | Calcule les facettes (filtres) |
| `search.service.ts` | Recherche full-text |

### 1.2 Dictionnaires du Parser (smart-search-parser.ts)

#### PRODUCT_TYPE_SYNONYMS
```
mela, melamine, mela, melamine, melamine, mfc → MELAMINE
strat, stratifie, stratifie, hpl, lamine, lamine → STRATIFIE
mdf, medium, medium, fibre → MDF
chant, chants, bande, bordure, abs → BANDE_DE_CHANT
compact, compacte → COMPACT
cp, contreplaque, contreplaque, multiplis → CONTREPLAQUE
agglo, agglomere, agglomere, particule, particules → PARTICULE
osb → OSB
placage, replaque, replaque → PLACAGE
pdt → PLAN_DE_TRAVAIL
massif → PANNEAU_MASSIF
solid, corian → SOLID_SURFACE
```

#### WOOD_SYNONYMS (Essences de bois)
- Europeennes: chene, noyer, hetre, frene, erable, pin, sapin, epicea, bouleau, merisier, cerisier, chataignier, tilleul, aulne, charme, peuplier, platane
- Exotiques: teck, wenge, acacia, olivier, orme, zebrano, palissandre
- Africaines: sapelli, iroko, okoume, sipo, acajou, ayous, padouk, doussie, movingui, framire
- Americaines: tulipier, ipe, jatoba
- Resineux: meleze, cedre, douglas
- Autres: bambou, robinier

#### COLOR_SYNONYMS (Couleurs)
- Blancs: blanc, creme, ivoire
- Gris: gris, anthracite, ardoise, taupe, graphite
- Noirs: noir
- Beiges/Marrons: beige, sable, marron, brun, caramel, chocolat, cafe, cappuccino
- Bleus: bleu, navy, marine, turquoise
- Verts: vert, olive, sauge
- Rouges/Roses: rouge, bordeaux, rose, corail
- Jaunes/Oranges: jaune, orange, curry, moutarde
- Metalliques: cuivre, or, dore, argent, chrome, inox, alu

#### SUBCATEGORY_SYNONYMS (Qualites)
- Qualites: standard, hydrofuge, ignifuge
- MDF: teinte, laque, bp, leger, cintrable
- CP: okoume, bouleau, peuplier, maritime, filme, ctbx
- Agglo: brut, replaque
- Mela: unis, decorbois, fantaisie
- Marques: egger, kronospan, pfleiderer, unilin, polyrey, formica, fenix

### 1.3 Logique de Parsing

```
1. Tokenize la requete
2. Pour chaque token:
   - Dimensions (2800x2070) ?
   - Epaisseur (19, 0.8mm) ?
   - ProductType (mdf, agglo, strat) ?
   - Subcategory (hydrofuge, ignifuge) ?
   - Essence de bois (chene, noyer) ?
   - Couleur (blanc, gris) ?
   - Qualificatif couleur (fonce, clair) ?
   - Decor (beton, marbre) ?
   - Sinon → texte libre
```

### 1.4 Generation SQL

La fonction `buildSmartSearchSQL` genere des clauses WHERE:
- `p."isActive" = true` (toujours)
- `p."productType" = ANY($N)` (si type detecte)
- `$N = ANY(p.thickness)` (si epaisseur detectee)
- `unaccent(lower(p.name)) ILIKE '%..%'` (recherche textuelle)

**Cas special**: Support + Essence (ex: "agglo chene")
- Recherche flexible: productType OU nom contient le materiau
- Permet de trouver "Agglomere chene A/B" qui a productType=PLACAGE

---

## PARTIE 2: ARBORESCENCE FRONTEND

### 2.1 Fichiers Frontend

| Fichier | Role |
|---------|------|
| `useTreeNavigation.ts` | Charge et gere l'arbre |
| `useSyncSearchToTree.ts` | Synchronise recherche → arbre |
| `TreeNavigation/index.tsx` | Composant d'affichage |

### 2.2 Mappings Frontend (useSyncSearchToTree.ts)

#### PRODUCT_TYPE_TO_CATEGORY
```
MELAMINE → melamines
STRATIFIE → stratifies-hpl
MDF → mdf
PARTICULE → agglomere
COMPACT → compacts-hpl
CONTREPLAQUE → contreplaque
OSB → osb
PLACAGE → plaques-bois
BANDE_DE_CHANT → chants
PANNEAU_MASSIF → bois-massifs
SOLID_SURFACE → solid-surface
PLAN_DE_TRAVAIL → plans-de-travail
```

#### PRODUCT_SUBCATEGORY_MAPPING
```
MDF:
  hydrofuge → mdf-hydrofuge
  ignifuge → mdf-ignifuge
  teinte → mdf-teinte
  standard → mdf-standard
  leger → mdf-leger
  laque → mdf-laquer

PARTICULE:
  hydrofuge → agglo-hydrofuge
  ignifuge → agglo-ignifuge
  standard → agglo-standard

OSB:
  hydrofuge → osb-hydrofuge
  standard → osb-standard
```

#### PLACAGE_ESSENCE_MAPPING
```
chene, chene, oak → placage-chene
noyer, walnut → placage-noyer
hetre, hetre, beech → placage-hetre
frene, frene, ash → placage-frene
erable, erable, maple → placage-erable
merisier, cerisier → placages-divers
teck → placage-teck
wenge, wenge → placage-wenge
```

### 2.3 Regle Metier Importante

**Support + Essence = PLACAGE**
```
PARTICULE + chene → plaques-bois (placage-chene)
MDF + noyer → plaques-bois (placage-noyer)
CONTREPLAQUE + hetre → plaques-bois (placage-hetre)
```

---

## PARTIE 3: BASE DE DONNEES

### 3.1 Distribution par ProductType

| ProductType | Count | % | Status |
|-------------|-------|---|--------|
| MELAMINE | 2578 | 27.3% | ✅ OK |
| BANDE_DE_CHANT | 2120 | 22.4% | ✅ OK |
| STRATIFIE | 1604 | 17.0% | ✅ OK |
| CONTREPLAQUE | 745 | 7.9% | ✅ OK |
| SOLID_SURFACE | 473 | 5.0% | ✅ OK |
| **NULL** | **466** | **4.9%** | ❌ **CRITIQUE** |
| MDF | 332 | 3.5% | ✅ OK |
| PANNEAU_MASSIF | 283 | 3.0% | ✅ OK |
| PLACAGE | 143 | 1.5% | ✅ OK |
| PLAN_DE_TRAVAIL | 127 | 1.3% | ✅ OK |
| PANNEAU_MURAL | 123 | 1.3% | ⚠️ Pas de mapping |
| PARTICULE | 102 | 1.1% | ✅ OK |
| PANNEAU_DECORATIF | 78 | 0.8% | ⚠️ Pas de mapping |
| COMPACT | 53 | 0.6% | ✅ OK |
| OSB | 42 | 0.4% | ✅ OK |
| PANNEAU_3_PLIS | 38 | 0.4% | ⚠️ Produit distinct |
| AGGLOMERE | 34 | 0.4% | ❌ Doublon PARTICULE |
| PANNEAU_CONSTRUCTION | 26 | 0.3% | ⚠️ A reclasser |
| MASSIF | 24 | 0.3% | ❌ Doublon PANNEAU_MASSIF |
| CIMENT_BOIS | 12 | 0.1% | ⚠️ A unifier |
| PANNEAU_ISOLANT | 12 | 0.1% | ⚠️ Pas de mapping |
| PANNEAU_SPECIAL | 8 | 0.1% | ⚠️ A reclasser |
| BOIS_CIMENT | 7 | 0.1% | ❌ Doublon CIMENT_BOIS |
| LATTE | 6 | 0.1% | ⚠️ Produit distinct |
| PANNEAU_ALVEOLAIRE | 4 | 0.0% | ⚠️ A unifier |
| PVC | 2 | 0.0% | ❌ A supprimer |
| ALVEOLAIRE | 2 | 0.0% | ❌ Doublon |
| PORTE | 1 | 0.0% | ❌ A supprimer |
| COLLE | 1 | 0.0% | ❌ A supprimer |

### 3.2 Distribution par Catalogue

| Catalogue | Panneaux | ProductTypes principaux |
|-----------|----------|------------------------|
| Dispano | 4362 | MELAMINE, STRATIFIE, BANDE_DE_CHANT, CONTREPLAQUE |
| Bouney | 3362 | MELAMINE, BANDE_DE_CHANT, **NULL (466)**, SOLID_SURFACE |
| Barrillet | 1722 | STRATIFIE, MELAMINE, BANDE_DE_CHANT, SOLID_SURFACE |
| CutX | 0 | (vide) |

### 3.3 Arborescence des Categories

```
Panneaux Decores (2171 panneaux)
├── Melamines (742)
├── Stratifies HPL (1360)
├── Compacts HPL (69)
└── Panneaux Deco Speciaux (0) ⚠️ vide

Chants (1017 panneaux)
├── Chants ABS (909)
├── Chants Melamines (67)
├── Chants PVC (3)
└── Chants Bois (0) ⚠️ vide

Plaques Bois (143 panneaux)
├── Placage Chene (46)
├── Placages Divers (56)
├── Placage Noyer (13)
├── Placage Hetre (10)
├── Placage Frene (9)
├── Placage Merisier (4)
├── Placage Teck (3)
├── Placage Erable (1)
└── Placage Wenge (1)

Bois Massifs (314 panneaux)
├── Panneautes (299)
├── 3 Plis (0) ⚠️ vide
└── Lamelles-Colles (0) ⚠️ vide

Panneaux Bruts (187 panneaux)
├── Contreplaque (187)
├── MDF (0) ⚠️ vide
├── Agglomere (0) ⚠️ vide
├── OSB (0) ⚠️ vide
├── Latte (0) ⚠️ vide
└── Panneaux Speciaux (0) ⚠️ vide

Panneaux Muraux (123 panneaux)
├── Muraux Etanches (123)
└── Muraux Acoustiques (0) ⚠️ vide

Plans de Travail (0 panneaux) ⚠️ TOUT VIDE
├── PDT Stratifies (0)
├── PDT Bois Massif (0)
├── PDT Compacts (0)
└── Solid Surface (0)
```

---

## PARTIE 4: INCOHERENCES DETECTEES

### 4.1 ProductTypes en Doublon

| Doublon | Standard | Count | Action |
|---------|----------|-------|--------|
| AGGLOMERE | PARTICULE | 34 | Migrer vers PARTICULE |
| MASSIF | PANNEAU_MASSIF | 24 | Migrer vers PANNEAU_MASSIF |
| BOIS_CIMENT | CIMENT_BOIS | 7 | Choisir un seul nom |
| ALVEOLAIRE | PANNEAU_ALVEOLAIRE | 2 | Migrer vers PANNEAU_ALVEOLAIRE |

### 4.2 ProductTypes a Supprimer

| ProductType | Count | Raison |
|-------------|-------|--------|
| COLLE | 1 | Ce n'est pas un panneau |
| PORTE | 1 | A reclasser en CONTREPLAQUE |
| PVC | 2 | A reclasser (SOLID_SURFACE ou autre) |

### 4.3 ProductTypes Sans Mapping (Legitimes)

Ces productTypes sont distincts et doivent avoir un mapping:

| ProductType | Count | Categorie suggeree |
|-------------|-------|-------------------|
| PANNEAU_MURAL | 123 | panneaux-muraux |
| PANNEAU_DECORATIF | 78 | panneaux-decoratifs (nouveau) |
| PANNEAU_3_PLIS | 38 | 3-plis |
| LATTE | 6 | latte |
| PANNEAU_ISOLANT | 12 | panneaux-isolants |
| PANNEAU_ALVEOLAIRE | 6 | panneaux-alveolaires |
| CIMENT_BOIS | 19 | ciment-bois |

### 4.4 Panneaux Sans ProductType

**466 panneaux** dans Bouney, categorie "Chants Melamines", nom "Panneau Melamine"

**DIAGNOSTIC**: Ce sont des CHANTS MELAMINES, pas des melamines!
**ACTION**: Mettre productType = BANDE_DE_CHANT

### 4.5 Categories Non Synchronisees

| Categorie dans l'arbre | Panneaux dedans | Probleme |
|------------------------|-----------------|----------|
| MDF (mdf) | 0 | 332 panneaux MDF existent mais pas dans cette categorie |
| Agglomere (agglomere) | 0 | 136 panneaux PARTICULE/AGGLOMERE existent |
| OSB (osb) | 0 | 42 panneaux OSB existent |
| Plans de Travail | 0 | 127 panneaux PLAN_DE_TRAVAIL existent |

---

## PARTIE 5: PLAN D'ACTION

### Phase 1: Corrections Critiques (Priorite HAUTE)

#### 1.1 Classifier les 466 panneaux sans productType
```sql
UPDATE "Panel"
SET "productType" = 'BANDE_DE_CHANT'
WHERE "productType" IS NULL
  AND "categoryId" IN (SELECT id FROM "Category" WHERE slug = 'chants-melamines');
```

#### 1.2 Unifier les doublons de productType
```sql
-- AGGLOMERE → PARTICULE
UPDATE "Panel" SET "productType" = 'PARTICULE' WHERE "productType" = 'AGGLOMERE';

-- MASSIF → PANNEAU_MASSIF
UPDATE "Panel" SET "productType" = 'PANNEAU_MASSIF' WHERE "productType" = 'MASSIF';

-- ALVEOLAIRE → PANNEAU_ALVEOLAIRE
UPDATE "Panel" SET "productType" = 'PANNEAU_ALVEOLAIRE' WHERE "productType" = 'ALVEOLAIRE';

-- BOIS_CIMENT → CIMENT_BOIS
UPDATE "Panel" SET "productType" = 'CIMENT_BOIS' WHERE "productType" = 'BOIS_CIMENT';
```

#### 1.3 Supprimer/Reclasser les productTypes invalides
```sql
-- COLLE → Desactiver
UPDATE "Panel" SET "isActive" = false WHERE "productType" = 'COLLE';

-- PORTE → CONTREPLAQUE
UPDATE "Panel" SET "productType" = 'CONTREPLAQUE' WHERE "productType" = 'PORTE';

-- PVC → SOLID_SURFACE
UPDATE "Panel" SET "productType" = 'SOLID_SURFACE' WHERE "productType" = 'PVC';
```

### Phase 2: Ajouter les Mappings Manquants

#### 2.1 Backend (smart-search-parser.ts)
```typescript
// Ajouter dans PRODUCT_TYPE_SYNONYMS:
mural: 'PANNEAU_MURAL',
decoratif: 'PANNEAU_DECORATIF',
'3plis': 'PANNEAU_3_PLIS', '3-plis': 'PANNEAU_3_PLIS', troisplis: 'PANNEAU_3_PLIS',
latte: 'LATTE', lattes: 'LATTE',
isolant: 'PANNEAU_ISOLANT',
alveolaire: 'PANNEAU_ALVEOLAIRE',
ciment: 'CIMENT_BOIS', viroc: 'CIMENT_BOIS',
```

#### 2.2 Frontend (useSyncSearchToTree.ts)
```typescript
// Ajouter dans PRODUCT_TYPE_TO_CATEGORY:
PANNEAU_MURAL: 'panneaux-muraux',
PANNEAU_DECORATIF: 'panneaux-decoratifs',
PANNEAU_3_PLIS: '3-plis',
LATTE: 'latte',
PANNEAU_ISOLANT: 'panneaux-isolants',
PANNEAU_ALVEOLAIRE: 'panneaux-alveolaires',
CIMENT_BOIS: 'ciment-bois',
PANNEAU_CONSTRUCTION: 'agglomere', // Ce sont des agglos
```

### Phase 3: Corriger les Categories

#### 3.1 Reassigner les panneaux aux bonnes categories
Les 332 panneaux MDF doivent etre dans la categorie "mdf"
Les 136 panneaux PARTICULE doivent etre dans "agglomere"
etc.

### Phase 4: Enrichir les Donnees

#### 4.1 Rescraper les 769 panneaux sans prix
#### 4.2 Rescraper les 522 panneaux sans image
#### 4.3 Enrichir les 4160 decores sans decorName

---

## PARTIE 6: DEFINITION DES PRODUCTTYPES

### ProductTypes Standards (A GARDER)

| ProductType | Description |
|-------------|-------------|
| MELAMINE | Panneau particule/MDF avec surface melaminee |
| STRATIFIE | Feuille stratifiee HPL (0.6-1.3mm) |
| MDF | Panneau fibre moyenne densite |
| PARTICULE | Panneau agglomere de particules |
| CONTREPLAQUE | Panneau multiplis colle |
| OSB | Panneau particules orientees |
| COMPACT | Panneau stratifie haute pression (8-20mm) |
| PLACAGE | Panneau avec placage bois veritable |
| BANDE_DE_CHANT | Bande pour chants (ABS, bois, mela, PVC) |
| PANNEAU_MASSIF | Panneau bois massif lamellee-colle |
| SOLID_SURFACE | Surface solide (Corian, Kerrock...) |
| PLAN_DE_TRAVAIL | Plan de travail cuisine/salle de bain |

### ProductTypes Speciaux (A GARDER)

| ProductType | Description |
|-------------|-------------|
| PANNEAU_MURAL | Panneaux muraux (etanches, acoustiques) |
| PANNEAU_DECORATIF | Panneaux design/acoustiques (Splitt, Latt...) |
| PANNEAU_3_PLIS | Panneau 3 couches croisees |
| LATTE | Panneau latte (ame lattes bois) |
| PANNEAU_ISOLANT | Panneaux isolants |
| PANNEAU_ALVEOLAIRE | Panneaux ame alveolaire |
| CIMENT_BOIS | Panneaux ciment-bois (Viroc) |

---

## CONCLUSION

Le systeme CutX a une base solide mais necessite:

1. **Corrections urgentes**:
   - 466 chants melamines sans productType
   - 69 panneaux avec productTypes en doublon
   - 4 panneaux avec productTypes invalides

2. **Ajout de mappings**:
   - 7 productTypes legitimes sans mapping backend/frontend

3. **Reorganisation categories**:
   - Beaucoup de panneaux ne sont pas dans les bonnes categories
   - 33 categories vides a peupler ou supprimer

4. **Enrichissement donnees**:
   - 769 sans prix (8.1%)
   - 522 sans image (5.5%)
   - 4160 decores sans decorName

**Estimation**: 2-3 jours de travail pour tout corriger.
