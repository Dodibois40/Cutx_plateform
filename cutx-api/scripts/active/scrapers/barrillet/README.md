# Barrillet - Scraper et Import

Scripts pour l'integration du catalogue Barrillet dans CutX.

## Structure des fichiers

```
barrillet/
├── config.ts           # Configuration et categories
├── scraper.ts          # Logique de scraping (template)
├── run.ts              # Script principal d'execution
├── seed-categories.ts  # Initialisation des categories
└── README.md           # Cette documentation
```

## Categories disponibles

Le catalogue Barrillet comprend **15 categories principales** et **53 sous-categories** :

| Categorie | Sous-categories |
|-----------|-----------------|
| Panneau melamine | Melamine blanc, Melamine decor, Tablette melaminee |
| Panneau stratifie | Stratifie blanc, Stratifie contrebalancement, Stratifie decor, Replaque stratifie, Stratifie metal |
| Panneau compact | Compact interieur |
| Resine de synthese | Resine decor, Accessoire resine |
| Plan de travail | Plan de travail bois, Plan de travail stratifie, Plan de travail compact |
| Panneaux massifs | Panneaute (LMC non aboute), Panneau 3/5 plis, Panneau lamelle-colle (aboute) |
| Panneau contreplaque | Okoume, Peuplier, Exotique, Meranti, Ilomba, Bouleau, Resineux, A cintrer, Filme/antiderapant, Emballage, Leger, Marine |
| Panneau latte | Faces MDF, Faces Exotique, Faces Peuplier, Leger |
| OSB | Panneau OSB, Dalle OSB |
| Bois-ciment | Panneau bois-ciment |
| Panneau MDF et fibres | MDF standard, MDF a laquer, MDF a cintrer, Fibres dures, MDF teinte/texture, MDF leger |
| Bande de chant | ABS, Melamine, Bois veritable |
| Panneau agglomere | Standard, Antiderapant, Leger, Dalle |
| Essences fines | Placage/stratifie essences fines, Panneau essences fines |
| Panneau mural | Etanche, Divers |

## Utilisation

### 1. Initialiser le catalogue (sans scraping)

Pour creer le catalogue et les categories en base de donnees :

```bash
cd cutx-api
npx tsx scripts/barrillet/seed-categories.ts
```

### 2. Lister les categories

```bash
npx tsx scripts/barrillet/run.ts --list
```

### 3. Scraper les produits

**Prerequis :** Lancer Chrome en mode debug et se connecter sur barrillet.fr

```bash
# Windows
start chrome --remote-debugging-port=9222

# Se connecter sur barrillet.fr avec son compte pro
```

Puis executer le scraper :

```bash
# Toutes les categories
npx tsx scripts/barrillet/run.ts

# Une categorie specifique
npx tsx scripts/barrillet/run.ts "Panneau melamine"
```

## Configuration des URLs

**IMPORTANT:** Les URLs des categories doivent etre configurees dans `config.ts`.

Pour chaque sous-categorie, ajouter l'URL correspondante :

```typescript
{
  name: 'Melamine blanc',
  slug: 'melamine-blanc',
  url: 'https://www.barrillet.fr/...'  // A completer
}
```

## Adaptation du scraper

Le fichier `scraper.ts` contient un template generique. Il devra etre adapte selon la structure HTML du site Barrillet :

1. **Selecteurs de liens produits** (`getProductLinks`)
2. **Extraction des donnees** (`scrapeProduct`)
3. **Patterns de reference** (regex pour extraire les refs)

## Types de produits

Le mapping automatique (`determineProductType`) gere les types suivants :

- `MELAMINE` - Panneaux melanines
- `STRATIFIE` - Stratifies HPL
- `COMPACT` - Compacts HPL
- `CONTREPLAQUE` - Contreplaques
- `OSB` - Panneaux OSB
- `MDF` - MDF et fibres
- `AGGLOMERE` - Agglomeres
- `MASSIF` - Panneaux massifs, lattes, lamelle-colles
- `BANDE_DE_CHANT` - Bandes de chant
- `PLAN_DE_TRAVAIL` - Plans de travail
- `SOLID_SURFACE` - Resines de synthese
- `PLACAGE` - Placages et essences fines
- `PANNEAU_MURAL` - Panneaux muraux
- `BOIS_CIMENT` - Panneaux bois-ciment

## References generees

Format : `BARR-{TYPE}-{REF_BARRILLET}`

Exemples :
- `BARR-MEL-12345` (melamine)
- `BARR-CTR-67890` (contreplaque)
- `BARR-CHT-11111` (bande de chant)

## Verification

Apres import, verifier via l'API :

```bash
# Verifier le catalogue
curl http://localhost:3001/api/catalogues/barrillet

# Rechercher des produits
curl "http://localhost:3001/api/catalogues/smart-search?q=melamine&catalogue=barrillet"

# Compter les panneaux
curl "http://localhost:3001/api/catalogues/panels?catalogue=barrillet&limit=1"
```

## Troubleshooting

### Chrome ne se connecte pas

```bash
# Verifier que Chrome tourne sur le port 9222
netstat -an | findstr 9222

# Relancer Chrome
taskkill /F /IM chrome.exe
start chrome --remote-debugging-port=9222
```

### Erreurs de scraping

1. Verifier que vous etes connecte sur barrillet.fr
2. Verifier les selecteurs CSS dans `scraper.ts`
3. Ajouter des logs pour debugger

### Base de donnees

```bash
# Verifier l'etat
npx prisma studio

# Reset si necessaire (attention: supprime les donnees!)
npx prisma db push --force-reset
```
