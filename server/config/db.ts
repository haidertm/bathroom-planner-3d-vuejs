// Database Configuration
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  console.error('Missing required environment variable: DATABASE_URL');
  console.error('Please ensure your .env file contains DATABASE_URL.');
  process.exit(1);
}

// Create PostgreSQL connection pool using DATABASE_URL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection not available
});

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
};

// Initialize database tables
export const initializeDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    // Create products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(255) UNIQUE NOT NULL,
        category VARCHAR(100) NOT NULL,
        name VARCHAR(500) NOT NULL,
        price DECIMAL(10, 2),
        link TEXT,
        image TEXT,
        variant_type VARCHAR(255),
        features JSONB DEFAULT '[]',
        variants JSONB DEFAULT '[]',
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_synced_at TIMESTAMP WITH TIME ZONE
      );

      -- Create index for faster lookups
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_enabled ON products(enabled);
      CREATE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);

      -- Create variants table for individual variant tracking
      CREATE TABLE IF NOT EXISTS product_variants (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        sku VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(500),
        title VARCHAR(500),
        image TEXT,
        link TEXT,
        path TEXT,
        price DECIMAL(10, 2),
        dimensions JSONB,
        orientation JSONB,
        movement JSONB,
        floor_offset DECIMAL(10, 2),
        spawn_height DECIMAL(10, 2),
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
      CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
      CREATE INDEX IF NOT EXISTS idx_variants_enabled ON product_variants(enabled);

      -- Create sync_logs table to track synchronization history
      CREATE TABLE IF NOT EXISTS sync_logs (
        id SERIAL PRIMARY KEY,
        sync_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        products_updated INTEGER DEFAULT 0,
        products_added INTEGER DEFAULT 0,
        products_failed INTEGER DEFAULT 0,
        error_message TEXT,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE
      );
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
