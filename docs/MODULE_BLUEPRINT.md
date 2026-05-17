# MODULE_BLUEPRINT — Squelette d'un module Modulo

> Document de référence pour créer un nouveau module. Tout module doit suivre cette structure.

## Anatomie d'un module

```
modules/<module-id>/
├── package.json                    # @modulo/module-<id>
├── README.md                       # Doc du module (purpose, features, API publique)
├── module.config.ts                # Métadonnées du module
├── schema.ts                       # Tables Drizzle
├── router.ts                       # Router tRPC (export du module)
├── events.ts                       # Events émis & écoutés
├── components/                     # Composants UI internes au module
│   ├── <Composant>.tsx
│   └── index.ts                    # Barrel
├── pages/                          # Pages exportées (montées dans app/m/<id>/)
│   ├── overview.tsx
│   └── ...
├── lib/                            # Logique métier pure
│   └── <helper>.ts
└── __tests__/                      # Vitest
    └── <test>.test.ts
```

---

## 1. `module.config.ts` — Métadonnées

C'est la "carte d'identité" du module. Le shell de l'app lit ce fichier pour afficher le module dans la sidebar, le pricing, etc.

```typescript
import type { ModuleConfig } from "@modulo/api";
import { BarChart3 } from "lucide-react";

export const moduleConfig: ModuleConfig = {
  // Identifiant unique (kebab-case, jamais changé après création)
  id: "sales-analytics",

  // Affichage
  name: "Sales Analytics",
  shortName: "Sales",
  description: "Pilotage commercial et KPI temps réel",
  icon: BarChart3,                                // Lucide icon

  // Catégorisation (utilisé dans le store de modules)
  category: "data",                               // "productivity" | "data" | "ai" | "communication"

  // Slug dans l'URL (apps/web/app/(app)/[orgSlug]/m/<slug>)
  slug: "sales",

  // Pricing — un produit Stripe par module
  pricing: {
    stripePriceId: process.env.STRIPE_PRICE_SALES_ANALYTICS!,
    monthlyPrice: 29,                             // EUR / org / mois
    trial: { days: 14 },
  },

  // Permissions du module (vérifiées via moduleProcedure)
  scopes: [
    "sales:read",
    "sales:write",
    "sales:admin",
  ],

  // Items de menu affichés dans la sidebar quand le module est actif
  navigation: [
    { label: "Vue d'ensemble", href: "/m/sales",          icon: "LayoutDashboard" },
    { label: "Deals",          href: "/m/sales/deals",    icon: "Briefcase" },
    { label: "Performance",    href: "/m/sales/perf",     icon: "TrendingUp" },
    { label: "Paramètres",     href: "/m/sales/settings", icon: "Settings", adminOnly: true },
  ],

  // Quick actions dans la command palette (Cmd+K)
  commands: [
    { id: "sales.new-deal",   label: "Nouveau deal",      shortcut: "n d" },
    { id: "sales.import-csv", label: "Importer un CSV",   shortcut: "i c" },
  ],

  // Permissions par défaut par rôle (peut être surchargé par tenant)
  defaultRolePermissions: {
    owner:  ["sales:read", "sales:write", "sales:admin"],
    admin:  ["sales:read", "sales:write", "sales:admin"],
    member: ["sales:read", "sales:write"],
    viewer: ["sales:read"],
  },
};
```

---

## 2. `schema.ts` — Tables Drizzle

**Règle d'or** : toute table d'un module DOIT avoir une colonne `organization_id` indexée + FK vers `organizations`.

```typescript
import { pgTable, text, timestamp, decimal, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { organizations } from "@modulo/db/schema/core";

export const salesDeals = pgTable(
  "sales_deals",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    stage: text("stage", { enum: ["lead", "qualified", "proposal", "won", "lost"] }).notNull(),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index().on(t.organizationId),
    orgStageIdx: index().on(t.organizationId, t.stage),
  })
);

export type SalesDeal = typeof salesDeals.$inferSelect;
export type NewSalesDeal = typeof salesDeals.$inferInsert;
```

Puis on l'ajoute au barrel `packages/db/schema/index.ts` :

```typescript
export * from "../../modules/sales-analytics/schema";
```

---

## 3. `router.ts` — Router tRPC

Toutes les procédures du module passent par `moduleProcedure("<module-id>")` qui :
1. Vérifie que l'user est authentifié
2. Vérifie qu'il appartient à une org
3. Vérifie que le module est activé pour cette org
4. Injecte `ctx.org` et `ctx.userId` dans le contexte

```typescript
import { z } from "zod";
import { createTRPCRouter, moduleProcedure } from "@modulo/api";
import { salesDeals } from "./schema";
import { eq, and, desc } from "drizzle-orm";

const salesProcedure = moduleProcedure("sales-analytics");

export const salesRouter = createTRPCRouter({
  list: salesProcedure
    .input(z.object({
      stage: z.enum(["lead", "qualified", "proposal", "won", "lost"]).optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.salesDeals.findMany({
        where: and(
          eq(salesDeals.organizationId, ctx.org.id),
          input.stage ? eq(salesDeals.stage, input.stage) : undefined,
        ),
        limit: input.limit,
        orderBy: desc(salesDeals.createdAt),
      });
    }),

  create: salesProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      amount: z.number().positive(),
      stage: z.enum(["lead", "qualified", "proposal", "won", "lost"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const [deal] = await ctx.db.insert(salesDeals).values({
        ...input,
        amount: input.amount.toString(),
        organizationId: ctx.org.id,
      }).returning();

      // Émission d'événement si deal gagné
      if (input.stage === "won") {
        await ctx.events.emit("sales.deal.closed", {
          dealId: deal.id,
          amount: input.amount,
          orgId: ctx.org.id,
        });
      }

      return deal;
    }),

  // ... update, delete, metrics, etc.
});
```

---

## 4. `events.ts` — Contrat d'événements

Le module déclare ici les events qu'il **émet** et qu'il **écoute**. C'est la documentation de son interface avec les autres modules.

```typescript
import { defineEvents } from "@modulo/events";

export const salesEvents = defineEvents({
  emits: {
    "sales.deal.closed": z.object({
      dealId: z.string(),
      amount: z.number(),
      orgId: z.string(),
    }),
    "sales.deal.created": z.object({
      dealId: z.string(),
      orgId: z.string(),
    }),
  },
  listens: {
    // Ex: réagir à un import de contacts depuis un autre module
    "contacts.imported": async (payload, ctx) => {
      // logique métier
    },
  },
});
```

---

## 5. `pages/` — Pages du module

Chaque page exporte un Server Component par défaut. Le shell les monte automatiquement dans `apps/web/app/(app)/[orgSlug]/m/<slug>/`.

```typescript
// modules/sales-analytics/pages/overview.tsx
import { ModuleShell, PageHeader } from "@modulo/ui";
import { trpc } from "@modulo/api/server";
import { DealsTable } from "../components/DealsTable";
import { MetricsRow } from "../components/MetricsRow";

export default async function SalesOverviewPage() {
  const metrics = await trpc.sales.metrics.fetch();

  return (
    <ModuleShell>
      <PageHeader
        title="Vue d'ensemble"
        description="Pilotage commercial temps réel"
      />
      <MetricsRow data={metrics} />
      <DealsTable />
    </ModuleShell>
  );
}
```

---

## 6. `README.md` du module

```markdown
# Sales Analytics

Module de pilotage commercial : dashboard KPI, gestion de deals, suivi de performance.

## Features
- Dashboard temps réel (CA, deals gagnés, taux de conversion)
- Pipeline visuel par étape
- Import CSV/Excel
- Export rapports PDF

## API publique (tRPC)
- `sales.list` — Liste des deals
- `sales.create` — Création d'un deal
- `sales.metrics` — KPI agrégés

## Events
- Émet : `sales.deal.closed`, `sales.deal.created`
- Écoute : `contacts.imported`

## Permissions
- `sales:read` — Lecture des deals et métriques
- `sales:write` — Création / modification de deals
- `sales:admin` — Configuration du module
```

---

## Checklist de validation d'un module

Avant de considérer un module "fini", vérifier :

- [ ] `module.config.ts` complet (icône, pricing, navigation, scopes)
- [ ] Toutes les tables ont `organization_id` indexé + FK cascade
- [ ] Tous les routers utilisent `moduleProcedure("<id>")`
- [ ] Aucun import depuis un autre module
- [ ] Events documentés dans `events.ts`
- [ ] README.md du module à jour
- [ ] Tests unitaires sur la logique métier critique
- [ ] Empty states designés pour chaque liste/page
- [ ] Loading states (skeletons) sur chaque chargement
- [ ] Pas de couleur hardcodée (uniquement tokens)
- [ ] `pnpm typecheck` et `pnpm lint` passent
- [ ] Le module peut être **désactivé** dans les settings sans casser le reste de l'app
