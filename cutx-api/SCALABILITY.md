# Configuration de Scalabilité - CutX API

## Configuration Railway (Production)

### Variables d'environnement requises

```bash
# Base de données avec connection pooling optimisé
DATABASE_URL="postgresql://user:pass@host:port/db?connection_limit=10&pool_timeout=30&connect_timeout=10"

# Optionnel: Redis pour le cache distribué
REDIS_URL="redis://..."
```

### Paramètres DATABASE_URL expliqués

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| `connection_limit` | 10 | Max connexions simultanées par instance |
| `pool_timeout` | 30 | Timeout en secondes pour obtenir une connexion |
| `connect_timeout` | 10 | Timeout en secondes pour établir une connexion |

### Capacité estimée

| Configuration | Utilisateurs simultanés | Requêtes/seconde |
|--------------|------------------------|------------------|
| Actuelle (sans pooling) | 10-20 | ~50 |
| Avec `connection_limit=10` | 50-100 | ~200 |
| Avec Redis cache | 200-500 | ~500 |
| Avec DB dédiée + PgBouncer | 500-2000 | ~1000 |

---

## Optimisations appliquées

### 1. Connection Pooling Prisma
- Fichier: `src/prisma/prisma.service.ts`
- Logging des connexions/déconnexions
- Méthode `healthCheck()` pour monitoring
- Méthode `withTimeout()` pour requêtes longues

### 2. Réduction des requêtes SQL
- Fichier: `src/catalogues/catalogues.service.ts`
- `aggregateSmartSearchFacets`: 6 requêtes → 2 requêtes
- Cache 30 secondes sur les facettes
- Gestion d'erreur gracieuse (pas de crash)

### 3. Cache en mémoire
- Filter options: 5 minutes
- Facettes de recherche: 30 secondes
- Autocomplete: à implémenter avec Redis

---

## Monitoring recommandé

### Métriques à surveiller

1. **Connexions DB actives**
   ```sql
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'railway';
   ```

2. **Requêtes lentes (>1s)**
   ```sql
   SELECT query, calls, mean_time
   FROM pg_stat_statements
   WHERE mean_time > 1000
   ORDER BY mean_time DESC;
   ```

3. **Cache hit ratio**
   - Ajouter des logs dans le service pour tracker

### Alertes recommandées

- Connexions DB > 80% du max
- Temps de réponse moyen > 500ms
- Erreurs 5xx > 1%

---

## Évolutions futures

### Phase 1: Redis Cache (recommandé)
```typescript
// Dans app.module.ts
CacheModule.register({
  store: redisStore,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  ttl: 60,
}),
```

### Phase 2: Read Replicas
- Séparer les lectures (search) des écritures (import)
- Utiliser un replica PostgreSQL pour les requêtes lourdes

### Phase 3: CDN pour images
- Cloudflare ou CloudFront devant les images produits
- Réduire la charge sur le serveur API

---

## Commandes de diagnostic

```bash
# Vérifier la santé de l'API
curl https://cutxplateform-production.up.railway.app/api/health

# Tester une recherche
curl "https://cutxplateform-production.up.railway.app/api/catalogues/smart-search?q=mdf%2019"

# Logs Railway
railway logs --tail
```
