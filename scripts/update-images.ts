// Update product images to match category — replaces random picsum URLs
// with real product photos from the image-search results.
import { db } from "../src/lib/db";
import { readFileSync } from "fs";

const imageMap: Record<string, string[]> = JSON.parse(
  readFileSync("/home/z/my-project/scripts/category-images.json", "utf8"),
);
const supplierLogos: string[] = JSON.parse(
  readFileSync("/home/z/my-project/scripts/supplier-logos.json", "utf8"),
).results.map((r: any) => r.original_url).filter(Boolean);

async function main() {
  console.log("🔄 Loading categories...");
  const categories = await db.category.findMany();
  const catSlugById = new Map(categories.map((c) => [c.id, c.slug]));

  console.log("🔄 Updating product images...");
  const products = await db.product.findMany({ select: { id: true, categoryId: true } });
  let updated = 0;

  for (const p of products) {
    const catSlug = catSlugById.get(p.categoryId);
    if (!catSlug) continue;
    const pool = imageMap[catSlug] || imageMap[Object.keys(imageMap).find((k) => catSlug.startsWith(k))] || [];
    if (pool.length === 0) {
      console.warn(`  No images for category ${catSlug}`);
      continue;
    }
    // Pick 3-5 images from the pool, cycling based on product index for variety
    const count = Math.min(pool.length, 3 + (updated % 3));
    const offset = (updated * 3) % pool.length;
    const images: string[] = [];
    for (let i = 0; i < count; i++) {
      images.push(pool[(offset + i) % pool.length]);
    }

    await db.product.update({
      where: { id: p.id },
      data: { images: JSON.stringify(images) },
    });
    updated++;
    if (updated % 50 === 0) console.log(`  ${updated}/${products.length} products updated...`);
  }
  console.log(`✅ Updated ${updated}/${products.length} product images`);

  console.log("🔄 Updating supplier logos...");
  const suppliers = await db.supplier.findMany({ select: { id: true } });
  for (let i = 0; i < suppliers.length; i++) {
    const logo = supplierLogos[i % supplierLogos.length];
    await db.supplier.update({
      where: { id: suppliers[i].id },
      data: { logo },
    });
  }
  console.log(`✅ Updated ${suppliers.length} supplier logos`);

  // Summary
  const sample = await db.product.findFirst({ select: { title: true, images: true, category: { select: { slug: true, name: true } } } });
  if (sample) {
    console.log("\n📋 Sample product:");
    console.log(`  Title: ${sample.title}`);
    console.log(`  Category: ${sample.category.name} (${sample.category.slug})`);
    console.log(`  Images: ${JSON.parse(sample.images).join(", ")}`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
