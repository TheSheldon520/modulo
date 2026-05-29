// scripts/seed-sales-demo.ts
//
// Seed demo data for the Sales Analytics module on a given organization.
//
// Usage:
//   pnpm seed:sales <org-slug>
//
// Idempotent: if the org already has any sales_pipeline_stages row, the seed
// short-circuits with an informational log. Re-running the script on a clean
// org inserts the full 25-row demo set (5 stages + 5 contacts + 10 deals).
//
// Stage codes are lowercase canonical (cf. router DEAL_STAGES). Contact /
// deal data mirrors the Silverlit dogfooding context (French retail B2B).

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
if (!orgSlug) {
  process.stderr.write(
    "Error: missing <org-slug> argument.\n" +
      "Usage: pnpm seed:sales <org-slug>\n",
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

  // Idempotency: skip if any pipeline stage already exists for this org.
  const existingStages = await db
    .select({ id: salesPipelineStages.id })
    .from(salesPipelineStages)
    .where(eq(salesPipelineStages.organizationId, org.id))
    .limit(1);
  if (existingStages.length > 0) {
    process.stdout.write(
      `Organization "${orgSlug}" already has sales seed data — skipping.\n` +
        `Delete the existing rows manually if you really want to re-seed.\n`,
    );
    await pool.end();
    process.exit(0);
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

  // 3. Deals (10) — mix of stages, lowercase codes
  const dealsData: Array<{
    name: string;
    amount: string;
    stage: "lead" | "qualified" | "proposal" | "won" | "lost";
    closedAt: Date | null;
  }> = [
    {
      name: "Référencement gamme Hélicos Carrefour Q2",
      amount: "45000",
      stage: "qualified",
      closedAt: null,
    },
    {
      name: "Extension portfolio Voitures RC E.Leclerc",
      amount: "32000",
      stage: "proposal",
      closedAt: null,
    },
    {
      name: "Renouvellement contrat Picwic 2026",
      amount: "78000",
      stage: "won",
      closedAt: new Date("2026-05-15T10:00:00Z"),
    },
    {
      name: "Pilot Drones gaming Boulanger",
      amount: "18500",
      stage: "lead",
      closedAt: null,
    },
    {
      name: "Partenariat JouéClub Noël 2026",
      amount: "55000",
      stage: "qualified",
      closedAt: null,
    },
    {
      name: "Référencement Robots Carrefour Hyper",
      amount: "62000",
      stage: "won",
      closedAt: new Date("2026-04-22T10:00:00Z"),
    },
    {
      name: "Test concept E.Leclerc Pro",
      amount: "12000",
      stage: "lost",
      closedAt: new Date("2026-03-10T10:00:00Z"),
    },
    {
      name: "Démo gamme premium Picwic",
      amount: "8500",
      stage: "proposal",
      closedAt: null,
    },
    {
      name: "Réassort Boulanger T3",
      amount: "23000",
      stage: "lead",
      closedAt: null,
    },
    {
      name: "Lancement collection JouéClub Anniversaire",
      amount: "41000",
      stage: "proposal",
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
      `  - ${dealsData.length} deals\n`,
  );

  await pool.end();
}

main().catch(async (err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
