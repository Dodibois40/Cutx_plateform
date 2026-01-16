# Scripts CutX API

## Structure

```
scripts/
├── active/                     # Scripts actifs utilisés régulièrement
│   ├── scrapers/              # Scrapers de catalogues
│   │   ├── barrillet/         # Scraper Barrillet Distribution
│   │   └── dispano/           # Scraper Dispano
│   ├── admin/                 # Utilitaires d'administration
│   │   ├── backup-classification.ts
│   │   ├── restore-classification.ts
│   │   ├── delete-panel.ts
│   │   ├── update-panel-image.ts
│   │   └── set-admin-role.ts
│   └── maintenance/           # Scripts de maintenance
│       ├── migrate-images-to-r2.ts
│       ├── cleanup-r2-html.ts
│       ├── count-panel-images.ts
│       ├── list-catalogues.ts
│       └── update-search-vector.ts
└── archived/                   # Scripts one-off (lecture seule)
    ├── 2024-fixes/            # Corrections de données (23 scripts)
    ├── 2024-analysis/         # Analyses et vérifications (105 scripts)
    ├── 2024-debug/            # Debug et tests (34 scripts)
    └── 2024-migrations/       # Migrations terminées (29 scripts)
```

## Scripts Actifs

### Scrapers

Les scrapers utilisent Puppeteer et nécessitent Chrome en mode debug :
```bash
# Lancer Chrome en mode debug (Windows)
./launch-chrome-debug.bat

# Puis exécuter le scraper
npx tsx active/scrapers/barrillet/run.ts
npx tsx active/scrapers/dispano/run.ts
```

### Administration

```bash
# Sauvegarder les classifications
npx tsx active/admin/backup-classification.ts

# Restaurer une sauvegarde
npx tsx active/admin/restore-classification.ts

# Supprimer un panneau
npx tsx active/admin/delete-panel.ts --id=<panel_id>

# Mettre à jour une image
npx tsx active/admin/update-panel-image.ts --id=<panel_id> --url=<image_url>
```

### Maintenance

```bash
# Migrer les images vers R2
npx tsx active/maintenance/migrate-images-to-r2.ts

# Compter les images par catalogue
npx tsx active/maintenance/count-panel-images.ts

# Lister les catalogues
npx tsx active/maintenance/list-catalogues.ts

# Mettre à jour les vecteurs de recherche
npx tsx active/maintenance/update-search-vector.ts
```

## Scripts Archivés

Les scripts dans `archived/` sont des opérations one-off qui ont été exécutées et conservées pour référence historique. Ne pas les exécuter sans vérification préalable.

**Organisé le 2026-01-16**
