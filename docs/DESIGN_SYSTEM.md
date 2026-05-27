# Design System — Modulo

## Direction esthétique : "Editorial Tech"

L'objectif : un look qui **paraît cher** dès l'ouverture, qui inspire confiance à un acheteur B2B, et qui se distingue immédiatement du sea of sameness des SaaS B2B (gros gradient violet, illustration 3D générique, etc.).

**Inspirations explicites** :
- **Linear** pour la densité d'information et la qualité des interactions
- **Vercel** pour la sobriété et la typographie
- **Arc Browser** pour les détails et les micro-animations
- **Stripe** pour la documentation et la pédagogie visuelle
- **Things 3** pour la respiration et la clarté

**Anti-inspirations** (à éviter) :
- Gradients violets/roses 2021
- Illustrations 3D Spline génériques
- Glassmorphism partout
- Emojis dans l'UI
- Avalanche de neumorphism

---

## 1. Tokens — Le cœur du système

Tout passe par des **CSS variables**. Ça permet :
1. Un dark/light mode propre
2. Un theming par tenant (chaque entreprise sa charte)
3. Un système cohérent inviolable

### Palette de base (thème par défaut "Modulo Dark")

```css
:root {
  /* === SURFACES (background hiérarchisé) === */
  --surface-0: oklch(0.18 0.005 250);    /* Fond app */
  --surface-1: oklch(0.21 0.005 250);    /* Cards, sidebar */
  --surface-2: oklch(0.24 0.006 250);    /* Cards élevées, popovers */
  --surface-3: oklch(0.28 0.007 250);    /* Hover states */

  /* === BORDERS === */
  --border-subtle: oklch(0.28 0.005 250 / 0.6);
  --border-default: oklch(0.35 0.006 250 / 0.8);
  --border-strong: oklch(0.45 0.008 250);

  /* === TEXT === */
  --text-primary: oklch(0.97 0.005 250);
  --text-secondary: oklch(0.75 0.005 250);
  --text-tertiary: oklch(0.55 0.005 250);
  --text-disabled: oklch(0.40 0.005 250);

  /* === ACCENT (couleur de marque, customisable par tenant) === */
  --accent: oklch(0.72 0.18 145);          /* Vert électrique par défaut */
  --accent-hover: oklch(0.78 0.18 145);
  --accent-foreground: oklch(0.15 0.01 145);
  --accent-muted: oklch(0.72 0.18 145 / 0.12);

  /* === SÉMANTIQUE === */
  --success: oklch(0.72 0.15 150);
  --warning: oklch(0.80 0.15 75);
  --danger: oklch(0.68 0.20 25);
  --info: oklch(0.70 0.15 230);

  /* Pour chaque couleur sémantique, un token *-foreground garantit la
     lisibilité du texte par-dessus (convention reprise de shadcn). À utiliser
     systématiquement sur les boutons / badges / notifications. */
  --success-foreground: oklch(0.15 0.01 150);
  --warning-foreground: oklch(0.15 0.01 75);
  --danger-foreground: oklch(0.97 0.005 25);
  --info-foreground: oklch(0.97 0.005 230);

  /* === ÉLÉVATION === */
  --shadow-sm: 0 1px 2px 0 oklch(0 0 0 / 0.20);
  --shadow-md: 0 4px 12px -2px oklch(0 0 0 / 0.30);
  --shadow-lg: 0 12px 32px -8px oklch(0 0 0 / 0.40);
  --shadow-glow: 0 0 24px -4px var(--accent);

  /* === RADIUS === */
  --radius-sm: 0.375rem;   /* 6px - inputs, badges */
  --radius-md: 0.5rem;     /* 8px - boutons, cards petites */
  --radius-lg: 0.75rem;    /* 12px - cards principales */
  --radius-xl: 1rem;       /* 16px - modals, panels */

  /* === ESPACEMENT (échelle 4px) === */
  /* Tailwind gère, mais on respecte une grille de 4px stricte */

  /* === ANIMATION === */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 360ms;
}
```

**Pourquoi OKLCH ?** C'est le format moderne, perceptuellement uniforme. Quand on change la teinte (`hue`), la luminosité reste constante — critique pour le theming multi-tenant.

---

## 2. Theming par tenant

Chaque organisation stocke en BDD un objet `theme` :

```typescript
type TenantTheme = {
  accent: { hue: number; chroma: number; lightness: number };  // OKLCH
  surface: { hue: number; chroma: number };                     // teinte du fond
  fontDisplay?: string;                                          // ex: "Inter", "Geist"
  radius: "sharp" | "default" | "rounded";                      // global radius preset
  density: "compact" | "default" | "comfortable";               // spacing preset
};
```

Au chargement de l'app, on injecte ces valeurs comme CSS variables :

```tsx
// apps/web/app/(app)/[orgSlug]/layout.tsx
const themeVars = generateThemeVars(org.theme);
return <div style={themeVars}>{children}</div>;
```

**Conséquence** : tous les composants utilisent `var(--accent)`, jamais `bg-green-500`. Changer la couleur de marque = changer une variable, partout.

---

## 3. Typographie

```css
--font-sans: "Geist", "Inter", system-ui, -apple-system, sans-serif;
--font-mono: "Geist Mono", "JetBrains Mono", ui-monospace, monospace;
--font-display: "Geist", sans-serif;  /* Override possible par tenant */
```

### Échelle typographique

| Token | Taille | Usage |
|-------|--------|-------|
| `text-2xs` | 11px | Labels caps, meta |
| `text-xs` | 12px | Helpers, captions |
| `text-sm` | 13px | UI dense (sidebar, tables) |
| `text-base` | 14px | Body par défaut |
| `text-md` | 15px | Body confortable |
| `text-lg` | 17px | Sous-titres |
| `text-xl` | 20px | Titres de section |
| `text-2xl` | 24px | Titres de page |
| `text-3xl` | 30px | Hero, marketing |
| `text-4xl` | 36px | Hero marketing |

**Règle** : 14px par défaut (pas 16px). Le 16px fait "site grand public", le 14px fait "logiciel pro". Linear, Notion, Figma sont tous à 13-14px.

### Letter-spacing

- Body : `tracking-normal`
- Titres : `tracking-tight` (-0.02em)
- Caps/labels : `tracking-wide` (+0.05em)

---

## 4. Principes UX

### Densité d'information
On vise une **densité élevée mais respirante**. Un dashboard doit montrer beaucoup en un coup d'œil sans donner l'impression d'étouffer.

### Hiérarchie via la couleur, pas la taille
On évite les titres énormes. On hiérarchise par **contraste de texte** (primary / secondary / tertiary) et par **élévation de surface** (surface-0 / surface-1 / surface-2).

### Interactions
- **Tout** doit avoir un état `:hover` distinct (subtil mais visible).
- **Tout clickable** doit avoir un état `:focus-visible` au clavier (ring 2px accent).
- **Loading** = skeleton qui mime le contenu, jamais un spinner centré.
- **Empty states** = illustration légère + CTA + 1 phrase pédagogique.

### Animations
- **Toujours** `ease-out` pour l'entrée, `ease-in-out` pour les transitions d'état.
- **120-360ms max**. Au-delà, on ressent du lag.
- **Framer Motion** pour : page transitions, modals, panel slides, list reorders.
- **CSS pur** pour : hover, focus, color transitions.

### Raccourcis clavier
- `Cmd+K` ouvre la command palette (cmdk).
- `g` puis `s` → Sales. `g` puis `n` → Notes. Etc.
- `?` ouvre le panneau de raccourcis.

---

## 5. Composants prioritaires (shadcn + customs)

Base shadcn à installer en premier :
- `button`, `input`, `select`, `textarea`, `checkbox`, `switch`, `radio-group`
- `dialog`, `sheet`, `popover`, `dropdown-menu`, `tooltip`
- `card`, `tabs`, `table`, `badge`, `avatar`
- `sonner` (toasts), `command` (Cmd+K)

Custom à construire (dans `packages/ui`) :
- `<DataTable />` — Table avancée avec tri, filtres, pagination, virtualisation (TanStack Table)
- `<MetricCard />` — Carte KPI avec valeur, variation, sparkline
- `<EmptyState />` — Standardisation des empty states
- `<PageHeader />` — Titre + actions + breadcrumb
- `<ModuleShell />` — Layout standard pour les pages de module (header + content + sidepanel optionnel)

### Status badges (pattern subtil)

Pour les indicateurs d'état multiples (succès / erreur / warning / info), utiliser inline `bg-{semantic}/10 text-{semantic}` plutôt que le composant `<Badge>` solid. Pattern hérité de shadcn (déjà visible dans `dropdown-menu` destructive). Réserve le composant `<Badge>` pour les labels / actions affirmés. La couleur sémantique est la même dans les deux cas — seul le poids visuel change.

**`bg-{semantic}-muted` vs `bg-{semantic}/10`** — chaque token sémantique expose aussi une variante `*-muted` calibrée par design (`--success-muted`, `--warning-muted`, `--danger-muted`, `--info-muted`). Utilise `*-muted` quand tu veux une teinte calibrée (hover/focus state, divergence light/dark contrôlée, contraste précis avec un foreground). Utilise `/10` quand tu veux juste un voile au-dessus du token sémantique (ad-hoc, suffit pour la plupart des status badges).

---

## 6. Iconographie

- **Lucide React** uniquement. Pas de mix avec d'autres libs.
- Taille standard : 16px dans le texte, 18px dans les boutons, 20px dans la sidebar.
- `strokeWidth={1.5}` par défaut (plus élégant que le 2 par défaut).

---

## 7. Dataviz

Pour Sales Analytics (et tous les modules data) :
- **Recharts** (open-source, customisable) ou **Tremor** (plus rapide à mettre en place)
- Palette dataviz dédiée (séparée de l'accent) :

```css
--chart-1: oklch(0.72 0.18 145);   /* vert */
--chart-2: oklch(0.70 0.15 230);   /* bleu */
--chart-3: oklch(0.80 0.15 75);    /* jaune */
--chart-4: oklch(0.68 0.20 25);    /* orange */
--chart-5: oklch(0.65 0.20 320);   /* violet */
```

Toujours pouvoir basculer en niveaux de gris pour l'accessibilité.

---

## 8. Mode "marketing" vs mode "app"

- **Marketing pages** (landing, pricing) : full bleed, gros titres, animations généreuses, hero typé Linear/Vercel.
- **App** : densité, sobriété, vitesse perçue maximale. Pas de hero, pas d'animation décorative.

Deux ambiances qui partagent les tokens mais s'expriment différemment.
