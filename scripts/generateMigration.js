/**
 * Script to generate migration.sql from productData.ts
 * This transfers all product data including filterAttributes to the database
 *
 * Usage: node scripts/generateMigration.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import product data
async function generateMigration() {
  // Dynamically import the product data
  const productDataModule = await import('../src/mocks/productData.ts');
  const productData = productDataModule.default;

  let sql = `-- Migration generated from productData.ts
-- Generated at: ${new Date().toISOString()}
-- This migration includes filterAttributes for all product variants

`;

  // Process each category
  for (const [category, products] of Object.entries(productData)) {
    sql += `\n-- Category: ${category}\n`;

    for (const product of products) {
      const productId = product.id;
      const name = escapeSql(product.name);
      const price = product.price || '0';
      const link = escapeSql(product.link || '');
      const image = escapeSql(product.image || '');
      const variantType = escapeSql(product.variantType || '');
      const features = JSON.stringify(product.features || []);

      // Process variants - keep all data including filterAttributes
      const variants = (product.variants || []).map(variant => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku || variant.id,
        path: variant.path,
        image: variant.image,
        link: variant.link,
        price: variant.price,
        title: variant.title,
        floorOffset: variant.floorOffset,
        spawnHeight: variant.spawnHeight,
        dimensions: variant.dimensions,
        orientation: variant.orientation,
        movement: variant.movement,
        // Include filterAttributes!
        filterAttributes: variant.filterAttributes
      }));

      const variantsJson = JSON.stringify(variants);

      sql += `INSERT INTO products (product_id, category, name, price, link, image, variant_type, features, variants, enabled) VALUES ('${productId}', '${category}', '${name}', ${parseFloat(price) || 0}, '${link}', '${image}', '${variantType}', '${features}'::jsonb, '${escapeSql(variantsJson)}'::jsonb, true) ON CONFLICT (product_id) DO UPDATE SET category = EXCLUDED.category, name = EXCLUDED.name, price = EXCLUDED.price, link = EXCLUDED.link, image = EXCLUDED.image, variant_type = EXCLUDED.variant_type, features = EXCLUDED.features, variants = EXCLUDED.variants, updated_at = CURRENT_TIMESTAMP;\n`;
    }
  }

  // Write to file
  const outputPath = path.join(__dirname, '..', 'migration.sql');
  fs.writeFileSync(outputPath, sql);

  console.log(`Migration file generated: ${outputPath}`);
  console.log(`Total categories: ${Object.keys(productData).length}`);

  let totalProducts = 0;
  let totalVariants = 0;
  for (const [category, products] of Object.entries(productData)) {
    totalProducts += products.length;
    for (const product of products) {
      totalVariants += (product.variants || []).length;
    }
    console.log(`  ${category}: ${products.length} products`);
  }
  console.log(`Total products: ${totalProducts}`);
  console.log(`Total variants: ${totalVariants}`);
}

function escapeSql(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/'/g, "''");
}

generateMigration().catch(console.error);
