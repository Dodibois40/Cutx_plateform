# CutX - Algorithme d'Optimisation de Decoupe

## Analyse des Concepts Metier (Industrie Standard)

### 1. Parametres de Decoupe

#### 1.1 Trait de Scie (Blade/Kerf Width)
- **BladeWidth** : Epaisseur de la lame (typiquement 3-4mm)
- Doit etre ajoute entre chaque piece decoupee
- Peut etre defini globalement OU par materiau

#### 1.2 Marges de Panneau (Sheet Trim)
- **TrimTop, TrimLeft, TrimBottom, TrimRight** : Marges a retirer sur les bords du panneau brut
- Utilise pour les panneaux avec defauts de bord ou placage
- Reduit la surface utilisable

#### 1.3 Surcotes (Expansion)
- **LongExpansion** : Surcote sur la longueur (sens du fil)
- **ShortExpansion** : Surcote sur la largeur
- Ajoute aux dimensions finies pour permettre l'usinage ulterieur

### 2. Contraintes de Placement

#### 2.1 Sens du Fil (Grain Direction)
- **HasGrain** : Le panneau a-t-il un sens de fil ?
- Si oui, les pieces doivent respecter l'orientation
- **GrainMatchGrainAlongPanelWidth** : Fil dans le sens de la largeur du panneau

#### 2.2 Rotation des Pieces
- **RotationType** :
  - `0` = Pas de rotation (orientation fixe)
  - `1` = Rotation 90 deg autorisee
  - `2` = Rotation libre (0 ou 90 deg selon optimisation)

#### 2.3 Dimensions Minimales
- **MinPieceLength** : Longueur minimale d'une piece
- **MinPieceWidth** : Largeur minimale d'une piece
- Les chutes en dessous de ces seuils sont considerees comme dechets

### 3. Strategies d'Optimisation

#### 3.1 Type d'Optimisation
- **OptimizationType** :
  - `0` = Minimiser les chutes (moins de dechets)
  - `1` = Minimiser le nombre de panneaux utilises
  - `2` = Minimiser les coupes (temps de decoupe)

#### 3.2 Nombre d'Etapes
- **OptimizationNoStages** : Nombre d'iterations d'optimisation
- Plus d'etapes = meilleur resultat mais plus lent

#### 3.3 Gestion des Chutes
- **WastageType** :
  - `0` = Ignorer les chutes
  - `1` = Reutiliser les chutes si possible
- **UseAnyAvailableSubSheets** : Utiliser les chutes disponibles

### 4. Groupement des Pieces

#### 4.1 Criteres de Groupement
Pour optimiser par lots de pieces similaires :
- **GroupBySize** : Grouper par dimensions identiques
- **GroupByEdging** : Grouper par chants identiques
- **GroupByHoles** : Grouper par percages identiques
- **GroupByGrooving** : Grouper par rainures identiques
- **GroupByLabeling** : Grouper par etiquetage

---

## Architecture de l'Algorithme CutX

### Phase 1 : Pre-traitement

```
1. Charger les pieces a decouper
2. Appliquer les surcotes (expansion)
3. Trier par surface decroissante (heuristique FFD)
4. Grouper par materiau
5. Pour chaque groupe, sous-grouper par contrainte de fil
```

### Phase 2 : Algorithme de Placement (Guillotine)

L'algorithme de **decoupe guillotine** impose que chaque coupe traverse
le panneau de part en part (comme une vraie scie sur rail).

```
ALGORITHME: Guillotine Best-Fit

ENTREES:
  - pieces[] : liste des pieces a placer (triees par surface desc)
  - panneau : dimensions du panneau source
  - traitScie : epaisseur de la lame

SORTIE:
  - placements[] : positions de chaque piece
  - chutes[] : zones non utilisees

PROCEDURE:
  espaces = [panneau.dimensions]  // Espaces libres disponibles

  POUR chaque piece DANS pieces:
    meilleurEspace = NULL
    meilleurScore = INFINI

    POUR chaque espace DANS espaces:
      SI piece.fitsDans(espace, traitScie):
        score = calculerScore(espace, piece)
        SI score < meilleurScore:
          meilleurScore = score
          meilleurEspace = espace

    SI meilleurEspace != NULL:
      placement = placer(piece, meilleurEspace)
      nouveauxEspaces = decoupeGuillotine(meilleurEspace, piece, traitScie)
      espaces.retirer(meilleurEspace)
      espaces.ajouter(nouveauxEspaces)
    SINON:
      // Piece ne rentre pas - nouveau panneau necessaire

  RETOURNER placements, espaces (chutes)
```

### Phase 3 : Decoupe Guillotine

Quand on place une piece dans un espace, on cree 2 nouveaux espaces :

```
+---------------------------+
|          ESPACE           |
+---------------------------+

Apres placement de PIECE (avec trait de scie) :

+-------+---+---------------+
| PIECE |   |   ESPACE B    |
|       | T |   (droite)    |
+-------+---+---------------+
|   T   |                   |  T = Trait de scie
+-------+                   |
|      ESPACE A (bas)       |
+---------------------------+

OU (coupe horizontale d'abord) :

+-------+-------------------+
| PIECE |                   |
|       |   ESPACE B        |
+-------+---+   (droite)    |
|   T       |               |
+-----------+---------------+
|      ESPACE A (bas)       |
+---------------------------+
```

### Phase 4 : Heuristiques de Score

```typescript
function calculerScore(espace: Espace, piece: Piece): number {
  // Best Area Fit (BAF) - minimiser l'espace perdu
  const airePerdue = espace.aire - piece.aire;

  // Best Short Side Fit (BSSF) - minimiser le plus petit cote restant
  const resteX = espace.largeur - piece.largeur;
  const resteY = espace.hauteur - piece.hauteur;
  const bssf = Math.min(resteX, resteY);

  // Combinaison ponderee
  return airePerdue * 0.7 + bssf * 100 * 0.3;
}
```

### Phase 5 : Multi-Panneau

```
SI toutes les pieces ne rentrent pas dans un panneau:
  1. Placer le maximum de pieces dans le panneau courant
  2. Creer un nouveau panneau
  3. Repeter avec les pieces restantes

Optimisation multi-panneau:
  - Essayer differentes combinaisons de pieces par panneau
  - Garder la combinaison avec le meilleur taux de remplissage global
```

---

## Structures de Donnees TypeScript

```typescript
// Types de base
interface Dimensions {
  length: number;  // mm
  width: number;   // mm
}

interface Position {
  x: number;
  y: number;
}

// Piece a decouper
interface CuttingPiece {
  id: string;
  name: string;
  dimensions: Dimensions;
  quantity: number;

  // Contraintes
  hasGrain: boolean;         // Sens du fil obligatoire
  grainDirection: 'length' | 'width';
  canRotate: boolean;        // Rotation autorisee

  // Surcotes
  expansion: {
    long: number;
    short: number;
  };

  // Chants (pour groupement)
  edging: {
    top: string | null;
    bottom: string | null;
    left: string | null;
    right: string | null;
  };
}

// Panneau source
interface SourceSheet {
  id: string;
  materialRef: string;
  dimensions: Dimensions;

  // Marges
  trim: {
    top: number;
    left: number;
    bottom: number;
    right: number;
  };

  hasGrain: boolean;
  grainDirection: 'length' | 'width';

  // Prix
  pricePerM2: number;
}

// Resultat de placement
interface Placement {
  pieceId: string;
  sheetIndex: number;
  position: Position;
  rotated: boolean;

  // Dimensions finales (avec surcotes)
  finalDimensions: Dimensions;
}

// Espace libre (pour l'algorithme)
interface FreeSpace {
  position: Position;
  dimensions: Dimensions;
}

// Plan de decoupe
interface CuttingPlan {
  sheets: {
    sheet: SourceSheet;
    placements: Placement[];
    freeSpaces: FreeSpace[];  // Chutes
    efficiency: number;        // % utilisation
  }[];

  // Statistiques globales
  totalSheets: number;
  totalArea: number;
  usedArea: number;
  wasteArea: number;
  globalEfficiency: number;

  // Coupes
  cuts: Cut[];
}

interface Cut {
  sheetIndex: number;
  type: 'horizontal' | 'vertical';
  position: number;  // mm depuis le bord
  length: number;    // longueur de la coupe
}

// Parametres d'optimisation
interface OptimizationParams {
  bladeWidth: number;         // Trait de scie (mm)
  optimizationType: 'minimize_waste' | 'minimize_sheets' | 'minimize_cuts';
  iterations: number;         // Nombre d'iterations
  reuseOffcuts: boolean;      // Reutiliser les chutes
  minOffcutLength: number;    // Chute min a conserver
  minOffcutWidth: number;
}
```

---

## Plan d'Implementation

### Etape 1 : Core Algorithm (Backend NestJS)
```
cutx-api/src/optimization/
  ├── optimization.module.ts
  ├── optimization.controller.ts
  ├── optimization.service.ts
  ├── algorithms/
  │   ├── guillotine.ts          # Algo principal
  │   ├── best-fit.ts            # Heuristiques de placement
  │   ├── sorting.ts             # Tri des pieces
  │   └── multi-sheet.ts         # Gestion multi-panneaux
  ├── dto/
  │   ├── optimization-request.dto.ts
  │   └── cutting-plan.dto.ts
  └── types/
      └── cutting.types.ts
```

### Etape 2 : API Endpoints
```
POST /api/optimization/calculate
  Body: { pieces: CuttingPiece[], sheets: SourceSheet[], params: OptimizationParams }
  Response: CuttingPlan

GET /api/optimization/preview/:planId
  Response: Image PNG du plan de decoupe
```

### Etape 3 : Frontend (Next.js)
```
cutx-frontend/src/components/optimization/
  ├── CuttingPlanViewer.tsx      # Visualisation SVG/Canvas
  ├── SheetPreview.tsx           # Preview d'un panneau
  ├── OptimizationParams.tsx     # Formulaire parametres
  └── CuttingStats.tsx           # Statistiques
```

---

## References Academiques

1. **Bin Packing 2D** - Algorithmes classiques FFD, BFD
2. **Guillotine Cutting** - Decoupe contrainte industrielle
3. **Maximal Rectangles Algorithm** - Jukka Jylanki (2010)
4. **Skyline Bottom-Left** - Heuristique de placement

Ces algorithmes sont du domaine public et documentes dans la litterature academique.
