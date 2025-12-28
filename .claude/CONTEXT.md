# CutX Platform - Contexte Projet

> **LIRE CE FICHIER AU DEBUT DE CHAQUE SESSION**

## Vision

CutX est une plateforme SaaS de configuration et commande de panneaux bois destinée aux professionnels (menuisiers, agenceurs, cuisinistes). L'ambition est de devenir le "ManoMano" de la découpe de panneaux.

## Architecture Globale

```
CutX_plateform/
├── cutx-frontend/          # Next.js 15 + Tailwind + shadcn/ui (Netlify)
├── cutx-api/               # Backend API (Railway) - À CRÉER
├── cutx-sketchup/          # Plugin SketchUp Ruby (C:\CutX\cutx-sketchup)
├── .claude/                # Contexte pour Claude
└── docs/                   # Documentation
```

## Stack Technique

| Composant | Technologie | Hébergement |
|-----------|-------------|-------------|
| Frontend | Next.js 15, TypeScript, Tailwind, shadcn/ui | Netlify |
| Backend | Node.js, Express, Prisma | Railway |
| Base de données | PostgreSQL | Railway |
| Plugin SketchUp | Ruby | Local utilisateur |
| Auth | À définir (Firebase Auth ou custom JWT) |

## Fonctionnalités Principales

### 1. Configurateur de Panneaux
- Import Excel (multiples formats : Bouney, IdeaBois, Debit, etc.)
- Import depuis SketchUp via plugin CutX
- Sélection panneaux (catalogue Bouney, etc.)
- Chants (ABS, placage, etc.)
- Finitions (laque RAL, teinte, vernis)
- Optimiseur de découpe (bin-packing)
- Export PDF devis

### 2. Plugin SketchUp (CutX)
- Extraction automatique des pièces depuis un modèle 3D
- Envoi vers le configurateur web
- Gestion des faces/chants

### 3. Espace Client (futur)
- Historique commandes
- Suivi production
- Wallet prépayé

## Origine du Code

Le configurateur V3 provient de `La_Manufacture_de_la_finition/manufacture-frontend/`:
- `components/configurateur-v3/` → `cutx-frontend/src/components/configurateur/`
- `lib/configurateur-v3/` → `cutx-frontend/src/lib/configurateur/`

## État Actuel

- [x] Projet Next.js initialisé
- [x] shadcn/ui configuré
- [x] Structure de base créée
- [x] **Migration code configurateur (142 fichiers)**
  - [x] 25 composants UI
  - [x] 21 fichiers lib (calculs, types, import, etc.)
  - [x] 80+ fichiers catalogue Bouney
  - [x] 4 services API
  - [x] Design system CSS
- [x] Build passe ✅
- [ ] Backend API (cutx-api) - À CRÉER
- [ ] Auth
- [ ] Multi-tenant
- [ ] Déploiement Netlify

## Commandes Utiles

```bash
# Frontend
cd cutx-frontend && npm run dev

# Build
npm run build
```

## Liens Importants

- **GitHub**: https://github.com/Dodibois40/Cutx_plateform
- **Plugin SketchUp**: C:\CutX\cutx-sketchup
- **Ancien projet**: C:\Users\doria\Desktop\La_Manufacture_de_la_finition

## Notes pour Claude

Quand l'utilisateur dit:
- "On travaille sur CutX" → Lire ce fichier
- "Migre le configurateur" → Copier depuis La_Manufacture_de_la_finition
- "Le plugin" → Fait référence à cutx-sketchup (Ruby)

## Prochaines Étapes Prioritaires

1. Migrer le code configurateur-v3
2. Créer l'API backend (cutx-api)
3. Connecter plugin SketchUp au nouveau frontend
4. Déployer sur Netlify/Railway
