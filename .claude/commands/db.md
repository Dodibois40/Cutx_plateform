# Database Operations (Prisma)

Manage the PostgreSQL database via Prisma.

## Instructions

### View Database (GUI)
```bash
cd cutx-api && npx prisma studio
```
Opens browser at http://localhost:5555

### Sync Schema
```bash
cd cutx-api && npx prisma db push
```
Pushes schema changes to database without migrations.

### Generate Client
```bash
cd cutx-api && npx prisma generate
```
Regenerates Prisma client after schema changes.

### Create Migration
```bash
cd cutx-api && npx prisma migrate dev --name [migration_name]
```

### View Schema
Read and explain the current Prisma schema:
```
cutx-api/prisma/schema.prisma
```

## Database Info
- Host: Railway PostgreSQL (internal)
- ORM: Prisma 6.x
- Models: User, Catalogue, Panel, Category, CutxImportSession, etc.
