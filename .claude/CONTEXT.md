# CutX Platform - Contexte Projet

> **LIRE CE FICHIER AU DEBUT DE CHAQUE SESSION**

## Vision

CutX est une plateforme SaaS de configuration et commande de panneaux bois destinée aux professionnels (menuisiers, agenceurs, cuisinistes). L'ambition est de devenir le "ManoMano" de la découpe de panneaux.

## Architecture Globale

```
CutX_plateform/
├── cutx-frontend/          # Next.js 15 + Tailwind + shadcn/ui (Netlify)
├── cutx-api/               # NestJS + Prisma + PostgreSQL (Railway)
├── .claude/                # Contexte pour Claude
└── docs/                   # Documentation

C:\CutX/                    # Plugin SketchUp Ruby (projet séparé)
```

## Déploiement Production

| Service | URL | Hébergement |
|---------|-----|-------------|
| **Frontend** | https://app.cutx.ai | Netlify |
| **Backend API** | https://cutxplateform-production.up.railway.app | Railway |
| **Database** | PostgreSQL | Railway (interne) |
| **Auth** | Clerk | clerk.com |

## Stack Technique

### Frontend (cutx-frontend)
- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: Clerk (@clerk/nextjs)
- **État**: React hooks + localStorage
- **Hébergement**: Netlify

### Backend (cutx-api)
- **Framework**: NestJS 11
- **ORM**: Prisma 6.x
- **Database**: PostgreSQL (Railway)
- **Auth**: Clerk JWT verification (@clerk/backend)
- **Validation**: class-validator
- **Hébergement**: Railway

## Structure API Backend

```
cutx-api/
├── prisma/
│   └── schema.prisma       # Modèles DB
├── src/
│   ├── auth/               # Module Auth (Clerk guard)
│   ├── common/
│   │   ├── decorators/     # @CurrentUser()
│   │   └── guards/         # ClerkAuthGuard
│   ├── users/              # CRUD utilisateurs
│   ├── catalogues/         # Catalogues + Panneaux
│   ├── webhooks/           # Webhook Clerk (sync users)
│   ├── prisma/             # PrismaService (global)
│   └── main.ts             # Bootstrap + CORS
└── .env                    # Variables d'environnement
```

## Endpoints API

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/health` | Non | Health check |
| GET | `/api/users/me` | Oui | Profil utilisateur connecté |
| PUT | `/api/users/me` | Oui | Mise à jour profil |
| GET | `/api/catalogues` | Non | Liste des catalogues |
| GET | `/api/catalogues/:slug` | Non | Détail d'un catalogue |
| GET | `/api/catalogues/:slug/categories` | Non | Catégories d'un catalogue |
| GET | `/api/catalogues/:slug/panels` | Non | Panneaux d'un catalogue |
| GET | `/api/catalogues/search?q=` | Non | Recherche panneaux |
| POST | `/api/webhooks/clerk` | Svix | Webhook Clerk (user sync) |

## Modèles de Données (Prisma)

```prisma
// Users & Organizations
- User (clerkId, email, firstName, lastName, phone, company, role)
- Organization (name, slug, siret, plan, stripeCustomerId)

// Catalogues & Panels
- Catalogue (name, slug, description, logoUrl)
- Category (name, slug, parentId) - hiérarchie
- Panel (reference, name, thickness[], pricePerM2, material, finish)

// Devis & Orders
- Devis (reference, status, clientInfo, totalHT/TTC, lines[])
- DevisLine (panelRef, dimensions, chants, prix)
- Order (reference, status, stripePaymentId, delivery)
```

## Variables d'Environnement

### Frontend (.env.local)
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/configurateur
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/configurateur
NEXT_PUBLIC_API_URL=https://cutxplateform-production.up.railway.app
```

### Backend (.env) - Railway
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NODE_ENV=production
```

## Fonctionnalités Configurateur

### Implémentées ✅
- Import Excel (multiples formats : Bouney, IdeaBois, Debit, etc.)
- Import depuis SketchUp via plugin CutX
- Sélection panneaux (catalogue Bouney)
- Chants (ABS, placage, etc.)
- Finitions (laque RAL, teinte, vernis)
- Optimiseur de découpe (bin-packing)
- Export PDF devis
- Version mobile responsive

### À faire 🚧
- Multi-tenant (organisations)
- Historique commandes
- Suivi production
- Stripe payments (plus tard)
- Wallet prépayé (plus tard)

## État Actuel

- [x] Frontend Next.js déployé (app.cutx.ai)
- [x] Backend NestJS déployé (Railway)
- [x] PostgreSQL configuré (Railway)
- [x] Clerk Auth intégré (frontend + backend)
- [x] Webhook Clerk → sync users PostgreSQL
- [x] CORS configuré
- [x] Migration code configurateur (142 fichiers)
  - [x] 25 composants UI
  - [x] 21 fichiers lib (calculs, types, import, etc.)
  - [x] 80+ fichiers catalogue Bouney
  - [x] 4 services API
  - [x] Design system CSS
- [x] Redirection home → /configurateur
- [x] Plugin SketchUp (C:\CutX)
- [x] Catalogues importés dans PostgreSQL
- [ ] Stripe (paiements) - à faire plus tard

## Commandes Utiles

```bash
# Frontend (dev local)
cd cutx-frontend && npm run dev

# Backend (dev local)
cd cutx-api && npm run start:dev

# Prisma
cd cutx-api && npx prisma studio     # GUI DB
cd cutx-api && npx prisma db push    # Sync schema
cd cutx-api && npx prisma generate   # Generate client

# Git
git add . && git commit -m "message" && git push origin main
# → Déclenche auto-deploy Netlify + Railway
```

## Liens Importants

- **GitHub**: https://github.com/Dodibois40/Cutx_plateform
- **Frontend prod**: https://app.cutx.ai
- **API prod**: https://cutxplateform-production.up.railway.app
- **Clerk Dashboard**: https://dashboard.clerk.com
- **Railway Dashboard**: https://railway.app
- **Netlify Dashboard**: https://app.netlify.com
- **Ancien projet**: C:\Users\doria\Desktop\La_Manufacture_de_la_finition

## Notes pour Claude

### Contexte
- CutX est séparé de "La Manufacture de la Finition"
- Le code configurateur vient de `manufacture-frontend/components/configurateur-v3`
- Le backend est NestJS (pas Express)
- L'auth est Clerk (pas Firebase)

### Quand l'utilisateur dit:
- "On travaille sur CutX" → Lire ce fichier
- "Le configurateur" → `cutx-frontend/src/components/configurateur/`
- "L'API" → `cutx-api/src/`
- "La DB" → PostgreSQL via Prisma
- "Ajoute un endpoint" → Créer controller/service dans cutx-api
- "Le plugin SketchUp" → `C:\CutX/` (projet séparé)

### Attention
- Ne pas confondre avec La_Manufacture_de_la_finition
- Toujours utiliser Clerk pour l'auth (pas de JWT custom)
- CORS déjà configuré pour app.cutx.ai
- Les webhooks Clerk doivent avoir `rawBody: true`

## Prochaines Étapes Possibles

1. **Multi-tenant** - Organisations avec plusieurs utilisateurs
2. **Dashboard admin** - Gestion catalogues, users, commandes
3. **Historique commandes** - Suivi des devis et commandes
4. **Suivi production** - État des commandes en cours
5. **Stripe** - Paiements et abonnements (plus tard)
6. **Wallet prépayé** - Système de crédits (plus tard)
