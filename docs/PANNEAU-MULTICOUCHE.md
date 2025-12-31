# Panneau Multicouche - Spécification Fonctionnelle

## Vision

Permettre aux menuisiers de configurer des **panneaux composites** formés de plusieurs couches de matériaux collées ensemble, tout en gérant la complexité liée au mode de collage (fournisseur vs client).

---

## Architecture UX : 2 Configurateurs

### Choix initial à l'entrée du configurateur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Quel type de panneau souhaitez-vous ?                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌───────────────────────────────┐   ┌───────────────────────────────┐ │
│   │                               │   │                               │ │
│   │      📦 Panneau Industriel    │   │      📚 Panneau Multicouche   │ │
│   │                               │   │                               │ │
│   │   Sélectionner un panneau     │   │   Créer un panneau sur-mesure │ │
│   │   déjà fabriqué du catalogue  │   │   avec plusieurs couches      │ │
│   │                               │   │   collées ensemble            │ │
│   │   • MDF, Mélaminé, OSB...     │   │                               │ │
│   │   • Prêt à l'emploi           │   │   • Parement + Âme + Dos      │ │
│   │   • Dimensions standard       │   │   • Composition personnalisée │ │
│   │                               │   │   • Collage fournisseur/client│ │
│   │                               │   │                               │ │
│   │        [Choisir →]            │   │        [Créer →]              │ │
│   │                               │   │                               │ │
│   └───────────────────────────────┘   └───────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2 expériences distinctes

| Aspect | Configurateur Industriel (existant) | Configurateur Multicouche (nouveau) |
|--------|-------------------------------------|-------------------------------------|
| **Entrée** | Bibliothèque de panneaux | Création de couches |
| **Panneau** | 1 matériau sélectionné | N couches assemblées |
| **Épaisseur** | Fixe (du catalogue) | Calculée (Σ couches) |
| **Prix matière** | Prix catalogue/m² | Σ prix couches/m² |
| **Options** | Toutes disponibles | Selon mode collage |
| **URL** | `/configurateur` | `/configurateur/multicouche` |

---

## Concept Métier

### Qu'est-ce qu'un panneau multicouche ?

Un panneau multicouche est un panneau fini composé de **plusieurs couches de matériaux différents** assemblées par collage d'épaisseur.

**Exemple concret :**
```
┌─────────────────────────────────────────────┐
│  Couche 1 - Face parement (visible)         │  Décoflex chêne de fil 0.6mm
│  ─────────────────────────────────────────  │  Réf: BCB-83731-b-comme-bois
├─────────────────────────────────────────────┤
│                                             │
│  Couche 2 - Âme du panneau (structure)      │  MDF Standard 19mm
│                                             │
├─────────────────────────────────────────────┤
│  Couche 3 - Contrebalancement (dos)         │  Stratifié blanc mat 0.8-1mm
│  ─────────────────────────────────────────  │  Réf: 79155
└─────────────────────────────────────────────┘
         ↓
    Épaisseur totale : ~20.5mm
```

### Pourquoi c'est important ?

1. **Stabilité dimensionnelle** : Le contrebalancement évite le cintrage
2. **Aspect esthétique** : Placage noble en face visible
3. **Économie** : Âme moins chère que du bois massif
4. **Personnalisation** : Combinaisons infinies de matériaux

---

## Workflow Utilisateur

### Choix initial : Mode de collage

```
┌──────────────────────────────────────────────────────────────────┐
│                    Comment sera collé ce panneau ?               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐ │
│  │                         │    │                             │ │
│  │   🏭 Collage Fournisseur│    │   🔧 Collage par mes soins  │ │
│  │                         │    │                             │ │
│  │   Le fournisseur colle  │    │   Je collerai moi-même      │ │
│  │   les couches et livre  │    │   les couches après         │ │
│  │   un panneau fini aux   │    │   réception                 │ │
│  │   dimensions exactes    │    │                             │ │
│  │                         │    │                             │ │
│  │   ✅ Placage de chants  │    │   ⚠️ Sur-cote nécessaire    │ │
│  │   ✅ Usinages           │    │   (recouper après collage)  │ │
│  │   ✅ Perçage            │    │                             │ │
│  │   ✅ Finition           │    │   ❌ Pas de prestations     │ │
│  │                         │    │   supplémentaires           │ │
│  └─────────────────────────┘    └─────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Workflow A : Collage Fournisseur

```
1. Sélection "Panneau Multicouche"
   │
2. Définir les couches (min 2, max 5)
   │  ├─ Couche 1 : Matériau + Épaisseur + Référence catalogue
   │  ├─ Couche 2 : Matériau + Épaisseur + Référence catalogue
   │  └─ Couche N : ...
   │
3. Choisir "Collage Fournisseur" ✅
   │
4. Définir dimensions FINALES (L × l)
   │
5. Options disponibles (comme panneau simple) :
   │  ├─ Placage de chants (A, B, C, D)
   │  ├─ Usinages
   │  ├─ Perçage
   │  └─ Finition (Vernis/Laque)
   │
6. → Génère 1 SEULE ligne panneau
      avec prix = Σ(couches) + prestation collage + options
```

### Workflow B : Collage Client (par ses soins)

```
1. Sélection "Panneau Multicouche"
   │
2. Définir les couches (min 2, max 5)
   │  ├─ Couche 1 : Matériau + Épaisseur + Référence catalogue
   │  ├─ Couche 2 : Matériau + Épaisseur + Référence catalogue
   │  └─ Couche N : ...
   │
3. Choisir "Collage par mes soins" 🔧
   │
4. Définir dimensions FINALES souhaitées (L × l)
   │
5. ⚠️ Proposition de sur-cote automatique :
   │  ┌─────────────────────────────────────────────────────┐
   │  │  Sur-cote recommandée pour recoupe après collage :  │
   │  │                                                      │
   │  │  Dimensions finales souhaitées : 800 × 600 mm       │
   │  │  Sur-cote appliquée : +50 mm par côté               │
   │  │  → Dimensions de découpe : 900 × 700 mm             │
   │  │                                                      │
   │  │  ☑ Appliquer la sur-cote (recommandé)               │
   │  │  ○ Commander aux dimensions exactes (déconseillé)   │
   │  └─────────────────────────────────────────────────────┘
   │
6. Options DÉSACTIVÉES (grisées) :
   │  ├─ ❌ Placage de chants (impossible, recoupe après)
   │  ├─ ❌ Usinages (impossible, recoupe après)
   │  ├─ ❌ Perçage (impossible, recoupe après)
   │  └─ ❌ Finition (impossible, recoupe après)
   │
7. → Génère 1 SEULE ligne panneau multicouche
      avec prix = Σ(couches) seulement
      Note: "Couches livrées séparément pour collage client"
```

---

## Structure de Données

### Nouveau Type : `CoucheMulticouche`

```typescript
interface CoucheMulticouche {
  id: string;                    // Identifiant unique de la couche
  ordre: number;                 // Position (1 = face parement, N = dos)
  type: 'parement' | 'ame' | 'contrebalancement' | 'autre';

  // Matériau
  materiau: string;              // MDF, Contreplaqué, Stratifié, Placage...
  epaisseur: number;             // En mm

  // Sens du fil (UNIQUEMENT pour couche parement)
  // Important pour l'aspect visuel de la face visible
  sensDuFil?: 'longueur' | 'largeur';  // Optionnel, seulement si type === 'parement'

  // Référence catalogue (optionnel)
  panneauId: string | null;
  panneauNom: string | null;
  panneauReference: string | null;
  panneauImageUrl: string | null;
  prixPanneauM2: number;

  // Calculé
  surfaceM2: number;
  prixCouche: number;
}
```

### Extension de `LignePrestationV3`

```typescript
interface LignePrestationV3 {
  // ... champs existants ...

  // === NOUVEAU : Multicouche ===
  isMulticouche: boolean;                      // Panneau multicouche ?
  couches: CoucheMulticouche[];                // Liste des couches
  modeCollage: 'fournisseur' | 'client' | null;

  // Sur-cote (si collage client)
  avecSurcote: boolean;
  surcoteMm: number;                           // Défaut: 50mm
  dimensionsDecoupe: {                         // Dimensions avec sur-cote
    longueur: number;
    largeur: number;
  };

  // Épaisseur totale calculée
  epaisseurTotale: number;                     // Σ(couches.epaisseur)

  // Prestation collage (si fournisseur)
  prixCollage: number;
}
```

### Type de couche

```typescript
type TypeCouche =
  | 'parement'           // Face visible (décor, placage noble)
  | 'ame'                // Cœur/structure (MDF, Contreplaqué, Lattés)
  | 'contrebalancement'  // Dos (stratifié fin, kraft)
  | 'autre';             // Couche intermédiaire

// Labels pour l'UI
const LABELS_COUCHE: Record<TypeCouche, string> = {
  parement: 'Face parement (visible)',
  ame: 'Âme du panneau',
  contrebalancement: 'Contrebalancement (dos)',
  autre: 'Couche intermédiaire'
};
```

---

## Interface Utilisateur

### Option 1 : Modale de configuration multicouche

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      Configuration Panneau Multicouche                   │
│                                                              ✕           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Référence : [FT1 - Facade Meuble        ]                              │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  COUCHES (de la face vers le dos)                                        │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 1 │ Face parement  │ Décoflex chêne    │ 0.6 mm │ 45€/m² │ [🗑] │   │
│  │   │ (visible)      │ BCB-83731         │        │        │      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 2 │ Âme panneau    │ MDF Standard      │ 19 mm  │ 12€/m² │ [🗑] │   │
│  │   │                │                    │        │        │      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 3 │ Contrebalan.   │ Stratifié blanc   │ 0.8 mm │ 8€/m²  │ [🗑] │   │
│  │   │ (dos)          │ Réf: 79155        │        │        │      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [+ Ajouter une couche]                                                  │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  ÉPAISSEUR TOTALE : 20.4 mm                                             │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  MODE DE COLLAGE                                                         │
│                                                                          │
│  ○ 🏭 Collage par le fournisseur                                        │
│     → Panneau livré collé aux dimensions exactes                        │
│     → Options disponibles : Chants, Usinages, Perçage, Finition         │
│                                                                          │
│  ● 🔧 Collage par mes soins                                             │
│     → Couches livrées séparément                                        │
│     → Sur-cote recommandée : +50mm par côté                             │
│       ☑ Appliquer la sur-cote                                           │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  DIMENSIONS                                                              │
│                                                                          │
│  Dimensions finales : [800] mm  ×  [600] mm                             │
│  Dimensions découpe : 900 mm × 700 mm (avec sur-cote +50mm)             │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  PRIX ESTIMÉ : 156.80 € HT                                              │
│  ├─ Couche 1 (Décoflex) : 22.32 €                                       │
│  ├─ Couche 2 (MDF) : 5.95 €                                             │
│  ├─ Couche 3 (Stratifié) : 3.97 €                                       │
│  └─ Découpe (3 couches) : 12.00 €                                       │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│                              [Annuler]  [Valider]                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Option 2 : Intégration inline dans LignePanneau

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ État │ Panneau              │ Réf     │ Dimensions   │ Chants │ ... │ Prix HT │
├────────────────────────────────────────────────────────────────────────────────┤
│  ●   │ 📚 MULTICOUCHE       │ FT1     │ 800×600×20.4 │ ABCD   │ ... │ 156.80€ │
│      │ ├─ Décoflex 0.6mm    │         │              │        │     │         │
│      │ ├─ MDF 19mm          │         │              │        │     │         │
│      │ └─ Strat. 0.8mm      │         │              │        │     │         │
│      │ [🔧 Collage client]  │         │              │ ❌     │ ❌  │         │
├────────────────────────────────────────────────────────────────────────────────┤
│  ◐   │ 📚 MULTICOUCHE       │ FT2     │ 1200×800×22  │ AB--   │ ... │ 245.60€ │
│      │ ├─ Noyer 0.6mm       │         │              │        │     │         │
│      │ ├─ Lattés 18mm       │         │              │        │     │         │
│      │ └─ Kraft 0.4mm       │         │              │        │     │         │
│      │ [🏭 Collage fourn.]  │         │              │ ✅     │ ✅  │         │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Règles Métier

### Contraintes générales

| Règle | Valeur |
|-------|--------|
| Nombre min de couches | 2 |
| Nombre max de couches | 5 |
| **Sur-cote par défaut** | **50 mm par côté** |
| Sur-cote min | 20 mm |
| Sur-cote max | 100 mm |

### Matériaux par type de couche

| Type couche | Matériaux suggérés |
|-------------|-------------------|
| Parement | Placage bois, Décoflex, HPL décoratif, Stratifié décor |
| Âme | MDF, Contreplaqué, Lattés, Aggloméré |
| Contrebalancement | Stratifié kraft, Stratifié blanc mat, Papier kraft |

### Calcul des prix

```typescript
// Prix multicouche
function calculerPrixMulticouche(ligne: LignePrestationV3): number {
  if (!ligne.isMulticouche) return 0;

  const surfaceM2 = ligne.avecSurcote
    ? (ligne.dimensionsDecoupe.longueur * ligne.dimensionsDecoupe.largeur) / 1_000_000
    : ligne.surfaceM2;

  // Prix des couches
  const prixCouches = ligne.couches.reduce((total, couche) => {
    return total + (surfaceM2 * couche.prixPanneauM2);
  }, 0);

  // Prix découpe (par couche)
  const prixDecoupe = ligne.couches.length * TARIF_DECOUPE_COUCHE;

  // Prix collage (si fournisseur)
  const prixCollage = ligne.modeCollage === 'fournisseur'
    ? surfaceM2 * TARIF_COLLAGE_M2 * (ligne.couches.length - 1)
    : 0;

  return prixCouches + prixDecoupe + prixCollage;
}
```

### Validation

```typescript
function validerMulticouche(ligne: LignePrestationV3): ValidationResult {
  const erreurs: string[] = [];

  if (ligne.couches.length < 2) {
    erreurs.push('Un panneau multicouche nécessite au moins 2 couches');
  }

  if (ligne.couches.length > 5) {
    erreurs.push('Maximum 5 couches par panneau');
  }

  // Vérifier que chaque couche a un matériau
  ligne.couches.forEach((couche, i) => {
    if (!couche.panneauId && !couche.materiau) {
      erreurs.push(`Couche ${i + 1} : matériau non défini`);
    }
    if (couche.epaisseur <= 0) {
      erreurs.push(`Couche ${i + 1} : épaisseur invalide`);
    }
  });

  // Si collage client, bloquer les options
  if (ligne.modeCollage === 'client') {
    if (ligne.chants.A || ligne.chants.B || ligne.chants.C || ligne.chants.D) {
      erreurs.push('Placage de chants impossible avec collage client');
    }
    if (ligne.usinages.length > 0) {
      erreurs.push('Usinages impossibles avec collage client');
    }
    if (ligne.percage) {
      erreurs.push('Perçage impossible avec collage client');
    }
    if (ligne.avecFinition) {
      erreurs.push('Finition impossible avec collage client');
    }
  }

  return {
    isValid: erreurs.length === 0,
    erreurs
  };
}
```

---

## Décisions validées ✅

| Question | Décision |
|----------|----------|
| **Sur-cote** | 50mm par côté (global, pas par couche) |
| **Sens du fil** | Uniquement important pour la couche **parement** (face visible) |
| **Quantités** | 5 panneaux identiques = 5× chaque couche (et 5× collage si fournisseur) |
| **Prix collage** | À définir ultérieurement |

---

## Questions ouvertes

### À clarifier plus tard

1. **Tarification collage fournisseur**
   - Prix au m² ? Prix forfaitaire par collage ?
   - Différence de prix selon le nombre de couches ?

2. **Catalogues multiples**
   - Les différentes couches peuvent-elles venir de catalogues différents ?
   - Comment gérer les références croisées ?

3. **Import Excel**
   - Comment représenter un panneau multicouche dans un fichier d'import ?
   - Format suggéré : lignes groupées avec un identifiant commun ?

---

## Implémentation Progressive

### Phase 1 : Architecture & Routing

- [ ] Créer la page de choix `/configurateur` avec les 2 options
- [ ] Route `/configurateur/industriel` → configurateur existant
- [ ] Route `/configurateur/multicouche` → nouveau configurateur
- [ ] Nouveau contexte `ConfigurateurMulticoucheContext`
- [ ] Types TypeScript pour `CoucheMulticouche` et extensions

### Phase 2 : Configurateur Multicouche MVP

- [ ] Interface de création des couches (liste verticale)
- [ ] Sélection de panneau par couche (catalogue existant)
- [ ] Choix du mode de collage (fournisseur/client)
- [ ] Calcul automatique de l'épaisseur totale
- [ ] Calcul du prix (somme des couches)
- [ ] Sur-cote 50mm automatique si collage client
- [ ] Blocage des options si collage client

### Phase 3 : Enrichissement UX

- [ ] Sens du fil pour la couche parement
- [ ] Visualisation des couches empilées (preview)
- [ ] Intégration avec les prestations (chants, usinages, etc.) si collage fournisseur
- [ ] Export PDF avec détail des couches

### Phase 4 : Avancé

- [ ] Import Excel format multicouche
- [ ] Optimiseur compatible multicouche
- [ ] Historique des compositions favorites
- [ ] Templates de compositions pré-définies

---

## Annexes

### Terminologie

| Terme | Définition |
|-------|------------|
| **Âme** | Couche centrale qui donne la structure/épaisseur |
| **Parement** | Face visible, souvent avec décor ou placage noble |
| **Contrebalancement** | Face arrière qui équilibre les tensions du bois |
| **Collage d'épaisseur** | Assemblage de couches pour créer un panneau épais |
| **Sur-cote** | Marge supplémentaire pour recoupe après collage |
| **Lattés** | Panneau avec âme en lattes de bois collées |

### Références normatives

- NF EN 313 : Contreplaqué - Classification et terminologie
- NF EN 622 : Panneaux de fibres (MDF)
- NF EN 14322 : Panneaux dérivés du bois - Stratifiés mélaminés

---

*Document créé le 30/12/2024 - Version 1.1*
*Mis à jour avec les décisions utilisateur*

---

## Historique des versions

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 30/12/2024 | Création initiale |
| 1.1 | 30/12/2024 | Architecture 2 configurateurs, sur-cote 50mm, sens du fil parement uniquement |
