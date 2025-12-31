// Migration Script - Imports products from productData.ts to PostgreSQL database
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { pool, initializeDatabase, testConnection } from '../config/db';
import ProductModel from '../models/Product';

// Read and parse the productData.ts file
const parseProductData = (): Record<string, any[]> => {
  const productDataPath = path.resolve(__dirname, '../../src/mocks/productData.ts');

  if (!fs.existsSync(productDataPath)) {
    throw new Error(`Product data file not found at: ${productDataPath}`);
  }

  const fileContent = fs.readFileSync(productDataPath, 'utf-8');

  // Parse the TypeScript file to extract product data
  // We'll use regex to extract the data object
  const dataMatch = fileContent.match(/const productData:\s*ProductData\s*=\s*(\{[\s\S]*?\});?\s*export default productData/);

  if (!dataMatch) {
    // Try alternative pattern
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
  // Clean up the string for eval
  // Remove comments
  let cleaned = dataString
    .replace(/\/\/[^\n]*/g, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

  // The data structure is already valid JavaScript, we just need to handle
  // the ObjectModel type references
  try {
    // Use Function constructor to safely evaluate (similar to JSON.parse but for JS objects)
    const fn = new Function(`return ${cleaned}`);
    return fn();
  } catch (error) {
    console.error('Error parsing product data:', error);
    throw new Error('Failed to parse product data');
  }
};

// Alternative: Direct import approach
const importProductDataDirectly = async (): Promise<Record<string, any[]>> => {
  try {
    // Dynamic import of the productData module
    const productDataModule = await import('../../src/mocks/productData');
    return productDataModule.default;
  } catch (error) {
    console.error('Direct import failed, trying file parsing...');
    return parseProductData();
  }
};

// Transform product data to database format
const transformProducts = (productData: Record<string, any[]>): any[] => {
  const products: any[] = [];

  for (const [category, categoryProducts] of Object.entries(productData)) {
    if (!Array.isArray(categoryProducts)) continue;

    for (const product of categoryProducts) {
      // Transform variants to ensure consistent format
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

      products.push({
        product_id: product.id,
        category: category,
        name: product.name,
        price: product.price?.toString() || '0',
        link: product.link || '',
        image: product.image || '',
        variant_type: product.variantType || 'Default',
        features: product.features || [],
        variants: variants,
        enabled: true, // All products enabled by default
      });
    }
  }

  return products;
};

// Main migration function
const runMigration = async (): Promise<void> => {
  console.log('='.repeat(60));
  console.log('Product Data Migration Script');
  console.log('='.repeat(60));

  try {
    // Test database connection
    console.log('\n1. Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }
    console.log('   Database connection successful');

    // Initialize database tables
    console.log('\n2. Initializing database tables...');
    await initializeDatabase();
    console.log('   Database tables initialized');

    // Import product data
    console.log('\n3. Loading product data from productData.ts...');
    let productData: Record<string, any[]>;

    try {
      productData = await importProductDataDirectly();
    } catch {
      console.log('   Direct import failed, using file parsing...');
      productData = parseProductData();
    }

    const categories = Object.keys(productData);
    console.log(`   Found ${categories.length} categories: ${categories.join(', ')}`);

    // Transform products
    console.log('\n4. Transforming products to database format...');
    const products = transformProducts(productData);
    console.log(`   Transformed ${products.length} products`);

    // Count variants
    let totalVariants = 0;
    for (const product of products) {
      totalVariants += product.variants.length;
    }
    console.log(`   Total variants: ${totalVariants}`);

    // Insert products into database
    console.log('\n5. Inserting products into database...');
    const result = await ProductModel.bulkUpsert(products);
    console.log(`   Inserted: ${result.inserted} new products`);
    console.log(`   Updated: ${result.updated} existing products`);

    // Verify migration
    console.log('\n6. Verifying migration...');
    const stats = await ProductModel.getStats();
    console.log(`   Total products in database: ${stats.totalProducts}`);
    console.log(`   Total variants: ${stats.totalVariants}`);
    console.log(`   Enabled products: ${stats.enabledProducts}`);
    console.log('\n   Category breakdown:');
    for (const [category, count] of Object.entries(stats.categoryCounts)) {
      console.log(`     - ${category}: ${count} products`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Migration completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\nMigration failed:', error);
    throw error;
  } finally {
    // Close database connection
    await pool.end();
  }
};

// Run migration
runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
