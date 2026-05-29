// scripts/seed-sales-demo.ts
//
// Seed demo data for the Sales Analytics module on a given organization.
//
// Usage:
//   pnpm seed:sales <org-slug>          # idempotent, skips if data exists
//   pnpm seed:sales <org-slug> --reset  # purges org's sales_* rows first
//
// Idempotent default: if the org already has any sales_pipeline_stages row,
// the seed short-circuits with an informational log. Re-running on a clean
// org inserts the full 25-row demo set (5 stages + 5 contacts + 10 deals).
//
// `--reset` flag: deletes the org's existing sales_deals + sales_contacts +
// sales_pipeline_stages rows BEFORE re-seeding. Useful to purge ad-hoc deals
// created during validation (e.g. the "Test" deal created in T1.3 visual
// validation) and rebuild a deterministic demo set with dates spread across
// 12 months for the T1.4 dashboard.
//
// Stage codes are lowercase canonical (cf. router DEAL_STAGES). Dates are
// spread from June 2025 to May 2026 so the revenue area chart and donut
// look populated, not flat-today.

import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";

import {
  memberships,
  organizations,
  salesContacts,
  salesDeals,
  salesPipelineStages,
} from "@modulo/db/schema";

config({ path: ".env.local" });

const orgSlug = process.argv[2];
const shouldReset = process.argv.includes("--reset");

if (!orgSlug) {
  process.stderr.write(
    "Error: missing <org-slug> argument.\n" +
      "Usage: pnpm seed:sales <org-slug> [--reset]\n",
  );
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write(
    "Error: DATABASE_URL_UNPOOLED (or DATABASE_URL) must be set in .env.local.\n",
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

async function main(): Promise<void> {
  const orgRows = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);
  const org = orgRows[0];
  if (!org) {
    process.stderr.write(`Error: organization "${orgSlug}" not found.\n`);
    process.exit(1);
  }

  // --reset: purge before re-seed. Order matters: deals reference owners
  // (users), which we leave intact, but no FK from deals to contacts/stages
  // at the DB layer (T1.2 decision), so the three deletes are independent.
  if (shouldReset) {
    const dDeals = await db
      .delete(salesDeals)
      .where(eq(salesDeals.organizationId, org.id))
      .returning({ id: salesDeals.id });
    const dContacts = await db
      .delete(salesContacts)
      .where(eq(salesContacts.organizationId, org.id))
      .returning({ id: salesContacts.id });
    const dStages = await db
      .delete(salesPipelineStages)
      .where(eq(salesPipelineStages.organizationId, org.id))
      .returning({ id: salesPipelineStages.id });
    process.stdout.write(
      `Reset "${orgSlug}": purged ${dDeals.length} deals, ${dContacts.length} contacts, ${dStages.length} pipeline stages.\n`,
    );
  } else {
    // Idempotency: skip if any pipeline stage already exists for this org.
    const existingStages = await db
      .select({ id: salesPipelineStages.id })
      .from(salesPipelineStages)
      .where(eq(salesPipelineStages.organizationId, org.id))
      .limit(1);
    if (existingStages.length > 0) {
      process.stdout.write(
        `Organization "${orgSlug}" already has sales seed data — skipping.\n` +
          `Pass --reset to wipe and re-seed deterministically.\n`,
      );
      await pool.end();
      process.exit(0);
    }
  }

  // Resolve any membership owner — every deal needs a salesperson FK. Picking
  // the oldest membership keeps the seed deterministic across re-runs.
  const ownerRows = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(eq(memberships.organizationId, org.id))
    .orderBy(memberships.createdAt)
    .limit(1);
  const owner = ownerRows[0];
  if (!owner) {
    process.stderr.write(
      `Error: organization "${orgSlug}" has no memberships — cannot assign deal owners.\n`,
    );
    await pool.end();
    process.exit(1);
  }

  // 1. Pipeline stages (5)
  const stagesData = [
    { name: "Lead", position: 0, color: "#94a3b8" },
    { name: "Qualified", position: 1, color: "#60a5fa" },
    { name: "Proposal", position: 2, color: "#f59e0b" },
    { name: "Won", position: 3, color: "#22c55e" },
    { name: "Lost", position: 4, color: "#ef4444" },
  ];
  await db.insert(salesPipelineStages).values(
    stagesData.map((s) => ({ ...s, organizationId: org.id })),
  );

  // 2. Contacts (5) — Silverlit retail dogfooding context
  const contactsData = [
    {
      name: "Sophie Martin",
      email: "sophie.martin@carrefour.fr",
      company: "Carrefour",
      phone: "+33 1 23 45 67 89",
    },
    {
      name: "Paul Lefevre",
      email: "p.lefevre@leclerc.com",
      company: "E.Leclerc",
      phone: "+33 1 23 45 67 90",
    },
    {
      name: "Marie Dubois",
      email: "marie.dubois@picwic.fr",
      company: "Picwic Toys",
      phone: "+33 1 23 45 67 91",
    },
    {
      name: "Jean Rousseau",
      email: "jean.rousseau@boulanger.com",
      company: "Boulanger",
      phone: null,
    },
    {
      name: "Claire Petit",
      email: "claire@joueclub.fr",
      company: "JouéClub",
      phone: null,
    },
  ];
  await db.insert(salesContacts).values(
    contactsData.map((c) => ({ ...c, organizationId: org.id })),
  );

  // 3. Deals (10) — dates spread across 12 months (Jun 2025 → May 2026) so
  // the T1.4 revenue area chart and stage donut look populated rather than
  // a single bar at "today". closedAt is set for won/lost deals (>= createdAt)
  // and null for open deals (lead/qualified/proposal). amount is a string
  // (Drizzle numeric wire format).
  const dealsData: Array<{
    name: string;
    amount: string;
    stage: "lead" | "qualified" | "proposal" | "won" | "lost";
    createdAt: Date;
    closedAt: Date | null;
  }> = [
    // ---- Won deals (closedAt set, revenue contribution by month) ----
    {
      name: "Renouvellement contrat Picwic 2026",
      amount: "78000",
      stage: "won",
      createdAt: new Date("2025-07-12T09:00:00Z"),
      closedAt: new Date("2025-09-18T10:00:00Z"),
    },
    {
      name: "Référencement Robots Carrefour Hyper",
      amount: "62000",
      stage: "won",
      createdAt: new Date("2025-10-05T09:00:00Z"),
      closedAt: new Date("2025-12-14T10:00:00Z"),
    },
    {
      name: "Lancement collection JouéClub Anniversaire",
      amount: "41000",
      stage: "won",
      createdAt: new Date("2026-01-20T09:00:00Z"),
      closedAt: new Date("2026-03-08T10:00:00Z"),
    },
    {
      name: "Réassort Boulanger T1 2026",
      amount: "23000",
      stage: "won",
      createdAt: new Date("2026-02-05T09:00:00Z"),
      closedAt: new Date("2026-04-22T10:00:00Z"),
    },
    // ---- Lost deals (closedAt set, contribute to conversion denominator) ----
    {
      name: "Test concept E.Leclerc Pro",
      amount: "12000",
      stage: "lost",
      createdAt: new Date("2025-06-15T09:00:00Z"),
      closedAt: new Date("2025-08-30T10:00:00Z"),
    },
    {
      name: "Pilot premium Boulanger Tech",
      amount: "9500",
      stage: "lost",
      createdAt: new Date("2025-11-10T09:00:00Z"),
      closedAt: new Date("2026-01-25T10:00:00Z"),
    },
    // ---- Open deals (no closedAt, contribute to pipelineValue) ----
    {
      name: "Référencement gamme Hélicos Carrefour Q2",
      amount: "45000",
      stage: "qualified",
      createdAt: new Date("2026-04-02T09:00:00Z"),
      closedAt: null,
    },
    {
      name: "Extension portfolio Voitures RC E.Leclerc",
      amount: "32000",
      stage: "proposal",
      createdAt: new Date("2026-03-18T09:00:00Z"),
      closedAt: null,
    },
    {
      name: "Démo gamme premium Picwic",
      amount: "8500",
      stage: "proposal",
      createdAt: new Date("2026-05-02T09:00:00Z"),
      closedAt: null,
    },
    {
      name: "Partenariat JouéClub Noël 2026",
      amount: "55000",
      stage: "lead",
      createdAt: new Date("2026-05-10T09:00:00Z"),
      closedAt: null,
    },
  ];
  await db.insert(salesDeals).values(
    dealsData.map((d) => ({
      ...d,
      organizationId: org.id,
      ownerId: owner.userId,
    })),
  );

  process.stdout.write(
    `Seeded "${org.name}" (${orgSlug}):\n` +
      `  - ${stagesData.length} pipeline stages\n` +
      `  - ${contactsData.length} contacts\n` +
      `  - ${dealsData.length} deals (4 won, 2 lost, 4 open) spread across 12 months\n`,
  );

  await pool.end();
}

main().catch(async (err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
