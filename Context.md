# CutX Platform - Context

## Vue d'ensemble

CutX est une plateforme SaaS de gestion de découpe de panneaux pour les professionnels du bois (menuisiers, agenceurs, cuisinistes). Elle permet de créer des listes de découpe, optimiser le placement des pièces sur les panneaux, et générer des devis.

## Architecture

### Monorepo Structure
```
C:\CutX_plateform\
├── cutx-api/          # Backend NestJS + Prisma + PostgreSQL
├── cutx-frontend/     # Frontend Next.js 15 + Clerk Auth
└── Context.md         # Ce fichier
```

### Stack Technique

#### Backend (cutx-api)
- **Framework**: NestJS 11
- **ORM**: Prisma 6
- **Base de données**: PostgreSQL (Railway)
- **Authentification**: Clerk (vérification JWT)
- **Hébergement**: Railway
- **URL Production**: https://cutxplateform-production.up.railway.app

#### Frontend (cutx-frontend)
- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS + Shadcn/ui
- **Authentification**: Clerk
- **Hébergement**: Netlify
- **URL Production**: https://app.cutx.ai

## Catalogue Produits

### Source des données
Le catalogue provient de **La Manufacture de la Finition** (Bouney Agencement), migré depuis Firebase vers PostgreSQL.

### Statistiques du catalogue
- **Total produits**: 2001
- **Marques**: B comme Bois, Egger, Fenix, Formica, Nebodesign, Pfleiderer, Polyrey, Rehau Rauvisio, Unilin
- **Types principaux**: Mélaminé P2/P3, Stratifié HPL, Compact, Chant ABS
- **Catégories**: Unis, Bois, Matières

### API Endpoints Catalogue

```
GET /api/catalogues/bouney/panels?limit=500
    → Retourne les panneaux du catalogue Bouney
    → Response: { panels: ApiPanel[], total: number, page: number, limit: number }

GET /api/catalogues/search?q=terme&limit=100
    → Recherche dans le catalogue
    → Response: { panels: ApiPanel[], total: number }
```

### Format des données API (ApiPanel)
```typescript
interface ApiPanel {
  id: string;
  reference: string;
  name: string;
  description: string | null;
  thickness: number[];          // Ex: [19] ou [8, 16, 19]
  defaultLength: number;        // Ex: 2800
  defaultWidth: number;         // Ex: 2070
  pricePerM2: number;
  material: string;             // Ex: "Mélaminé P2", "Chant ABS"
  finish: string;               // Marque: "Egger", "Polyrey", etc.
  colorCode: string | null;
  imageUrl: string | null;      // Firebase Storage URL
  isActive: boolean;
  category: { id, name, slug };
  createdAt: string;
  updatedAt: string;
}
```

### Transformation Frontend

Le frontend transforme les données API en deux formats selon le composant:

#### CatalogueProduit (PopupSelectionPanneau)
```typescript
// Fichier: src/lib/services/catalogue-api.ts
interface CatalogueProduit {
  id, nom, reference, codeArticle, marque, categorie, sousCategorie,
  type, longueur, largeur, epaisseur, stock, prixAchatM2, prixVenteM2,
  imageUrl, disponible, createdAt, updatedAt
}
```

#### PanneauCatalogue (ConfigurateurV3)
```typescript
// Fichier: src/lib/services/panneaux-catalogue.ts
interface PanneauCatalogue {
  id, nom, categorie, essence, epaisseurs[], prixM2: Record<string, number>,
  fournisseur, disponible, description, ordre, imageUrl
}
```

## Configurateur V3

### Composants principaux
- `ConfigurateurV3.tsx` - Composant principal
- `PopupSelectionPanneau.tsx` - Sélection de panneau depuis le catalogue

### Fonctionnalités
- Import de listes de découpe (Excel, DXF, SketchUp via plugin)
- Sélection de panneaux depuis le catalogue Bouney
- Optimisation de découpe (bin-packing)
- Export PDF/DXF
- Sauvegarde des devis

## Authentification

### Clerk Configuration
```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/configurateur
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/configurateur
```

### Routes protégées
- `/configurateur` - Configurateur de découpe
- `/devis` - Gestion des devis
- `/admin/*` - Administration (admin seulement)

## Déploiement

### Railway (Backend)
- **Dockerfile**: Multi-stage build avec Node 20
- **Port**: 3001 (interne) → 8080 (Railway)
- **Variables d'environnement**:
  - `DATABASE_URL` - PostgreSQL connection string
  - `CLERK_SECRET_KEY` - Pour vérification JWT
  - `PORT=8080`

### Netlify (Frontend)
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Plugin**: `@netlify/plugin-nextjs`

## Scripts utiles

### Backend
```bash
cd cutx-api
npm run start:dev     # Dev avec hot reload
npm run build         # Build production
npx prisma studio     # Interface DB
npx prisma db push    # Sync schema
```

### Frontend
```bash
cd cutx-frontend
npm run dev           # Dev server :3000
npm run build         # Build production
```

## Historique des corrections récentes

### 2024-12-29 - Correction chargement catalogue
1. **Problème**: PopupSelectionPanneau affichait 0 produits
2. **Cause**: `/api/catalogues/search` retourne vide sans terme de recherche
3. **Solution**: Utiliser `/api/catalogues/bouney/panels` quand pas de recherche
4. **Fichier modifié**: `src/lib/services/catalogue-api.ts`

### 2024-12-29 - Correction marques hardcodées
1. **Problème**: Marques affichées incorrectes dans les filtres
2. **Solution**: Mise à jour avec les vraies marques du catalogue
3. **Fichier modifié**: `src/lib/services/catalogue-api.ts`

### 2024-12-29 - Fix Railway Dockerfile
1. **Problème**: Build échouait (nest: not found, Node 18 trop ancien)
2. **Solution**: Node 20, copier src avant npm ci, --ignore-scripts en prod
3. **Fichier modifié**: `cutx-api/Dockerfile`

## Notes techniques

### Images Firebase Storage
Les images sont stockées dans Firebase Storage (projet La Manufacture de la Finition).
URL pattern: `https://firebasestorage.googleapis.com/v0/b/la-manufacture-xxxxx/...`

### Épaisseurs
- **Panneaux**: 8, 10, 12, 16, 18, 19, 22, 25, 28, 30, 38 mm
- **Chants**: 0.4, 0.5, 0.8, 1, 1.3, 2, 3 mm
- **Filtre par défaut**: 19mm (mélaminés standards)

### Catégories de matériaux (mapping)
```typescript
material.includes('mdf') && material.includes('hydro') → 'mdf_hydro'
material.includes('mdf') → 'mdf'
material.includes('aggloméré') → 'agglo_brut' ou 'agglo_plaque'
material.includes('contreplaqué') → 'cp'
material.includes('massif') → 'bois_massif'
default → 'agglo_plaque' (pour mélaminé, stratifié)
```
