// Migration Script using psql - works around Node pg library auth issues
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Read and parse the productData.ts file
const parseProductData = (): Record<string, any[]> => {
  const productDataPath = path.resolve(__dirname, '../../src/mocks/productData.ts');

  if (!fs.existsSync(productDataPath)) {
    throw new Error(`Product data file not found at: ${productDataPath}`);
  }

  const fileContent = fs.readFileSync(productDataPath, 'utf-8');

  // Parse the TypeScript file to extract product data
  const dataMatch = fileContent.match(/const productData:\s*ProductData\s*=\s*(\{[\s\S]*?\});?\s*export default productData/);

  if (!dataMatch) {
    const altMatch = fileContent.match(/const productData\s*[^=]*=\s*(\{[\s\S]*?\});?\s*export/);
    if (!altMatch) {
      throw new Error('Could not parse product data from file');
    }
    return evalProductData(altMatch[1]);
  }

  return evalProductData(dataMatch[1]);
};

// Safe evaluation of product data object
const evalProductData = (dataString: string): Record<string, any[]> => {
  let cleaned = dataString
    .replace(/\/\/[^\n]*/g, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

  try {
    const fn = new Function(`return ${cleaned}`);
    return fn();
  } catch (error) {
    console.error('Error parsing product data:', error);
    throw new Error('Failed to parse product data');
  }
};

// Escape string for PostgreSQL
const escapePgString = (str: string | undefined | null): string => {
  if (str === undefined || str === null) return 'NULL';
  // Escape single quotes by doubling them
  return `'${String(str).replace(/'/g, "''")}'`;
};

// Convert JS object to PostgreSQL JSONB
const toJsonb = (obj: any): string => {
  if (obj === undefined || obj === null) return "'{}'::jsonb";
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
};

// Transform products and generate SQL
const generateInsertStatements = (productData: Record<string, any[]>): string[] => {
  const statements: string[] = [];

  for (const [category, categoryProducts] of Object.entries(productData)) {
    if (!Array.isArray(categoryProducts)) continue;

    for (const product of categoryProducts) {
      // Transform variants
      const variants = (product.variants || []).map((variant: any) => ({
        id: variant.id || variant.sku,
        name: variant.name,
        sku: variant.sku || variant.id,
        path: variant.path,
        image: variant.image,
        link: variant.link,
        price: variant.price?.toString() || '0',
        title: variant.title || variant.name,
        floorOffset: variant.floorOffset,
        spawnHeight: variant.spawnHeight,
        dimensions: variant.dimensions || { width: 0, height: 0, depth: 0 },
        orientation: variant.orientation,
        movement: variant.movement,
      }));

      const sql = `INSERT INTO products (product_id, category, name, price, link, image, variant_type, features, variants, enabled)
VALUES (${escapePgString(product.id)}, ${escapePgString(category)}, ${escapePgString(product.name)}, ${parseFloat(product.price || '0')}, ${escapePgString(product.link)}, ${escapePgString(product.image)}, ${escapePgString(product.variantType)}, ${toJsonb(product.features || [])}, ${toJsonb(variants)}, true)
ON CONFLICT (product_id) DO UPDATE SET
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  link = EXCLUDED.link,
  image = EXCLUDED.image,
  variant_type = EXCLUDED.variant_type,
  features = EXCLUDED.features,
  variants = EXCLUDED.variants,
  updated_at = CURRENT_TIMESTAMP;`;

      statements.push(sql);
    }
  }

  return statements;
};

// Run SQL via psql
const runPsql = (sql: string): void => {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  // Write SQL to temp file
  const tempFile = path.resolve(__dirname, '../../temp_migration.sql');
  fs.writeFileSync(tempFile, sql);

  try {
    const result = execSync(
      `psql -h ${host} -p ${port} -U ${user} -d ${database} -f "${tempFile}"`,
      {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
        env: { ...process.env, PGPASSWORD: password }
      }
    );
    console.log(result);
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
};

// Main migration function
const runMigration = async (): Promise<void> => {
  console.log('='.repeat(60));
  console.log('Product Data Migration Script (psql version)');
  console.log('='.repeat(60));

  try {
    // Test psql connection
    console.log('\n1. Testing database connection...');
    try {
      const result = execSync(
        `psql -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -c "SELECT 1;"`,
        {
          encoding: 'utf-8',
          env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
        }
      );
      console.log('   Database connection successful');
    } catch (error) {
      throw new Error('Failed to connect to database via psql');
    }

    // Load product data
    console.log('\n2. Loading product data from productData.ts...');
    const productData = parseProductData();

    const categories = Object.keys(productData);
    console.log(`   Found ${categories.length} categories: ${categories.join(', ')}`);

    // Count products
    let totalProducts = 0;
    let totalVariants = 0;
    for (const [, products] of Object.entries(productData)) {
      if (Array.isArray(products)) {
        totalProducts += products.length;
        for (const product of products) {
          totalVariants += (product.variants || []).length;
        }
      }
    }
    console.log(`   Total products: ${totalProducts}`);
    console.log(`   Total variants: ${totalVariants}`);

    // Generate SQL
    console.log('\n3. Generating SQL statements...');
    const statements = generateInsertStatements(productData);
    console.log(`   Generated ${statements.length} INSERT statements`);

    // Run migration
    console.log('\n4. Inserting products into database...');
    const sql = statements.join('\n');
    runPsql(sql);
    console.log('   Products inserted successfully');

    // Verify migration
    console.log('\n5. Verifying migration...');
    const psqlEnv = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD };
    const countResult = execSync(
      `psql -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -t -c "SELECT COUNT(*) FROM products;"`,
      { encoding: 'utf-8', env: psqlEnv }
    );
    console.log(`   Total products in database: ${countResult.trim()}`);

    const enabledResult = execSync(
      `psql -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -t -c "SELECT COUNT(*) FROM products WHERE enabled = true;"`,
      { encoding: 'utf-8', env: psqlEnv }
    );
    console.log(`   Enabled products: ${enabledResult.trim()}`);

    const categoryResult = execSync(
      `psql -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -t -c "SELECT category, COUNT(*) FROM products GROUP BY category ORDER BY category;"`,
      { encoding: 'utf-8', env: psqlEnv }
    );
    console.log('\n   Category breakdown:');
    categoryResult.trim().split('\n').forEach(line => {
      if (line.trim()) {
        const [cat, count] = line.split('|').map(s => s.trim());
        console.log(`     - ${cat}: ${count} products`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('Migration completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\nMigration failed:', error);
    throw error;
  }
};

// Run migration
runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
