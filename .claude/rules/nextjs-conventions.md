# Next.js 15 Conventions - CutX Frontend

Ces conventions s'appliquent aux fichiers dans `cutx-frontend/src/app/` et `cutx-frontend/src/components/`.

## App Router Structure

```
src/app/
├── layout.tsx          # Layout racine (providers, metadata)
├── page.tsx            # Page d'accueil (/)
├── globals.css         # Styles globaux
├── configurateur/
│   └── page.tsx        # /configurateur
├── sign-in/
│   └── [[...sign-in]]/
│       └── page.tsx    # Clerk sign-in
└── api/                # Route handlers (si besoin)
```

## Pages (Server Components par défaut)

```typescript
// app/xxx/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Title | CutX',
  description: 'Description',
};

export default function XxxPage() {
  return <div>...</div>;
}
```

## Client Components

```typescript
// Ajouter 'use client' en première ligne
'use client';

import { useState, useEffect } from 'react';

export default function ClientComponent() {
  const [state, setState] = useState();
  // ...
}
```

## useSearchParams (Suspense obligatoire)

```typescript
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Content() {
  const searchParams = useSearchParams();
  const param = searchParams.get('xxx');
  // ...
}

// OBLIGATOIRE: Wrapper avec Suspense
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}
```

## Fetching Data

```typescript
// Client-side fetch
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

useEffect(() => {
  fetch(`${API_URL}/api/xxx`)
    .then(res => res.json())
    .then(data => setData(data));
}, []);
```

## Components Structure

```
src/components/
├── ui/                 # Composants shadcn/ui
├── configurateur/      # Composants métier configurateur
└── layout/             # Header, Footer, Navigation
```

## File Size Limits (CRITICAL)

### Limites strictes

| Type | Max lignes | Action si dépassé |
|------|------------|-------------------|
| Composant | 300 | Splitter en sous-composants |
| Page | 200 | Extraire vers composants |
| Context | 400 | Splitter par domaine |
| Hook | 200 | Composer plusieurs hooks |

### Avant d'ajouter du code

AVANT d'ajouter plus de 20 lignes à un fichier, Claude DOIT :

1. Vérifier le nombre de lignes actuel (`wc -l` ou compter)
2. Si > 250 lignes : **STOP**, proposer un split AVANT d'ajouter
3. Si > 300 lignes : **REFUSER** d'ajouter, exiger refactoring d'abord

### Signaux d'alerte automatiques

- 5+ useState → Extraire vers custom hook
- 2+ useEffect → Revoir la logique
- JSX répété → Extraire en sous-composant
- Styles inline > 50 lignes → Extraire en CSS module

## Complex Component Structure

Quand un composant dépasse 200 lignes OU a 3+ sections distinctes, créer un dossier :

```
ComponentName/
├── index.tsx              # Composant principal (<150 lignes)
├── components/            # Sous-composants
│   ├── SectionA.tsx
│   ├── SectionB.tsx
│   └── index.ts           # Barrel export
├── hooks/                 # Hooks spécifiques
│   ├── useComponentState.ts
│   └── index.ts
├── types.ts               # Types du composant
└── utils/                 # Helpers
```

### Exemple bon pattern (existant dans le projet)

```
ligne-panneau/
├── index.ts                    # Export barrel
├── LignePanneauGrip.tsx       # Grip drag & drop
├── LignePanneauDimensions.tsx # Inputs dimensions
├── LignePanneauChants.tsx     # Sélection chants
├── LignePanneauActions.tsx    # Boutons actions
└── LigneFinitionRow.tsx       # Ligne finition
```

## Splitting Decision Tree

```
1. Fichier > 250 lignes ?
   OUI → DOIT splitter avant d'ajouter
   NON → Continuer

2. Ajout > 50 lignes ?
   OUI → Résultat > 200 lignes ?
         OUI → Splitter d'abord
         NON → Procéder avec prudence
   NON → Procéder

3. 3+ sections logiques distinctes ?
   OUI → Envisager split proactif
   NON → Procéder

4. Code pattern répété 2+ fois ?
   OUI → Extraire en composant/hook partagé
   NON → Procéder
```

## Response Template - Architecture Check Failed

Quand un fichier dépasse les limites, Claude DOIT répondre avec ce format :

```
⚠️ ARCHITECTURE CHECK

Fichier: [nom]
Actuel: [X] lignes | Limite: 300 lignes

REFACTORING REQUIS avant d'ajouter du code :

Structure proposée:
[dossier]/
├── index.tsx
├── components/
│   ├── [SousComposant1].tsx
│   └── [SousComposant2].tsx
└── hooks/
    └── use[Feature].ts

Procéder avec le refactoring ? (O/n)
```

## Styling

- Tailwind CSS pour tout le styling
- shadcn/ui pour les composants de base
- Classes utilitaires > CSS custom
- Dark mode: utiliser les classes `dark:xxx`

## Images

```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="CutX Logo"
  width={100}
  height={50}
  priority  // Pour images above-the-fold
/>
```

## Environment Variables

```typescript
// Client-side (préfixe NEXT_PUBLIC_)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Server-side seulement
const secret = process.env.CLERK_SECRET_KEY;
```
