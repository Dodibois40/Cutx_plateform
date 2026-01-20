# CutX Marketplace Chutes - Document de Conception

## Vision du Projet

**Le Bon Coin des chutes de panneaux de bois** - Un marketplace intelligent, moderne et géolocalisé permettant aux professionnels et particuliers de vendre et acheter des chutes de panneaux de bois (mélaminé, MDF, stratifié, contreplaqué, etc.).

### Objectifs Principaux
- Réduire le gaspillage de matériaux de qualité
- Créer une économie circulaire dans le secteur du bois
- Connecter vendeurs et acheteurs géographiquement proches
- Valoriser les chutes avec un système de prix intelligent

---

## 1. Architecture Technique Existante (Points d'Ancrage)

### Ce qu'on peut réutiliser

| Composant | Existant | Utilisation pour Chutes |
|-----------|----------|------------------------|
| **Authentication** | Clerk (JWT) | Authentification vendeurs/acheteurs |
| **Organisation** | address, city, postalCode | Géolocalisation native |
| **Categories** | Arborescence 5 niveaux | Navigation par type de panneau |
| **Search** | PostgreSQL full-text + pg_trgm | Recherche intelligente |
| **Images** | Cloudflare R2 | Stockage photos chutes |
| **Paiements** | Stripe | Transactions sécurisées |
| **Devis/Orders** | Workflow complet | Base pour transactions |

### Nouveaux Modèles à Créer

```prisma
// À ajouter dans schema.prisma

model ChuteOffering {
  id                String   @id @default(cuid())

  // Vendeur
  sellerId          String
  seller            User     @relation(fields: [sellerId], references: [id])

  // Produit source (optionnel - si lié au catalogue)
  sourcePanelId     String?
  sourcePanel       Panel?   @relation(fields: [sourcePanelId], references: [id])

  // Caractéristiques de la chute
  title             String
  description       String?  @db.Text
  productType       ProductType
  material          String?          // Ex: "Chêne", "Blanc", "U963"
  thickness         Float            // mm
  length            Float            // mm
  width             Float            // mm
  quantity          Int      @default(1)

  // État & Certification
  condition         ChuteCondition
  certifiedIntact   Boolean  @default(false)
  certificationDate DateTime?
  certificationNote String?

  // Prix
  pricePerUnit      Float
  originalPrice     Float?           // Prix neuf de référence
  acceptsOffers     Boolean  @default(true)
  minimumOffer      Float?           // Offre minimum acceptée

  // Promotion/Visibilité
  boostLevel        BoostLevel @default(NONE)
  boostExpiresAt    DateTime?
  boostPriority     Int       @default(0)

  // Géolocalisation
  latitude          Float?
  longitude         Float?
  city              String
  postalCode        String
  departement       String?

  // Images
  images            ChuteImage[]

  // Statut
  status            OfferingStatus @default(ACTIVE)
  viewCount         Int      @default(0)
  favoriteCount     Int      @default(0)

  // Catégorie (liée à l'arborescence CutX)
  categoryId        String?
  category          Category? @relation(fields: [categoryId], references: [id])

  // Timestamps
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  expiresAt         DateTime?
  soldAt            DateTime?

  // Relations
  offers            ChuteOffer[]
  messages          ChuteMessage[]
  favorites         ChuteFavorite[]
  viewLogs          ChuteViewLog[]

  // Recherche full-text
  searchVector      Unsupported("tsvector")?
  searchText        String?  @db.Text

  @@index([sellerId])
  @@index([categoryId])
  @@index([postalCode])
  @@index([status, boostLevel])
  @@index([productType, thickness])
}

enum ChuteCondition {
  PARFAIT      // Aucun défaut
  BON          // Légères marques, utilisable
  CORRECT      // Quelques défauts visibles
  A_NETTOYER   // Poussière/colle à nettoyer
}

enum OfferingStatus {
  DRAFT        // Brouillon
  ACTIVE       // En vente
  RESERVED     // Réservée (négociation en cours)
  SOLD         // Vendue
  EXPIRED      // Expirée
  ARCHIVED     // Archivée par le vendeur
}

enum BoostLevel {
  NONE         // Gratuit - 5% commission
  STANDARD     // 2€/semaine - 8% commission - Badge "Boost"
  PREMIUM      // 5€/semaine - 10% commission - Top des recherches
  URGENT       // 10€/semaine - 12% commission - Bannière "Vente urgente"
}

model ChuteImage {
  id            String @id @default(cuid())
  offeringId    String
  offering      ChuteOffering @relation(fields: [offeringId], references: [id], onDelete: Cascade)
  url           String
  thumbnailUrl  String?
  order         Int    @default(0)
  isPrimary     Boolean @default(false)
  createdAt     DateTime @default(now())
}

model ChuteOffer {
  id            String @id @default(cuid())
  offeringId    String
  offering      ChuteOffering @relation(fields: [offeringId], references: [id])
  buyerId       String
  buyer         User   @relation(fields: [buyerId], references: [id])

  amount        Float
  message       String? @db.Text
  status        OfferStatus @default(PENDING)

  createdAt     DateTime @default(now())
  respondedAt   DateTime?
  expiresAt     DateTime // 48h par défaut

  @@index([offeringId])
  @@index([buyerId])
}

enum OfferStatus {
  PENDING      // En attente de réponse
  ACCEPTED     // Acceptée
  REJECTED     // Refusée
  COUNTER      // Contre-offre
  EXPIRED      // Expirée
  CANCELLED    // Annulée
}

model ChuteMessage {
  id            String @id @default(cuid())
  offeringId    String
  offering      ChuteOffering @relation(fields: [offeringId], references: [id])
  senderId      String
  sender        User   @relation(fields: [senderId], references: [id])
  recipientId   String

  content       String @db.Text
  isRead        Boolean @default(false)

  createdAt     DateTime @default(now())

  @@index([offeringId])
  @@index([senderId])
  @@index([recipientId])
}

model ChuteFavorite {
  userId        String
  offeringId    String
  user          User   @relation(fields: [userId], references: [id])
  offering      ChuteOffering @relation(fields: [offeringId], references: [id])
  createdAt     DateTime @default(now())

  @@id([userId, offeringId])
}

model ChuteViewLog {
  id            String @id @default(cuid())
  offeringId    String
  offering      ChuteOffering @relation(fields: [offeringId], references: [id])
  userId        String?
  ipHash        String?
  viewedAt      DateTime @default(now())

  @@index([offeringId, viewedAt])
}

model SellerProfile {
  id              String @id @default(cuid())
  userId          String @unique
  user            User   @relation(fields: [userId], references: [id])

  // Infos publiques
  displayName     String
  bio             String? @db.Text
  avatarUrl       String?

  // Stats
  totalSales      Int    @default(0)
  totalRevenue    Float  @default(0)
  averageRating   Float?
  responseRate    Float? // % de réponses aux messages
  responseTime    Int?   // Temps moyen en heures

  // Vérification
  isVerified      Boolean @default(false)
  verifiedAt      DateTime?
  identityCheck   Boolean @default(false)

  // Préférences
  acceptsPickup   Boolean @default(true)
  acceptsShipping Boolean @default(false)
  shippingInfo    String? @db.Text

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model SellerReview {
  id            String @id @default(cuid())
  sellerId      String
  reviewerId    String
  transactionId String?

  rating        Int    // 1-5
  comment       String? @db.Text

  // Aspects notés
  qualityRating     Int? // Qualité conforme à l'annonce
  communicationRating Int? // Réactivité
  packagingRating   Int? // Emballage (si envoi)

  isVerifiedPurchase Boolean @default(false)

  createdAt     DateTime @default(now())

  @@index([sellerId])
}
```

---

## 2. Fonctionnalités Core

### 2.1 Publication d'Annonces (Vendeur)

#### Flux de création
```
1. Type de panneau → Arborescence CutX (auto-détection catégorie)
2. Dimensions → Longueur, largeur, épaisseur
3. État → Parfait / Bon / Correct / À nettoyer + certification
4. Photos → Min 1, max 10 (avec guidelines de qualité)
5. Prix → Suggestion automatique + prix libre + "Accepte les offres"
6. Localisation → Auto-détection ou saisie manuelle
7. Options boost → Gratuit / Standard / Premium / Urgent
```

#### Suggestion de prix intelligente

```typescript
// Algorithme de suggestion de prix
interface PriceSuggestion {
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  factors: {
    originalPanelPrice: number;    // Prix neuf du panneau source
    surfaceRatio: number;          // % de surface restante
    conditionMultiplier: number;   // 0.8-1.0 selon état
    demandScore: number;           // Popularité du matériau
    localSupply: number;           // Offre locale (+ offre = - prix)
  };
}

// Facteurs de réduction selon état
const CONDITION_MULTIPLIERS = {
  PARFAIT: 1.0,
  BON: 0.85,
  CORRECT: 0.65,
  A_NETTOYER: 0.50
};

// Prix suggéré = Original × (Surface chute / Surface panneau) × État × Demande
```

### 2.2 Certification Qualité

#### Niveaux de certification

| Badge | Signification | Comment l'obtenir |
|-------|---------------|-------------------|
| **Non certifié** | Déclaratif vendeur | Par défaut |
| **Auto-certifié** | Vendeur a checké la checklist | Cocher les 5 points |
| **Photo-certifié** | Photos haute qualité | 4+ photos avec règles |
| **Vérifié CutX** | Équipe CutX a validé | Vendeurs Pro uniquement |

#### Checklist auto-certification
```markdown
□ Aucune rayure visible sur les faces
□ Aucun éclat sur les chants
□ Pas de trace de colle ou adhésif
□ Dimensions mesurées avec précision (±2mm)
□ Stockage à plat, non gondolé
```

### 2.3 Système de Négociation (Style Le Bon Coin)

#### Flux de négociation
```
Acheteur                          Vendeur
    │                                 │
    ├─── Fait une offre (80€) ──────►│
    │                                 │
    │◄── Contre-offre (90€) ──────────┤
    │    ou Accepte/Refuse            │
    │                                 │
    ├─── Accepte (90€) ──────────────►│
    │                                 │
    │◄── Transaction créée ───────────┤
```

#### Règles de négociation
- Offre expire après 48h sans réponse
- Maximum 3 contre-offres par négociation
- Vendeur peut définir une offre minimum
- Historique des négociations visible (anonymisé)

### 2.4 Messagerie Intégrée

```typescript
// Fonctionnalités messagerie
interface MessagingFeatures {
  realtime: boolean;           // WebSocket pour temps réel
  quickReplies: string[];      // "Toujours disponible", "Vendu", etc.
  imageSharing: boolean;       // Envoyer photos supplémentaires
  locationSharing: boolean;    // Partager point de RDV
  offerIntegration: boolean;   // Faire une offre depuis le chat
}
```

---

## 3. Recherche & Navigation

### 3.1 Arborescence Intelligente (Héritée de CutX)

L'arborescence se construit **dynamiquement** basée sur les chutes disponibles :

```
🏠 Marketplace Chutes
├── 📦 Mélaminés (234)
│   ├── Blancs (89)
│   │   ├── Mat (45)
│   │   └── Brillant (44)
│   ├── Gris (67)
│   ├── Bois (52)
│   │   ├── Chêne (28)
│   │   ├── Noyer (15)
│   │   └── Autres essences (9)
│   └── Couleurs (26)
├── 📦 MDF (156)
│   ├── Brut (98)
│   │   ├── 16mm (45)
│   │   ├── 19mm (38)
│   │   └── Autres (15)
│   └── Laqué (58)
├── 📦 Contreplaqués (87)
│   ├── Peuplier (34)
│   ├── Bouleau (29)
│   └── Okoumé (24)
├── 📦 Stratifiés (45)
├── 📦 Agglomérés (78)
└── 📦 Autres (23)
```

#### Logique de construction
```typescript
// L'arborescence n'affiche que les catégories avec des chutes disponibles
async function buildDynamicTree() {
  // 1. Récupérer toutes les catégories parentes de chutes actives
  const activeChuteCategories = await prisma.chuteOffering.groupBy({
    by: ['categoryId'],
    where: { status: 'ACTIVE' },
    _count: true
  });

  // 2. Remonter la hiérarchie pour chaque catégorie
  // 3. Construire l'arbre avec les compteurs
  // 4. Cacher les branches vides
}
```

### 3.2 Recherche Intelligente (Smart Search)

Réutiliser le parser existant + extensions :

```typescript
// Exemples de requêtes comprises
"mélaminé blanc 19mm" → { productType: MELAMINE, color: 'blanc', thickness: 19 }
"chêne 50x80 près de Lyon" → { material: 'chêne', dims: [50, 80], location: 'Lyon' }
"mdf moins de 20€" → { productType: MDF, priceMax: 20 }
"lot aggloméré" → { productType: AGGLOMERE, isBundle: true }
```

### 3.3 Filtres Avancés

```typescript
interface ChuteSearchFilters {
  // Produit
  productTypes: ProductType[];
  thicknessRange: { min?: number; max?: number };
  materials: string[];

  // Dimensions
  lengthRange: { min?: number; max?: number };
  widthRange: { min?: number; max?: number };
  minSurface: number; // m²

  // Prix
  priceRange: { min?: number; max?: number };
  acceptsOffers: boolean;

  // État
  conditions: ChuteCondition[];
  certifiedOnly: boolean;

  // Vendeur
  verifiedSellersOnly: boolean;
  minSellerRating: number;

  // Localisation
  postalCode: string;
  radius: number; // km
  // OU
  departements: string[];

  // Tri
  sortBy: 'price_asc' | 'price_desc' | 'date_desc' | 'distance' | 'popularity' | 'boost';

  // Pagination
  page: number;
  limit: number;
}
```

### 3.4 Recherche par Carte

```typescript
// Intégration carte (Mapbox ou Google Maps)
interface MapSearch {
  center: { lat: number; lng: number };
  zoom: number;
  bounds: {
    ne: { lat: number; lng: number };
    sw: { lat: number; lng: number };
  };
  clusters: boolean; // Grouper les marqueurs proches
}
```

---

## 4. Géolocalisation

### 4.1 Source de Données

- **Organisation** : address, city, postalCode (existant)
- **Coordonnées** : latitude, longitude (à ajouter)
- **API Géocodage** : api-adresse.data.gouv.fr (gratuit, FR)

### 4.2 Calcul de Distance

```typescript
// Formule Haversine pour distance entre 2 points
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Rayon Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

### 4.3 Recherche par Rayon

```sql
-- Recherche dans un rayon de X km (PostgreSQL)
SELECT *,
  (6371 * acos(
    cos(radians(:userLat)) * cos(radians(latitude)) *
    cos(radians(longitude) - radians(:userLng)) +
    sin(radians(:userLat)) * sin(radians(latitude))
  )) AS distance
FROM "ChuteOffering"
WHERE status = 'ACTIVE'
HAVING distance < :radiusKm
ORDER BY distance;
```

### 4.4 Options de Rayon

| Option | Description |
|--------|-------------|
| 10 km | Quartier |
| 25 km | Ville |
| 50 km | Agglomération |
| 100 km | Département |
| 200 km | Région |
| France | Tout le pays |

---

## 5. Système de Tarification & Commissions

### 5.1 Modèle Économique

```
                    VENDEUR                    CUTX                    ACHETEUR
                       │                         │                         │
Prix affiché: 100€     │                         │                         │
                       │                         │                         │
Vente réalisée         ├────────────────────────►│◄────────────────────────┤
                       │                         │      Paie: 100€         │
                       │                         │                         │
Commission CutX        │◄────── 5-12% ───────────┤                         │
(selon boost)          │                         │                         │
                       │                         │                         │
Vendeur reçoit:        │      88-95€             │                         │
```

### 5.2 Grille de Commissions

| Niveau | Commission | Avantages |
|--------|------------|-----------|
| **Gratuit** | 5% | Publication standard |
| **Boost Standard** (2€/sem) | 8% | Badge "Boost" + priorité recherche |
| **Boost Premium** (5€/sem) | 10% | Top des résultats + notifications acheteurs |
| **Vente Urgente** (10€/sem) | 12% | Bannière rouge + push notification + email |

### 5.3 Options Supplémentaires

```typescript
interface ListingOptions {
  // Visibilité
  boost: BoostLevel;
  featuredInCategory: boolean;  // 3€/semaine - En vedette dans sa catégorie

  // Notifications
  alertBuyers: boolean;         // 1€ - Notifier acheteurs intéressés par ce type

  // Renouvellement
  autoRenew: boolean;           // Renouveler automatiquement après 30j
  extendDuration: number;       // 60j au lieu de 30j (+1€)
}
```

### 5.4 Paiements Vendeur

- Paiement Stripe Connect (compte vendeur lié)
- Délai de versement : 7 jours après confirmation acheteur
- Minimum de retrait : 10€
- Frais Stripe : inclus dans la commission CutX

---

## 6. Interface Utilisateur

### 6.1 Pages à Créer

```
/chutes                           # Marketplace principal
/chutes/[id]                      # Détail annonce
/chutes/vendre                    # Créer une annonce
/chutes/mes-annonces              # Gérer mes annonces
/chutes/mes-favoris               # Mes favoris
/chutes/mes-offres                # Mes offres envoyées/reçues
/chutes/messages                  # Messagerie
/chutes/vendeur/[id]              # Profil vendeur public
/chutes/mon-profil-vendeur        # Mon profil vendeur
```

### 6.2 Composants Principaux

#### Header Marketplace
```
┌─────────────────────────────────────────────────────────────────────┐
│  🏠 CutX                    [🔍 Recherche...          ] [📍 Lyon]   │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 📦 Mélaminé ▼  │ 📐 Dimensions  │ 💰 Prix  │ 📊 État  │ 🔄 Tri ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

#### Carte Produit (Style Le Bon Coin)
```
┌────────────────────────────────────────┐
│  [IMAGE PRINCIPALE]                    │
│  ┌────────┐                            │
│  │ URGENT │  ← Badge boost             │
│  └────────┘                            │
│  ♥ 12      👁 234                       │
├────────────────────────────────────────┤
│  Mélaminé Blanc Mat 19mm               │
│  120 × 80 cm                           │
│                                        │
│  💰 35€         📍 Lyon (69)    12km   │
│                                        │
│  ⭐ 4.8 (23 avis)  ✓ Certifié intact  │
│                                        │
│  [💬 Contacter]  [💵 Faire une offre]  │
└────────────────────────────────────────┘
```

#### Fiche Détaillée
```
┌───────────────────────────────────────────────────────────────────────┐
│  ← Retour                                                             │
├────────────────────────────┬──────────────────────────────────────────┤
│                            │  Mélaminé Blanc Mat Egger U104           │
│  [GALERIE PHOTOS]          │                                          │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐      │  💰 35€  (Prix neuf ~85€/m² = 81€)       │
│  │1 │ │2 │ │3 │ │4 │      │                                          │
│  └──┘ └──┘ └──┘ └──┘      │  📐 120 × 80 cm • 19mm                   │
│                            │  📦 Type: Mélaminé                       │
│                            │  🎨 Finition: Mat                        │
│                            │                                          │
│                            │  ✅ Certifié intact                      │
│                            │  • Aucune rayure                         │
│                            │  • Chants parfaits                       │
│                            │                                          │
│                            │  📍 Lyon 3ème (69003) - 12 km            │
│                            │                                          │
│                            │  ┌─────────────────────────────────────┐ │
│                            │  │ [💵 Faire une offre]  [💬 Message] │ │
│                            │  │                                     │ │
│                            │  │ [❤️ Favoris]  [🔗 Partager]        │ │
│                            │  └─────────────────────────────────────┘ │
├────────────────────────────┴──────────────────────────────────────────┤
│  VENDEUR                                                              │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  [Avatar]  Menuiserie Dupont  ✓ Vérifié                        │   │
│  │            ⭐ 4.8 (47 avis) • Répond en ~2h • 95% réponse      │   │
│  │            Membre depuis Mars 2024 • 23 ventes                 │   │
│  │            [Voir le profil]  [Voir ses annonces (8)]           │   │
│  └────────────────────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────────────────┤
│  📝 DESCRIPTION                                                       │
│  Chute de mélaminé blanc mat Egger U104, reste d'un projet de        │
│  cuisine. Parfait état, stocké à plat. Idéal pour étagère ou         │
│  petits projets.                                                      │
├───────────────────────────────────────────────────────────────────────┤
│  📍 LOCALISATION                                                      │
│  [MINI CARTE]  Lyon 3ème (69003)                                     │
│                Retrait sur place uniquement                           │
├───────────────────────────────────────────────────────────────────────┤
│  💡 ANNONCES SIMILAIRES                                               │
│  [Card] [Card] [Card] [Card]                                         │
└───────────────────────────────────────────────────────────────────────┘
```

### 6.3 Vue Mobile

```
┌─────────────────────┐
│ 🔍 Chutes près de...│
│ [Lyon] [10 km ▼]    │
├─────────────────────┤
│ Filtres: Type ▼     │
├─────────────────────┤
│┌───────────────────┐│
││ [IMG]             ││
││ Mélaminé blanc    ││
││ 35€  📍 5km       ││
│└───────────────────┘│
│┌───────────────────┐│
││ [IMG]             ││
││ MDF 19mm          ││
││ 15€  📍 8km       ││
│└───────────────────┘│
│        ...          │
├─────────────────────┤
│ [+] Vendre une chute│
└─────────────────────┘
```

---

## 7. Fonctionnalités Avancées

### 7.1 Alertes & Notifications

```typescript
interface ChuteAlert {
  id: string;
  userId: string;

  // Critères de l'alerte
  criteria: {
    productTypes?: ProductType[];
    thicknessRange?: { min?: number; max?: number };
    priceMax?: number;
    postalCode?: string;
    radius?: number;
    keywords?: string[];
  };

  // Fréquence
  frequency: 'INSTANT' | 'DAILY' | 'WEEKLY';

  // Canaux
  email: boolean;
  push: boolean;

  isActive: boolean;
}
```

### 7.2 Lots (Bundles)

```typescript
interface ChuteBundle {
  id: string;
  sellerId: string;
  title: string; // "Lot fin de chantier cuisine"

  items: {
    offeringId?: string;  // Lié à une annonce existante
    description: string;
    dimensions: string;
    quantity: number;
  }[];

  bundlePrice: number;      // Prix total du lot
  individualTotal: number;  // Somme des prix individuels
  discount: number;         // % de réduction
}
```

### 7.3 Historique de Prix

```typescript
// Afficher l'historique des prix pour le même type de chute
interface PriceHistory {
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  pricePerM2: number;
  salesCount: number;
  period: '7d' | '30d' | '90d';
}
```

### 7.4 Statistiques Vendeur

```typescript
interface SellerDashboard {
  // Vue d'ensemble
  activeListings: number;
  totalViews: number;
  totalFavorites: number;
  messagesUnread: number;

  // Performance
  salesThisMonth: number;
  revenueThisMonth: number;
  conversionRate: number; // vues → ventes

  // Comparaison
  avgPriceVsMarket: number; // +/-% par rapport au marché
  avgTimeToSell: number;    // jours

  // Recommandations
  suggestions: {
    type: 'BOOST' | 'PRICE_DROP' | 'ADD_PHOTOS' | 'RENEW';
    listingId: string;
    message: string;
  }[];
}
```

---

## 8. Intégration avec CutX Existant

### 8.1 Import depuis Optimisation

Quand l'utilisateur fait une découpe dans le configurateur, proposer de vendre les chutes :

```typescript
// Après optimisation, afficher les chutes générées
interface OptimizationResult {
  panels: CuttingPlan[];
  offcuts: {
    sourcePanel: Panel;
    dimensions: { length: number; width: number };
    estimatedValue: number;
    suggestedPrice: number;
  }[];
}

// Bouton "Vendre ces chutes sur le marketplace"
function createListingsFromOffcuts(offcuts: Offcut[]) {
  // Pré-remplir les formulaires avec les données de l'optimisation
}
```

### 8.2 Recherche Unifiée

Option dans la recherche principale :

```
[🔍 mélaminé blanc 19mm                    ]
    ┌─────────────────────────────────────┐
    │ 📦 Catalogue CutX (45 résultats)    │
    │ ♻️ Chutes Marketplace (12 résultats)│  ← Toggle
    └─────────────────────────────────────┘
```

### 8.3 Suggestions Croisées

```
Vous recherchez : Mélaminé Blanc U104 19mm (85€/m²)
┌────────────────────────────────────────────────────┐
│ 💡 Économisez ! 3 chutes disponibles près de vous: │
│    • 120×80cm à 35€ (12km) - Économie: 46€         │
│    • 60×40cm à 12€ (8km) - Économie: 8€            │
└────────────────────────────────────────────────────┘
```

---

## 9. Sécurité & Modération

### 9.1 Vérification Vendeur

| Niveau | Exigences | Avantages |
|--------|-----------|-----------|
| **Basique** | Email vérifié | Peut publier |
| **Confirmé** | Téléphone vérifié | Badge |
| **Vérifié** | Pièce d'identité | Badge vert |
| **Pro** | SIRET + docs | Badge Pro + limites relevées |

### 9.2 Modération Contenu

```typescript
interface ModerationRules {
  // Auto-modération
  bannedWords: string[];
  minPhotoQuality: number; // résolution minimum
  maxPhotoSize: number;    // MB

  // Limites
  maxActiveListings: {
    FREE: 5,
    VERIFIED: 20,
    PRO: 100
  };

  // Signalements
  reportThreshold: number; // Signalements avant review manuel
}
```

### 9.3 Anti-Fraude

- Détection de prix anormalement bas
- Vérification des photos (reverse image search)
- Historique des transactions douteuses
- Blocage des comptes multi-comptes

---

## 10. Roadmap de Développement

### Phase 1 : MVP (4-6 semaines)
- [ ] Modèles de données Prisma
- [ ] CRUD annonces basique
- [ ] Upload photos (R2)
- [ ] Recherche simple + filtres
- [ ] Géolocalisation basique
- [ ] Page liste + détail

### Phase 2 : Core Features (4-6 semaines)
- [ ] Système de négociation
- [ ] Messagerie vendeur/acheteur
- [ ] Système de boost/promotion
- [ ] Profils vendeurs
- [ ] Favoris & alertes

### Phase 3 : Avancé (4-6 semaines)
- [ ] Arborescence dynamique
- [ ] Recherche avancée (carte, rayon)
- [ ] Système d'avis/notation
- [ ] Dashboard vendeur
- [ ] Paiement intégré (Stripe Connect)

### Phase 4 : Optimisation (2-4 semaines)
- [ ] Import depuis optimiseur CutX
- [ ] Suggestions croisées catalogue/chutes
- [ ] Analytics avancés
- [ ] App mobile (PWA)
- [ ] Intégration logistique (envoi)

---

## 11. KPIs & Métriques

### Métriques Business
- GMV (Gross Merchandise Value)
- Commission moyenne
- Nombre d'annonces actives
- Taux de conversion (vues → ventes)
- Temps moyen de vente
- Panier moyen

### Métriques Utilisateur
- DAU/MAU (Daily/Monthly Active Users)
- Taux de rétention
- NPS (Net Promoter Score)
- Temps passé sur la plateforme
- Taux de réponse aux messages

### Métriques Techniques
- Temps de chargement pages
- Taux d'erreur API
- Uptime
- Conversion mobile

---

## 12. Résumé des Idées Clés

### Différenciateurs vs Concurrence

| Feature | Le Bon Coin | Facebook | CutX Chutes |
|---------|-------------|----------|-------------|
| Spécialisation bois | ❌ | ❌ | ✅ |
| Certification qualité | ❌ | ❌ | ✅ |
| Prix suggéré intelligent | ❌ | ❌ | ✅ |
| Lien avec configurateur | ❌ | ❌ | ✅ |
| Arborescence technique | ❌ | ❌ | ✅ |
| Import depuis devis | ❌ | ❌ | ✅ |

### Points Forts à Développer

1. **Expertise métier** - Connaître le bois (essences, finitions, qualités)
2. **Intégration verticale** - Lien configurateur → chutes → vente
3. **Certification unique** - Garantir la qualité des chutes
4. **Communauté pro** - Menuisiers, ébénistes, agenceurs
5. **Économie circulaire** - Argument écologique fort
6. **Prix juste** - Suggestion intelligente basée sur le marché

---

## Prochaines Étapes

1. **Validation du document** - Revoir avec l'équipe
2. **Priorisation features** - Définir le MVP minimal
3. **Design UI/UX** - Maquettes Figma
4. **Sprint 1** - Commencer par les modèles Prisma + API CRUD
5. **Tests utilisateurs** - Feedback early adopters

---

*Document créé le 20/01/2026*
*Version 1.0*
