# Architecture - Module Caissons Preconfigures

## Vue d'ensemble

Ce module permet de configurer des caissons de cuisine/mobilier avec :
- Configuration en 4 etapes
- Previsualisation 3D temps reel
- Recalcul dynamique des dimensions
- Export automatique vers le configurateur

---

## Structure des dossiers

```
cutx-api/
└── src/
    └── caissons/                          # Module NestJS
        ├── caissons.module.ts
        ├── caissons.controller.ts
        ├── caissons.service.ts
        ├── caissons-calculs.service.ts    # Logique de recalcul
        ├── dto/
        │   ├── index.ts
        │   ├── create-caisson.dto.ts
        │   ├── calculate-caisson.dto.ts
        │   └── caisson-template.dto.ts
        └── templates/
            ├── index.ts
            ├── caisson-bas-cuisine.ts     # Template 500mm DROIT
            ├── caisson-haut-cuisine.ts
            └── caisson-colonne.ts

cutx-frontend/
└── src/
    ├── components/
    │   └── configurateur/
    │       └── caissons/                  # Composants UI
    │           ├── index.ts
    │           ├── PopupCaissonConfig.tsx        # Popup principale
    │           ├── CaissonPreview3D.tsx          # Preview Three.js
    │           ├── SelecteurCaisson.tsx          # Bouton selection template
    │           └── etapes/
    │               ├── index.ts
    │               ├── EtapeStructure.tsx        # Etape 1: Panneaux structure
    │               ├── EtapeFond.tsx             # Etape 2: Panneau fond
    │               ├── EtapeFacade.tsx           # Etape 3: Facade
    │               └── EtapeCharnieres.tsx       # Etape 4: Charnieres
    │
    ├── lib/
    │   └── caissons/                      # Logique metier
    │       ├── index.ts
    │       ├── types.ts                   # Types TypeScript
    │       ├── constants.ts               # Constantes (min/max dimensions)
    │       ├── calculs.ts                 # Formules de calcul
    │       └── templates.ts               # Templates par defaut
    │
    ├── hooks/
    │   └── useCaissonCalculs.ts           # Hook React pour calculs
    │
    └── contexts/
        └── CaissonContext.tsx             # Context pour l'etat du caisson
```

---

## Types principaux

```typescript
// Types de caissons disponibles
type TypeCaisson =
  | 'bas_cuisine'      // Caisson bas cuisine (ex: 500mm DROIT)
  | 'haut_cuisine'     // Caisson haut mural
  | 'colonne'          // Colonne cuisine
  | 'tiroir'           // Caisson a tiroirs
  | 'custom';          // Configuration libre

// Type de fond
type TypeFond =
  | 'applique'         // Fond en applique (vissé derriere)
  | 'encastre'         // Fond encastré dans rainure
  | 'feuillure'        // Fond en feuillure
  | 'rainure';         // Fond rainuré

// Type de facade
type TypeFacade =
  | 'applique'         // Facade en applique
  | 'encastre';        // Facade encastrée (overlay)

// Position charniere
type PositionCharniere = 'gauche' | 'droite';

// Type de charniere Blum
type TypeCharniere =
  | 'a_visser'         // CLIP top standard
  | 'inserta';         // CLIP top INSERTA (sans outil)

// Marque de charniere
type MarqueCharniere = 'blum' | 'hettich' | 'grass' | 'hafele';
```

---

## Configuration d'un caisson

```typescript
interface ConfigCaisson {
  // Identifiants
  id: string;
  templateId: string | null;      // Si base sur un template
  nom: string;

  // Dimensions globales (inputs utilisateur)
  hauteur: number;                // 200 - 2800 mm
  largeur: number;                // 100 - 2800 mm
  profondeur: number;             // 100 - 2800 mm

  // Epaisseurs
  epaisseurStructure: number;     // 16, 18, 19, 22 mm
  epaisseurFond: number;          // 3, 5, 8 mm
  epaisseurFacade: number;        // 16, 18, 19, 22 mm

  // Panneaux selectionnes
  panneauStructure: PanneauCatalogue | null;
  panneauFond: PanneauCatalogue | null;
  panneauFacade: PanneauCatalogue | null;

  // Configuration fond
  typeFond: TypeFond;
  profondeurRainure?: number;     // Si rainure: 8-15mm

  // Configuration facade
  typeFacade: TypeFacade;
  jeuFacade: number;              // Jeu facade (1-3mm)

  // Charnieres
  positionCharniere: PositionCharniere;
  marqueCharniere: MarqueCharniere;
  typeCharniere: TypeCharniere;
  nombreCharnieres: number;       // Auto-calcule selon hauteur

  // Calculs (generes automatiquement)
  panneaux: PanneauCalcule[];     // Liste des panneaux calcules
}

interface PanneauCalcule {
  id: string;
  nom: string;                    // "Cote gauche", "Panneau superieur"...
  type: 'cote' | 'haut' | 'bas' | 'fond' | 'facade';
  longueur: number;               // mm
  largeur: number;                // mm
  epaisseur: number;              // mm
  quantite: number;
  surfaceM2: number;
  chants: {                       // Chants a plaquer
    A: boolean;
    B: boolean;
    C: boolean;
    D: boolean;
  };
}
```

---

## Formules de calcul (basees sur Blum)

```typescript
// Inputs
const H = hauteur;           // Hauteur totale
const L = largeur;           // Largeur totale
const P = profondeur;        // Profondeur totale
const ep = epaisseurStructure;
const epFond = epaisseurFond;
const jeu = jeuFacade;

// Panneaux structure
const coteGauche  = { longueur: H, largeur: P };
const coteDroit   = { longueur: H, largeur: P };
const panneauHaut = { longueur: L - 2*ep, largeur: P };
const panneauBas  = { longueur: L - 2*ep, largeur: P };

// Fond (selon type)
const fond_applique  = { longueur: H, largeur: L - 2*ep };
const fond_rainure   = { longueur: H - 2*rainure, largeur: L - 2*ep + 2*rainure };

// Facade (selon type)
const facade_applique = { longueur: H - jeu, largeur: L - jeu };
const facade_encastre = { longueur: H - 2*jeu, largeur: L - 2*ep - 2*jeu };

// Nombre charnieres (regle Blum)
const nombreCharnieres =
  H <= 600 ? 2 :
  H <= 1000 ? 3 :
  H <= 1400 ? 4 :
  H <= 1800 ? 5 : 6;
```

---

## Workflow utilisateur

```
1. Selection template    -->  2. Configuration        -->  3. Preview 3D
   [Caisson bas cuisine]      Hauteur: [800] mm            [Canvas 3D]
   [Caisson haut]             Largeur: [500] mm
   [Colonne]                  Profondeur: [522] mm

4. Validation           -->  5. Export                -->  6. Configurateur
   [Recap panneaux]           Auto-creation lignes         [Lignes generees]
   [Recap charnieres]         dans configurateur           [Prix calcules]
```

---

## API Endpoints

```
GET    /api/caissons/templates          # Liste des templates
GET    /api/caissons/templates/:id      # Detail template
POST   /api/caissons/calculate          # Calcul panneaux
POST   /api/caissons/validate           # Validation config
GET    /api/caissons/charnieres         # Liste charnieres dispo
```

---

## Dependances a installer

### Frontend
```bash
cd cutx-frontend
npm install three @react-three/fiber @react-three/drei @types/three
```

### Backend
Aucune dependance supplementaire requise.

---

## Phases de developpement

### Phase 1: Setup (2-3h)
- [x] Structure dossiers
- [ ] Installation dependances
- [ ] Types TypeScript

### Phase 2: Backend (4-5h)
- [ ] Module NestJS
- [ ] Service calculs
- [ ] Templates seed

### Phase 3: Frontend (8-10h)
- [ ] Hook calculs
- [ ] Preview 3D
- [ ] Popup config (4 etapes)
- [ ] Composants etapes

### Phase 4: Integration (3-4h)
- [ ] Context caisson
- [ ] Export vers configurateur
- [ ] Tests integration

### Phase 5: Polish (2-3h)
- [ ] Tests unitaires
- [ ] Documentation
- [ ] Optimisations
