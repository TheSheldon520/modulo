# Architecture technique — Modulo

## 1. Stack technique

### Frontend
- **Next.js 15** (App Router, React Server Components)
- **TypeScript** strict (`"strict": true`, `"noUncheckedIndexedAccess": true`)
- **Tailwind CSS v4** (via CSS variables — clé du theming multi-tenant)
- **shadcn/ui** comme base de composants (copy-paste, on possède le code)
- **Framer Motion** pour les micro-animations
- **Lucide React** pour les icônes
- **Recharts** pour la dataviz (peut être remplacé par Tremor pour aller plus vite sur Sales Analytics)

### Backend
- **Next.js API routes** + **tRPC v11** (type-safety end-to-end)
- **Drizzle ORM** (préféré à Prisma : plus rapide, plus proche du SQL, meilleur pour le multi-tenant)
- **PostgreSQL** via **Neon** (serverless, branches par environnement)
- **Zod** pour la validation à chaque frontière (API, formulaires, env vars)

### Auth & Multi-tenant
- **Better Auth** (open-source, contrôle total, organisations natives) — alternative : Clerk si on veut aller plus vite
- Modèle : `User` → `Membership` → `Organization` → `enabledModules[]`
- Row-Level Security (RLS) PostgreSQL pour l'isolation tenant (défense en profondeur)

### Billing
- **Stripe** avec **abonnements modulaires**
- Un produit Stripe par module + un produit "plateforme" (accès de base)
- Webhook Stripe → activation/désactivation de modules en temps réel

### Infra
- **Vercel** (hébergement Next.js, edge functions)
- **Neon** (Postgres serverless, branching pour preview)
- **Upstash Redis** (cache, rate limiting, queues légères)
- **Resend** (emails transactionnels)
- **Inngest** (background jobs, workflows IA longs)
- **Cloudflare R2** ou **UploadThing** (stockage fichiers)

### IA
- **SDK Anthropic** côté serveur uniquement (jamais de clé exposée client)
- **Prompt caching** systématique sur les contextes longs (skills, données tenant)
- Routing modèle : **Sonnet** pour 90% des cas, **Opus** uniquement pour analyses complexes ou génération éditoriale soignée
- **Streaming** vers le client via Server-Sent Events

### Observabilité
- **Sentry** (erreurs)
- **PostHog** (analytics produit, feature flags)
- **Axiom** ou **Better Stack** (logs)

---

## 2. Structure du monorepo

Gestionnaire : **pnpm workspaces** + **Turborepo**.

```
modulo/
├── apps/
│   └── web/                          # App Next.js principale
│       ├── app/
│       │   ├── (marketing)/          # Landing publique
│       │   ├── (auth)/               # Login, signup, onboarding
│       │   ├── (app)/                # App authentifiée
│       │   │   ├── [orgSlug]/        # Routes scopées par org
│       │   │   │   ├── layout.tsx    # Sidebar + topbar + modules actifs
│       │   │   │   ├── dashboard/    # Home tenant
│       │   │   │   └── m/            # Modules montés ici
│       │   │   │       ├── sales/    # → @modulo/module-sales
│       │   │   │       ├── notes/    # → @modulo/module-notes
│       │   │   │       └── ...
│       │   │   └── settings/         # Paramètres org (charte, modules, billing)
│       │   └── api/
│       │       ├── trpc/[trpc]/      # tRPC handler
│       │       ├── webhooks/stripe/
│       │       └── ai/               # Routes IA (streaming)
│       └── trpc/
│           └── router.ts             # Agrège les routers de chaque module
│
├── packages/                          # Code partagé entre apps & modules
│   ├── ui/                           # Design system (shadcn-based)
│   │   ├── components/
│   │   ├── tokens/                   # CSS variables, palette, typo
│   │   └── theme-provider/           # Multi-tenant theming
│   ├── db/                           # Schéma Drizzle + migrations
│   │   ├── schema/
│   │   │   ├── core.ts               # users, orgs, memberships
│   │   │   ├── billing.ts            # subscriptions, modules activés
│   │   │   └── index.ts              # ré-exporte tout + schémas modules
│   │   └── client.ts
│   ├── auth/                         # Wrapper Better Auth + helpers
│   ├── api/                          # tRPC core (procedures, middlewares)
│   │   ├── trpc.ts                   # init tRPC
│   │   ├── procedures/               # publicProcedure, orgProcedure, moduleProcedure
│   │   └── context.ts                # createContext (user, org, modules actifs)
│   ├── ai/                           # SDK Anthropic + helpers prompt caching
│   ├── events/                       # Event bus inter-modules (typé)
│   └── config/                       # eslint, tsconfig, tailwind partagés
│
├── modules/                          # Modules métier (1 dossier = 1 module)
│   ├── sales-analytics/
│   │   ├── package.json              # @modulo/module-sales
│   │   ├── module.config.ts          # Métadonnées (id, nom, icône, prix Stripe…)
│   │   ├── schema.ts                 # Tables Drizzle propres au module
│   │   ├── router.ts                 # Router tRPC du module
│   │   ├── components/               # Composants UI propres au module
│   │   ├── pages/                    # Pages exportées (montées dans app/m/sales)
│   │   ├── lib/                      # Logique métier
│   │   └── events.ts                 # Events émis/consommés par le module
│   └── notes/
│       └── ... (même structure)
│
└── turbo.json
```

### Pourquoi cette structure

- **`apps/web`** = shell applicatif. Il ne contient pas de logique métier, juste le routing, l'auth, la sidebar dynamique.
- **`packages/`** = code partagé, stable, peu sujet au changement.
- **`modules/`** = chaque module est un **package isolé**. Il peut être ajouté/retiré sans toucher au shell.
- **Convention d'or** : `apps/web` peut importer depuis `modules/*`, mais un module ne doit JAMAIS importer un autre module. Communication = events ou tRPC.

---

## 3. Schéma BDD — tables core

```typescript
// packages/db/schema/core.ts

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  // Theming personnalisé par tenant
  theme: jsonb("theme").$type<TenantTheme>().default(defaultTheme),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memberships = pgTable("memberships", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  role: text("role", { enum: ["owner", "admin", "member", "viewer"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.userId, t.organizationId),
}));

// packages/db/schema/billing.ts

export const enabledModules = pgTable("enabled_modules", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  moduleId: text("module_id").notNull(),         // ex: "sales-analytics"
  status: text("status", { enum: ["active", "trial", "past_due", "canceled"] }).notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  activatedAt: timestamp("activated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
}, (t) => ({
  unq: unique().on(t.organizationId, t.moduleId),
}));
```

**Règle BDD pour les modules** : chaque table d'un module DOIT avoir une colonne `organization_id` indexée et reliée par foreign key. C'est la base de l'isolation multi-tenant. À **renforcer côté code** par un middleware tRPC qui injecte le `WHERE organization_id = ?` automatiquement.

---

## 4. Couche tRPC — procédures de base

```typescript
// packages/api/procedures/index.ts

// Pour les routes publiques (marketing, login)
export const publicProcedure = t.procedure;

// Utilisateur authentifié (sans contexte d'org)
export const authedProcedure = t.procedure.use(requireAuth);

// Utilisateur dans le contexte d'une org (membership vérifiée)
export const orgProcedure = authedProcedure.use(requireOrg);

// Utilisateur dans une org QUI a le module activé
export const moduleProcedure = (moduleId: string) =>
  orgProcedure.use(requireModuleEnabled(moduleId));
```

**Usage dans un module** :

```typescript
// modules/sales-analytics/router.ts
import { moduleProcedure } from "@modulo/api";

const salesProcedure = moduleProcedure("sales-analytics");

export const salesRouter = createTRPCRouter({
  list: salesProcedure.query(...),
  create: salesProcedure.input(...).mutation(...),
});
```

Si un user accède à une route d'un module non activé → erreur 403 automatique. Pas besoin de répéter le check partout.

---

## 5. Event bus inter-modules

Pour que les modules collaborent sans s'imbriquer :

```typescript
// packages/events/types.ts
export type ModuleEvents = {
  "sales.deal.closed": { dealId: string; amount: number; orgId: string };
  "notes.document.created": { docId: string; orgId: string };
  // ...
};

// Dans un module qui émet
import { eventBus } from "@modulo/events";
eventBus.emit("sales.deal.closed", { dealId, amount, orgId });

// Dans un module qui écoute (ex: AI Reports génère un récap)
eventBus.on("sales.deal.closed", async (payload) => { ... });
```

Implémentation v1 : **événements in-process** (simple, suffisant au début).
Implémentation v2 (scale) : **Inngest** pour la durabilité et le retry.

---

## 6. Theming multi-tenant

Toutes les couleurs sont des **CSS variables** appliquées au niveau `<body>` selon le tenant. Détails dans `DESIGN_SYSTEM.md`.

```typescript
// apps/web/app/(app)/[orgSlug]/layout.tsx
<body style={generateThemeVars(org.theme)}>
  {children}
</body>
```

---

## 7. Conventions de code

- **TypeScript strict** partout, jamais de `any`.
- **Zod schemas** comme source de vérité (types dérivés via `z.infer`).
- **Server Components par défaut**, Client Components uniquement quand nécessaire (`"use client"` justifié).
- **Mutations** → toujours via tRPC, jamais d'appels `fetch` directs depuis le client.
- **Loading states** → toujours skeleton, jamais spinner sur fond blanc.
- **Erreurs** → toujours un toast + un fallback UI utile (jamais un crash blanc).
- **Tests** : Vitest pour le unit, Playwright pour l'E2E des flows critiques (login, paiement, activation module).

---

## 8. Commandes essentielles (à mettre dans `package.json` racine)

```bash
pnpm dev               # Lance l'app web en dev
pnpm db:generate       # Génère les migrations Drizzle
pnpm db:migrate        # Applique les migrations
pnpm db:studio         # UI Drizzle Studio
pnpm module:new        # Script: scaffold un nouveau module depuis MODULE_BLUEPRINT
pnpm lint              # ESLint sur tout le monorepo
pnpm typecheck         # tsc --noEmit sur tout
```
