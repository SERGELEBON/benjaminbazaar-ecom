-- Data migration: French category names (catalogue shown to buyers in Côte d'Ivoire).
-- Idempotent: only rows still carrying the original English name are renamed.
UPDATE "Category" SET "name" = 'Vêtements & accessoires' WHERE "name" = 'Apparel & Accessories';
UPDATE "Category" SET "name" = 'Électronique grand public' WHERE "name" = 'Consumer Electronics';
UPDATE "Category" SET "name" = 'Sports & loisirs' WHERE "name" = 'Sports & Entertainment';
UPDATE "Category" SET "name" = 'Bijoux, lunettes & montres' WHERE "name" = 'Jewelry / Eyewear / Watches';
UPDATE "Category" SET "name" = 'Emballage & impression' WHERE "name" = 'Packaging & Printing';
UPDATE "Category" SET "name" = 'Maison & jardin' WHERE "name" = 'Home & Garden';
UPDATE "Category" SET "name" = 'Beauté' WHERE "name" = 'Beauty';
UPDATE "Category" SET "name" = 'Chaussures' WHERE "name" = 'Shoes';
UPDATE "Category" SET "name" = 'Bagages & sacs' WHERE "name" = 'Luggage & Bags';
UPDATE "Category" SET "name" = 'Enfants & jouets' WHERE "name" = 'Kids & Toys';
UPDATE "Category" SET "name" = 'Hygiène & entretien' WHERE "name" = 'Personal / Home Care';
UPDATE "Category" SET "name" = 'Santé & médical' WHERE "name" = 'Health & Medical';
UPDATE "Category" SET "name" = 'Cadeaux & artisanat' WHERE "name" = 'Gifts & Crafts';
UPDATE "Category" SET "name" = 'Animalerie' WHERE "name" = 'Pet Supplies';
UPDATE "Category" SET "name" = 'École & bureau' WHERE "name" = 'School & Office';
UPDATE "Category" SET "name" = 'Machines industrielles' WHERE "name" = 'Industrial Machinery';
UPDATE "Category" SET "name" = 'Construction & BTP' WHERE "name" = 'Construction';
UPDATE "Category" SET "name" = 'Mobilier' WHERE "name" = 'Furniture';
UPDATE "Category" SET "name" = 'Éclairage' WHERE "name" = 'Lighting';
UPDATE "Category" SET "name" = 'Électroménager' WHERE "name" = 'Home Appliances';
UPDATE "Category" SET "name" = 'Auto & pièces détachées' WHERE "name" = 'Automotive & Vehicle Parts';
UPDATE "Category" SET "name" = 'Outillage & quincaillerie' WHERE "name" = 'Tools & Hardware';
UPDATE "Category" SET "name" = 'Énergies renouvelables' WHERE "name" = 'Renewable Energy';
UPDATE "Category" SET "name" = 'Matériel électrique' WHERE "name" = 'Electrical Equipment';
UPDATE "Category" SET "name" = 'Sécurité & protection' WHERE "name" = 'Safety & Security';
UPDATE "Category" SET "name" = 'Composants électroniques' WHERE "name" = 'Electronic Components';
UPDATE "Category" SET "name" = 'Véhicules' WHERE "name" = 'Vehicles';
UPDATE "Category" SET "name" = 'Agriculture & agroalimentaire' WHERE "name" = 'Agriculture / Food & Beverage';
UPDATE "Category" SET "name" = 'Matières premières' WHERE "name" = 'Raw Materials';
UPDATE "Category" SET "name" = 'Vêtements homme' WHERE "name" = 'Men''s Clothing';
UPDATE "Category" SET "name" = 'Vêtements femme' WHERE "name" = 'Women''s Clothing';
UPDATE "Category" SET "name" = 'Vêtements enfant' WHERE "name" = 'Kids Clothing';
UPDATE "Category" SET "name" = 'Accessoires' WHERE "name" = 'Accessories';
UPDATE "Category" SET "name" = 'Uniformes' WHERE "name" = 'Uniforms';
UPDATE "Category" SET "name" = 'Audio & casques' WHERE "name" = 'Audio & Headphones';
UPDATE "Category" SET "name" = 'Objets connectés' WHERE "name" = 'Wearables';
UPDATE "Category" SET "name" = 'Fitness' WHERE "name" = 'Fitness Gear';
UPDATE "Category" SET "name" = 'Extérieur' WHERE "name" = 'Outdoor';
UPDATE "Category" SET "name" = 'Sports collectifs' WHERE "name" = 'Team Sports';
UPDATE "Category" SET "name" = 'Montres' WHERE "name" = 'Watches';
UPDATE "Category" SET "name" = 'Lunettes' WHERE "name" = 'Eyewear';
UPDATE "Category" SET "name" = 'Joaillerie' WHERE "name" = 'Fine Jewelry';
UPDATE "Category" SET "name" = 'Bijoux fantaisie' WHERE "name" = 'Fashion Jewelry';
UPDATE "Category" SET "name" = 'Boîtes' WHERE "name" = 'Boxes';
UPDATE "Category" SET "name" = 'Sacs' WHERE "name" = 'Bags';
UPDATE "Category" SET "name" = 'Étiquettes' WHERE "name" = 'Labels';
UPDATE "Category" SET "name" = 'Services d’impression' WHERE "name" = 'Printing Services';
UPDATE "Category" SET "name" = 'Cuisine' WHERE "name" = 'Kitchen';
UPDATE "Category" SET "name" = 'Décoration' WHERE "name" = 'Decor';
UPDATE "Category" SET "name" = 'Outils de jardin' WHERE "name" = 'Garden Tools';
UPDATE "Category" SET "name" = 'Literie' WHERE "name" = 'Bedding';
UPDATE "Category" SET "name" = 'Soins de la peau' WHERE "name" = 'Skincare';
UPDATE "Category" SET "name" = 'Maquillage' WHERE "name" = 'Makeup';
UPDATE "Category" SET "name" = 'Soins capillaires' WHERE "name" = 'Hair Care';
UPDATE "Category" SET "name" = 'Parfums' WHERE "name" = 'Fragrance';
UPDATE "Category" SET "name" = 'Baskets' WHERE "name" = 'Sneakers';
UPDATE "Category" SET "name" = 'Sandales' WHERE "name" = 'Sandals';
UPDATE "Category" SET "name" = 'Bottes' WHERE "name" = 'Boots';
UPDATE "Category" SET "name" = 'Chaussures habillées' WHERE "name" = 'Formal';
UPDATE "Category" SET "name" = 'Sacs à dos' WHERE "name" = 'Backpacks';
UPDATE "Category" SET "name" = 'Valises' WHERE "name" = 'Suitcases';
UPDATE "Category" SET "name" = 'Sacs à main' WHERE "name" = 'Handbags';
UPDATE "Category" SET "name" = 'Voyage' WHERE "name" = 'Travel';
UPDATE "Category" SET "name" = 'Jouets' WHERE "name" = 'Toys';
UPDATE "Category" SET "name" = 'Puériculture' WHERE "name" = 'Baby Gear';
UPDATE "Category" SET "name" = 'Habits enfant' WHERE "name" = 'Kids Apparel';
UPDATE "Category" SET "name" = 'Éducatif' WHERE "name" = 'Educational';
UPDATE "Category" SET "name" = 'Hygiène bucco-dentaire' WHERE "name" = 'Oral Care';
UPDATE "Category" SET "name" = 'Nettoyage' WHERE "name" = 'Cleaning';
UPDATE "Category" SET "name" = 'Bien-être' WHERE "name" = 'Wellness';
UPDATE "Category" SET "name" = 'Équipements' WHERE "name" = 'Equipment';
UPDATE "Category" SET "name" = 'Fournitures' WHERE "name" = 'Supplies';
UPDATE "Category" SET "name" = 'Mobilité' WHERE "name" = 'Mobility';
UPDATE "Category" SET "name" = 'EPI' WHERE "name" = 'PPE';
UPDATE "Category" SET "name" = 'Artisanat' WHERE "name" = 'Handicraft';
UPDATE "Category" SET "name" = 'Fêtes' WHERE "name" = 'Festive';
UPDATE "Category" SET "name" = 'Papeterie' WHERE "name" = 'Stationery';
UPDATE "Category" SET "name" = 'Alimentation' WHERE "name" = 'Food';
UPDATE "Category" SET "name" = 'Toilettage' WHERE "name" = 'Grooming';
UPDATE "Category" SET "name" = 'Habitat' WHERE "name" = 'Housing';
UPDATE "Category" SET "name" = 'Technologie' WHERE "name" = 'Tech';
UPDATE "Category" SET "name" = 'Machines d’emballage' WHERE "name" = 'Packaging Machines';
UPDATE "Category" SET "name" = 'Transformation alimentaire' WHERE "name" = 'Food Processing';
UPDATE "Category" SET "name" = 'Matériaux' WHERE "name" = 'Materials';
UPDATE "Category" SET "name" = 'Outils' WHERE "name" = 'Tools';
UPDATE "Category" SET "name" = 'Finitions' WHERE "name" = 'Finishing';
UPDATE "Category" SET "name" = 'Bureau' WHERE "name" = 'Office';
UPDATE "Category" SET "name" = 'Maison' WHERE "name" = 'Home';
UPDATE "Category" SET "name" = 'Professionnel' WHERE "name" = 'Commercial';
UPDATE "Category" SET "name" = 'Intérieur' WHERE "name" = 'Indoor';
UPDATE "Category" SET "name" = 'Industriel' WHERE "name" = 'Industrial';
UPDATE "Category" SET "name" = 'Climatisation' WHERE "name" = 'Climate';
UPDATE "Category" SET "name" = 'Petit électroménager' WHERE "name" = 'Small Appliances';
UPDATE "Category" SET "name" = 'Pièces détachées' WHERE "name" = 'Parts';
UPDATE "Category" SET "name" = 'Entretien' WHERE "name" = 'Care';
UPDATE "Category" SET "name" = 'Outils à main' WHERE "name" = 'Hand Tools';
UPDATE "Category" SET "name" = 'Outils électriques' WHERE "name" = 'Power Tools';
UPDATE "Category" SET "name" = 'Visserie & fixations' WHERE "name" = 'Fasteners';
UPDATE "Category" SET "name" = 'Quincaillerie' WHERE "name" = 'Hardware';
UPDATE "Category" SET "name" = 'Solaire' WHERE "name" = 'Solar';
UPDATE "Category" SET "name" = 'Onduleurs' WHERE "name" = 'Inverters';
UPDATE "Category" SET "name" = 'Éolien' WHERE "name" = 'Wind';
UPDATE "Category" SET "name" = 'Câbles' WHERE "name" = 'Cables';
UPDATE "Category" SET "name" = 'Interrupteurs' WHERE "name" = 'Switches';
UPDATE "Category" SET "name" = 'Moteurs' WHERE "name" = 'Motors';
UPDATE "Category" SET "name" = 'Distribution électrique' WHERE "name" = 'Distribution';
UPDATE "Category" SET "name" = 'Vidéosurveillance' WHERE "name" = 'CCTV';
UPDATE "Category" SET "name" = 'Alarmes' WHERE "name" = 'Alarms';
UPDATE "Category" SET "name" = 'Vêtements de sécurité' WHERE "name" = 'Safety Wear';
UPDATE "Category" SET "name" = 'Serrures' WHERE "name" = 'Locks';
UPDATE "Category" SET "name" = 'Semi-conducteurs' WHERE "name" = 'Semiconductors';
UPDATE "Category" SET "name" = 'Condensateurs' WHERE "name" = 'Capacitors';
UPDATE "Category" SET "name" = 'Capteurs' WHERE "name" = 'Sensors';
UPDATE "Category" SET "name" = 'Voitures' WHERE "name" = 'Cars';
UPDATE "Category" SET "name" = 'Motos' WHERE "name" = 'Motorcycles';
UPDATE "Category" SET "name" = 'Vélos' WHERE "name" = 'Bicycles';
UPDATE "Category" SET "name" = 'Céréales' WHERE "name" = 'Grains';
UPDATE "Category" SET "name" = 'Boissons' WHERE "name" = 'Beverages';
UPDATE "Category" SET "name" = 'Métaux' WHERE "name" = 'Metals';
UPDATE "Category" SET "name" = 'Plastiques' WHERE "name" = 'Plastics';
UPDATE "Category" SET "name" = 'Produits chimiques' WHERE "name" = 'Chemicals';
UPDATE "Category" SET "name" = 'Logistique' WHERE "name" = 'Logistics';
UPDATE "Category" SET "name" = 'Fabrication' WHERE "name" = 'Manufacturing';
UPDATE "Category" SET "name" = 'Conseil' WHERE "name" = 'Consulting';

-- Demo catalogue (seed rows only, recognised by their generated title pattern):
-- French titles, descriptions, attributes and options. Real merchant products are untouched.
UPDATE "Product" p SET
  "title" = CASE substring(p."title" from ' ([A-Za-z]+) #[0-9]+$') WHEN 'Series' THEN 'Série' WHEN 'Collection' THEN 'Collection' WHEN 'Kit' THEN 'Kit' WHEN 'Edition' THEN 'Édition' WHEN 'Line' THEN 'Gamme' WHEN 'Bundle' THEN 'Lot' WHEN 'Grade' THEN 'Qualité' WHEN 'Model' THEN 'Modèle' WHEN 'Pack' THEN 'Pack' WHEN 'Set' THEN 'Ensemble' END || ' ' || CASE split_part(p."title", ' ', 1) WHEN 'Premium' THEN 'Premium' WHEN 'Smart' THEN 'Smart' WHEN 'Classic' THEN 'Classique' WHEN 'Pro' THEN 'Pro' WHEN 'Eco' THEN 'Éco' WHEN 'Ultra' THEN 'Ultra' WHEN 'Industrial' THEN 'Industrielle' WHEN 'Wholesale' THEN 'Grossiste' WHEN 'OEM' THEN 'OEM' WHEN 'Custom' THEN 'Sur mesure' END || ' – ' || c."name" || ' #' || substring(p."title" from '#([0-9]+)$'),
  "description" = CASE substring(p."title" from ' ([A-Za-z]+) #[0-9]+$') WHEN 'Series' THEN 'Série' WHEN 'Collection' THEN 'Collection' WHEN 'Kit' THEN 'Kit' WHEN 'Edition' THEN 'Édition' WHEN 'Line' THEN 'Gamme' WHEN 'Bundle' THEN 'Lot' WHEN 'Grade' THEN 'Qualité' WHEN 'Model' THEN 'Modèle' WHEN 'Pack' THEN 'Pack' WHEN 'Set' THEN 'Ensemble' END || ' ' || CASE split_part(p."title", ' ', 1) WHEN 'Premium' THEN 'Premium' WHEN 'Smart' THEN 'Smart' WHEN 'Classic' THEN 'Classique' WHEN 'Pro' THEN 'Pro' WHEN 'Eco' THEN 'Éco' WHEN 'Ultra' THEN 'Ultra' WHEN 'Industrial' THEN 'Industrielle' WHEN 'Wholesale' THEN 'Grossiste' WHEN 'OEM' THEN 'OEM' WHEN 'Custom' THEN 'Sur mesure' END || ' – ' || c."name" || ' #' || substring(p."title" from '#([0-9]+)$')
    || ' : ' || lower(c."name") || ' proposé par ' || s."name" || ' (' || s."city" || '). '
    || 'Fabrication sous contrôle qualité strict'
    || COALESCE(' (certifications : ' || NULLIF(regexp_replace(COALESCE(p."certifications", ''), '[\[\]"]', '', 'g'), '') || ')', '')
    || '. Idéal pour la vente en gros, le commerce de détail, le dropshipping et la personnalisation. '
    || 'Livraison en Côte d''Ivoire, en Afrique de l''Ouest et à l''international.',
  "keyAttributes" = regexp_replace(regexp_replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(p."keyAttributes", '"k":"Place of Origin"', '"k":"Pays d''origine"'), '"k":"Brand Name"', '"k":"Marque"'), '"k":"Model Number"', '"k":"Référence"'), '"k":"Material"', '"k":"Matière"'), '"k":"Warranty"', '"k":"Garantie"'), '"k":"Packaging"', '"k":"Conditionnement"'), '"k":"Lead Time"', '"k":"Délai de production"'), '"k":"Customization"', '"k":"Personnalisation"'), '"v":"China"', '"v":"Chine"'), '"v":"Egypt"', '"v":"Égypte"'), '"v":"Germany"', '"v":"Allemagne"'), '"v":"India"', '"v":"Inde"'), '"v":"Turkey"', '"v":"Turquie"'), '"v":"Aluminum"', '"v":"Aluminium"'), '"v":"Cotton"', '"v":"Coton"'), '"v":"Glass"', '"v":"Verre"'), '"v":"Plastic"', '"v":"Plastique"'), '"v":"Stainless Steel"', '"v":"Acier inoxydable"'), '"v":"1 Year"', '"v":"1 an"'), '"v":"2 Year"', '"v":"2 ans"'), '"v":"3 Year"', '"v":"3 ans"'), '"v":"OEM, ODM, Custom logo"', '"v":"OEM, ODM, logo personnalisé"'), '"v":"([0-9]+) days"', '"v":"\1 jours"', 'g'), '"v":"Carton / ([0-9]+) pcs"', '"v":"Carton de \1 pièces"', 'g'),
  "variantsJson" = replace(replace(replace(replace(replace(replace(replace(p."variantsJson", '"Color"', '"Couleur"'), '"Size"', '"Taille"'), '"Black"', '"Noir"'), '"White"', '"Blanc"'), '"Red"', '"Rouge"'), '"Blue"', '"Bleu"'), '"Green"', '"Vert"')
FROM "Category" c, "Supplier" s
WHERE c."id" = p."categoryId" AND s."id" = p."supplierId"
  AND p."title" ~ '^(Premium|Smart|Classic|Pro|Eco|Ultra|Industrial|Wholesale|OEM|Custom) .+ (Series|Collection|Kit|Edition|Line|Bundle|Grade|Model|Pack|Set) #[0-9]{4}$';
