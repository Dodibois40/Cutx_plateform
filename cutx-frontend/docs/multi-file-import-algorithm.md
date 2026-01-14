# Multi-File Import Algorithm

## Vue d'ensemble

Le workflow multi-fichiers permet d'importer plusieurs fichiers de débit (Excel/DXF), puis d'affecter **chaque fichier à un panneau différent** via le moteur de recherche, le tout **sans quitter la homepage**. Une fois tous les fichiers affectés, un bouton "Configurer" envoie le tout au configurateur CutX.

---

## Structures de données

### ImportedFileData
```typescript
interface ImportedFileData {
  id: string;              // UUID unique
  name: string;            // Nom du fichier
  lines: LignePrestationV3[]; // Lignes de découpe parsées
  foundReference: string | null;
  // Thickness analysis
  thicknessBreakdown: ThicknessBreakdown[];
  primaryThickness: number;   // Épaisseur majoritaire
  isMixedThickness: boolean;
  // Panneau assigné (optionnel)
  assignedPanel?: SearchProduct;
}
```

### GroupConfig (transfert vers configurateur)
```typescript
interface GroupConfig {
  panel: SearchProduct;        // Panneau sélectionné
  lines: LignePrestationV3[];  // Lignes affectées
  sourceFileNames: string[];   // Noms des fichiers sources
}
```

---

## Composants impliqués

| Composant | Rôle |
|-----------|------|
| `useFileImport` | Hook - gestion état fichiers importés + assignation panneaux |
| `HomeSearchBar` | Zone de drop + affichage FileCards + bouton Configurer |
| `FileCard` | Affichage d'un fichier importé avec panneau assigné |
| `PanelActionPopup` | Popup d'affectation panneau → fichier(s) **sans navigation** |
| `ConfigurateurV3` | Réception des groupes |
| `GroupesProvider` | Initialisation des groupes |

---

## Workflow utilisateur

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Upload 3 fichiers                                           │
│     → 3 FileCards apparaissent (orange = pas de panneau)        │
├─────────────────────────────────────────────────────────────────┤
│  2. Recherche "mélaminé blanc"                                  │
│     → Résultats s'affichent                                     │
├─────────────────────────────────────────────────────────────────┤
│  3. Clic sur panneau                                            │
│     → Popup s'ouvre avec fichiers SANS panneau                  │
│     → Coche fichier 1                                           │
│     → "Affecter le panneau"                                     │
│     → FileCard 1 devient VERTE avec panneau affiché             │
│     → RESTE sur homepage                                        │
├─────────────────────────────────────────────────────────────────┤
│  4. Recherche "aggloméré"                                       │
│     → Clic sur panneau                                          │
│     → Popup montre fichiers 2 et 3 (sans panneau)               │
│     → Coche fichier 2                                           │
│     → "Affecter le panneau"                                     │
│     → FileCard 2 devient VERTE                                  │
├─────────────────────────────────────────────────────────────────┤
│  5. Recherche "stratifié"                                       │
│     → Affecte au fichier 3                                      │
│     → Tous les fichiers ont un panneau                          │
│     → Bouton "Configurer la découpe" apparaît                   │
├─────────────────────────────────────────────────────────────────┤
│  6. Clic "Configurer la découpe"                                │
│     → Navigation vers /configurateur?import=multi               │
│     → 3 groupes créés (un par panneau)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Algorithme détaillé

### Phase 1 : Import des fichiers (Homepage)

```
UTILISATEUR drop fichier(s) sur HomeSearchBar
    │
    ▼
useFileImport.processFile(file)
    │
    ├─► Parse Excel/DXF → LignePrestationV3[]
    ├─► Analyse épaisseurs → thicknessAnalysis
    └─► Ajoute à importedFiles[] (assignedPanel = undefined)
    │
    ▼
HomeSearchBar affiche FileCard pour chaque fichier
    │
    ├─► FileCard ORANGE = pas de panneau assigné
    ├─► Affiche: nom, nb pièces, épaisseur
    └─► Texte "Panneau non assigné"
```

### Phase 2 : Recherche et sélection panneau

```
UTILISATEUR tape recherche dans SearchBar
    │
    ▼
API /catalogues/search → résultats panneaux
    │
    ▼
UTILISATEUR clique sur un panneau (ProductCard)
    │
    ▼
PanelActionPopup s'ouvre
    │
    └─► Affiche UNIQUEMENT les fichiers SANS panneau (filesWithoutPanel)
        Label: "Affecter ce panneau à :"
        Checkboxes pour chaque fichier sans panneau
```

### Phase 3 : Affectation panneau → fichier(s)

```
PanelActionPopup
    │
    ▼
UTILISATEUR coche fichier(s) à affecter
    │
    ├─► selectedFileIds: Set<string>
    └─► selectedFiles: ImportedFileData[]
    │
    ▼
UTILISATEUR clique "Affecter le panneau"
    │
    ▼
handleConfirmCutting()
    │
    ├─► Appelle onAssignPanelToFiles(selectedIds, product)
    │       │
    │       └─► useFileImport.assignPanelToFiles(ids, panel)
    │               │
    │               └─► Met à jour importedFiles[].assignedPanel = panel
    │
    └─► Ferme le popup (PAS DE NAVIGATION)
    │
    ▼
Homepage se re-render
    │
    ├─► FileCard du fichier assigné devient VERTE
    ├─► Affiche image + nom + ref du panneau
    └─► filesWithoutPanel diminue de 1
```

### Phase 4 : Tous les fichiers assignés

```
Quand allFilesHavePanel === true
    │
    ▼
HomeSearchBar affiche bouton vert
    │
    └─► "Configurer la découpe (3 fichiers)"
    │
    ▼
UTILISATEUR clique le bouton
    │
    ▼
handleConfigureAll()
    │
    ├─► 1. Récupère filesWithPanel
    │
    ├─► 2. Groupe par panneau (Map<reference, files[]>)
    │       - Fichiers avec même panneau → même groupe
    │
    ├─► 3. Crée GroupConfig[] pour chaque panneau
    │       {
    │         panel: SearchProduct,
    │         lines: [...fichier1.lines, ...fichier2.lines],
    │         sourceFileNames: ['fichier1.xlsx', 'fichier2.xlsx']
    │       }
    │
    ├─► 4. Sauvegarde sessionStorage(MULTI_GROUP_CONFIG_KEY)
    │
    ├─► 5. Reset importedFiles (vide le hook)
    │
    └─► 6. Navigation → /configurateur?import=multi
```

### Phase 5 : Réception dans le configurateur

```
ConfigurateurContent (page configurateur)
    │
    ▼
URL contient ?import=multi
    │
    ├─► isMultiImportMode = true
    └─► Affiche loader
    │
    ▼
useEffect détecte import=multi
    │
    ├─► Lit sessionStorage(MULTI_GROUP_CONFIG_KEY)
    ├─► Parse GroupConfig[]
    ├─► Convertit en InitialGroupeData[]
    ├─► setInitialGroupes(groupesData)
    └─► setIsMultiImportReady(true)
    │
    ▼
ConfigurateurV3 reçoit initialData.initialGroupes
    │
    ▼
GroupesProvider crée N groupes (un par panneau)
```

---

## États visuels des FileCards

| État | Couleur bordure | Couleur fond | Texte |
|------|----------------|--------------|-------|
| Sans panneau | `border-amber-500/30` | `bg-amber-500/10` | "Panneau non assigné" |
| Avec panneau | `border-green-500/40` | `bg-green-500/10` | Image + nom panneau |

---

## Clés sessionStorage

| Clé | Usage |
|-----|-------|
| `cutx_multi_group_config` | GroupConfig[] pour transfert homepage → configurateur |
| `cutx_pending_import_files` | ImportedFileData[] persistés (survit à la navigation) |
| `cutx_homepage_import` | Lignes single-file (mode legacy) |

---

## Hooks et fonctions clés

### useFileImport
```typescript
// État
importedFiles: ImportedFileData[]
filesWithPanel: ImportedFileData[]      // Fichiers avec panneau
filesWithoutPanel: ImportedFileData[]   // Fichiers sans panneau
allFilesHavePanel: boolean              // Tous ont un panneau
someFilesHavePanel: boolean             // Au moins un a un panneau

// Actions
processFile(file: File)                 // Ajoute un fichier
removeFile(fileId: string)              // Supprime un fichier
assignPanelToFile(fileId, panel)        // Assigne panneau à 1 fichier
assignPanelToFiles(fileIds[], panel)    // Assigne panneau à N fichiers
unassignPanel(fileId)                   // Retire l'affectation
resetImport()                           // Vide tout
```

---

## Points d'attention

1. **Pas de navigation pendant l'affectation** : Le popup assigne le panneau et ferme, l'utilisateur reste sur la homepage.

2. **Seuls les fichiers sans panneau** sont montrés dans le popup (`filesWithoutPanel`).

3. **Groupement par panneau** : Si 2 fichiers ont le même panneau, ils sont fusionnés en un seul groupe dans le configurateur.

4. **Persistence** : Les fichiers sont persistés dans sessionStorage pour survivre à un refresh page.

5. **Bouton conditionnel** : Le bouton "Configurer" n'apparaît que quand TOUS les fichiers ont un panneau.
