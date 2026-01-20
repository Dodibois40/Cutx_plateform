# CutX Sound Design System

> *"Le son est l'émotion invisible qui transforme une expérience fonctionnelle en expérience mémorable."*

**Date de création :** 17 janvier 2026
**Statut :** Phase de conception
**Inspirations :** Hans Zimmer, sound design Apple/Windows/Netflix

---

## 1. Vision

### Pourquoi un système sonore ?

Les applications professionnelles sont muettes. CutX veut briser ce paradigme en introduisant une **identité sonore unique** qui :

1. **Crée des repères cognitifs** - Le cerveau traite le son plus vite que la vision
2. **Génère des émotions** - Satisfaction, accomplissement, anticipation
3. **Différencie CutX** - Aucun configurateur concurrent n'a de design sonore
4. **Fidélise les utilisateurs** - Un son mémorable = une marque mémorable

### Références d'inspiration

| Référence | Ce qu'on retient |
|-----------|------------------|
| **Hans Zimmer - Inception** | Le "BWAAAAM" - un son simple mais inoubliable |
| **Hans Zimmer - Interstellar** | L'orgue - émotion pure, tension et résolution |
| **Hans Zimmer - Dune** | Percussions - puissance et précision |
| **Apple** | Le son de démarrage Mac - clarté, modernité |
| **Windows** | Le son de connexion - accueil, familiarité |
| **Netflix** | Le "Ta-dum" - 2 notes, identité mondiale |

### Philosophie sonore CutX

- **Moderne mais chaleureux** - Pas froid/robotique
- **Court mais satisfaisant** - 50ms à 3 secondes max
- **Cohérent** - Tous les sons appartiennent à la même famille
- **Non-intrusif** - Améliore l'expérience, ne la perturbe pas
- **Optionnel** - L'utilisateur peut activer/désactiver

---

## 2. Palette Sonore

### 2.1 Son Signature (Logo Sonore)

Le son qui **définit CutX**. Équivalent du "Ta-dum" Netflix.

| Attribut | Valeur |
|----------|--------|
| **Durée** | 1.5 - 2.5 secondes |
| **Usage** | Premier chargement de l'app, splash screen |
| **Émotion** | Confiance, professionnalisme, modernité |
| **Fréquence** | 1 fois par session |
| **Fichier** | `cutx-logo.mp3` |

**Direction créative :** Notes montantes, résolution harmonique, touche boisée/organique (rappel du bois/panneaux).

---

### 2.2 Micro-sons d'interaction

#### Catégorie : Actions positives

| Son | Durée | Déclencheur | Émotion | Fichier |
|-----|-------|-------------|---------|---------|
| **Ajout panneau** | 80-120ms | Clic "Ajouter un panneau" | Satisfaction rapide | `add-panel.mp3` |
| **Validation** | 100-150ms | Confirmation d'une action | Accomplissement | `validate.mp3` |
| **Succès** | 200-300ms | Commande finalisée, export réussi | Accomplissement majeur | `success.mp3` |
| **Drop réussi** | 60-80ms | Drag & drop terminé | Feedback tactile | `drop.mp3` |

#### Catégorie : Navigation

| Son | Durée | Déclencheur | Émotion | Fichier |
|-----|-------|-------------|---------|---------|
| **Tab switch** | 40-60ms | Changement d'onglet | Transition fluide | `tab.mp3` |
| **Modal open** | 80-100ms | Ouverture modale | Attention | `modal-open.mp3` |
| **Modal close** | 60-80ms | Fermeture modale | Clôture | `modal-close.mp3` |

#### Catégorie : Alertes

| Son | Durée | Déclencheur | Émotion | Fichier |
|-----|-------|-------------|---------|---------|
| **Attention** | 150-200ms | Avertissement non-bloquant | Attention douce | `warning.mp3` |
| **Erreur** | 200-250ms | Erreur bloquante | Alerte (pas agressive) | `error.mp3` |
| **Notification** | 100-150ms | Nouvelle info | Information | `notification.mp3` |

#### Catégorie : Configurateur spécifique

| Son | Durée | Déclencheur | Émotion | Fichier |
|-----|-------|-------------|---------|---------|
| **Chant appliqué** | 80-100ms | Sélection d'un chant | Confirmation | `chant-applied.mp3` |
| **Dimension modifiée** | 50-70ms | Changement longueur/largeur | Feedback | `dimension.mp3` |
| **Groupe créé** | 150-200ms | Création d'un groupe | Progression | `group-created.mp3` |
| **Coupe calculée** | 120-150ms | Calcul de débit terminé | Résultat | `cut-calculated.mp3` |

---

### 2.3 Sons contextuels (Phase 2)

Pour plus tard, des sons adaptés au contexte :

| Contexte | Variation sonore |
|----------|------------------|
| Mode multicouche | Sons plus "riches", harmoniques |
| Grosse commande (>50 panneaux) | Son de succès amplifié |
| Premier utilisateur | Sons de bienvenue/tutoriel |
| Erreur critique | Son distinct des erreurs mineures |

---

## 3. Architecture Technique

### 3.1 Structure des fichiers

```
cutx-frontend/
├── public/
│   └── sounds/
│       ├── logo/
│       │   └── cutx-logo.mp3
│       ├── actions/
│       │   ├── add-panel.mp3
│       │   ├── validate.mp3
│       │   ├── success.mp3
│       │   └── drop.mp3
│       ├── navigation/
│       │   ├── tab.mp3
│       │   ├── modal-open.mp3
│       │   └── modal-close.mp3
│       ├── alerts/
│       │   ├── warning.mp3
│       │   ├── error.mp3
│       │   └── notification.mp3
│       └── configurateur/
│           ├── chant-applied.mp3
│           ├── dimension.mp3
│           ├── group-created.mp3
│           └── cut-calculated.mp3
```

### 3.2 Composants React

```
cutx-frontend/src/
├── contexts/
│   └── SoundContext.tsx          # Provider global
├── hooks/
│   └── useSoundEffects.ts        # Hook principal
├── lib/
│   └── sounds/
│       ├── index.ts              # Exports
│       ├── sound-manager.ts      # Classe de gestion
│       └── sound-config.ts       # Configuration des sons
└── components/
    └── settings/
        └── SoundSettings.tsx     # UI préférences utilisateur
```

### 3.3 API du hook

```typescript
// Usage dans un composant
const { play, setVolume, setEnabled, isEnabled } = useSoundEffects();

// Jouer un son
play('add-panel');
play('success');
play('logo'); // Son signature

// Gérer les préférences
setVolume(0.7);      // 0 à 1
setEnabled(false);   // Mute global
```

### 3.4 Configuration

```typescript
// sound-config.ts
export const SOUND_CONFIG = {
  logo: {
    file: '/sounds/logo/cutx-logo.mp3',
    volume: 0.8,
    category: 'branding',
  },
  'add-panel': {
    file: '/sounds/actions/add-panel.mp3',
    volume: 0.5,
    category: 'action',
  },
  // ... etc
};

export type SoundName = keyof typeof SOUND_CONFIG;
```

### 3.5 Persistance des préférences

```typescript
// Stockage localStorage
interface SoundPreferences {
  enabled: boolean;
  volume: number;
  categoryVolumes: {
    branding: number;
    action: number;
    navigation: number;
    alert: number;
  };
}
```

---

## 4. Spécifications Audio

### 4.1 Format des fichiers

| Attribut | Valeur | Raison |
|----------|--------|--------|
| **Format principal** | MP3 | Compatibilité universelle |
| **Format fallback** | OGG | Meilleure compression |
| **Sample rate** | 44.1 kHz | Standard web |
| **Bit rate** | 128-192 kbps | Qualité/taille équilibré |
| **Canaux** | Stéréo | Richesse sonore |

### 4.2 Contraintes techniques

- **Taille max par fichier** : 50 KB (micro-sons), 200 KB (logo)
- **Latence cible** : < 50ms entre action et son
- **Préchargement** : Sons fréquents préchargés au démarrage
- **Fallback silencieux** : Si erreur audio, aucune erreur visible

### 4.3 Web Audio API

Utilisation de l'API native pour :
- Latence minimale
- Contrôle précis du volume
- Pas de dépendance externe
- Gestion du contexte audio (autoplay policies)

---

## 5. UX des préférences utilisateur

### 5.1 Paramètres disponibles

```
┌─────────────────────────────────────────────┐
│  🔊 Sons et notifications                   │
├─────────────────────────────────────────────┤
│                                             │
│  ☑ Activer les sons                         │
│                                             │
│  Volume général          ━━━━━━━━━○━━ 70%   │
│                                             │
│  ▼ Paramètres avancés                       │
│  ┌─────────────────────────────────────┐    │
│  │ Sons d'actions        ━━━━━━○━━━━ 50%│   │
│  │ Sons de navigation    ━━━━○━━━━━━ 40%│   │
│  │ Sons d'alertes        ━━━━━━━━○━━ 70%│   │
│  └─────────────────────────────────────┘    │
│                                             │
│  [🔊 Tester le son]                         │
│                                             │
└─────────────────────────────────────────────┘
```

### 5.2 Comportement par défaut

- **Sons activés** : Oui (opt-out, pas opt-in)
- **Volume par défaut** : 50%
- **Respect autoplay** : Premier son après interaction utilisateur

---

## 6. Plan d'implémentation

### Phase 1 : Infrastructure (Sprint 1)

- [ ] Créer la structure de dossiers `/public/sounds/`
- [ ] Implémenter `SoundContext.tsx`
- [ ] Implémenter `useSoundEffects.ts`
- [ ] Implémenter `sound-manager.ts` avec Web Audio API
- [ ] Ajouter des sons placeholder (beeps génériques)
- [ ] Tester l'intégration basique

### Phase 2 : Intégration Configurateur (Sprint 1-2)

- [ ] Intégrer son "ajout panneau"
- [ ] Intégrer son "validation chant"
- [ ] Intégrer son "modification dimension"
- [ ] Intégrer son "création groupe"
- [ ] Intégrer sons de drag & drop
- [ ] Intégrer son "calcul terminé"

### Phase 3 : Création des sons définitifs (Sprint 2)

- [ ] Créer le logo sonore CutX (Suno AI)
- [ ] Créer les micro-sons (ElevenLabs / sound designer)
- [ ] Valider chaque son (session de test)
- [ ] Remplacer les placeholders

### Phase 4 : Préférences utilisateur (Sprint 2)

- [ ] Créer `SoundSettings.tsx`
- [ ] Intégrer dans la page Settings
- [ ] Persistance localStorage
- [ ] Tests utilisateurs

### Phase 5 : Polish (Sprint 3)

- [ ] Sons contextuels (multicouche, grosses commandes)
- [ ] Optimisation performance (préchargement intelligent)
- [ ] Analytics (quels sons déclenchés, préférences utilisateurs)
- [ ] Documentation finale

---

## 7. Création des sons

### 7.1 Logo sonore - Suno AI

**Prompt recommandé :**
```
Short 2 second audio logo, modern minimalist,
satisfying resolution, subtle wood/organic texture,
tech startup premium feel, Hans Zimmer inspiration,
no vocals, cinematic but brief
```

**Itérations prévues :** 10-20 générations, sélection des 3 meilleurs, vote final.

### 7.2 Micro-sons - Options

| Option | Avantages | Inconvénients | Coût |
|--------|-----------|---------------|------|
| **ElevenLabs Sound Effects** | IA, rapide, custom | Qualité variable | ~$20/mois |
| **Sound designer Fiverr** | Pro, unique, cohérent | Délai, itérations | 200-500€ |
| **Bibliothèque pro (Artlist)** | Qualité garantie | Pas unique | ~$200/an |
| **Mix des 3** | Flexibilité | Coordination | Variable |

**Recommandation :** Commencer avec ElevenLabs pour prototyper, puis sound designer pour finaliser.

---

## 8. Métriques de succès

### 8.1 Objectifs

| Métrique | Cible | Mesure |
|----------|-------|--------|
| **Adoption** | >70% utilisateurs gardent sons activés | Analytics |
| **Satisfaction** | >4/5 dans feedback utilisateur | Survey |
| **Performance** | <50ms latence son | Monitoring |
| **Reconnaissance** | "C'est le son CutX" | Tests utilisateurs |

### 8.2 Feedback à collecter

- Quels sons sont désactivés en premier ?
- Volume moyen choisi par les utilisateurs
- Corrélation sons activés / temps passé sur l'app
- Feedback qualitatif (trop fort, trop fréquent, manquant ?)

---

## 9. Références techniques

### Documentation

- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Autoplay Policy - Chrome](https://developer.chrome.com/blog/autoplay/)
- [Sound Design for UI - Nielsen Norman](https://www.nngroup.com/articles/sound-design-ui/)

### Outils

- **Suno AI** : Génération de logos sonores
- **ElevenLabs Sound Effects** : Génération d'effets sonores IA
- **Audacity** : Édition audio gratuite
- **Adobe Audition** : Édition audio pro

---

## 10. Annexes

### A. Exemples de code

#### SoundContext.tsx (squelette)

```typescript
'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SoundManager } from '@/lib/sounds/sound-manager';
import type { SoundName } from '@/lib/sounds/sound-config';

interface SoundContextType {
  play: (sound: SoundName) => void;
  setVolume: (volume: number) => void;
  setEnabled: (enabled: boolean) => void;
  isEnabled: boolean;
  volume: number;
}

const SoundContext = createContext<SoundContextType | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [manager] = useState(() => new SoundManager());
  const [isEnabled, setIsEnabled] = useState(true);
  const [volume, setVolumeState] = useState(0.5);

  // ... implémentation

  return (
    <SoundContext.Provider value={{ play, setVolume, setEnabled, isEnabled, volume }}>
      {children}
    </SoundContext.Provider>
  );
}

export const useSoundEffects = () => {
  const context = useContext(SoundContext);
  if (!context) throw new Error('useSoundEffects must be used within SoundProvider');
  return context;
};
```

### B. Checklist de validation son

Pour chaque son créé :

- [ ] Durée respectée (cf. spécifications)
- [ ] Pas de clipping (saturation)
- [ ] Cohérent avec les autres sons de la famille
- [ ] Testé sur haut-parleurs ET casque
- [ ] Testé à volume bas ET volume haut
- [ ] Pas de silence au début (latence perçue)
- [ ] Fade out propre (pas de clic en fin)
- [ ] Taille fichier optimisée

---

**Document maintenu par :** Équipe CutX
**Dernière mise à jour :** 17 janvier 2026
