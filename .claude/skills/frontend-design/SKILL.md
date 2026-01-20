# CutX Frontend Design System

## Metadata
- name: frontend-design
- description: Design system officiel CutX - Style "Precision Workshop" inspiré de Linear/Figma/Notion
- version: 2.1.0
- updated: 2026-01-18
- trigger: Utiliser pour créer des interfaces frontend CutX avec le bon design system

## Description

Ce skill définit le **design system officiel de CutX**. Style dark mode professionnel avec une direction "Precision Workshop" - interfaces précises, techniques et élégantes pour les professionnels du bois.

**Fichier source** : `cutx-frontend/src/app/styles/cutx.css`

---

## Design Thinking Process (Anthropic 2026 Best Practices)

### Avant de coder, s'arrêter et réfléchir :

1. **Purpose** : Quel problème cette interface résout-elle ? Qui l'utilise ?
2. **Tone** : CutX = "Precision Workshop" (voir direction ci-dessous)
3. **Constraints** : Next.js 16, Tailwind v4, Motion 12, dark mode only
4. **Differentiation** : Qu'est-ce qui rend cette interface MÉMORABLE ?

### Principe critique
> "Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work—the key is intentionality, not intensity."

### Ce qu'il ne faut JAMAIS faire

❌ **Esthétiques AI génériques :**
- Polices overused (Inter seul sans Mono, Roboto, Arial, system fonts)
- Schémas de couleurs clichés (purple gradients sur blanc)
- Layouts prévisibles sans caractère
- Design cookie-cutter sans contexte

✅ **Pour CutX, toujours :**
- Inter + JetBrains Mono (système dual intentionnel)
- Palette Olive + Amber sur surfaces sombres
- Densité d'information technique
- Données numériques en monospace

### Matching Complexité-Implémentation

| Vision | Code attendu |
|--------|-------------|
| **Maximalist** | Animations élaborées, effets multiples, transitions riches |
| **Minimalist/Refined** (CutX) | Précision, attention aux espacements, typographie soignée, détails subtils |

CutX est **refined minimalism** : l'élégance vient de l'exécution parfaite de détails subtils, pas de l'excès.

---

## Philosophie de Design

### Direction Artistique : "Precision Workshop"

CutX est un outil pour **professionnels de la découpe de panneaux**. Le design reflète :
- **Précision** : Données techniques lisibles (font mono pour les mesures)
- **Efficacité** : Densité d'information sans surcharge
- **Professionnalisme** : Palette sobre, accents subtils
- **Modernité** : Inspiré de Linear, Figma, Notion

### Principes Clés

1. **Dark Mode Only** - Pas de mode clair, fond charbon profond
2. **Dual Accent** - Olive (technique) + Amber (branding)
3. **Variables CSS** - Toujours utiliser `var(--cx-*)`, jamais de hex directs
4. **Hiérarchie claire** - 4 niveaux de texte, 5 niveaux de surface

---

## Palette de Couleurs

### Accents (Dual System)

| Nom | Variable | Hex | Usage |
|-----|----------|-----|-------|
| **Olive** | `--cx-accent` | `#8B9A4B` | Accent technique : boutons, focus, badges, données |
| Olive Hover | `--cx-accent-hover` | `#9DAC5A` | États hover sur éléments olive |
| Olive Muted | `--cx-accent-muted` | `rgba(139,154,75,0.15)` | Backgrounds subtils |
| Olive Subtle | `--cx-accent-subtle` | `rgba(139,154,75,0.08)` | Hover très léger |
| **Amber** | Tailwind `amber-500` | `#f59e0b` | Branding CutX, CTAs chauds, logo |
| Amber Light | Tailwind `amber-400` | `#fbbf24` | Hover sur CTAs amber |

**Règle d'usage :**
- **Olive** → Données techniques, validation, états actifs, focus rings
- **Amber** → Logo CutX, boutons d'action principaux, highlights importants

### Surfaces (5 niveaux)

| Niveau | Variable | Hex | Usage |
|--------|----------|-----|-------|
| 0 | `--cx-surface-0` | `#141413` | Background principal de l'app |
| 1 | `--cx-surface-1` | `#1A1A19` | Sidebars, panneaux élevés |
| 2 | `--cx-surface-2` | `#1F1F1E` | Cards, modals |
| 3 | `--cx-surface-3` | `#252524` | Hover states |
| 4 | `--cx-surface-4` | `#2B2B29` | Active/pressed states |

**Alias pratique :** `--cx-background` = `--cx-surface-0`

### Bordures

| Nom | Variable | Valeur | Usage |
|-----|----------|--------|-------|
| Subtle | `--cx-border-subtle` | `rgba(255,255,255,0.06)` | Séparateurs discrets |
| Default | `--cx-border-default` | `rgba(255,255,255,0.10)` | Bordures standard |
| Strong | `--cx-border-strong` | `rgba(255,255,255,0.16)` | Hover, focus |
| Accent | `--cx-border-accent` | `rgba(139,154,75,0.4)` | Bordures olive |

**Alias :** `--cx-border` = `--cx-border-default`

### Texte (4 niveaux)

| Niveau | Variable | Valeur | Usage |
|--------|----------|--------|-------|
| Primary | `--cx-text-primary` | `rgba(255,255,255,0.95)` | Titres, texte important |
| Secondary | `--cx-text-secondary` | `rgba(255,255,255,0.72)` | Corps de texte |
| Tertiary | `--cx-text-tertiary` | `rgba(255,255,255,0.50)` | Labels, metadata |
| Muted | `--cx-text-muted` | `rgba(255,255,255,0.32)` | Placeholders, hints |

**Alias :** `--cx-text` = `--cx-text-primary`

### Status Colors

| Status | Couleur | Muted | Usage |
|--------|---------|-------|-------|
| Success | `--cx-success` `#4ADE80` | `--cx-success-muted` | Validations, stock OK |
| Warning | `--cx-warning` `#FBBF24` | `--cx-warning-muted` | Alertes, stock bas |
| Error | `--cx-error` `#F87171` | `--cx-error-muted` | Erreurs, ruptures |
| Info | `--cx-info` `#60A5FA` | `--cx-info-muted` | Informations |

---

## Typographie

### Fonts

```css
--cx-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--cx-font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
```

**Règle :** Utiliser `--cx-font-mono` pour toutes les **données numériques** (dimensions, prix, références).

### Échelle de Tailles

| Token | Variable | Valeur | Usage |
|-------|----------|--------|-------|
| xs | `--cx-text-xs` | 11px | Badges, hints |
| sm | `--cx-text-sm` | 12px | Labels, captions |
| base | `--cx-text-base` | 13px | Texte courant |
| md | `--cx-text-md` | 14px | Boutons, inputs |
| lg | `--cx-text-lg` | 16px | Sous-titres |
| xl | `--cx-text-xl` | 18px | Titres de section |

### Exemples Tailwind

```tsx
{/* Titre de page */}
<h1 className="text-xl font-semibold text-[var(--cx-text-primary)]">
  Configuration de débits
</h1>

{/* Données numériques */}
<span className="font-mono text-sm text-[var(--cx-text-secondary)]">
  2440 × 1220 mm
</span>

{/* Label muted */}
<label className="text-xs text-[var(--cx-text-muted)] uppercase tracking-wide">
  Épaisseur
</label>
```

---

## Espacements

| Token | Variable | Valeur |
|-------|----------|--------|
| 1 | `--cx-space-1` | 4px |
| 2 | `--cx-space-2` | 8px |
| 3 | `--cx-space-3` | 12px |
| 4 | `--cx-space-4` | 16px |
| 5 | `--cx-space-5` | 20px |
| 6 | `--cx-space-6` | 24px |
| 8 | `--cx-space-8` | 32px |
| 10 | `--cx-space-10` | 40px |
| 12 | `--cx-space-12` | 48px |

**Base** : Système en 4px (utiliser multiples de 4).

---

## Border Radius

| Token | Variable | Valeur | Usage |
|-------|----------|--------|-------|
| sm | `--cx-radius-sm` | 4px | Badges, petits éléments |
| md | `--cx-radius-md` | 6px | Boutons, inputs |
| lg | `--cx-radius-lg` | 8px | Cards internes |
| xl | `--cx-radius-xl` | 12px | Panneaux, modals |

---

## Shadows

| Token | Variable | Valeur |
|-------|----------|--------|
| sm | `--cx-shadow-sm` | `0 1px 2px rgba(0,0,0,0.4)` |
| md | `--cx-shadow-md` | `0 4px 12px rgba(0,0,0,0.5)` |
| lg | `--cx-shadow-lg` | `0 8px 24px rgba(0,0,0,0.6)` |
| glow | `--cx-shadow-glow` | `0 0 20px rgba(139,154,75,0.15)` |

---

## Transitions

| Token | Variable | Valeur |
|-------|----------|--------|
| fast | `--cx-transition-fast` | `120ms ease-out` |
| base | `--cx-transition-base` | `200ms ease-out` |
| slow | `--cx-transition-slow` | `300ms ease-out` |

---

## Composants CSS Prédéfinis

### Cards

```tsx
{/* Card basique */}
<div className="cx-card p-4">
  Contenu
</div>

{/* Card interactive (hover glow) */}
<div className="cx-card cx-card--interactive p-4">
  Cliquable
</div>
```

### Boutons

```tsx
{/* Primary (olive) */}
<button className="cx-btn cx-btn--primary">Valider</button>

{/* Secondary */}
<button className="cx-btn cx-btn--secondary">Annuler</button>

{/* Ghost */}
<button className="cx-btn cx-btn--ghost">Options</button>

{/* Accent Ghost (olive transparent) */}
<button className="cx-btn cx-btn--accent-ghost">Ajouter</button>

{/* Tailles */}
<button className="cx-btn cx-btn--primary cx-btn--sm">Petit</button>
<button className="cx-btn cx-btn--primary cx-btn--lg">Grand</button>
```

### Inputs

```tsx
{/* Input standard */}
<input className="cx-input" placeholder="Rechercher..." />

{/* Input monospace (pour données) */}
<input className="cx-input cx-input--mono" value="2440" />

{/* Avec icône */}
<div className="cx-input-wrapper">
  <Search className="cx-input-icon" size={16} />
  <input className="cx-input" />
</div>
```

### Badges

```tsx
<span className="cx-badge cx-badge--success">En stock</span>
<span className="cx-badge cx-badge--warning">Stock bas</span>
<span className="cx-badge cx-badge--error">Rupture</span>
<span className="cx-badge cx-badge--info">Nouveau</span>
<span className="cx-badge cx-badge--neutral">Standard</span>
<span className="cx-badge cx-badge--accent">Sélectionné</span>
```

### Alertes

```tsx
<div className="cx-alert cx-alert--warning">
  <AlertTriangle size={16} />
  <span>Attention : stock limité</span>
</div>
```

---

## Layout Homepage (Pattern Principal)

La homepage CutX utilise un layout **75/25** :

```tsx
<div className="fixed inset-0 bg-[var(--cx-background)] flex">
  {/* Zone gauche - Recherche (75%) */}
  <div className="w-[75%] flex flex-col">
    {/* Header avec logo CutX */}
    <div className="text-center">
      <h1 className="text-6xl font-black tracking-tighter">
        <span className="text-white">Cut</span>
        <span className="text-amber-500">X</span>
      </h1>
    </div>

    {/* Search bar */}
    <HomeSearchBar />

    {/* Résultats */}
    <SearchResults />
  </div>

  {/* Zone droite - Panneau contextuel (25%) */}
  <div className="w-[25%] border-l border-[var(--cx-border)] bg-[var(--cx-surface-1)]/30">
    <FilesPanel />
  </div>
</div>
```

### Logo CutX

```tsx
<h1 className="text-6xl md:text-8xl font-black tracking-tighter">
  <span className="text-white">Cut</span>
  <span className="text-amber-500">X</span>
</h1>
```

**Important** : Le "X" est TOUJOURS en `text-amber-500`.

---

## Animations Prédéfinies

### Classes d'animation

```tsx
{/* Fade in */}
<div className="cx-animate-fade-in">...</div>

{/* Slide up */}
<div className="cx-animate-slide-up">...</div>

{/* Scale in */}
<div className="cx-animate-scale-in">...</div>
```

### Keyframes disponibles (cutx.css)

| Animation | Usage |
|-----------|-------|
| `cx-fade-in` | Apparition douce |
| `cx-slide-up` | Apparition + translation Y |
| `cx-scale-in` | Apparition + scale |
| `cx-pulse` | Pulsation status indicator |
| `drop-zone-pulse` | Bordure pulsante drop zone |
| `panel-rise` | Ghost panel qui monte |
| `float-up` | Flèche flottante |
| `fadeInOut` | Fade in puis out (messages) |

### Exemple animation custom

```tsx
{/* Message temporaire "Lancez-vous" */}
<div style={{ animation: 'fadeInOut 2s ease-in-out forwards' }}>
  <span className="text-lg font-semibold text-white">Lancez-vous !</span>
</div>
```

---

## Patterns Avancés

### Glassmorphism (léger)

```tsx
<div className="bg-[var(--cx-surface-1)]/80 backdrop-blur-xl border border-[var(--cx-border)]">
  Contenu avec blur
</div>
```

### Product Card (homepage)

```tsx
<div className="group p-3 bg-[var(--cx-surface-2)] border border-[var(--cx-border-subtle)]
                rounded-lg hover:border-[var(--cx-border-strong)]
                hover:bg-[var(--cx-surface-3)] transition-all cursor-pointer">
  <img src={imageUrl} className="w-full h-32 object-cover rounded-md mb-3" />
  <p className="text-sm font-medium text-[var(--cx-text)] truncate group-hover:text-amber-500">
    {productName}
  </p>
  <p className="text-xs text-[var(--cx-text-tertiary)] font-mono">
    {dimensions}
  </p>
</div>
```

### Mode Selector (Tabs)

```tsx
<div className="flex gap-1 p-1 bg-[var(--cx-surface-1)] border border-[var(--cx-border)] rounded-lg">
  <button className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
    isActive
      ? 'bg-amber-500/20 text-amber-500'
      : 'text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] hover:bg-white/5'
  }`}>
    Mode 1
  </button>
  <button>Mode 2</button>
</div>
```

### File Drop Zone

```tsx
<div className={`border-2 border-dashed rounded-xl p-6 transition-colors ${
  isDragging
    ? 'border-amber-500 bg-amber-500/5'
    : 'border-[var(--cx-border)] hover:border-[var(--cx-border-strong)]'
}`}>
  <Upload className="w-8 h-8 text-[var(--cx-text-muted)]" />
  <p className="text-sm text-[var(--cx-text-muted)]">
    Glissez vos fichiers ici
  </p>
</div>
```

---

## Tables de Données (Configurateur)

Le configurateur utilise des tables avec colonnes fixes :

```tsx
<div className="cx-table-wrapper">
  <div className="cx-table-scroll">
    <table className="cx-data-table">
      <thead>
        <tr>
          <th className="cx-col-etat">État</th>
          <th className="cx-col-reference">Référence</th>
          <th className="cx-col-dimensions">Dimensions</th>
          <th className="cx-col-prix">Prix</th>
        </tr>
      </thead>
      <tbody>
        {/* Lignes */}
      </tbody>
    </table>
  </div>
</div>
```

Classes de colonnes : `cx-col-etat`, `cx-col-reference`, `cx-col-forme`, `cx-col-dimensions`, `cx-col-chants`, `cx-col-usinages`, `cx-col-percage`, `cx-col-finition`, `cx-col-prix`, `cx-col-actions`

---

## Scrollbars Personnalisées

Les scrollbars sont stylées globalement dans `cutx.css` :
- **Webkit** : Scrollbar fine 8px, thumb semi-transparent
- **Firefox** : `scrollbar-width: thin`
- **Hover** : Le thumb devient plus visible
- **Active** : Accent amber

---

## Checklist Avant Livraison

- [ ] Utiliser uniquement les variables `--cx-*`
- [ ] Logo CutX : "Cut" blanc + "X" amber-500
- [ ] Données numériques en `font-mono`
- [ ] Bordures avec `--cx-border-*` (pas de hex)
- [ ] Hover states sur tous les éléments cliquables
- [ ] Transitions `--cx-transition-base` (200ms)
- [ ] Cards avec `--cx-radius-xl` (12px)
- [ ] Pas de couleurs saturées hors palette
- [ ] Espacements multiples de 4px

---

## Migration depuis Anciens Skills

| Ancien (caisson-designer-ui) | Nouveau |
|------------------------------|---------|
| `--olive` | `var(--cx-accent)` |
| `--noyer` | Supprimé (utiliser `--cx-warning` ou amber) |
| `--bg-card` | `var(--cx-surface-2)` |
| `#0F0E0D` | `var(--cx-surface-0)` |

| Ancien (frontend-design-2) | Nouveau |
|----------------------------|---------|
| `#FF6B4A` (corail) | `text-amber-500` pour CTAs |
| `#0A0A0A` | `var(--cx-surface-0)` |
| `bg-[#1A1A1A]` | `bg-[var(--cx-surface-2)]` |

---

## Motion Best Practices (2026)

### Philosophie Motion
> "Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions."

### Priorités Motion pour CutX

1. **Page Load Orchestration** - Stagger les éléments à l'entrée
2. **Hover States Surprenants** - Pas juste un changement de couleur
3. **CSS-only quand possible** - Utiliser Motion (Framer) seulement pour le complexe

### Exemple Page Load Orchestrée

```tsx
import { motion } from 'motion/react'

// Conteneur avec staggerChildren
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  }}
>
  {items.map((item) => (
    <motion.div
      key={item.id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
    >
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

### Transitions Standards

| Élément | Durée | Easing |
|---------|-------|--------|
| Boutons/Hover | 120ms | ease-out |
| Cards/Apparition | 200ms | ease-out |
| Modals/Overlays | 300ms | ease-out |
| Page transitions | 400-500ms | [0.4, 0, 0.2, 1] |

---

## Screenshot-to-Code Workflow (Opus 4.5)

Opus 4.5 excelle au screenshot-to-code. Pour reproduire un design :

1. **Screenshot** : Fournir une capture d'écran du design cible
2. **Contexte** : Préciser que c'est pour CutX (dark mode, variables `--cx-*`)
3. **Analyse** : Claude analyse la composition, couleurs, typographie
4. **Adaptation** : Transpose vers le design system CutX

### Prompt exemple
```
Voici une capture d'écran d'une interface. Reproduis-la en utilisant le design system CutX :
- Surfaces : var(--cx-surface-*)
- Textes : var(--cx-text-*)
- Accents : Olive pour technique, Amber pour CTAs
- Font mono pour données numériques
```

---

## Core Philosophy

> "Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision."
>
> — Anthropic Frontend Design Skill

Pour CutX, cette vision distinctive est **la précision technique élégante** - un atelier de découpe moderne où chaque pixel a sa place.

---

## Ressources

- **Design System CSS** : `cutx-frontend/src/app/styles/cutx.css`
- **Homepage** : `cutx-frontend/src/app/[locale]/page.tsx`
- **Composants UI** : `cutx-frontend/src/components/ui/`
- **Composants Home** : `cutx-frontend/src/components/home/`
- **Anthropic Frontend Skill** : https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md
