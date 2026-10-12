// Run image searches for all 30 categories with controlled concurrency
import { execSync } from "child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";

const CATEGORIES: { slug: string; query: string }[] = [
  { slug: "apparel-accessories", query: "wholesale clothing apparel fashion garment product" },
  { slug: "consumer-electronics", query: "consumer electronics gadgets smartphone headphones product" },
  { slug: "sports-entertainment", query: "sports equipment fitness gear dumbbell product" },
  { slug: "jewelry-eyewear-watches", query: "jewelry watches eyewear sunglasses gold ring product" },
  { slug: "packaging-printing", query: "packaging boxes cardboard shipping cartons product" },
  { slug: "home-garden", query: "home decor garden tools kitchen accessories product" },
  { slug: "beauty", query: "beauty cosmetics skincare makeup cream bottle product" },
  { slug: "shoes", query: "sneakers shoes footwear leather running product" },
  { slug: "luggage-bags", query: "backpacks luggage bags travel suitcase handbag product" },
  { slug: "kids-toys", query: "kids toys children playset blocks teddy product" },
  { slug: "personal-home-care", query: "personal care shampoo soap hygiene bottle product" },
  { slug: "health-medical", query: "medical equipment hospital device stethoscope health product" },
  { slug: "gifts-crafts", query: "gifts crafts handmade decorative artisan product" },
  { slug: "pet-supplies", query: "pet supplies dog cat food bowl leash product" },
  { slug: "school-office", query: "office supplies stationery school notebook pen product" },
  { slug: "industrial-machinery", query: "industrial machinery factory CNC equipment metalworking" },
  { slug: "construction", query: "construction materials bricks cement steel building" },
  { slug: "furniture", query: "furniture sofa chair table desk office home product" },
  { slug: "lighting", query: "LED lighting lamp bulb ceiling fixture product" },
  { slug: "home-appliances", query: "home appliances kitchen blender microwave rice cooker product" },
  { slug: "automotive-vehicle-parts", query: "auto car parts engine tire brake headlight product" },
  { slug: "tools-hardware", query: "hardware tools wrench drill screwdriver hammer product" },
  { slug: "renewable-energy", query: "solar panels renewable energy battery inverter product" },
  { slug: "electrical-equipment", query: "electrical cables wires switches circuit breaker product" },
  { slug: "safety-security", query: "safety helmet security camera CCTV vest gloves product" },
  { slug: "electronic-components", query: "electronic components circuit board resistor capacitor PCB" },
  { slug: "vehicles", query: "car truck motorcycle bicycle vehicle product" },
  { slug: "agriculture-food-beverage", query: "agriculture food beverage rice grains coffee cocoa product" },
  { slug: "raw-materials", query: "raw materials metal steel plastic sheets industrial" },
  { slug: "services", query: "logistics shipping warehouse business services containers" },
];

const OUT_DIR = "/home/z/my-project/scripts";
const RESULT_FILE = `${OUT_DIR}/category-images.json`;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const existing: Record<string, string[]> = existsSync(RESULT_FILE)
  ? JSON.parse(readFileSync(RESULT_FILE, "utf8"))
  : {};

const todo = CATEGORIES.filter((c) => !existing[c.slug] || existing[c.slug].length === 0);
console.log(`Total: ${CATEGORIES.length}, Done: ${CATEGORIES.length - todo.length}, Todo: ${todo.length}`);

const CONCURRENCY = 4;

async function searchOne(cat: { slug: string; query: string }): Promise<void> {
  const outFile = `${OUT_DIR}/${cat.slug}.json`;
  try {
    execSync(
      `z-ai image-search -q "${cat.query}" --count 10 --no-rank --gl us -o "${outFile}"`,
      { timeout: 180000, stdio: "pipe" },
    );
    const data = JSON.parse(readFileSync(outFile, "utf8"));
    if (data.success && data.results) {
      const urls = data.results.map((r: any) => r.original_url).filter(Boolean);
      existing[cat.slug] = urls;
      writeFileSync(RESULT_FILE, JSON.stringify(existing, null, 2));
      console.log(`✓ ${cat.slug}: ${urls.length} images`);
    } else {
      console.error(`✗ ${cat.slug}: no results`);
    }
  } catch (e: any) {
    console.error(`✗ ${cat.slug}: ${e.message?.slice(0, 80) || "error"}`);
  }
}

async function main() {
  const queue = [...todo];
  const running: Promise<void>[] = [];
  while (queue.length > 0 || running.length > 0) {
    while (running.length < CONCURRENCY && queue.length > 0) {
      const cat = queue.shift()!;
      const p = searchOne(cat).then(() => {
        running.splice(running.indexOf(p), 1);
      });
      running.push(p);
    }
    if (running.length > 0) {
      await Promise.race(running);
    }
  }
  let total = 0;
  for (const c of CATEGORIES) {
    const n = existing[c.slug]?.length || 0;
    total += n;
  }
  console.log(`\nTotal: ${total} images across ${CATEGORIES.length} categories`);
  console.log(`Saved to ${RESULT_FILE}`);
}

main().catch(console.error);
