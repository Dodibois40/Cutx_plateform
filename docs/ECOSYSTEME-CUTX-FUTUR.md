# Écosystème CutX - Vision Future

> Document de référence pour le développement futur de CutX.
> À travailler APRÈS le lancement de CutX Core.

---

## Vision globale

**CutX = Le Google des menuisiers-agenceurs**

Comme Google a construit un écosystème autour de la recherche (Gmail, Drive, Docs, Ads...), CutX construit un écosystème autour de l'optimisation de découpe.

```
                              CutX Core
                    (Configurateur + Optimiseur + Plugin SketchUp)
                                  │
           ┌──────────────────────┼──────────────────────┐
           │                      │                      │
      CutX Devis            CutX Chutes            CutX Learn
      (Facturation)         (Marketplace)          (Formation)
           │                      │                      │
           │           ┌──────────┴──────────┐           │
           │           │                     │           │
      CutX Compta   CutX Stock          CutX Jobs    CutX Vitrine
      (Comptabilité) (Gestion)          (Recrutement) (Site web)
```

**Principe clé** : Chaque produit satellite renforce CutX Core et garde l'utilisateur dans l'écosystème.

---

## 1. CutX Devis

### Problème adressé

Le menuisier utilise CutX pour configurer et optimiser, puis doit basculer sur un autre logiciel (Obat, Tolteck, Batappli...) pour faire son devis client. Double saisie, perte de temps, risque d'erreur.

### Solution

Génération automatique de devis clients depuis une configuration CutX.

```
Configuration CutX terminée
├── 12 panneaux H1180 = 845€ (coût matière)
├── Découpe et usinage = 120€
└── Quincaillerie = 85€
         │
         ▼
    [Générer un devis client]
         │
         ▼
┌─────────────────────────────────────┐
│         DEVIS N° 2026-0142          │
│                                     │
│  Client : M. Dupont                 │
│  Projet : Meuble TV sur mesure      │
│                                     │
│  Fourniture panneaux      1 200€    │
│  Main d'œuvre fabrication   800€    │
│  Pose sur site              400€    │
│  ─────────────────────────────────  │
│  Total HT                 2 400€    │
│  TVA 10%                    240€    │
│  ─────────────────────────────────  │
│  Total TTC                2 640€    │
└─────────────────────────────────────┘
```

### Fonctionnalités clés

- **Import du coût matière** depuis la config CutX
- **Taux de marge paramétrable** (x2, x2.5, personnalisé)
- **Bibliothèque de prestations** (pose, livraison, finitions...)
- **Templates personnalisables** (logo, CGV, mentions légales)
- **Export PDF** professionnel
- **Signature électronique** (option)
- **Transformation devis → facture** en 1 clic
- **Suivi des devis** (envoyé, vu, accepté, refusé)

### Business model

| Offre | Prix | Fonctionnalités |
|-------|------|-----------------|
| Gratuit | 0€ | 3 devis/mois, template basique |
| Pro | 19€/mois | Illimité, templates custom, signature |
| Business | 39€/mois | Multi-utilisateurs, stats, relances auto |

### Avantage compétitif

Les logiciels de devis (Obat, Tolteck) n'ont PAS :
- L'optimisation de découpe
- Le coût matière réel des fournisseurs
- L'intégration avec la commande fournisseur

CutX Devis = **le seul outil qui va du fournisseur au client final**.

### Développement estimé

- Complexité : Moyenne
- Temps : 4-6 semaines
- Prérequis : CutX Core fonctionnel

---

## 2. CutX Chutes (Marketplace)

### Problème adressé

Après chaque projet, il reste des chutes de panneaux. Elles s'accumulent dans l'atelier, prennent de la place, et finissent souvent à la benne. C'est du gaspillage d'argent et de ressources.

### Solution

Une marketplace intégrée pour vendre/acheter des chutes entre utilisateurs CutX.

```
Projet terminé sur CutX
         │
         ▼
"Vous avez 3 chutes réutilisables :"
├── H1180 ST37 - 80x60cm - Valeur neuf : 35€
├── U999 PM - 120x40cm - Valeur neuf : 28€
└── K001 PE - 45x45cm - Valeur neuf : 12€
         │
         ▼
┌─────────────────────────────────────┐
│  Que faire de ces chutes ?          │
│                                     │
│  ☐ Ajouter à mon stock perso        │
│  ☐ Mettre en vente sur CutX Chutes  │
│  ☐ Marquer comme déchet             │
└─────────────────────────────────────┘
         │
         ▼ (si mise en vente)

Autre utilisateur CutX (à 15km)
Configure un projet, a besoin de H1180
         │
         ▼
"Chute disponible près de chez vous !"
├── H1180 ST37 - 80x60cm
├── Vendeur : Atelier Bois & Co (4.8★)
├── Distance : 15km
├── Prix : 20€ (économie 43%)
└── [Contacter le vendeur] [Acheter]
```

### Fonctionnalités clés

- **Détection automatique des chutes** après optimisation
- **Estimation de valeur** basée sur les prix CutX
- **Géolocalisation** pour trouver des chutes proches
- **Messagerie intégrée** entre acheteur/vendeur
- **Notation des vendeurs** (fiabilité)
- **Paiement sécurisé** (option)
- **Historique des transactions**

### Business model

| Source | Commission |
|--------|------------|
| Vente de chute | 10% sur la transaction |
| Mise en avant | 2€/annonce "boost" |
| Abonnement vendeur pro | 9€/mois (0% commission) |

### Avantage compétitif

- **[Au Coin du Bois](https://www.aucoindubois.fr/)** existe mais c'est généraliste (palettes, meubles, tout bois)
- **CutX Chutes** = spécialisé panneaux, intégré à l'outil de découpe
- On CONNAÎT les dimensions exactes, le décor, l'état

### Impact marketing

- **Économie circulaire** = argument fort (RSE, écologie)
- **Communauté** = les utilisateurs se rencontrent, échangent
- **Viralité** = "J'ai trouvé ma chute sur CutX, trop bien !"

### Développement estimé

- Complexité : Moyenne-Haute
- Temps : 6-8 semaines
- Prérequis : CutX Core + base utilisateurs (min 500)

---

## 3. CutX Stock

### Problème adressé

Le menuisier a souvent des panneaux en stock :
- Achetés en gros (prix de gros)
- Chutes gardées des projets précédents
- Erreurs de commande

Mais il les oublie et rachète du neuf au lieu d'utiliser ce qu'il a.

### Solution

Gestion du stock personnel intégrée à l'optimiseur.

```
Stock personnel de l'utilisateur :
├── H1180 ST37 - Panneau entier 2800x2070 (x2)
├── H1180 ST37 - Chute 80x60cm
├── U999 PM - Chute 120x40cm
└── Egger W1000 - Panneau entier 2800x2070 (x1)

         │
         ▼

Nouveau projet : Meuble TV en H1180
         │
         ▼

Optimiseur CutX :
"J'ai trouvé dans ton stock :
 - 2 panneaux H1180 entiers
 - 1 chute 80x60cm (utilisable pour pièce n°7)

 Besoin réel à commander : 1 panneau
 Économie : 89€"
```

### Fonctionnalités clés

- **Inventaire visuel** des panneaux et chutes
- **Scan code-barres** pour ajouter facilement
- **Intégration optimiseur** : utilise le stock en priorité
- **Alertes stock bas** : "Il te reste 1 panneau H1180"
- **Valorisation du stock** : valeur totale en euros
- **Historique** : entrées/sorties

### Business model

Inclus dans l'abonnement CutX Pro (pas de coût supplémentaire).
→ Argument de vente pour passer Pro.

### Développement estimé

- Complexité : Faible-Moyenne
- Temps : 3-4 semaines
- Prérequis : CutX Core

---

## 4. CutX Jobs

### Problème adressé

**Pénurie massive de menuisiers qualifiés en France.**

- Les entreprises n'arrivent pas à recruter
- Les ouvriers qualifiés cherchent des missions flexibles
- Les intérims prennent 30-40% de commission

Source : [France Info - Menuisier, un métier en déficit de candidats](https://www.franceinfo.fr/replay-radio/c-est-mon-boulot/c-est-mon-boulot-menuisier-un-metier-en-deficit-de-candidats_2522635.html)

### Solution

Plateforme de mise en relation directe entre menuisiers et entreprises.

```
CÔTÉ MENUISIER (freelance/extra)
┌─────────────────────────────────────┐
│  Mon profil CutX Jobs               │
│                                     │
│  Jean Dupont - Menuisier agenceur   │
│  15 ans d'expérience                │
│  Spécialités : Cuisines, Dressings  │
│  Zone : Pays Basque (64)            │
│  Dispo : Week-ends, missions courtes│
│  Tarif : 35€/h                      │
│                                     │
│  [Voir mes réalisations]            │
└─────────────────────────────────────┘

CÔTÉ ENTREPRISE
┌─────────────────────────────────────┐
│  Recherche menuisier                │
│                                     │
│  Mission : Pose cuisine client      │
│  Durée : 2 jours                    │
│  Lieu : Biarritz                    │
│  Budget : 500-700€                  │
│                                     │
│  [3 profils correspondent]          │
│  → Jean D. (4.9★) - 15km            │
│  → Marie L. (4.7★) - 22km           │
│  → Paul M. (4.5★) - 8km             │
└─────────────────────────────────────┘
```

### Fonctionnalités clés

- **Profils vérifiés** (SIRET, qualifications)
- **Géolocalisation** des disponibilités
- **Calendrier de dispos** synchronisé
- **Messagerie** intégrée
- **Contrat type** généré automatiquement
- **Paiement sécurisé** (séquestre)
- **Notation bidirectionnelle**

### Business model

| Source | Commission |
|--------|------------|
| Mise en relation réussie | 8-10% (vs 30-40% intérim) |
| Abonnement entreprise | 49€/mois (accès illimité) |
| Boost profil menuisier | 9€/mois |

### Avantage compétitif

- **Commission 3x moins chère** que l'intérim
- **Intégré à CutX** : les bons menuisiers utilisent déjà CutX
- **Spécialisé** : pas généraliste comme Indeed ou Leboncoin

### Développement estimé

- Complexité : Haute
- Temps : 8-12 semaines
- Prérequis : Base utilisateurs solide (2000+)

---

## 5. CutX Learn

### Problème adressé

Les menuisiers sont largués sur :
- Les logiciels (SketchUp, CNC)
- L'optimisation de découpe
- Les nouvelles techniques

### Solution

Plateforme de formation en ligne intégrée.

```
CutX Learn - Catalogue de formations

GRATUIT
├── Premiers pas avec CutX (30 min)
├── Optimiser ses découpes : les bases (45 min)
└── Importer depuis SketchUp (20 min)

PREMIUM (9€/formation ou 29€/mois illimité)
├── SketchUp pour menuisiers (4h)
├── Maîtriser sa CNC (6h)
├── Calculer ses marges et devis (2h)
├── Lancer son activité d'agenceur (3h)
└── Certification "CutX Expert" (examen)
```

### Fonctionnalités clés

- **Vidéos courtes** (5-15 min par module)
- **Quiz et exercices** pratiques
- **Certificats** téléchargeables
- **Parcours guidés** selon le niveau
- **Forum Q&A** avec la communauté

### Business model

| Offre | Prix |
|-------|------|
| Formations de base | Gratuit (acquisition) |
| Formation premium | 9-29€/formation |
| Abonnement illimité | 29€/mois |
| Certification | 49€ |

### Partenariats possibles

- **Fabricants machines** (Biesse, Homag) : formations sponsorisées
- **Éditeurs logiciels** (SketchUp, Fusion) : co-branding
- **Organismes formation** (OPCO) : financement CPF ?

### Développement estimé

- Complexité : Faible (contenu = le plus long)
- Temps : 2-3 semaines (plateforme) + création contenu
- Prérequis : Aucun (peut démarrer tôt)

---

## 6. CutX Vitrine

### Problème adressé

La plupart des artisans menuisiers :
- N'ont pas de site web
- Ou ont un site pourri des années 2010
- Sont invisibles sur Google

### Solution

Site web professionnel généré automatiquement depuis le profil CutX.

```
https://jeanmenuiserie.cutx.fr

┌─────────────────────────────────────┐
│  JEAN MENUISERIE                    │
│  Menuisier-agenceur à Bayonne       │
│                                     │
│  ★★★★★ (23 avis)                    │
│                                     │
│  [Photo atelier]                    │
│                                     │
│  Nos réalisations :                 │
│  [Cuisine 1] [Dressing] [Meuble TV] │
│                                     │
│  Services :                         │
│  ✓ Cuisines sur mesure              │
│  ✓ Dressings et rangements          │
│  ✓ Meubles personnalisés            │
│                                     │
│  [Demander un devis gratuit]        │
│                                     │
│  Contact : 06 XX XX XX XX           │
│  Zone : Pays Basque, Landes         │
└─────────────────────────────────────┘
```

### Fonctionnalités clés

- **Génération automatique** depuis le profil CutX
- **Galerie de réalisations** (photos uploadées)
- **Formulaire de contact** → leads qualifiés
- **SEO optimisé** (menuisier + ville)
- **Sous-domaine CutX** ou domaine personnalisé
- **Responsive mobile**

### Business model

| Offre | Prix |
|-------|------|
| Vitrine basique | Gratuit (sous-domaine cutx.fr) |
| Vitrine Pro | 9€/mois (domaine perso, analytics) |
| Leads qualifiés | 5€/lead (demandes de devis) |

### Développement estimé

- Complexité : Faible
- Temps : 2-3 semaines
- Prérequis : Profils utilisateurs

---

## 7. CutX Communauté

### Problème adressé

Les menuisiers échangent sur des forums vieillots (L'Air du Bois, Copain des Copeaux) ou des groupes Facebook mal organisés. Pas de plateforme moderne, technique et professionnelle dédiée.

### Solution

Un **réseau social professionnel** intégré à l'écosystème CutX. Pas juste un forum, mais une vraie plateforme sociale façon LinkedIn/Instagram pour les pros du panneau.

```
CutX Communauté

CATÉGORIES
├── 💬 Discussions générales
│   ├── Présentez-vous
│   └── Actualités du métier
│
├── 🪵 Panneaux & Matériaux
│   ├── Retours d'expérience décors
│   ├── Comparatifs fournisseurs
│   └── Questions techniques
│
├── 🔧 Techniques & Assemblages
│   ├── Quincaillerie
│   ├── Usinage CNC
│   └── Finitions
│
├── 🛠️ Machines & Outillage
│   ├── Discussions machines
│   └── 🔥 Petites annonces machines
│
└── 💼 Business & Gestion
    ├── Tarification & devis
    └── Gestion d'atelier
```

### Fonctionnalités clés

**Réseau social :**
- **Messagerie privée** entre pros (demander un conseil, proposer une collab, partager un contact)
- **Liste d'amis** et réseau de contacts menuisiers
- **Fil d'actualité** : projets, réalisations, astuces partagées par le réseau
- **Profils pros** avec portfolio de réalisations, spécialités, zone géographique
- **Notifications** en temps réel (nouveau message, like, commentaire)

**Forum :**
- **Discussions par thématiques** (panneaux, chants, quincaillerie, machines)
- **Avis et retours d'expérience sur les fournisseurs** (Dispano, Bouney, etc.)
- **Questions/réponses avec système de votes** (style Stack Overflow)
- **Tutoriels et astuces partagés** par la communauté

**Marketplace :**
- **Petites annonces machines d'occasion** entre pros
- **Badges et réputation** selon l'expertise (Débutant → Expert → Mentor)

**Intégration CutX :**
- Partager une config depuis le Configurateur
- Montrer un projet terminé avec photos
- Demander de l'aide sur un plan de découpe

### Business model

| Source | Revenu | Notes |
|--------|--------|-------|
| Accès plateforme | Gratuit | Acquisition utilisateurs |
| **Publicités ciblées** | CPM/CPC | Fabricants, fournisseurs, outils |
| Posts sponsorisés | 50-200€/post | Nouveaux produits, promos |
| Annonces sponsorisées (fil d'actu) | 200-500€/mois | Mise en avant permanente |
| Petites annonces machines | 5€/annonce ou 2% transaction | Marketplace intégrée |
| Badge "Pro Vérifié" | 4,99€/mois | Profil mis en avant |
| Abonnement Premium | 9,99€/mois | Sans pub, analytics avancés |

**Publicité ciblée ultra-pertinente :**

```
Menuisier consulte un post sur les décors Egger
         │
         ▼
Pub Egger : "Nouveau décor H3170 disponible"
         │
         ▼
Clic → Page produit CutX → Ajout au projet
```

L'avantage vs Facebook : **audience 100% qualifiée**. Un fabricant de quincaillerie sait que 100% des viewers sont des pros du panneau.

### Avantage compétitif

| Plateforme existante | Problème |
|----------------------|----------|
| L'Air du Bois | Forum vieillot, pas de messagerie, pas pro |
| Copain des Copeaux | Amateur, pas de réseau social |
| Groupes Facebook | Bordel, pub random, pas d'intégration métier |
| LinkedIn | Généraliste, pas technique |
| Forums fabricants | Bias commercial, pas de social |

**CutX Communauté** = le seul réseau social :
- ✅ 100% dédié panneau/agencement
- ✅ Messagerie + amis + fil d'actu (comme Instagram)
- ✅ Intégré aux outils CutX (partage de configs, projets)
- ✅ Pub ciblée pertinente (pas des pubs pour des voitures)
- ✅ Marketplace machines intégrée
- ✅ UI moderne, mobile-first

### Impact stratégique

```
Utilisateur vient pour poser une question
         │
         ▼
Découvre CutX Core en voyant les autres l'utiliser
         │
         ▼
S'inscrit pour essayer
         │
         ▼
Reste pour la communauté + les outils
```

**La communauté = acquisition gratuite + rétention maximale.**

Les utilisateurs reviennent même quand ils n'ont pas de projet, juste pour discuter.

### Développement estimé

- Complexité : **Élevée** (réseau social complet)
- Prérequis : Base utilisateurs initiale (500+)
- Stack technique : WebSockets (temps réel), CDN images, modération IA

**Phases de développement :**
1. Profils + messagerie privée (MVP social)
2. Fil d'actualité + posts
3. Forum thématique
4. Marketplace machines
5. Système de pub

---

## Roadmap globale

### Phase 1 : CutX Core (Maintenant → M6)
- Configurateur
- Optimiseur
- Plugin SketchUp
- Partenariats fournisseurs
- **Objectif : 3000 utilisateurs**

### Phase 2 : Monétisation directe (M7 → M12)
- **CutX Devis** (synergie maximale avec Core)
- **CutX Stock** (améliore l'optimiseur)
- **Objectif : Premiers revenus récurrents**

### Phase 3 : Communauté (M13 → M18)
- **CutX Chutes** (marketplace)
- **CutX Learn** (formations)
- **Objectif : Effet réseau, viralité**

### Phase 4 : Expansion (M19+)
- **CutX Jobs** (recrutement)
- **CutX Vitrine** (sites web)
- **CutX Compta** (comptabilité simplifiée)
- **Objectif : Écosystème complet**

---

## Synergies entre produits

```
Utilisateur arrive sur CutX (gratuit)
         │
         ▼
Utilise CutX Core pour configurer
         │
         ├──→ A besoin de faire un devis client → CutX Devis
         │
         ├──→ A des chutes à vendre → CutX Chutes
         │
         ├──→ Veut apprendre SketchUp → CutX Learn
         │
         ├──→ Cherche un ouvrier → CutX Jobs
         │
         └──→ Veut plus de clients → CutX Vitrine

Chaque produit RAMÈNE vers CutX Core
Chaque produit AUGMENTE la valeur des autres
```

---

## Revenus potentiels (vision 3 ans)

| Produit | Users | Conversion | Prix moyen | MRR |
|---------|-------|------------|------------|-----|
| CutX Core (commissions) | 15 000 | 30% actifs | 3% sur 500€ | 67 500€ |
| CutX Devis | 15 000 | 10% | 25€/mois | 37 500€ |
| CutX Chutes | 15 000 | 5% | 10€/transaction | 7 500€ |
| CutX Learn | 15 000 | 3% | 15€/mois | 6 750€ |
| CutX Jobs | 500 entreprises | 100% | 49€/mois | 24 500€ |
| **Total MRR** | | | | **143 750€** |
| **Total ARR** | | | | **1 725 000€** |

*Estimations optimistes à 3 ans avec 15 000 utilisateurs*

---

## 8. VISION LONG TERME : Le Réseau Social de l'Agencement Intérieur

> *"Tu ne me connais pas, mec. Moi je m'appelle Dorian. Tu t'imagines pas les idées !"*

### Le constat : Les réseaux sociaux actuels sont morts

| Plateforme | Problème |
|------------|----------|
| Instagram | Devenu de la merde : chats, IA, spam, contenu random |
| LinkedIn | Bullshit corporate, pas technique |
| X (Twitter) | Poubelle politique |
| Pinterest | US-centric, pas de vrais pros français |
| Facebook | Groupes bordéliques, pub random |

**Il n'existe RIEN** pour :
- Un particulier qui veut trouver un cuisiniste de qualité près de chez lui
- Un artisan qui veut montrer son travail sans être noyé
- Une marque qui veut toucher les décideurs (pros + particuliers qui rénovent)

### La vision : CutX devient LE réseau social français de l'agencement intérieur

```
CUTX AUJOURD'HUI                    CUTX DEMAIN (M24+)
─────────────────────────────────────────────────────────────
Outil B2B pour menuisiers           Plateforme complète B2B + B2C


                                    ┌─────────────────────────┐
                                    │     PARTICULIERS        │
                                    │  (inspiration, commande │
                                    │   de meubles sur-mesure)│
                                    └────────────┬────────────┘
                                                 │
                                    ┌────────────▼────────────┐
                                    │       ARTISANS          │
                                    │  Menuisiers, Cuisinistes│
                                    │  Décorateurs, Agenceurs │
                                    └────────────┬────────────┘
                                                 │
                                    ┌────────────▼────────────┐
                                    │        MARQUES          │
                                    │  BSH (Bosch/Siemens)    │
                                    │  Blum, Hettich, Egger   │
                                    │  Électroménager, etc.   │
                                    └─────────────────────────┘
```

### Le marché élargi

| Segment | Taille France |
|---------|---------------|
| Menuisiers/agenceurs | ~70 000 entreprises |
| Cuisinistes | ~15 000 entreprises |
| Décorateurs intérieur | ~20 000 entreprises |
| Particuliers qui rénovent/an | **2-3 millions** |
| Particuliers qui s'inspirent | **5-10 millions** |
| Budget pub marques intérieur/an | **centaines de millions €** |

### Fonctionnalités B2C (Phase 3+)

**Pour les particuliers :**
- Galerie d'inspiration (réalisations des artisans)
- Recherche d'artisans par spécialité et zone géo
- Demande de devis en ligne
- Avis et notes des artisans
- Visualisation 3D IA de leur projet

**Pour les artisans :**
- Portfolio de réalisations visible par les particuliers
- Leads qualifiés (particuliers qui cherchent un pro)
- IA générative 3D (envoyer un plan, recevoir un rendu 3D pour le client)
- Mise en avant payante dans les résultats

### IA Générative 3D (killer feature)

```
Artisan envoie un plan basique
         │
         ▼
IA CutX génère un rendu 3D photoréaliste
         │
         ▼
Artisan montre au client → Signature du devis
```

**L'avantage :** Le menuisier vend mieux, plus vite. Le client visualise son projet avant fabrication.

### Business model B2C

| Source | Revenu | Notes |
|--------|--------|-------|
| Leads particuliers → artisans | 5-20€/lead | Demandes de devis |
| Pub marques (BSH, Blum...) | CPM/CPC | Audience ultra-qualifiée |
| Mise en avant artisan | 29-99€/mois | Boost dans les résultats |
| Commission sur commandes | 3-5% | Meubles sur-mesure |
| IA 3D (crédits) | 0,50-2€/rendu | Pay-per-use |
| Abonnement Pro IA illimité | 49€/mois | Pour gros utilisateurs |

**Exemple de revenus pub marques :**

```
Particulier consulte un cuisiniste sur CutX
         │
         ▼
Pub Bosch : "Four Serie 8, finition inox"
         │
         ▼
Clic → Fiche produit → Artisan l'intègre au devis
```

L'avantage vs Facebook/Google : **100% des viewers sont en train de faire de l'agencement intérieur**. Le ROI pour BSH/Blum/Hettich est énorme.

### Valorisation potentielle

| Users | Type | ARR estimé | Valorisation (5-8x) |
|-------|------|------------|---------------------|
| 50 000 | B2B + B2C | 2-3M€ | **10-25M€** |
| 200 000 | Plateforme FR | 5-8M€ | **30-60M€** |
| 500 000 | Expansion EU | 15-20M€ | **100-150M€** |
| 1 000 000+ | Leader marché | 30M€+ | **200-500M€** |

### Roadmap vers cette vision

**Phase 1 (M1-M12) : Prouver le B2B**
- CutX Core (Configurateur + Optimiseur)
- 2 000 utilisateurs pros
- Premiers partenariats fournisseurs

**Phase 2 (M12-M18) : Construire le réseau social B2B**
- CutX Communauté (messagerie, fil d'actu, forum)
- 5 000 utilisateurs pros
- Premières pubs fabricants (Egger, Blum...)

**Phase 3 (M18-M24) : Ouvrir aux particuliers**
- Galerie publique des réalisations
- Recherche d'artisans
- Leads particuliers → artisans
- 50 000 utilisateurs (pros + particuliers)

**Phase 4 (M24-M36) : IA et Scale**
- IA générative 3D
- Expansion européenne
- Partenariats marques (BSH, Electrolux...)
- 200 000+ utilisateurs

### Le pitch investisseur (M24+)

> "CutX, c'est le réseau social vertical de l'agencement intérieur français.
>
> On connecte 100 000 artisans avec 3 millions de particuliers qui rénovent chaque année.
>
> Les marques (Bosch, Blum, Egger) paient pour être visibles au moment de la décision d'achat.
>
> C'est le Houzz français, mais avec de vrais outils pour les pros et une IA qui génère des rendus 3D.
>
> On a prouvé le modèle B2B avec 2 000 pros payants. Maintenant on scale vers le B2C."

### Pourquoi ça peut marcher

1. **Timing** : Les réseaux généralistes (Insta, LinkedIn) déçoivent
2. **Vertical spécialisé** : Audience 100% qualifiée = CPM élevé
3. **Outil + Réseau** : Pas juste un réseau, un outil de travail quotidien
4. **Effet réseau** : Plus d'artisans = plus de particuliers = plus de marques
5. **IA intégrée** : Différenciation technologique

### Risques

| Risque | Mitigation |
|--------|-----------|
| Trop ambitieux pour un solo | Focus Phase 1-2, lever des fonds pour Phase 3+ |
| Houzz/Pinterest réagissent | Ils sont US-centric, marché FR trop petit pour eux |
| Les marques ne paient pas | Prouver le volume d'audience d'abord |
| L'IA 3D ne marche pas | Partenariat avec des outils existants (Midjourney, etc.) |

---

## Conclusion

CutX n'est pas qu'un configurateur de panneaux.

**CutX = Le réseau social français de l'agencement intérieur.**

Phase 1 : L'outil des menuisiers.
Phase 2 : Le LinkedIn de l'artisanat.
Phase 3 : Le Houzz français avec IA.

---

*Document créé le 10 janvier 2026*
*Vision long terme ajoutée le 10 janvier 2026*
*À revoir après le lancement de CutX Core*

---

> "Mon gars, on tient le bout. On est une équipe de fous."
> — Dorian, fondateur de CutX
