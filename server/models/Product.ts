// Product Model - Database operations for products
import pool from '../config/db';

// Types matching the frontend admin types
export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  path: string;
  image: string;
  link: string;
  price: string | number;
  title?: string;
  floorOffset?: number;
  spawnHeight?: number;
  dimensions: {
    width: number;
    height: number;
    depth?: number;
  };
  orientation?: {
    type: 'face_into_room' | 'flush_with_wall' | 'custom';
    wallBuffer?: number;
    rotationOffset?: number;
    description?: string;
  };
  movement?: {
    snapToWall: boolean;
    cornerInstallOnly?: boolean;
    allowVerticalMovement?: boolean;
    allowFreeRotation?: boolean;
    minHeight?: number;
    maxHeight?: number;
  };
}

export interface Product {
  id?: number;
  product_id: string;
  category: string;
  name: string;
  price: string;
  link: string;
  image: string;
  variant_type: string;
  features: string[];
  variants: ProductVariant[];
  enabled: boolean;
  created_at?: Date;
  updated_at?: Date;
  last_synced_at?: Date;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductFilters {
  categories?: string[];
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  enabled?: boolean;
  sortBy?: 'name' | 'price' | 'category' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Product Model Functions
export const ProductModel = {
  // Get all products with filters and pagination
  async findAll(filters: ProductFilters = {}): Promise<ProductListResponse> {
    const {
      categories = [],
      search = '',
      minPrice,
      maxPrice,
      enabled,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 12,
    } = filters;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by categories
    if (categories.length > 0) {
      query += ` AND category = ANY($${paramIndex})`;
      params.push(categories);
      paramIndex++;
    }

    // Filter by search term
    if (search.trim()) {
      query += ` AND (
        name ILIKE $${paramIndex} OR
        product_id ILIKE $${paramIndex} OR
        variants::text ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Filter by price range
    if (minPrice !== undefined) {
      query += ` AND price >= $${paramIndex}`;
      params.push(minPrice);
      paramIndex++;
    }
    if (maxPrice !== undefined) {
      query += ` AND price <= $${paramIndex}`;
      params.push(maxPrice);
      paramIndex++;
    }

    // Filter by enabled status
    if (enabled !== undefined) {
      query += ` AND enabled = $${paramIndex}`;
      params.push(enabled);
      paramIndex++;
    }

    // Get total count - build a separate count query
    let countQuery = 'SELECT COUNT(*) FROM products WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (categories && categories.length > 0) {
      countQuery += ` AND category = ANY($${countParamIndex})`;
      countParams.push(categories);
      countParamIndex++;
    }
    if (search && search.trim()) {
      countQuery += ` AND (name ILIKE $${countParamIndex} OR product_id ILIKE $${countParamIndex} OR variants::text ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }
    if (minPrice !== undefined) {
      countQuery += ` AND price >= $${countParamIndex}`;
      countParams.push(minPrice);
      countParamIndex++;
    }
    if (maxPrice !== undefined) {
      countQuery += ` AND price <= $${countParamIndex}`;
      countParams.push(maxPrice);
      countParamIndex++;
    }
    if (enabled !== undefined) {
      countQuery += ` AND enabled = $${countParamIndex}`;
      countParams.push(enabled);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Add sorting
    const validSortColumns = ['name', 'price', 'category', 'created_at', 'updated_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortColumn} ${order}`;

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return {
      products: result.rows.map(row => ({
        ...row,
        features: row.features || [],
        variants: row.variants || [],
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  // Get a single product by ID
  async findById(id: number): Promise<Product | null> {
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  // Get a single product by product_id
  async findByProductId(productId: string): Promise<Product | null> {
    const result = await pool.query(
      'SELECT * FROM products WHERE product_id = $1',
      [productId]
    );
    return result.rows[0] || null;
  },

  // Create a new product
  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const result = await pool.query(
      `INSERT INTO products (
        product_id, category, name, price, link, image,
        variant_type, features, variants, enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        product.product_id,
        product.category,
        product.name,
        product.price,
        product.link,
        product.image,
        product.variant_type,
        JSON.stringify(product.features),
        JSON.stringify(product.variants),
        product.enabled ?? true,
      ]
    );
    return result.rows[0];
  },

  // Update an existing product
  async update(id: number, updates: Partial<Product>): Promise<Product | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    const allowedFields = [
      'name', 'price', 'link', 'image', 'variant_type',
      'features', 'variants', 'enabled', 'category'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(key === 'features' || key === 'variants' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    // Always update updated_at
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  },

  // Update by product_id (for sync operations)
  async updateByProductId(productId: string, updates: Partial<Product>): Promise<Product | null> {
    const product = await this.findByProductId(productId);
    if (!product || !product.id) return null;
    return this.update(product.id, updates);
  },

  // Toggle enabled status
  async toggleEnabled(id: number): Promise<Product | null> {
    const result = await pool.query(
      `UPDATE products SET
        enabled = NOT enabled,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },

  // Delete a product
  async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  // Bulk upsert for migration/sync
  async bulkUpsert(products: Omit<Product, 'id' | 'created_at' | 'updated_at'>[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const product of products) {
      const existing = await this.findByProductId(product.product_id);

      if (existing && existing.id) {
        await this.update(existing.id, product);
        updated++;
      } else {
        await this.create(product);
        inserted++;
      }
    }

    return { inserted, updated };
  },

  // Get all enabled products (for planner frontend)
  async findAllEnabled(): Promise<Product[]> {
    const result = await pool.query(
      'SELECT * FROM products WHERE enabled = true ORDER BY category, name'
    );
    return result.rows.map(row => ({
      ...row,
      features: row.features || [],
      variants: row.variants || [],
    }));
  },

  // Get product statistics
  async getStats(): Promise<{
    totalProducts: number;
    enabledProducts: number;
    disabledProducts: number;
    categoryCounts: Record<string, number>;
    totalVariants: number;
  }> {
    const totalResult = await pool.query('SELECT COUNT(*) FROM products');
    const enabledResult = await pool.query('SELECT COUNT(*) FROM products WHERE enabled = true');
    const categoryResult = await pool.query(
      'SELECT category, COUNT(*) as count FROM products GROUP BY category'
    );

    // Count total variants
    const variantResult = await pool.query(
      'SELECT SUM(jsonb_array_length(variants)) as total FROM products'
    );

    const categoryCounts: Record<string, number> = {};
    for (const row of categoryResult.rows) {
      categoryCounts[row.category] = parseInt(row.count);
    }

    return {
      totalProducts: parseInt(totalResult.rows[0].count),
      enabledProducts: parseInt(enabledResult.rows[0].count),
      disabledProducts: parseInt(totalResult.rows[0].count) - parseInt(enabledResult.rows[0].count),
      categoryCounts,
      totalVariants: parseInt(variantResult.rows[0].total) || 0,
    };
  },

  // Update last synced timestamp
  async updateSyncTimestamp(productIds: string[]): Promise<void> {
    await pool.query(
      `UPDATE products SET last_synced_at = CURRENT_TIMESTAMP WHERE product_id = ANY($1)`,
      [productIds]
    );
  },

  // Get products that need syncing (enabled and not synced recently)
  async getProductsForSync(hoursOld: number = 24): Promise<Product[]> {
    const result = await pool.query(
      `SELECT * FROM products
       WHERE enabled = true
       AND (last_synced_at IS NULL OR last_synced_at < NOW() - INTERVAL '${hoursOld} hours')
       ORDER BY last_synced_at NULLS FIRST`,
    );
    return result.rows;
  },
};

export default ProductModel;
