# Gestion des Serveurs - CutX

## IMPORTANT : Les serveurs tournent déjà !

L'utilisateur a TOUJOURS les serveurs en cours d'exécution dans des fenêtres séparées :
- **API** : `npm run start:dev` sur le port 3001
- **Frontend** : `npm run dev` sur le port 3000

## Avant toute action sur les serveurs

1. **NE PAS démarrer les serveurs** - ils tournent déjà
2. **NE PAS tuer les processus node** sauf si l'utilisateur le demande explicitement
3. **Vérifier avec un simple curl** si besoin de confirmer :
   ```bash
   curl -s http://localhost:3001/api/health
   curl -s http://localhost:3000 -o /dev/null -w "%{http_code}"
   ```

## Scripts PowerShell (RECOMMANDÉS)

Des scripts PowerShell sont disponibles à la racine du projet. **Toujours utiliser PowerShell**, pas les anciens scripts .bat.

### Démarrer les serveurs
```bash
powershell -ExecutionPolicy Bypass -File "c:\CutX_plateform\dev-start.ps1"
```

### Arrêter les serveurs
```bash
powershell -ExecutionPolicy Bypass -File "c:\CutX_plateform\dev-stop.ps1"
```

### Redémarrer (stop + clear cache + start)
```bash
powershell -ExecutionPolicy Bypass -File "c:\CutX_plateform\dev-restart.ps1"
```

## CRITIQUE : Ne JAMAIS utiliser taskkill /IM node.exe

L'ancienne méthode `taskkill /F /IM node.exe` tue TOUS les processus node du système, y compris :
- VSCode
- Claude Code
- Extensions diverses

Cela fait planter Windows. Les nouveaux scripts PowerShell ne tuent que les processus sur les ports 3000 et 3001.

## Arrêter manuellement (si scripts indisponibles)

```powershell
# Arrêter seulement les serveurs sur ports 3000/3001
powershell -ExecutionPolicy Bypass -Command "& {
    netstat -ano | Select-String ':3001.*LISTENING' | ForEach-Object {
        Stop-Process -Id (($_  -split '\s+')[-1]) -Force -ErrorAction SilentlyContinue
    }
    netstat -ano | Select-String ':3000.*LISTENING' | ForEach-Object {
        Stop-Process -Id (($_ -split '\s+')[-1]) -Force -ErrorAction SilentlyContinue
    }
}"
```

## Démarrer manuellement (si scripts indisponibles)

```powershell
# API
Start-Process cmd -ArgumentList "/k", "cd /d c:\CutX_plateform\cutx-api && npm run start:dev"

# Frontend (attendre 5s après l'API)
Start-Process cmd -ArgumentList "/k", "cd /d c:\CutX_plateform\cutx-frontend && npm run dev"
```

## Hot Reload

Les deux serveurs ont le hot-reload activé :
- Les changements de code sont automatiquement pris en compte
- **Exception** : Les nouveaux modules NestJS nécessitent un redémarrage manuel de l'API
- **Exception** : Les changements de schema Prisma nécessitent `prisma generate` + redémarrage

## Quand mentionner le redémarrage

Si j'ai créé un **nouveau module NestJS** (comme `panels-review`), je dois :
1. Informer l'utilisateur que le serveur API doit être redémarré
2. NE PAS le faire moi-même
3. Attendre que l'utilisateur confirme qu'il l'a fait

## Vérification rapide

```bash
# API health
curl -s http://localhost:3001/api/health

# Frontend status
curl -s http://localhost:3000 -o /dev/null -w "%{http_code}"
```

Réponses attendues :
- API : `{"status":"ok",...}`
- Frontend : `200` ou `307` (redirect)
