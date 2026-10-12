import { db } from "../src/lib/db";

// AELF Bazaar seed: 30 categories, 20 verified suppliers, 200 products w/ price tiers + MOQ.

const CATEGORY_DEFS: { name: string; icon: string; subs?: string[] }[] = [
  { name: "Apparel & Accessories", icon: "shirt", subs: ["Men's Clothing", "Women's Clothing", "Kids Clothing", "Accessories", "Uniforms"] },
  { name: "Consumer Electronics", icon: "smartphone", subs: ["Smartphones", "Audio & Headphones", "Wearables", "Accessories"] },
  { name: "Sports & Entertainment", icon: "trophy", subs: ["Fitness Gear", "Outdoor", "Team Sports", "Camping"] },
  { name: "Jewelry / Eyewear / Watches", icon: "gem", subs: ["Watches", "Eyewear", "Fine Jewelry", "Fashion Jewelry"] },
  { name: "Packaging & Printing", icon: "package", subs: ["Boxes", "Bags", "Labels", "Printing Services"] },
  { name: "Home & Garden", icon: "home", subs: ["Kitchen", "Decor", "Garden Tools", "Bedding"] },
  { name: "Beauty", icon: "sparkles", subs: ["Skincare", "Makeup", "Hair Care", "Fragrance"] },
  { name: "Shoes", icon: "footprints", subs: ["Sneakers", "Sandals", "Boots", "Formal"] },
  { name: "Luggage & Bags", icon: "briefcase", subs: ["Backpacks", "Suitcases", "Handbags", "Travel"] },
  { name: "Kids & Toys", icon: "baby", subs: ["Toys", "Baby Gear", "Kids Apparel", "Educational"] },
  { name: "Personal / Home Care", icon: "droplet", subs: ["Hair Care", "Oral Care", "Cleaning", "Wellness"] },
  { name: "Health & Medical", icon: "heart-pulse", subs: ["Equipment", "Supplies", "Mobility", "PPE"] },
  { name: "Gifts & Crafts", icon: "gift", subs: ["Handicraft", "Souvenirs", "Festive", "Stationery"] },
  { name: "Pet Supplies", icon: "dog", subs: ["Food", "Toys", "Grooming", "Housing"] },
  { name: "School & Office", icon: "pencil", subs: ["Stationery", "Furniture", "Supplies", "Tech"] },
  { name: "Industrial Machinery", icon: "cog", subs: ["Packaging Machines", "CNC", "Food Processing", "Textile"] },
  { name: "Construction", icon: "hard-hat", subs: ["Materials", "Tools", "Equipment", "Finishing"] },
  { name: "Furniture", icon: "sofa", subs: ["Office", "Home", "Outdoor", "Commercial"] },
  { name: "Lighting", icon: "lightbulb", subs: ["LED", "Indoor", "Outdoor", "Industrial"] },
  { name: "Home Appliances", icon: "microwave", subs: ["Kitchen", "Cleaning", "Climate", "Small Appliances"] },
  { name: "Automotive & Vehicle Parts", icon: "car", subs: ["Parts", "Accessories", "Tools", "Care"] },
  { name: "Tools & Hardware", icon: "wrench", subs: ["Hand Tools", "Power Tools", "Fasteners", "Hardware"] },
  { name: "Renewable Energy", icon: "sun", subs: ["Solar", "Batteries", "Inverters", "Wind"] },
  { name: "Electrical Equipment", icon: "zap", subs: ["Cables", "Switches", "Motors", "Distribution"] },
  { name: "Safety & Security", icon: "shield", subs: ["CCTV", "Alarms", "Safety Wear", "Locks"] },
  { name: "Electronic Components", icon: "circuit-board", subs: ["Semiconductors", "Capacitors", "Sensors", "Modules"] },
  { name: "Vehicles", icon: "truck", subs: ["Cars", "Motorcycles", "Bicycles", "Parts"] },
  { name: "Agriculture / Food & Beverage", icon: "wheat", subs: ["Grains", "Beverages", "Snacks", "Equipment"] },
  { name: "Raw Materials", icon: "layers", subs: ["Metals", "Plastics", "Chemicals", "Textiles"] },
  { name: "Services", icon: "handshake", subs: ["Logistics", "Design", "Manufacturing", "Consulting"] },
];

const SUPPLIER_DEFS = [
  { name: "Shenzhen Lingtong Tech Co., Ltd.", city: "Shenzhen", country: "China", type: "Manufacturer", main: "Consumer Electronics", certs: ["ISO9001", "CE", "RoHS", "BSCI"], years: 8, rating: 4.8, reorder: 52, response: "<=1h" },
  { name: "Guangzhou Trend Apparel Ltd.", city: "Guangzhou", country: "China", type: "Manufacturer", main: "Apparel & Accessories", certs: ["BSCI", "ISO9001", "WRAP"], years: 6, rating: 4.6, reorder: 47, response: "<=2h" },
  { name: "Yiwu Crafts Trading Co.", city: "Yiwu", country: "China", type: "Trading Company", main: "Gifts & Crafts", certs: ["ISO9001"], years: 5, rating: 4.4, reorder: 39, response: "<=3h" },
  { name: "Istanbul Leather Works", city: "Istanbul", country: "Turkey", type: "Manufacturer", main: "Luggage & Bags", certs: ["ISO9001", "CE"], years: 12, rating: 4.7, reorder: 55, response: "<=2h" },
  { name: "Mumbai Textile Mills", city: "Mumbai", country: "India", type: "Manufacturer", main: "Apparel & Accessories", certs: ["BSCI", "WRAP", "ISO9001"], years: 15, rating: 4.5, reorder: 48, response: "<=4h" },
  { name: "Ho Chi Minh Footwear Co.", city: "Ho Chi Minh", country: "Vietnam", type: "Manufacturer", main: "Shoes", certs: ["BSCI", "ISO9001"], years: 9, rating: 4.6, reorder: 44, response: "<=2h" },
  { name: "Accra Agro Foods Ltd.", city: "Accra", country: "Ghana", type: "Manufacturer", main: "Agriculture / Food & Beverage", certs: ["HACCP", "HALAL", "FDA"], years: 7, rating: 4.7, reorder: 61, response: "<=1h" },
  { name: "Kumasi Furniture Makers", city: "Kumasi", country: "Ghana", type: "Manufacturer", main: "Furniture", certs: ["ISO9001"], years: 10, rating: 4.5, reorder: 38, response: "<=3h" },
  { name: "Nairobi Solar Solutions", city: "Nairobi", country: "Kenya", type: "Manufacturer", main: "Renewable Energy", certs: ["IEC", "CE", "ISO9001"], years: 6, rating: 4.8, reorder: 53, response: "<=2h" },
  { name: "Dongguan Precision Machinery", city: "Dongguan", country: "China", type: "Manufacturer", main: "Industrial Machinery", certs: ["ISO9001", "CE"], years: 14, rating: 4.7, reorder: 49, response: "<=2h" },
  { name: "Foshan Lighting Factory", city: "Foshan", country: "China", type: "Manufacturer", main: "Lighting", certs: ["CE", "RoHS", "ISO9001"], years: 11, rating: 4.6, reorder: 45, response: "<=2h" },
  { name: "Abidjan Beauty Naturals", city: "Abidjan", country: "Côte d'Ivoire", type: "Manufacturer", main: "Beauty", certs: ["HALAL", "FDA"], years: 5, rating: 4.5, reorder: 42, response: "<=3h" },
  { name: "Shanghai Smart Electronics", city: "Shanghai", country: "China", type: "Manufacturer", main: "Electronic Components", certs: ["ISO9001", "RoHS", "CE"], years: 13, rating: 4.7, reorder: 50, response: "<=1h" },
  { name: "Lagos Auto Parts Ltd.", city: "Lagos", country: "Nigeria", type: "Trading Company", main: "Automotive & Vehicle Parts", certs: ["ISO9001"], years: 8, rating: 4.4, reorder: 36, response: "<=4h" },
  { name: "Suzhou Packaging Group", city: "Suzhou", country: "China", type: "Manufacturer", main: "Packaging & Printing", certs: ["FSC", "ISO9001"], years: 9, rating: 4.6, reorder: 47, response: "<=2h" },
  { name: "Jaipur Jewelry House", city: "Jaipur", country: "India", type: "Manufacturer", main: "Jewelry / Eyewear / Watches", certs: ["ISO9001", "RJC"], years: 18, rating: 4.8, reorder: 51, response: "<=2h" },
  { name: "Cairo Hardware Works", city: "Cairo", country: "Egypt", type: "Manufacturer", main: "Tools & Hardware", certs: ["ISO9001", "CE"], years: 12, rating: 4.5, reorder: 40, response: "<=3h" },
  { name: "Bangalore Medical Devices", city: "Bangalore", country: "India", type: "Manufacturer", main: "Health & Medical", certs: ["ISO13485", "CE", "FDA"], years: 11, rating: 4.7, reorder: 46, response: "<=2h" },
  { name: "Tema Construction Supplies", city: "Tema", country: "Ghana", type: "Trading Company", main: "Construction", certs: ["ISO9001"], years: 6, rating: 4.3, reorder: 35, response: "<=4h" },
  { name: "Berlin Smart Home Systems", city: "Berlin", country: "Germany", type: "Manufacturer", main: "Safety & Security", certs: ["CE", "ISO9001", "TUV"], years: 16, rating: 4.9, reorder: 54, response: "<=1h" },
];

const PROD_CERTS = ["CE", "RoHS", "FCC", "FDA", "HALAL", "ISO9001", "BSCI", "FSC", "CB", "EMC"];
const UNITS = ["piece", "set", "kilogram", "liter", "meter", "box", "carton", "pair", "ton"];

const ADJ = ["Premium", "Smart", "Classic", "Pro", "Eco", "Ultra", "Industrial", "Wholesale", "OEM", "Custom"];
const NOUNS = ["Edition", "Series", "Model", "Line", "Collection", "Pack", "Bundle", "Kit", "Set", "Grade"];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function rand(seed: number, min: number, max: number) {
  const x = Math.sin(seed) * 10000;
  const r = x - Math.floor(x);
  return Math.floor(r * (max - min + 1)) + min;
}

async function main() {
  console.log("🧹 Cleaning DB...");
  await db.favorite.deleteMany();
  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.quote.deleteMany();
  await db.rFQ.deleteMany();
  await db.payout.deleteMany();
  await db.review.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.cartItem.deleteMany();
  await db.cart.deleteMany();
  await db.priceTier.deleteMany();
  await db.product.deleteMany();
  await db.supplier.deleteMany();
  await db.address.deleteMany();
  await db.user.deleteMany();
  await db.category.deleteMany();

  console.log("📂 Creating categories...");
  const catMap = new Map<string, string>();
  let catOrder = 0;
  for (const c of CATEGORY_DEFS) {
    const slug = slugify(c.name);
    const parent = await db.category.create({
      data: { name: c.name, slug, icon: c.icon, order: catOrder++ },
    });
    catMap.set(c.name, parent.id);
    if (c.subs) {
      for (const s of c.subs) {
        const sub = await db.category.create({
          data: { name: s, slug: slugify(s + "-" + slug), parentId: parent.id, order: catOrder++ },
        });
        catMap.set(c.name + ">" + s, sub.id);
      }
    }
  }

  console.log("🏢 Creating suppliers...");
  // Create a demo user per supplier + an admin + a demo buyer
  const admin = await db.user.create({
    data: { email: "admin@benjaminbazaar.com", name: "Admin", role: "ADMIN", password: "demo" },
  });
  const buyer = await db.user.create({
    data: { email: "buyer@benjaminbazaar.com", name: "Demo Buyer", role: "BUYER", phone: "+233500000000", password: "demo" },
  });
  await db.cart.create({ data: { userId: buyer.id } });

  const supplierIds: string[] = [];
  let sIdx = 0;
  for (const s of SUPPLIER_DEFS) {
    const u = await db.user.create({
      data: {
        email: slugify(s.name).slice(0, 28) + "@benjaminbazaar.com",
        name: s.name,
        role: "SUPPLIER",
        password: "demo",
        country: s.country,
      },
    });
    const sup = await db.supplier.create({
      data: {
        userId: u.id,
        name: s.name,
        slug: slugify(s.name),
        logo: `https://picsum.photos/seed/${slugify(s.name)}/200/200`,
        city: s.city,
        country: s.country,
        years: s.years,
        type: s.type,
        verified: true,
        storeRating: s.rating,
        responseTime: s.response,
        onTimeDispatch: 96 + (sIdx % 4),
        reorderRate: s.reorder,
        mainCategory: s.main,
        employees: `${50 + sIdx * 7} - ${200 + sIdx * 13}`,
        annualRevenue: `US$${(sIdx + 1) * 2}M - US$${(sIdx + 1) * 5}M`,
        certifications: JSON.stringify(s.certs),
        markets: JSON.stringify(["Africa", "Europe", "Middle East", "Americas"].slice(0, 2 + (sIdx % 3))),
      },
    });
    supplierIds.push(sup.id);
    sIdx++;
  }

  console.log("📦 Creating 200 products...");
  const catNames = CATEGORY_DEFS.map((c) => c.name);
  for (let i = 0; i < 200; i++) {
    const catName = catNames[i % catNames.length];
    const catId = catMap.get(catName)!;
    const supplier = SUPPLIER_DEFS[i % SUPPLIER_DEFS.length];
    const supplierId = supplierIds[i % supplierIds.length];
    const seed = i + 1;
    const adj = pick(ADJ, i);
    const noun = pick(NOUNS, i * 3 + 1);
    const title = `${adj} ${catName.replace(/&/g, "").replace(/\//g, " ")} ${noun} #${1000 + i}`;

    const basePrice = rand(seed, 4, 380) + rand(seed * 7, 0, 99) / 100;
    const tiers = [
      { minQty: 1, maxQty: 49, price: basePrice, unit: pick(UNITS, i) },
      { minQty: 50, maxQty: 499, price: +(basePrice * 0.82).toFixed(2), unit: pick(UNITS, i) },
      { minQty: 500, maxQty: null, price: +(basePrice * 0.66).toFixed(2), unit: pick(UNITS, i) },
    ];
    const certs = Array.from(new Set([pick(PROD_CERTS, i), pick(PROD_CERTS, i + 3), pick(PROD_CERTS, i + 7)])).slice(0, 3);
    const imgCount = rand(seed, 3, 6);
    const images = Array.from({ length: imgCount }, (_, k) =>
      `https://picsum.photos/seed/${slugify(title)}-${k}/700/700`,
    );
    const unit = pick(UNITS, i);
    const minOrder = String(rand(seed, 1, 500));
    const sold = rand(seed * 3, 80, 48000);
    const rating = +(4 + ((seed * 13) % 10) / 10).toFixed(1);
    const reviewCount = rand(seed * 5, 5, 1200);
    const reorderRate = rand(seed * 2, 28, 64);

    const variantSets = [
      { name: "Color", options: ["Black", "White", "Red", "Blue", "Green"].slice(0, 2 + (i % 4)) },
      { name: "Size", options: ["S", "M", "L", "XL"].slice(0, 2 + (i % 3)) },
    ];

    const keyAttributes = [
      { k: "Place of Origin", v: `${supplier.country}` },
      { k: "Brand Name", v: supplier.name.split(" ")[0] },
      { k: "Model Number", v: `AB-${2000 + i}` },
      { k: "Material", v: pick(["ABS", "Stainless Steel", "Cotton", "Aluminum", "Plastic", "Glass"], i) },
      { k: "Warranty", v: `${rand(seed, 1, 3)} Year` },
      { k: "Packaging", v: `Carton / ${rand(seed, 10, 200)} pcs` },
      { k: "Lead Time", v: `${rand(seed, 3, 25)} days` },
      { k: "Customization", v: "OEM, ODM, Custom logo" },
    ];

    const slug = slugify(title);
    const product = await db.product.create({
      data: {
        title,
        slug,
        description: `${title} — premium ${catName.toLowerCase()} sourced from ${supplier.name}, ${supplier.city}, ${supplier.country}. Manufactured under strict quality control with ${certs.join(", ")} certifications. Suitable for wholesale, retail, dropshipping and customization. Trade Assurance supported. Fast worldwide shipping to Africa, Europe and the Americas.`,
        categoryId: catId,
        supplierId,
        images: JSON.stringify(images),
        videoUrl: i % 6 === 0 ? `https://picsum.photos/seed/${slug}-vid/700/700` : null,
        minOrder,
        minOrderUnit: unit,
        unit,
        sold,
        popularity: sold,
        rating,
        reviewCount,
        reorderRate,
        lowestPrice: i % 5 === 0,
        certifications: JSON.stringify(certs),
        keyAttributes: JSON.stringify(keyAttributes),
        variantsJson: JSON.stringify(variantSets),
        tradeAssurance: true,
        readyToShip: i % 3 === 0,
        customizable: i % 2 === 0,
        rank: i < 30 ? i + 1 : 0,
      },
    });
    await db.priceTier.createMany({
      data: tiers.map((t) => ({ productId: product.id, minQty: t.minQty, maxQty: t.maxQty, price: t.price, unit: t.unit })),
    });
  }

  // A few reviews
  console.log("⭐ Seeding reviews...");
  for (let i = 0; i < 60; i++) {
    const p = await db.product.findFirst({ skip: i * 3, orderBy: { id: "asc" } });
    if (!p) continue;
    await db.review.create({
      data: {
        userId: buyer.id,
        productId: p.id,
        rating: 4 + (i % 2),
        title: pick(["Great quality", "Fast delivery", "Will reorder", "Good value", "As described"], i),
        content: "Exactly as described, supplier communication excellent, packaging sturdy. Recommended for wholesale buyers.",
        verified: i % 3 !== 0,
      },
    });
  }

  console.log("✅ Seed complete.");
  console.log(`   Categories: ${await db.category.count()}`);
  console.log(`   Suppliers:  ${await db.supplier.count()}`);
  console.log(`   Products:   ${await db.product.count()}`);
  console.log(`   Reviews:    ${await db.review.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
