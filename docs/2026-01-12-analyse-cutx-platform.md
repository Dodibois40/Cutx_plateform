# Rapport d'Analyse Approfondie - CutX Platform

**Date:** 12 janvier 2026
**Version:** 1.0
**Auteur:** Claude Code Analysis

---

## Vue d'Ensemble

**CutX** est une plateforme SaaS B2B destinée aux professionnels du bois (menuisiers, agenceurs, cuisinistes) pour la configuration et l'optimisation de découpe de panneaux.

| Aspect | Détails |
|--------|---------|
| **Architecture** | Monorepo : Backend NestJS + Frontend Next.js |
| **Backend** | 12 modules NestJS, Prisma ORM, PostgreSQL |
| **Frontend** | 337+ fichiers, App Router Next.js 15, React 19 |
| **Base de données** | 18 modèles, ~100k+ panneaux, FTS + trigram search |
| **Auth** | Clerk (frontend + backend JWT) |
| **Déploiement** | Railway (API) + Netlify (Frontend) |
| **i18n** | Français + Anglais (next-intl) |

---

## 1. Architecture Globale

```
┌────────────────────────────────────────────────────────────┐
│                   UTILISATEUR FINAL                         │
│                 https://app.cutx.ai                         │
└────────────────────────────────────────────────────────────┘
                          ↕ HTTPS
┌────────────────────────────────────────────────────────────┐
│              FRONTEND (cutx-frontend)                       │
│    Next.js 15 + React 19 + Tailwind + Clerk                │
├────────────────────────────────────────────────────────────┤
│ • Page d'accueil (recherche intelligente)                  │
│ • Configurateur V3 (découpe panneaux)                      │
│ • Import multi-fichiers (DXF/XLSX)                         │
│ • Gestion devis/commandes                                   │
│ • Administration panneaux (review)                          │
└────────────────────────────────────────────────────────────┘
                          ↕ REST API
┌────────────────────────────────────────────────────────────┐
│               BACKEND (cutx-api)                            │
│        NestJS 11 + Prisma 6 + PostgreSQL                   │
├────────────────────────────────────────────────────────────┤
│ 12 Modules: Catalogues, Panels, Devis, Caissons,           │
│ Optimization, PanelsReview, Usinages, Users...             │
└────────────────────────────────────────────────────────────┘
                          ↕ SQL
┌────────────────────────────────────────────────────────────┐
│              PostgreSQL (Railway)                           │
│  18 tables, FTS français + trigram, 50+ index             │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Backend NestJS

### 2.1 Structure des Modules

```
cutx-api/src/
├── app.module.ts              # Module racine
├── prisma/                    # Service Prisma (singleton)
├── auth/                      # Authentification Clerk
├── users/                     # Gestion utilisateurs
├── catalogues/                # Catalogue produits (1647 lignes service)
├── panels/                    # Détails panneaux
├── panels-review/             # Classification & review admin
├── devis/                     # Gestion devis (511 lignes service)
├── caissons/                  # Calcul meubles + export DXF
├── optimization/              # Bin-packing découpe
├── usinages/                  # Templates usinages
├── multicouche-templates/     # Panneaux multicouches
├── cutx-import/               # Import SketchUp
└── webhooks/                  # Webhooks Clerk/Stripe
```

### 2.2 Endpoints Principaux

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Catalogues** | `GET /api/catalogues/smart-search` | Recherche intelligente avec parse |
| | `GET /api/catalogues/autocomplete` | Suggestions rapides |
| | `GET /api/catalogues/filter-options` | Facettes dynamiques |
| **Panels** | `GET /api/panels/:id` | Détails complets panneau |
| | `GET /api/panels/:id/related` | Panneaux liés (même décor) |
| **Devis** | `POST /api/devis` | Créer devis |
| | `POST /api/devis/:id/send` | Envoyer au client |
| | `POST /api/devis/:id/convert` | Convertir en commande |
| **Caissons** | `POST /api/caissons/calculate` | Calcul dimensions |
| | `POST /api/caissons/export/dxf` | Export DXF |
| | `POST /api/caissons/calculate-drillings` | Perçages System32 |
| **Optimization** | `POST /api/optimization/calculate` | Optimisation découpe |
| **PanelsReview** | `GET /api/panels-review/random` | Panel aléatoire à reviewer |
| | `POST /api/panels-review/:id/verify` | Valider classification |

### 2.3 Recherche Intelligente

La recherche utilise **3 stratégies en cascade** :

1. **Full-Text Search PostgreSQL** avec stemming français + unaccent
2. **Trigram Similarity** (pg_trgm) pour fautes de frappe
3. **ILIKE fallback** pour recherche basique

**Exemple:** `"MDF 19 blanc"` → parse automatique type + épaisseur + filtre couleur

### 2.4 Services Majeurs (par taille)

| Service | Lignes | Responsabilité |
|---------|--------|----------------|
| `CataloguesService` | 1647 | Recherche, filtres, suggestions |
| `System32Service` | 591 | Perçage meublier System32 |
| `DevisService` | 511 | Gestion devis/quotes |
| `ExportDxfService` | 460 | Export DXF/SVG |
| `CaissonsService` | 315 | Calcul caissons |
| `PanelsReviewService` | 310 | Vérification qualité |
| `OptimizationService` | 280 | Optimisation découpe |

---

## 3. Frontend Next.js

### 3.1 Structure des Pages (App Router)

```
src/app/[locale]/
├── page.tsx                   # Hub central (673 lignes)
├── configurateur/
│   ├── page.tsx               # Configurateur principal
│   ├── admin/page.tsx         # Admin templates usinage
│   └── optimiseur/page.tsx    # Optimiseur découpe
├── panels-review/page.tsx     # Review admin
├── devis/page.tsx             # Gestion devis
├── produit/[reference]/       # Fiche produit
├── compte/page.tsx            # Profil utilisateur
├── sign-in/                   # Clerk auth
├── sign-up/
├── chutes/                    # Gestion chutes
├── stock/                     # Inventaire
├── communaute/                # Communauté
└── learn/                     # Documentation
```

### 3.2 Composants Principaux

```
src/components/
├── home/
│   ├── HomeSearchBar.tsx          # Input recherche + autocomplete
│   ├── SearchResults.tsx          # Grille résultats + facettes
│   ├── FilterChips.tsx            # Filtres actifs
│   ├── ProductCard/               # Carte produit (Grid/List/Detail)
│   ├── ImportWorkspace/           # Import fichiers
│   │   ├── FilesPanel.tsx
│   │   └── SplitThicknessModal/
│   └── OnboardingGuide/           # Tutoriel interactif
├── configurateur/
│   ├── ligne-panneau/             # Ligne de prestation
│   ├── groupes/                   # Gestion groupes
│   ├── caissons/                  # Composants caissons
│   ├── optimiseur/                # Visualisation optimisation
│   └── dialogs/                   # Modals
└── ui/                            # shadcn/ui components
```

### 3.3 Hooks Customs

| Hook | Lignes | Responsabilité |
|------|--------|----------------|
| `useFileImport` | 812 | Parsing XLSX/DXF, détection format, analyse épaisseurs |
| `useSearchState` | 181 | État recherche + synchronisation URL |
| `useCatalogueSearch` | 146 | React Query + infinite scroll + facettes |
| `useOptimizerBroadcast` | ~50 | Communication BroadcastChannel |
| `useDebounce` | 25 | Debounce générique |

### 3.4 Contexts (State Management)

| Context | Lignes | Rôle |
|---------|--------|------|
| `GroupesContext` | 1213 | Groupes de panneaux + chants niveau groupe |
| `ConfigurateurContext` | 929 | État configurateur + persistence localStorage |
| `PreferencesProvider` | ~100 | Sync preferences Clerk |
| `QueryProvider` | ~50 | Configuration React Query |

### 3.5 Flux Import Multi-Fichier

```
1. Drop fichier (XLSX/DXF)
   ↓
2. Parse & détection format (Bouney, IDEA Bois, DXF)
   ↓
3. Analyse épaisseurs (mixed thickness detection)
   ↓
4. Suggestion panneau depuis filename
   ↓
5. User drag product → assign to file
   ↓
6. "Configure All" → sessionStorage
   ↓
7. Navigate /configurateur?import=multi
   ↓
8. Load GroupConfigs → initialize lignes
```

---

## 4. Base de Données (Prisma)

### 4.1 Modèles Principaux

#### Panel (70+ champs)
```prisma
model Panel {
  // Identité
  id              String    @id @default(cuid())
  reference       String
  name            String

  // Classification
  productType     ProductType?
  panelType       PanelType?
  panelSubType    PanelSubType?
  decorCategory   DecorCategory?
  decorCode       String?
  decorName       String?

  // Dimensions
  thickness       Float[]
  defaultThickness Float?
  defaultLength   Float?
  defaultWidth    Float?

  // Prix
  pricePerM2      Float?
  pricePerMl      Float?
  pricePerUnit    Float?

  // Propriétés
  isHydrofuge     Boolean @default(false)
  isIgnifuge      Boolean @default(false)
  isFullRoll      Boolean @default(false)

  // Review
  reviewStatus    ReviewStatus @default(NON_VERIFIE)
  reviewedAt      DateTime?
  reviewedBy      String?

  // Search
  searchVector    Unsupported("tsvector")?
  searchText      String?

  // Relations
  catalogueId     String
  categoryId      String?

  @@unique([catalogueId, reference])
  @@index([catalogueId, isActive])
  @@index([searchVector], type: Gin)
}
```

#### Devis
```prisma
model Devis {
  id              String      @id @default(cuid())
  reference       String      @unique  // DEV-YYYY-XXXXX
  name            String?
  status          DevisStatus @default(DRAFT)

  // Client
  clientName      String?
  clientEmail     String?
  clientPhone     String?
  clientAddress   String?

  // Pricing
  totalHT         Float       @default(0)
  totalTVA        Float       @default(0)
  totalTTC        Float       @default(0)
  tvaRate         Float       @default(20)

  // Relations
  userId          String
  lines           DevisLine[]
  order           Order?
}
```

#### Cabinet (Configuration meuble)
```prisma
model Cabinet {
  id                  String   @id @default(cuid())
  name                String
  width               Float
  height              Float
  depth               Float

  // Épaisseurs
  structureThickness  Float    @default(19)
  backThickness       Float    @default(8)
  doorThickness       Float    @default(19)

  // Coûts
  totalPanelsHT       Float    @default(0)
  totalEdgingHT       Float    @default(0)
  totalFittingsHT     Float    @default(0)
  totalDrillingHT     Float    @default(0)
  totalHT             Float    @default(0)

  // Relations
  panels              CabinetPanel[]
  fittings            CabinetFitting[]
  drillings           CabinetDrilling[]
}
```

### 4.2 Enums Métier

```prisma
enum ProductType {
  MELAMINE
  STRATIFIE
  MDF
  CONTREPLAQUE
  MASSIF
  AGGLOMERE
  BANDE_DE_CHANT
  PLAN_TRAVAIL
  PANNEAU_TECHNIQUE
  ACCESSOIRE
}

enum DecorCategory {
  UNIS
  BOIS
  PIERRE
  BETON
  METAL
  TEXTILE
  FANTAISIE
  SANS_DECOR
}

enum ReviewStatus {
  NON_VERIFIE
  VERIFIE
  A_CORRIGER
}

enum DevisStatus {
  DRAFT
  SENT
  ACCEPTED
  REJECTED
  EXPIRED
  CONVERTED
}
```

### 4.3 Index et Optimisations

| Type | Détail |
|------|--------|
| **Full-Text Search** | GIN index sur `searchVector` avec stemming français |
| **Trigram Search** | GIN index sur `searchText` avec pg_trgm |
| **Index partiels** | `WHERE isActive = true` pour réduire taille |
| **Index composites** | `catalogueId + productType + isActive` |
| **Triggers** | Auto-fill `defaultThickness`, `searchVector` |
| **Extensions** | `unaccent`, `pg_trgm` |

### 4.4 Migrations Récentes (Janvier 2026)

| Migration | Ajout |
|-----------|-------|
| `20260101` | Full-text search français |
| `20260103` | Accent-tolerant search (unaccent + trigram) |
| `20260106` | Index scalabilité 100k+ produits |
| `20260111` | Support rouleaux (`isFullRoll`) |
| `20260111` | Classification complète + review system |

---

## 5. Stack Technique

### Backend
```
Framework:     NestJS 11.0.1
ORM:           Prisma 6.19.1
Database:      PostgreSQL (Railway)
Auth:          Clerk Backend SDK
Validation:    class-validator, Zod
Cache:         @nestjs/cache-manager (5min TTL)
DXF:           @tarikjabiri/dxf, makerjs
Scraping:      Puppeteer
Webhooks:      Svix
```

### Frontend
```
Framework:     Next.js 16.1.1 (App Router)
React:         19.2.3
Styling:       Tailwind CSS 4, shadcn/ui
Auth:          @clerk/nextjs 6.36.5
Data:          TanStack Query 5.90.16
State:         Zustand 5.0.9, React Context
i18n:          next-intl 4.6.1
Parsing:       xlsx, dxf-parser
3D:            Three.js, @react-three/fiber
PDF:           @react-pdf/renderer
Animation:     framer-motion
```

### Infrastructure
```
Backend:       Railway (Docker multi-stage)
Frontend:      Netlify (@netlify/plugin-nextjs)
Database:      Railway PostgreSQL
CDN:           Netlify Edge
```

---

## 6. Métriques du Projet

| Métrique | Valeur |
|----------|--------|
| **Fichiers Backend** | ~90 TypeScript |
| **Fichiers Frontend** | ~337 TypeScript/TSX |
| **Modèles Prisma** | 18 |
| **Enums Prisma** | 15 |
| **Index DB** | 50+ |
| **Endpoints API** | ~60 |
| **Hooks customs** | ~15 |
| **Plus gros service** | 1647 lignes (CataloguesService) |
| **Plus gros context** | 1213 lignes (GroupesContext) |
| **Scripts utilitaires** | 100+ (scraping, debug, migration) |

---

## 7. Points Forts

### Recherche Performante
- Smart search parse requêtes naturelles ("MDF 19 blanc")
- 3 niveaux de fallback (FTS → trigram → ILIKE)
- Accent-insensitive ("chene" = "chêne")

### Import Intelligent
- Multi-format (XLSX Bouney/IDEA Bois/DXF)
- Détection automatique de format
- Suggestion panneau depuis filename
- Split par épaisseur pour fichiers mixtes

### Système de Groupes
- Un groupe = un panneau + ses lignes
- Chant appliqué au niveau groupe
- Persistance localStorage/sessionStorage

### Quality Control
- Review workflow (NON_VERIFIE → VERIFIE → A_CORRIGER)
- Classification granulaire (70+ champs)
- Dashboard stats admin

### Scalabilité
- 100k+ panneaux supportés
- Index stratégiques (15 sur Panel)
- Cache intelligent
- Pagination + infinite scroll

---

## 8. Recommandations

### Maintenance
1. **CataloguesService** (1647 lignes) : envisager split en sous-services
2. **GroupesContext** (1213 lignes) : extraire hooks spécialisés
3. **Scripts/** : 100+ fichiers de debug à archiver/nettoyer

### Performance
1. Considérer Redis pour le cache (au lieu d'in-memory)
2. Ajouter WebSocket pour collaboration temps réel
3. Implémenter IndexedDB pour mode offline

### Architecture
1. Documenter les flux métier critiques
2. Ajouter des tests E2E (Playwright)
3. Considérer monorepo tools (Turborepo/Nx)

### Sécurité
1. Audit des endpoints publics vs protégés
2. Rate limiting sur les endpoints de recherche
3. Validation des uploads fichiers

---

## 9. Conclusion

CutX est une plateforme mature avec une architecture solide, bien organisée autour de modules NestJS et composants React modulaires. Les conventions de code sont documentées et respectées. Les optimisations de recherche (FTS + trigram) permettent de gérer efficacement un catalogue de 100k+ produits.

Les prochaines évolutions pourraient inclure :
- Mode collaboratif temps réel
- Application mobile (React Native ou PWA avancée)
- Intelligence artificielle pour suggestions de panneaux
- Marketplace entre professionnels

---

*Document généré le 12 janvier 2026*
