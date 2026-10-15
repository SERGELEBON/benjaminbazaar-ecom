// Seeds the Supabase database with the initial catalogue (prisma/seed-data.json)
// ONLY when the database is empty. Safe to run on every deploy.
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));

// Insert order respects foreign keys
const ORDER = ["User", "Supplier", "Category", "Product", "PriceTier", "Cart", "CartItem", "Review", "Banner"];
const delegate = (model) => prisma[model.charAt(0).toLowerCase() + model.slice(1)];

async function main() {
  const existing = await prisma.product.count();
  if (existing > 0) {
    console.log(`[seed] Database already has ${existing} products, skipping seed.`);
    return;
  }
  const data = JSON.parse(readFileSync(join(here, "seed-data.json"), "utf8"));
  for (const model of ORDER) {
    const rows = data[model];
    if (!rows?.length) continue;
    const toDate = (r) => {
      for (const k of ["createdAt", "updatedAt"]) if (r[k]) r[k] = new Date(r[k]);
      return r;
    };
    if (model === "Category") {
      // parents first, then children (self-relation)
      await delegate(model).createMany({ data: rows.filter((r) => !r.parentId).map(toDate), skipDuplicates: true });
      await delegate(model).createMany({ data: rows.filter((r) => r.parentId).map(toDate), skipDuplicates: true });
    } else {
      await delegate(model).createMany({ data: rows.map(toDate), skipDuplicates: true });
    }
    console.log(`[seed] ${model}: ${rows.length}`);
  }
  console.log("[seed] Done.");
}

main()
  .catch((e) => {
    console.error("[seed] Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
