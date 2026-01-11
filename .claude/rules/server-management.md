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

## CRITIQUE : Syntaxe des commandes Windows dans Git Bash

Claude Code utilise Git Bash (MINGW64), pas cmd.exe. Pour exécuter des commandes Windows :

**UTILISER `//c` (double slash), pas `/c` (simple slash) :**

```bash
# CORRECT - Git Bash passe /c à cmd.exe
cmd //c "taskkill /F /IM node.exe"
cmd //c "c:\\CutX_plateform\\restart-servers.bat"

# INCORRECT - Git Bash interprète /c comme un chemin
cmd /c "taskkill /F /IM node.exe"  # NE FONCTIONNE PAS
```

## Méthode recommandée : Utiliser les scripts batch

Des scripts batch sont disponibles à la racine du projet :

```bash
# Arrêter tous les serveurs
cmd //c "c:\\CutX_plateform\\stop-servers.bat"

# Démarrer les serveurs
cmd //c "c:\\CutX_plateform\\start-servers.bat"

# Redémarrer complètement (stop + clear cache + start)
cmd //c "c:\\CutX_plateform\\restart-servers.bat"
```

## Si l'utilisateur dit que c'est planté

SEULEMENT dans ce cas, utiliser le script de redémarrage :

```bash
cmd //c "c:\\CutX_plateform\\restart-servers.bat"
```

Ou manuellement avec la syntaxe correcte :

```bash
# 1. Arrêter les processus
cmd //c "taskkill /F /IM node.exe /T"

# 2. Attendre (utiliser sleep en Git Bash, pas timeout)
sleep 3

# 3. Démarrer l'API en arrière-plan
cd c:/CutX_plateform/cutx-api && npm run start:dev > /tmp/api.log 2>&1 &

# 4. Attendre que l'API démarre
sleep 8

# 5. Vérifier
curl -s http://localhost:3001/api/health
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

## Commandes Windows courantes (syntaxe Git Bash)

| Action | Commande |
|--------|----------|
| Tuer node | `cmd //c "taskkill /F /IM node.exe"` |
| Lister processus | `cmd //c "tasklist \| findstr node"` |
| Vérifier port | `netstat -ano \| findstr :3001` |
| Supprimer dossier | `cmd //c "rmdir /s /q c:\\path"` |
| Démarrer fenêtre | `start "Title" cmd //k "command"` |
