# Frontend Design 2 - Cowork Dark Style

## Metadata
- name: frontend-design-2
- description: Design system moderne inspiré de Cowork - Dark mode avec accents corail/orange
- version: 1.0.0
- trigger: Utiliser pour créer des interfaces dark mode modernes avec style "productivity app"

## Description

Ce skill définit un design system inspiré de l'interface **Cowork** (Anthropic). Style dark mode élégant avec accents corail, parfait pour les applications de productivité et les dashboards.

## Caractéristiques Clés

- **Dark mode natif** - Fond noir profond, pas de mode clair
- **Accent corail/orange** - Couleur chaude et énergique
- **Layout 3 colonnes** - Sidebar gauche, contenu central, panneau contextuel
- **Cards minimalistes** - Fond semi-transparent, bordures subtiles
- **Progress indicators** - Cercles et étapes visuelles
- **Glassmorphism léger** - Blur et transparence sur les panneaux

---

## Palette de Couleurs

### Couleurs d'Accent

| Nom | Hex | Tailwind | Usage |
|-----|-----|----------|-------|
| Coral | `#FF6B4A` | `text-[#FF6B4A]` | Accent principal, CTAs |
| Coral Light | `#FF7A5C` | `text-[#FF7A5C]` | Hover, highlights |
| Coral Soft | `#FF8F75` | `text-[#FF8F75]` | Icônes actives |
| Green Accent | `#10B981` | `text-emerald-500` | Success, boutons positifs |
| Blue Accent | `#3B82F6` | `text-blue-500` | Links, info |

### Fonds (du plus sombre au plus clair)

| Nom | Hex | Tailwind | Usage |
|-----|-----|----------|-------|
| Background | `#0A0A0A` | `bg-[#0A0A0A]` | Fond principal |
| Surface 1 | `#111111` | `bg-[#111111]` | Sidebars |
| Surface 2 | `#1A1A1A` | `bg-[#1A1A1A]` | Cards, panneaux |
| Surface 3 | `#222222` | `bg-[#222222]` | Hover states |
| Surface 4 | `#2A2A2A` | `bg-[#2A2A2A]` | Éléments surélevés |

### Bordures

| Nom | Hex | Tailwind | Usage |
|-----|-----|----------|-------|
| Border Subtle | `#1F1F1F` | `border-[#1F1F1F]` | Séparateurs discrets |
| Border Default | `#2A2A2A` | `border-[#2A2A2A]` | Bordures cards |
| Border Hover | `#3A3A3A` | `border-[#3A3A3A]` | Hover, focus |

### Texte

| Nom | Hex | Tailwind | Usage |
|-----|-----|----------|-------|
| Text Primary | `#FFFFFF` | `text-white` | Titres, texte important |
| Text Secondary | `#E5E5E5` | `text-[#E5E5E5]` | Corps de texte |
| Text Muted | `#A0A0A0` | `text-[#A0A0A0]` | Labels, placeholders |
| Text Disabled | `#666666` | `text-[#666666]` | Éléments désactivés |

---

## Typographie

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Échelle

| Nom | Taille | Weight | Usage |
|-----|--------|--------|-------|
| Display | 32px | 600 | Hero titles |
| H1 | 24px | 600 | Page titles |
| H2 | 20px | 600 | Section titles |
| H3 | 16px | 500 | Card titles |
| Body | 14px | 400 | Texte courant |
| Small | 13px | 400 | Labels, captions |
| XS | 12px | 400 | Badges, hints |

### Tailwind Classes
```html
<!-- Display -->
<h1 class="text-3xl font-semibold text-white">Let's knock something off your list</h1>

<!-- Section title -->
<h2 class="text-xl font-semibold text-white">Progress</h2>

<!-- Body text -->
<p class="text-sm text-[#A0A0A0]">Steps will show as the task unfolds.</p>
```

---

## Espacements

| Token | Valeur | Usage |
|-------|--------|-------|
| xs | 4px | Gaps internes |
| sm | 8px | Padding inputs |
| md | 12px | Gaps entre éléments |
| lg | 16px | Padding cards |
| xl | 24px | Sections |
| 2xl | 32px | Marges principales |
| 3xl | 48px | Espaces larges |

---

## Border Radius

| Token | Valeur | Usage |
|-------|--------|-------|
| sm | 6px | Inputs, badges |
| md | 8px | Buttons |
| lg | 12px | Cards |
| xl | 16px | Panneaux |
| full | 9999px | Avatars, pills |

---

## Composants

### 1. Layout 3 Colonnes

```tsx
<div className="flex h-screen bg-[#0A0A0A]">
  {/* Sidebar gauche */}
  <aside className="w-[240px] border-r border-[#1F1F1F] bg-[#111111] flex flex-col">
    {/* Tabs */}
    <div className="flex border-b border-[#1F1F1F]">
      <button className="px-4 py-3 text-sm text-[#A0A0A0] hover:text-white">Chat</button>
      <button className="px-4 py-3 text-sm text-[#A0A0A0] hover:text-white">Code</button>
      <button className="px-4 py-3 text-sm text-white bg-[#1A1A1A] rounded-t-lg">Cowork</button>
    </div>

    {/* New Task Button */}
    <button className="m-4 flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20">
      <Plus size={16} />
      <span className="text-sm font-medium">New task</span>
    </button>

    {/* Task List */}
    <div className="flex-1 overflow-y-auto px-2">
      {/* Task items */}
    </div>

    {/* Footer note */}
    <p className="p-4 text-xs text-[#666666]">
      These tasks run locally and aren't synced across devices.
    </p>
  </aside>

  {/* Zone centrale */}
  <main className="flex-1 flex flex-col items-center justify-center p-8">
    {/* Content */}
  </main>

  {/* Sidebar droite */}
  <aside className="w-[280px] border-l border-[#1F1F1F] bg-[#111111] p-4 space-y-4">
    {/* Panels */}
  </aside>
</div>
```

### 2. Hero Section avec Logo Animé

```tsx
<div className="flex flex-col items-center text-center max-w-xl">
  {/* Logo animé */}
  <div className="w-16 h-16 mb-6 animate-pulse">
    <svg viewBox="0 0 64 64" className="text-[#FF6B4A]">
      {/* Logo géométrique style origami/éclair */}
      <path
        fill="currentColor"
        d="M32 4L8 36h16L20 60l36-32H40L44 4H32z"
      />
    </svg>
  </div>

  {/* Titre principal */}
  <h1 className="text-3xl font-semibold text-white mb-4">
    Let's knock something off your list
  </h1>

  {/* Info banner */}
  <div className="w-full p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] mb-8">
    <p className="text-sm text-[#A0A0A0]">
      Cowork is an early research preview. New improvements ship frequently.{' '}
      <a href="#" className="text-[#FF6B4A] hover:underline">Learn more</a>
      {' '}or{' '}
      <a href="#" className="text-[#FF6B4A] hover:underline">give us feedback</a>.
    </p>
  </div>
</div>
```

### 3. Action Cards Grid (2x3)

```tsx
const actions = [
  { icon: FileText, label: 'Create a file' },
  { icon: Database, label: 'Crunch data' },
  { icon: Layers, label: 'Make a prototype' },
  { icon: FolderOpen, label: 'Organize files' },
  { icon: Calendar, label: 'Prep for the day' },
  { icon: MessageSquare, label: 'Send a message' },
];

<div className="grid grid-cols-3 gap-3 w-full max-w-2xl">
  {actions.map(({ icon: Icon, label }) => (
    <button
      key={label}
      className="flex items-center gap-3 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl
                 hover:bg-[#222222] hover:border-[#3A3A3A] transition-all duration-200
                 group"
    >
      <div className="p-2 bg-[#2A2A2A] rounded-lg group-hover:bg-[#3A3A3A]">
        <Icon size={18} className="text-[#A0A0A0] group-hover:text-white" />
      </div>
      <span className="text-sm text-[#E5E5E5] group-hover:text-white">{label}</span>
    </button>
  ))}
</div>
```

### 4. Panneau Collapsible (Progress/Artifacts/Context)

```tsx
interface PanelProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsiblePanel({ title, icon, children, defaultOpen = true }: PanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#222222]"
      >
        <div className="flex items-center gap-3">
          <div className="text-[#A0A0A0]">{icon}</div>
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-[#666666] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

{/* Usage */}
<CollapsiblePanel title="Progress" icon={<Activity size={18} />}>
  <div className="flex items-center gap-2 mb-3">
    <div className="w-6 h-6 rounded-full border-2 border-emerald-500 flex items-center justify-center">
      <Check size={12} className="text-emerald-500" />
    </div>
    <div className="w-6 h-6 rounded-full border-2 border-emerald-500" />
    <div className="w-6 h-6 rounded-full border-2 border-[#3A3A3A]" />
  </div>
  <p className="text-xs text-[#666666]">Steps will show as the task unfolds.</p>
</CollapsiblePanel>
```

### 5. Progress Indicators (Cercles)

```tsx
type StepStatus = 'completed' | 'current' | 'pending';

interface Step {
  status: StepStatus;
  label?: string;
}

function ProgressSteps({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div
            className={`
              w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all
              ${step.status === 'completed'
                ? 'bg-emerald-500/20 border-emerald-500'
                : step.status === 'current'
                ? 'border-[#FF6B4A] bg-[#FF6B4A]/10'
                : 'border-[#3A3A3A] bg-transparent'
              }
            `}
          >
            {step.status === 'completed' && (
              <Check size={14} className="text-emerald-500" />
            )}
            {step.status === 'current' && (
              <div className="w-2 h-2 rounded-full bg-[#FF6B4A]" />
            )}
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-4 h-0.5 ${
                step.status === 'completed' ? 'bg-emerald-500' : 'bg-[#3A3A3A]'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
```

### 6. Task Item (Sidebar)

```tsx
function TaskItem({ task, isActive }: { task: Task; isActive: boolean }) {
  return (
    <button
      className={`
        w-full text-left p-3 rounded-lg transition-all
        ${isActive
          ? 'bg-[#1A1A1A] border border-[#2A2A2A]'
          : 'hover:bg-[#1A1A1A]/50'
        }
      `}
    >
      <p className={`text-sm truncate ${isActive ? 'text-white' : 'text-[#A0A0A0]'}`}>
        {task.title}
      </p>
      {task.subtitle && (
        <p className="text-xs text-[#666666] truncate mt-1">{task.subtitle}</p>
      )}
    </button>
  );
}
```

### 7. Input Field

```tsx
<div className="relative">
  <input
    type="text"
    placeholder="Describe your task..."
    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl
               text-sm text-white placeholder:text-[#666666]
               focus:outline-none focus:border-[#FF6B4A] focus:ring-1 focus:ring-[#FF6B4A]/20
               transition-all"
  />
  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#A0A0A0] hover:text-[#FF6B4A]">
    <ArrowRight size={18} />
  </button>
</div>
```

### 8. Notification Banner (Info)

```tsx
<div className="flex items-start gap-3 p-4 bg-[#FF6B4A]/10 border border-[#FF6B4A]/20 rounded-xl">
  <Info size={18} className="text-[#FF6B4A] mt-0.5 flex-shrink-0" />
  <div>
    <p className="text-sm text-white font-medium">New feature available</p>
    <p className="text-xs text-[#A0A0A0] mt-1">
      You can now export your tasks to multiple formats.
    </p>
  </div>
  <button className="ml-auto text-[#666666] hover:text-white">
    <X size={16} />
  </button>
</div>
```

---

## Animations

### Pulse subtil (Logo)
```css
@keyframes pulse-soft {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(0.98); }
}

.animate-pulse-soft {
  animation: pulse-soft 3s ease-in-out infinite;
}
```

### Fade in
```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
```

### Transitions standards
```tsx
// Pour tous les éléments interactifs
className="transition-all duration-200"

// Pour les couleurs uniquement
className="transition-colors duration-150"
```

---

## Tailwind Config Extensions

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        cowork: {
          bg: '#0A0A0A',
          surface: {
            1: '#111111',
            2: '#1A1A1A',
            3: '#222222',
            4: '#2A2A2A',
          },
          border: {
            subtle: '#1F1F1F',
            default: '#2A2A2A',
            hover: '#3A3A3A',
          },
          coral: {
            DEFAULT: '#FF6B4A',
            light: '#FF7A5C',
            soft: '#FF8F75',
          },
          text: {
            primary: '#FFFFFF',
            secondary: '#E5E5E5',
            muted: '#A0A0A0',
            disabled: '#666666',
          },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(0.98)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
};
```

---

## Principes de Design

### 1. Hiérarchie Visuelle
- **Corail** = Action principale, accent
- **Vert (emerald)** = Success, création
- **Blanc** = Éléments importants
- **Gris** = Éléments secondaires

### 2. Densité d'Information
- Beaucoup d'espace blanc (noir)
- Groupes d'éléments bien séparés
- Pas de surcharge visuelle

### 3. Feedback Visuel
- Hover states sur tous les éléments cliquables
- Transitions douces (200ms)
- Focus visible pour l'accessibilité

### 4. Consistance
- Border radius uniforme par catégorie
- Espacements réguliers
- Palette de couleurs limitée

---

## Exemples d'Application

### Page d'accueil style Cowork
```tsx
export default function HomePage() {
  return (
    <div className="flex h-screen bg-[#0A0A0A]">
      <LeftSidebar />

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <AnimatedLogo />
        <h1 className="text-3xl font-semibold text-white mt-6 mb-4">
          Let's knock something off your list
        </h1>
        <InfoBanner />
        <ActionCardsGrid />
      </main>

      <RightSidebar>
        <ProgressPanel />
        <ArtifactsPanel />
        <ContextPanel />
      </RightSidebar>
    </div>
  );
}
```

### Dashboard avec métriques
```tsx
export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] p-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <button className="px-4 py-2 bg-[#FF6B4A] text-white rounded-lg hover:bg-[#FF7A5C]">
          New Project
        </button>
      </header>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard title="Total Tasks" value="128" change="+12%" />
        <MetricCard title="Completed" value="94" change="+8%" />
        <MetricCard title="In Progress" value="24" />
        <MetricCard title="Efficiency" value="73%" change="+5%" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <TaskList className="col-span-2" />
        <ActivityFeed />
      </div>
    </div>
  );
}
```

---

## Checklist Avant Livraison

- [ ] Fond principal = `#0A0A0A` (pas de gris)
- [ ] Accents corail cohérents
- [ ] Hover states sur tous les boutons
- [ ] Transitions 200ms
- [ ] Border radius 12px pour les cards
- [ ] Texte muted = `#A0A0A0`
- [ ] Pas de couleurs saturées autres que corail/vert
- [ ] Espacements réguliers (multiples de 4px)
