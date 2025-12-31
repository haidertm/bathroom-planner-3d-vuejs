import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import product data directly
const productDataModule = await import('../../src/mocks/productData.ts');
const productData = productDataModule.default;

// Generate SQL
const escapePgString = (str: string | undefined | null): string => {
  if (str === undefined || str === null) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
};

const toJsonb = (obj: any): string => {
  if (obj === undefined || obj === null) return "'{}'::jsonb";
  return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
};

const statements: string[] = [];
for (const [category, categoryProducts] of Object.entries(productData)) {
  if (!Array.isArray(categoryProducts)) continue;

  for (const product of categoryProducts) {
    const variants = (product.variants || []).map((v: any) => ({
      id: v.id || v.sku,
      name: v.name,
      sku: v.sku || v.id,
      path: v.path,
      image: v.image,
      link: v.link,
      price: v.price?.toString() || '0',
      title: v.title || v.name,
      floorOffset: v.floorOffset,
      spawnHeight: v.spawnHeight,
      dimensions: v.dimensions || { width: 0, height: 0, depth: 0 },
      orientation: v.orientation,
      movement: v.movement,
    }));

    const sql = `INSERT INTO products (product_id, category, name, price, link, image, variant_type, features, variants, enabled) VALUES (${escapePgString(product.id)}, ${escapePgString(category)}, ${escapePgString(product.name)}, ${parseFloat(product.price || '0')}, ${escapePgString(product.link)}, ${escapePgString(product.image)}, ${escapePgString(product.variantType)}, ${toJsonb(product.features || [])}, ${toJsonb(variants)}, true) ON CONFLICT (product_id) DO UPDATE SET category = EXCLUDED.category, name = EXCLUDED.name, price = EXCLUDED.price, link = EXCLUDED.link, image = EXCLUDED.image, variant_type = EXCLUDED.variant_type, features = EXCLUDED.features, variants = EXCLUDED.variants, updated_at = CURRENT_TIMESTAMP;`;
    statements.push(sql);
  }
}

// Write SQL file
const sqlFile = path.resolve(__dirname, '../../migration.sql');
fs.writeFileSync(sqlFile, statements.join('\n'));
console.log('Generated ' + statements.length + ' INSERT statements');
console.log('SQL file saved to: ' + sqlFile);

// Print category breakdown
const counts: Record<string, number> = {};
for (const [category, categoryProducts] of Object.entries(productData)) {
  if (Array.isArray(categoryProducts)) {
    counts[category] = categoryProducts.length;
  }
}
console.log('\nCategory breakdown:');
for (const [cat, count] of Object.entries(counts)) {
  console.log(`  ${cat}: ${count} products`);
}
