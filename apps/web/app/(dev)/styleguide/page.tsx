import { notFound } from "next/navigation";

/**
 * Design tokens styleguide — dev only.
 *
 * Route: /styleguide (the `(dev)` route group does not affect the URL).
 * Server Component: pure rendering, no interactivity. Renders every design
 * token defined in `@modulo/ui/tokens` so the system can be eyeballed.
 *
 * No hardcoded colors: every swatch is painted through a Tailwind utility
 * (which resolves to `var(--token)`) or an inline `var(--token)` reference.
 */

interface Swatch {
  token: string;
  value: string;
  className: string;
}

const SURFACES: readonly Swatch[] = [
  {
    token: "--surface-0",
    value: "oklch(0.18 0.005 250)",
    className: "bg-surface-0",
  },
  {
    token: "--surface-1",
    value: "oklch(0.21 0.005 250)",
    className: "bg-surface-1",
  },
  {
    token: "--surface-2",
    value: "oklch(0.24 0.006 250)",
    className: "bg-surface-2",
  },
  {
    token: "--surface-3",
    value: "oklch(0.28 0.007 250)",
    className: "bg-surface-3",
  },
];

const BORDERS: readonly Swatch[] = [
  {
    token: "--border-subtle",
    value: "oklch(0.28 0.005 250 / 0.6)",
    className: "border-border-subtle",
  },
  {
    token: "--border-default",
    value: "oklch(0.35 0.006 250 / 0.8)",
    className: "border-border-default",
  },
  {
    token: "--border-strong",
    value: "oklch(0.45 0.008 250)",
    className: "border-border-strong",
  },
];

const TEXT_COLORS: readonly Swatch[] = [
  {
    token: "--text-primary",
    value: "oklch(0.97 0.005 250)",
    className: "text-text-primary",
  },
  {
    token: "--text-secondary",
    value: "oklch(0.75 0.005 250)",
    className: "text-text-secondary",
  },
  {
    token: "--text-tertiary",
    value: "oklch(0.55 0.005 250)",
    className: "text-text-tertiary",
  },
  {
    token: "--text-disabled",
    value: "oklch(0.40 0.005 250)",
    className: "text-text-disabled",
  },
];

const ACCENTS: readonly Swatch[] = [
  {
    token: "--accent",
    value: "oklch(0.72 0.18 145)",
    className: "bg-accent",
  },
  {
    token: "--accent-hover",
    value: "oklch(0.78 0.18 145)",
    className: "bg-accent-hover",
  },
  {
    token: "--accent-foreground",
    value: "oklch(0.15 0.01 145)",
    className: "bg-accent-foreground",
  },
  {
    token: "--accent-muted",
    value: "oklch(0.72 0.18 145 / 0.12)",
    className: "bg-accent-muted",
  },
];

const SEMANTIC: readonly Swatch[] = [
  {
    token: "--success",
    value: "oklch(0.72 0.15 150)",
    className: "bg-success",
  },
  {
    token: "--warning",
    value: "oklch(0.80 0.15 75)",
    className: "bg-warning",
  },
  {
    token: "--danger",
    value: "oklch(0.68 0.20 25)",
    className: "bg-danger",
  },
  { token: "--info", value: "oklch(0.70 0.15 230)", className: "bg-info" },
];

interface TypeSample {
  token: string;
  size: string;
  className: string;
}

const TYPE_SCALE: readonly TypeSample[] = [
  { token: "--text-2xs", size: "11px", className: "text-2xs" },
  { token: "--text-xs", size: "12px", className: "text-xs" },
  { token: "--text-sm", size: "13px", className: "text-sm" },
  { token: "--text-base", size: "14px", className: "text-base" },
  { token: "--text-md", size: "15px", className: "text-md" },
  { token: "--text-lg", size: "17px", className: "text-lg" },
  { token: "--text-xl", size: "20px", className: "text-xl" },
  { token: "--text-2xl", size: "24px", className: "text-2xl" },
  { token: "--text-3xl", size: "30px", className: "text-3xl" },
  { token: "--text-4xl", size: "36px", className: "text-4xl" },
];

interface RadiusSample {
  token: string;
  value: string;
  className: string;
}

const RADII: readonly RadiusSample[] = [
  { token: "--radius-sm", value: "6px", className: "rounded-sm" },
  { token: "--radius-md", value: "8px", className: "rounded-md" },
  { token: "--radius-lg", value: "12px", className: "rounded-lg" },
  { token: "--radius-xl", value: "16px", className: "rounded-xl" },
];

interface ShadowSample {
  token: string;
  className: string;
}

const SHADOWS: readonly ShadowSample[] = [
  { token: "--shadow-sm", className: "shadow-sm" },
  { token: "--shadow-md", className: "shadow-md" },
  { token: "--shadow-lg", className: "shadow-lg" },
  { token: "--shadow-glow", className: "shadow-glow" },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border-subtle py-12">
      <h2 className="text-xl font-medium tracking-tight text-text-primary">
        {title}
      </h2>
      <p className="mt-1 max-w-xl text-sm text-text-tertiary">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function TokenLabel({ token, value }: { token: string; value?: string }) {
  return (
    <div className="mt-3">
      <p className="font-mono text-2xs tracking-wide text-text-secondary">
        {token}
      </p>
      {value ? (
        <p className="mt-0.5 font-mono text-2xs text-text-tertiary">{value}</p>
      ) : null}
    </div>
  );
}

export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-8 py-16">
      <header>
        <p className="font-mono text-2xs uppercase tracking-wide text-text-tertiary">
          Dev only
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-text-primary">
          Design tokens
        </h1>
        <p className="mt-2 max-w-xl text-md text-text-secondary">
          Référence visuelle du design system Modulo. Toutes les valeurs
          proviennent de{" "}
          <span className="font-mono text-sm">@modulo/ui/tokens</span>.
        </p>
      </header>

      <Section
        title="Surfaces"
        description="Arrière-plans hiérarchisés, du fond d'app aux états de survol."
      >
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {SURFACES.map((s) => (
            <div key={s.token}>
              <div
                className={`${s.className} h-20 rounded-lg border border-border-subtle`}
              />
              <TokenLabel token={s.token} value={s.value} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Borders"
        description="Trois intensités de bordure, du séparateur discret au contour marqué."
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {BORDERS.map((b) => (
            <div key={b.token}>
              <div
                className={`${b.className} h-20 rounded-lg border-2 bg-surface-1`}
              />
              <TokenLabel token={b.token} value={b.value} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Texte"
        description="Quatre niveaux de contraste — la hiérarchie passe par la couleur, pas la taille."
      >
        <div className="rounded-lg bg-surface-0 p-6">
          {TEXT_COLORS.map((t) => (
            <div
              key={t.token}
              className="flex items-baseline justify-between gap-4 py-2"
            >
              <span className={`${t.className} text-md`}>
                The quick brown fox jumps over the lazy dog
              </span>
              <span className="shrink-0 font-mono text-2xs text-text-tertiary">
                {t.token}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Accent"
        description="Couleur de marque et ses variantes. Réécrite au runtime par le theming tenant."
      >
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {ACCENTS.map((a) => (
            <div key={a.token}>
              <div
                className={`${a.className} h-20 rounded-lg border border-border-subtle`}
              />
              <TokenLabel token={a.token} value={a.value} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Sémantique"
        description="Couleurs de statut : succès, avertissement, danger, information."
      >
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {SEMANTIC.map((s) => (
            <div key={s.token}>
              <div
                className={`${s.className} h-20 rounded-lg border border-border-subtle`}
              />
              <TokenLabel token={s.token} value={s.value} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Échelle typographique"
        description="Dix tailles, de la meta-label 11px au hero marketing 36px. Body par défaut : 14px."
      >
        <div className="rounded-lg bg-surface-1 p-6">
          {TYPE_SCALE.map((t) => (
            <div
              key={t.token}
              className="flex items-baseline gap-6 border-b border-border-subtle py-3 last:border-b-0"
            >
              <span
                className={`${t.className} w-24 shrink-0 font-medium tracking-tight text-text-primary`}
              >
                Aa
              </span>
              <span className="font-mono text-2xs text-text-secondary">
                {t.token}
              </span>
              <span className="ml-auto font-mono text-2xs text-text-tertiary">
                {t.size}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Radius"
        description="Quatre rayons d'arrondi, des inputs aux modals."
      >
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {RADII.map((r) => (
            <div key={r.token}>
              <div
                className={`${r.className} h-20 border border-border-strong bg-surface-2`}
              />
              <TokenLabel token={r.token} value={r.value} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Shadows"
        description="Quatre niveaux d'élévation, incluant le glow accentué."
      >
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {SHADOWS.map((s) => (
            <div key={s.token}>
              <div
                className={`${s.className} flex h-20 items-center justify-center rounded-lg bg-surface-2`}
              >
                <span className="font-mono text-2xs text-text-tertiary">
                  {s.token.replace("--shadow-", "")}
                </span>
              </div>
              <TokenLabel token={s.token} />
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
