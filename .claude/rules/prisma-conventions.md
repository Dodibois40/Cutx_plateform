# Prisma Conventions - CutX Database

Ces conventions s'appliquent aux fichiers `*.prisma` et aux interactions avec Prisma dans `cutx-api/`.

## Schema Location

```
cutx-api/prisma/schema.prisma
```

## Model Conventions

```prisma
model User {
  // ID en premier (CUID par défaut)
  id        String   @id @default(cuid())

  // Champs métier
  email     String   @unique
  firstName String?
  lastName  String?

  // Relations
  orders    Order[]

  // Timestamps en dernier
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Index pour les recherches fréquentes
  @@index([email])
}
```

## Relations

```prisma
// One-to-Many
model Catalogue {
  id     String  @id @default(cuid())
  panels Panel[]
}

model Panel {
  id          String    @id @default(cuid())
  catalogueId String
  catalogue   Catalogue @relation(fields: [catalogueId], references: [id])
}

// Many-to-Many (table intermédiaire)
model User {
  organizations UserOrganization[]
}

model Organization {
  users UserOrganization[]
}

model UserOrganization {
  userId         String
  organizationId String
  user           User         @relation(fields: [userId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])
  role           String       @default("member")

  @@id([userId, organizationId])
}
```

## Types de Données

```prisma
// Strings
name        String              // VARCHAR(191)
description String?             // Nullable
content     String  @db.Text    // TEXT (long)

// Numbers
price       Float
quantity    Int
amount      Decimal @db.Decimal(10, 2)

// JSON (pour données flexibles)
data        String              // Stocker JSON.stringify()
// ou
metadata    Json                // Type JSON natif PostgreSQL

// Enums
status      OrderStatus         // Enum défini ci-dessous

enum OrderStatus {
  PENDING
  PROCESSING
  COMPLETED
  CANCELLED
}
```

## Queries Courantes

```typescript
// Find avec relations
const catalogue = await prisma.catalogue.findUnique({
  where: { slug },
  include: {
    panels: true,
    categories: {
      where: { parentId: null },
      orderBy: { name: 'asc' },
    },
  },
});

// Search avec filtres
const panels = await prisma.panel.findMany({
  where: {
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { reference: { contains: query, mode: 'insensitive' } },
    ],
    catalogueId,
  },
  take: 20,
});

// Create avec relations
const order = await prisma.order.create({
  data: {
    reference: generateRef(),
    user: { connect: { id: userId } },
    lines: {
      create: lines.map(l => ({
        panelRef: l.reference,
        quantity: l.quantity,
      })),
    },
  },
  include: { lines: true },
});
```

## Migrations

```bash
# Dev: push direct (pas de migration)
npx prisma db push

# Prod: créer migration
npx prisma migrate dev --name add_xxx

# Appliquer en prod
npx prisma migrate deploy
```

## Prisma Studio

```bash
npx prisma studio
# Ouvre http://localhost:5555
```
