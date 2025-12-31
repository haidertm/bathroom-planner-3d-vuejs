const fs = require('fs');
const path = require('path');

// Read product data file
const productDataPath = path.resolve(__dirname, '../../src/mocks/productData.ts');
const fileContent = fs.readFileSync(productDataPath, 'utf-8');

// Parse product data
const dataMatch = fileContent.match(/const productData:\s*ProductData\s*=\s*(\{[\s\S]*?\});\s*export default productData/);
let dataString = dataMatch ? dataMatch[1] : null;

if (!dataString) {
  const altMatch = fileContent.match(/const productData\s*[^=]*=\s*(\{[\s\S]*?\});\s*export/);
  dataString = altMatch ? altMatch[1] : null;
}

if (!dataString) {
  console.error('Could not parse product data');
  process.exit(1);
}

// Clean and evaluate
let cleaned = dataString
  .replace(/\/\/[^\n]*/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');

const fn = new Function('return ' + cleaned);
const productData = fn();

// Generate SQL
const escapePgString = (str) => {
  if (str === undefined || str === null) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
};

const toJsonb = (obj) => {
  if (obj === undefined || obj === null) return "'{}'::jsonb";
  return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
};

const statements = [];
for (const [category, categoryProducts] of Object.entries(productData)) {
  if (!Array.isArray(categoryProducts)) continue;

  for (const product of categoryProducts) {
    const variants = (product.variants || []).map((v) => ({
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
let counts = {};
for (const [category, categoryProducts] of Object.entries(productData)) {
  if (Array.isArray(categoryProducts)) {
    counts[category] = categoryProducts.length;
  }
}
console.log('\nCategory breakdown:');
for (const [cat, count] of Object.entries(counts)) {
  console.log(`  ${cat}: ${count} products`);
}
