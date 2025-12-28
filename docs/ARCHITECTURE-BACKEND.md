# CutX Backend - Architecture

## Vision
Backend SaaS scalable pour plateforme de commande de panneaux bois.
Objectif : supporter des milliers d'utilisateurs et millions de références catalogue.

---

## Stack Technique

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| Framework | **NestJS** | Enterprise-grade, modulaire, TypeScript natif |
| ORM | **Prisma** | Type-safe, migrations, excellent DX |
| Database | **PostgreSQL** | Relationnel, performant, Railway native |
| Cache | **Redis** | Sessions, cache catalogue, rate limiting |
| Auth | **À définir** | Firebase Auth / Clerk / Custom JWT |
| Paiement | **Stripe** | Standard industrie, webhooks robustes |
| Storage | **Firebase Storage** | Images produits, documents |
| Search | **Meilisearch** (futur) | Recherche catalogue performante |

---

## Modules NestJS

### Core Modules

```
src/
├── auth/                 # Authentification & autorisation
├── users/                # Gestion utilisateurs
├── groups/               # Entreprises, équipes
├── permissions/          # RBAC (Role-Based Access Control)
├── catalogue/            # Produits, catégories
├── orders/               # Commandes, devis
├── payments/             # Stripe, factures
├── suppliers/            # API fournisseurs (Bouney, etc.)
├── notifications/        # Email, push
└── admin/                # Dashboard admin
```

### Module Auth
- Login/Register
- JWT access + refresh tokens
- OAuth (Google, etc.) via provider externe
- 2FA (futur)
- Password reset

### Module Users
- Profil utilisateur
- Préférences
- Historique activité

### Module Groups
- Création entreprise/équipe
- Invitation membres
- Rôles par groupe (admin, membre, viewer)
- Facturation par groupe

### Module Catalogue
- CRUD produits
- Catégories hiérarchiques
- Recherche full-text
- Filtres (marque, épaisseur, prix, stock)
- Import/Export CSV
- Sync fournisseurs

### Module Orders
- Panier
- Devis (draft → validé → commandé)
- Historique
- PDF génération
- Duplication devis

### Module Payments
- Stripe Checkout
- Abonnements (futur)
- Wallet/crédits prépayés
- Factures

---

## Base de données - Schéma Prisma

```prisma
// Users & Auth
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  avatar        String?
  role          UserRole  @default(USER)
  groups        GroupMember[]
  orders        Order[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum UserRole {
  USER
  ADMIN
  SUPER_ADMIN
}

// Groups (Entreprises)
model Group {
  id            String    @id @default(cuid())
  name          String
  siret         String?
  address       String?
  members       GroupMember[]
  orders        Order[]
  createdAt     DateTime  @default(now())
}

model GroupMember {
  id            String    @id @default(cuid())
  userId        String
  groupId       String
  role          GroupRole @default(MEMBER)
  user          User      @relation(fields: [userId], references: [id])
  group         Group     @relation(fields: [groupId], references: [id])

  @@unique([userId, groupId])
}

enum GroupRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

// Catalogue
model Product {
  id            String    @id @default(cuid())
  reference     String    @unique
  name          String
  brand         String
  category      String
  subCategory   String?
  type          String
  length        Float
  width         Float
  thickness     Float
  pricePerM2    Float
  stock         StockStatus @default(ON_ORDER)
  imageUrl      String?
  supplierId    String?
  supplier      Supplier? @relation(fields: [supplierId], references: [id])
  orderItems    OrderItem[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([brand])
  @@index([category])
  @@index([thickness])
}

enum StockStatus {
  IN_STOCK
  ON_ORDER
  OUT_OF_STOCK
}

model Supplier {
  id            String    @id @default(cuid())
  name          String
  code          String    @unique
  apiUrl        String?
  products      Product[]
}

// Orders
model Order {
  id            String    @id @default(cuid())
  reference     String    @unique
  userId        String
  groupId       String?
  status        OrderStatus @default(DRAFT)
  items         OrderItem[]
  totalHT       Float
  totalTTC      Float
  user          User      @relation(fields: [userId], references: [id])
  group         Group?    @relation(fields: [groupId], references: [id])
  payment       Payment?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum OrderStatus {
  DRAFT
  PENDING
  CONFIRMED
  IN_PRODUCTION
  SHIPPED
  DELIVERED
  CANCELLED
}

model OrderItem {
  id            String    @id @default(cuid())
  orderId       String
  productId     String
  quantity      Int
  length        Float
  width         Float
  unitPrice     Float
  totalPrice    Float
  edges         Json?     // {A: true, B: false, C: true, D: false}
  finish        Json?     // {type: 'laque', color: 'RAL9010', faces: 2}
  order         Order     @relation(fields: [orderId], references: [id])
  product       Product   @relation(fields: [productId], references: [id])
}

// Payments
model Payment {
  id            String    @id @default(cuid())
  orderId       String    @unique
  stripeId      String?
  amount        Float
  status        PaymentStatus @default(PENDING)
  order         Order     @relation(fields: [orderId], references: [id])
  createdAt     DateTime  @default(now())
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}
```

---

## API Endpoints (exemple)

### Auth
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- POST /auth/forgot-password

### Users
- GET /users/me
- PATCH /users/me
- GET /users/:id (admin)

### Catalogue
- GET /catalogue/products
- GET /catalogue/products/:id
- GET /catalogue/products/search?q=...
- GET /catalogue/categories
- GET /catalogue/brands

### Orders
- GET /orders
- POST /orders
- GET /orders/:id
- PATCH /orders/:id
- DELETE /orders/:id
- POST /orders/:id/duplicate

### Admin
- GET /admin/stats
- GET /admin/users
- POST /admin/catalogue/import
- etc.

---

## Environnement Railway

```
cutx-api (NestJS)
├── PostgreSQL
├── Redis
└── Variables d'environnement:
    - DATABASE_URL
    - REDIS_URL
    - JWT_SECRET
    - STRIPE_SECRET_KEY
    - FRONTEND_URL
```

---

## Prochaines étapes

1. [ ] Créer projet NestJS avec structure modulaire
2. [ ] Configurer Prisma + PostgreSQL Railway
3. [ ] Module Auth (JWT ou provider externe)
4. [ ] Module Catalogue (migration données La Manufacture)
5. [ ] Module Orders
6. [ ] Connecter frontend CutX
7. [ ] Module Payments (Stripe)
8. [ ] Tests & documentation Swagger

---

## Questions ouvertes

- **Auth provider** : Firebase Auth, Clerk, ou JWT custom ?
- **Search** : PostgreSQL full-text ou Meilisearch ?
- **Rate limiting** : Redis ou service externe ?
