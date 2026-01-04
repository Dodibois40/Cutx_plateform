# Design : Multi-panneaux dans le Configurateur CutX

**Date** : 2026-01-04
**Statut** : Validé

## Problème

Un utilisateur importe un DXF de caisson avec 6 parties :
1. Côté gauche
2. Côté droit
3. Haut
4. Bas
5. Fond
6. Façade

Il veut assigner des panneaux différents :
- Parties 1,2,3,4 → Mélaminé U963 19mm
- Partie 5 (fond) → Mélaminé U963 8mm
- Partie 6 (façade) → Agglo plaqué chêne 19mm

Actuellement impossible : un seul panneau par configuration.

---

## Solution : Groupes de panneaux

### Structure UI

```
┌─────────────────────────────────────────────────────────────┐
│ 🟡 Mélaminé U963 19mm - 67,35€/panneau          [▼ expand]  │
├─────────────────────────────────────────────────────────────┤
│   Panneau supérieur    562 x 560    [A][B][C][D]    12,50€  │
│   Panneau inférieur    562 x 560    [A][B][C][D]    12,50€  │
│   Côté gauche          780 x 560    [A][B][C][D]    18,00€  │
│   Côté droit           780 x 560    [A][B][C][D]    18,00€  │
│                                         Sous-total: 61,00€  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🟡 Mélaminé U963 8mm - 62,83€/panneau           [▼ expand]  │
├─────────────────────────────────────────────────────────────┤
│   Dos du corps         758 x 578    [A][B][C][D]     8,00€  │
│                                         Sous-total:  8,00€  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🟡 Agglo chêne 19mm - 158,58€/panneau           [▼ expand]  │
├─────────────────────────────────────────────────────────────┤
│   Porte                778 x 596    [A][B][C][D]    45,00€  │
│                                         Sous-total: 45,00€  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Non assigné (0 lignes)                       [▼ expand]  │
├─────────────────────────────────────────────────────────────┤
│   (vide)                                                    │
└─────────────────────────────────────────────────────────────┘

         [+ Ajouter un panneau]    [+ Ajouter une ligne]

                                              TOTAL: 114,00€
```

### Fonctionnalités

| Action | Comportement |
|--------|--------------|
| + Ajouter un panneau | Ouvre modal catalogue, crée nouveau groupe |
| + Ajouter une ligne | Ajoute ligne dans "Non assigné" |
| Drag & drop ligne | Déplace entre groupes |
| Clic sur header groupe | Collapse/expand |
| Changer panneau d'un groupe | Libre (modal catalogue) |
| Supprimer un groupe | Déplace ses lignes vers "Non assigné" |

### Comportements spéciaux

**Drag vers groupe avec épaisseur différente :**
- Warning : "Attention : épaisseur ligne (19mm) ≠ panneau (8mm). Adapter ?"
- Si oui → épaisseur ligne s'adapte
- Si non → annule le drag

**Optimisation avec lignes non assignées :**
- Warning : "X lignes non assignées seront ignorées. Continuer ?"
- Si oui → optimise seulement les groupes assignés
- Si non → annule

**Import DXF :**
- Toutes les lignes arrivent dans "Non assigné"
- (V2 : détection intelligente pour pré-assigner)

---

## Structure des données

```typescript
interface ConfigurateurState {
  // Groupes de panneaux avec leurs lignes
  groupes: GroupePanneau[];

  // Lignes non encore assignées
  lignesNonAssignees: LigneConfiguration[];

  // Metadata
  referenceChantier: string;
  // ...
}

interface GroupePanneau {
  id: string;
  panneau: PanneauCatalogue | null;
  lignes: LigneConfiguration[];
  isExpanded: boolean;
}

interface LigneConfiguration {
  id: string;
  reference: string;
  longueur: number;
  largeur: number;
  epaisseur: number;
  quantite: number;
  chants: { A: boolean; B: boolean; C: boolean; D: boolean };
  forme: FormeType;
  usinages: Usinage[];
  percages: Percage[];
  finition: Finition | null;
}
```

---

## Tarification

3 niveaux d'affichage :
1. **Par ligne** : prix individuel à droite de chaque ligne
2. **Par groupe** : sous-total en bas de chaque groupe
3. **Global** : total en bas du configurateur

---

## Améliorations futures (V2)

- [ ] Sélection multiple de lignes (checkboxes)
- [ ] "Assigner sélection à..." → dropdown rapide
- [ ] Raccourcis clavier (Ctrl+A, Ctrl+Click, Shift+Click)
- [ ] Filtres / recherche dans les lignes
- [ ] Détection intelligente à l'import DXF (fond=8mm, façade=différent, etc.)
- [ ] Templates de caisson pré-configurés

---

## Implémentation

### Fichiers à modifier

1. `cutx-frontend/src/contexts/ConfigurateurContext.tsx` - Nouveau state structure
2. `cutx-frontend/src/components/configurateur/ConfigurateurV3.tsx` - UI groupes
3. `cutx-frontend/src/components/configurateur/GroupePanneau.tsx` - Nouveau composant
4. `cutx-frontend/src/components/configurateur/LigneConfiguration.tsx` - Adapter pour drag
5. `cutx-frontend/src/lib/configurateur/import/index.ts` - Import vers "Non assigné"

### Dépendances

- `@dnd-kit/core` et `@dnd-kit/sortable` pour le drag & drop
