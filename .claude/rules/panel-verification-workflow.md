# Workflow : Vérification des Panneaux avec Notes

Ce workflow permet de corriger automatiquement les panneaux qui ont une `verificationNote` contenant un lien vers la fiche produit source.

## Quand utiliser ce workflow

L'utilisateur dit quelque chose comme :
- "J'ai mis des notes sur des panneaux à vérifier"
- "Vérifie les panneaux avec des liens"
- "Corrige les panneaux dans Références à vérifier"

## Étapes du workflow

### 1. Trouver les panneaux avec notes

```bash
cd c:/CutX_plateform/cutx-api && npx ts-node scripts/find-panels-with-notes.ts
```

Ce script affiche :
- ID du panneau
- Référence (BCB-XXXXX)
- Nom actuel
- Note de vérification (URL)

### 2. Accéder aux liens et extraire les infos

Utiliser `WebFetch` sur chaque URL pour extraire :
- **Nom exact** du produit
- **Fabricant** (Polyrey, Egger, Kronospan, etc.)
- **Code décor** (T086, F417, U104, etc.)
- **Nom du décor** (Textus gris, Textile gris, etc.)
- **Code finition** (EXM, ST10, SM, etc.)
- **Type de produit** (Stratifié, Mélaminé, etc.)

### 3. Mettre à jour les panneaux

Créer un script `update-panels-from-notes.ts` avec les données extraites :

```typescript
const panelUpdates = [
  {
    id: 'cmXXXXX',
    reference: 'BCB-XXXXX',
    newData: {
      name: 'Stratifié CODE FINITION Fabricant Décor',
      description: 'Stratifié Fabricant Décor - Finition CODE - Certification',
      manufacturer: 'Fabricant',
      decorCode: 'CODE',
      decorName: 'Nom décor',
      finishCode: 'FINITION',
      productType: 'Stratifié', // ou Mélaminé
    }
  },
  // ... autres panneaux
];
```

### 4. Déplacer vers la bonne catégorie

Catégories de destination typiques :
- **Strat textile** - Stratifiés avec motifs textiles
- **Strat Fantaisie** - Stratifiés unis ou fantaisie
- **Strat Pierre** - Stratifiés effet pierre/béton
- **Strat Bois** - Stratifiés effet bois
- **Décors Bois** - Mélaminés effet bois
- **Décors Unis** - Mélaminés unis
- **Décors Fantaisie** - Mélaminés motifs/textures

### 5. Marquer comme vérifié

```typescript
await prisma.panel.update({
  where: { id: panelId },
  data: {
    ...newData,
    categoryId: destCategoryId,
    verificationNote: null,  // Effacer la note
    reviewStatus: 'VERIFIE'  // Marquer comme vérifié
  }
});
```

## Scripts disponibles

| Script | Description |
|--------|-------------|
| `scripts/find-panels-with-notes.ts` | Liste les panneaux avec verificationNote |
| `scripts/update-panels-from-notes.ts` | Template pour mise à jour batch |
| `scripts/fix-panels-to-verify.ts` | Auto-catégorisation par épaisseur |

## Champs Prisma importants

```prisma
model Panel {
  name             String      // Nom affiché
  description      String?     // Description détaillée
  manufacturer     String?     // Polyrey, Egger, etc.
  decorCode        String?     // T086, F417, etc.
  decorName        String?     // Textus gris, etc.
  finishCode       String?     // EXM, ST10, etc.
  productType      String?     // Stratifié, Mélaminé
  categoryId       String?     // Catégorie de destination
  verificationNote String?     // Lien ou note de vérification
  reviewStatus     PanelReviewStatus  // NON_VERIFIE, VERIFIE, etc.
}
```

## Format de nommage standard

### Stratifiés
```
Stratifié {decorCode} {finishCode} {manufacturer} {decorName}
```
Exemple : `Stratifié T086 EXM Polyrey Textus gris`

### Mélaminés
```
Mélaminé {decorCode} {finishCode} {manufacturer} {decorName}
```
Exemple : `Mélaminé U104 SM Egger Blanc alpin`

## Résumé rapide

1. `find-panels-with-notes.ts` → voir les panneaux à traiter
2. `WebFetch` sur chaque URL → extraire les infos
3. `update-panels-from-notes.ts` → mettre à jour et déplacer
4. Vérifier que "Références à vérifier" est vide
