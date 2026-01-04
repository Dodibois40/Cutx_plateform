# Caisson Designer - Charte Graphique CutX

## Metadata
- name: caisson-designer-ui
- description: Charte graphique du configurateur de caissons CutX - Style minimaliste avec palette olive/noyer
- version: 1.0.0

## Description

Ce skill définit la charte graphique du Caisson Designer de CutX. L'objectif est de maintenir une cohérence visuelle avec un style **minimaliste** tout en conservant l'identité CutX.

## Palette de Couleurs

### Couleurs Principales

| Nom | Hex | Usage |
|-----|-----|-------|
| Olive | `#8B9A4B` | Accents principaux, boutons CTA |
| Olive Light | `#A4B563` | Hover, textes actifs |
| Olive Dark | `#6F7A3A` | Dégradés, bordures |
| Noyer | `#8B5A3C` | Accents secondaires, liste de débit |
| Noyer Light | `#A67C5D` | Hover secondaire |

### Couleurs Neutres

| Nom | Hex | Usage |
|-----|-----|-------|
| Fond Principal | `#0F0E0D` | Background de l'app |
| Fond Secondaire | `#1C1B19` | Panneaux, cartes |
| Fond Tertiaire | `#2A2926` | Sections, inputs |
| Bordure | `#3A3835` | Séparateurs |
| Texte Principal | `#F5F4F1` | Titres, texte important |
| Texte Secondaire | `#E0DFDA` | Labels, descriptions |
| Texte Muted | `#B3B1AA` | Placeholders, infos |

## Typographie

- **Police principale**: Plus Jakarta Sans
- **Police mono**: Courier New (pour les valeurs numériques)

### Tailles
- xs: 11px - Labels discrets
- sm: 12px - Labels, petits textes
- base: 13px - Texte courant
- lg: 14px - Boutons, inputs
- xl: 16px - Sous-titres
- 2xl: 18px - Titres de section
- 3xl: 24px - Titres principaux

## Espacements

- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px

## Border Radius

- sm: 6px - Inputs, petits éléments
- md: 8px - Boutons, cartes internes
- lg: 10px - Sections
- xl: 12px - Panneaux principaux

## Règles de Design

1. **Minimalisme**: Éviter les décorations inutiles
2. **Cohérence**: Utiliser les variables CSS définies dans `variables.css`
3. **Hiérarchie**: Olive pour les actions principales, Noyer pour les secondaires
4. **Contraste**: Fond sombre avec texte clair pour la lisibilité
5. **Panneaux**: Utiliser `backdrop-filter: blur(16px)` pour l'effet glassmorphism

## Fichiers CSS

Les styles sont définis dans:
- `public/caisson-designer/css/variables.css` - Tokens de design
- `public/caisson-designer/css/layout.css` - Structure des panneaux
- `public/caisson-designer/css/components.css` - Composants UI
- `public/caisson-designer/css/texture.css` - Panneau textures
- `public/caisson-designer/css/modal.css` - Modales

## Exemple d'Usage

```css
/* Bouton principal */
.btn-primary {
  background: linear-gradient(135deg, var(--olive-dark), var(--olive));
  color: var(--text-primary);
  border: 1px solid var(--olive-border);
  border-radius: var(--radius-md);
}

/* Panneau */
.panel {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  backdrop-filter: blur(16px);
}
```
