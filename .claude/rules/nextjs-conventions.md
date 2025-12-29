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
