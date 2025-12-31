// GraphQL Sync Service - Fetches live product data from Bathroom Mountain
import { GraphQLClient, gql } from 'graphql-request';
import ProductModel, { Product } from '../models/Product';
import pool from '../config/db';

// GraphQL client configuration
const endpoint = process.env.GRAPHQL_ENDPOINT || 'https://www.bathroommountain.co.uk/graphql';

const client = new GraphQLClient(endpoint, {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// GraphQL query to fetch product data by SKU
// Magento 2 GraphQL typically uses this structure
const GET_PRODUCT_BY_SKU = gql`
  query GetProductBySku($sku: String!) {
    products(filter: { sku: { eq: $sku } }) {
      items {
        sku
        name
        price_range {
          minimum_price {
            regular_price {
              value
              currency
            }
            final_price {
              value
              currency
            }
          }
        }
        url_key
        url_suffix
        image {
          url
          label
        }
        small_image {
          url
        }
        stock_status
        ... on ConfigurableProduct {
          variants {
            product {
              sku
              name
              price_range {
                minimum_price {
                  final_price {
                    value
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// Alternative simpler query structure
const GET_PRODUCTS_BY_SKUS = gql`
  query GetProducts($skus: [String!]!) {
    products(filter: { sku: { in: $skus } }) {
      items {
        sku
        name
        price_range {
          minimum_price {
            final_price {
              value
              currency
            }
          }
        }
        url_key
        image {
          url
        }
        stock_status
      }
    }
  }
`;

interface GraphQLProductResponse {
  sku: string;
  name: string;
  price_range?: {
    minimum_price?: {
      final_price?: {
        value: number;
        currency: string;
      };
    };
  };
  url_key?: string;
  image?: {
    url: string;
  };
  stock_status?: string;
}

interface SyncResult {
  success: boolean;
  productsUpdated: number;
  productsFailed: number;
  errors: string[];
  syncedAt: Date;
}

// Log sync operation to database
const logSync = async (
  syncType: string,
  status: string,
  productsUpdated: number,
  productsFailed: number,
  errorMessage?: string
): Promise<number> => {
  const result = await pool.query(
    `INSERT INTO sync_logs (sync_type, status, products_updated, products_failed, error_message)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [syncType, status, productsUpdated, productsFailed, errorMessage || null]
  );
  return result.rows[0].id;
};

// Update sync log completion
const completeSyncLog = async (logId: number, productsUpdated: number, productsFailed: number): Promise<void> => {
  await pool.query(
    `UPDATE sync_logs SET
       status = 'completed',
       products_updated = $1,
       products_failed = $2,
       completed_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [productsUpdated, productsFailed, logId]
  );
};

// Extract SKUs from product variants
const extractSkusFromProduct = (product: Product): string[] => {
  const skus: string[] = [];
  if (product.variants && Array.isArray(product.variants)) {
    for (const variant of product.variants) {
      if (variant.sku) {
        skus.push(variant.sku);
      }
    }
  }
  return skus;
};

// Fetch product data from GraphQL
const fetchProductFromGraphQL = async (sku: string): Promise<GraphQLProductResponse | null> => {
  try {
    const data = await client.request<{ products: { items: GraphQLProductResponse[] } }>(
      GET_PRODUCT_BY_SKU,
      { sku }
    );

    if (data.products?.items?.length > 0) {
      return data.products.items[0];
    }
    return null;
  } catch (error) {
    console.error(`GraphQL fetch error for SKU ${sku}:`, error);
    return null;
  }
};

// Batch fetch products from GraphQL
const batchFetchProducts = async (skus: string[]): Promise<Map<string, GraphQLProductResponse>> => {
  const results = new Map<string, GraphQLProductResponse>();

  try {
    // Fetch in batches of 20 to avoid overwhelming the API
    const batchSize = 20;
    for (let i = 0; i < skus.length; i += batchSize) {
      const batch = skus.slice(i, i + batchSize);

      try {
        const data = await client.request<{ products: { items: GraphQLProductResponse[] } }>(
          GET_PRODUCTS_BY_SKUS,
          { skus: batch }
        );

        if (data.products?.items) {
          for (const item of data.products.items) {
            results.set(item.sku, item);
          }
        }
      } catch (batchError) {
        console.error(`Error fetching batch starting at ${i}:`, batchError);
        // Continue with next batch
      }

      // Rate limiting - wait 500ms between batches
      if (i + batchSize < skus.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    console.error('Batch fetch error:', error);
  }

  return results;
};

// Main sync function - syncs enabled products only
export const syncEnabledProducts = async (): Promise<SyncResult> => {
  console.log('Starting GraphQL product sync...');
  const syncedAt = new Date();
  const errors: string[] = [];
  let productsUpdated = 0;
  let productsFailed = 0;

  // Log sync start
  const logId = await logSync('daily_sync', 'in_progress', 0, 0);

  try {
    // Get all enabled products
    const enabledProducts = await ProductModel.findAllEnabled();
    console.log(`Found ${enabledProducts.length} enabled products to sync`);

    if (enabledProducts.length === 0) {
      await completeSyncLog(logId, 0, 0);
      return {
        success: true,
        productsUpdated: 0,
        productsFailed: 0,
        errors: [],
        syncedAt,
      };
    }

    // Collect all SKUs to fetch
    const allSkus: string[] = [];
    const skuToProduct = new Map<string, { product: Product; variantIndex: number }>();

    for (const product of enabledProducts) {
      const skus = extractSkusFromProduct(product);
      for (let i = 0; i < skus.length; i++) {
        allSkus.push(skus[i]);
        skuToProduct.set(skus[i], { product, variantIndex: i });
      }
    }

    console.log(`Fetching ${allSkus.length} SKUs from GraphQL...`);

    // Batch fetch from GraphQL
    const graphqlData = await batchFetchProducts(allSkus);
    console.log(`Received data for ${graphqlData.size} SKUs`);

    // Process and update products
    const updatedProductIds = new Set<string>();

    for (const [sku, graphqlProduct] of graphqlData) {
      const mapping = skuToProduct.get(sku);
      if (!mapping) continue;

      const { product, variantIndex } = mapping;

      try {
        // Update variant data
        const variants = [...(product.variants || [])];
        if (variants[variantIndex]) {
          // Update price if available
          if (graphqlProduct.price_range?.minimum_price?.final_price?.value) {
            variants[variantIndex].price = graphqlProduct.price_range.minimum_price.final_price.value.toString();
          }

          // Update image if available
          if (graphqlProduct.image?.url) {
            // Only update if it's different (to preserve local images)
            // variants[variantIndex].image = graphqlProduct.image.url;
          }

          // Update name if available
          if (graphqlProduct.name) {
            variants[variantIndex].title = graphqlProduct.name;
          }
        }

        // Update the product with new variant data
        if (product.id) {
          await ProductModel.update(product.id, { variants });
          updatedProductIds.add(product.product_id);
        }
      } catch (updateError) {
        console.error(`Error updating product ${product.product_id}:`, updateError);
        errors.push(`Failed to update ${product.product_id}: ${updateError}`);
        productsFailed++;
      }
    }

    productsUpdated = updatedProductIds.size;

    // Update sync timestamps
    if (updatedProductIds.size > 0) {
      await ProductModel.updateSyncTimestamp(Array.from(updatedProductIds));
    }

    // Calculate failed (SKUs we couldn't fetch)
    productsFailed = allSkus.length - graphqlData.size;

    // Complete sync log
    await completeSyncLog(logId, productsUpdated, productsFailed);

    console.log(`Sync completed: ${productsUpdated} products updated, ${productsFailed} failed`);

    return {
      success: true,
      productsUpdated,
      productsFailed,
      errors,
      syncedAt,
    };
  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await pool.query(
      `UPDATE sync_logs SET
         status = 'failed',
         error_message = $1,
         completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [errorMessage, logId]
    );

    return {
      success: false,
      productsUpdated,
      productsFailed: 0,
      errors: [errorMessage],
      syncedAt,
    };
  }
};

// Get sync history
export const getSyncHistory = async (limit: number = 10): Promise<any[]> => {
  const result = await pool.query(
    `SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
};

// Manual sync trigger for single product
export const syncSingleProduct = async (productId: string): Promise<boolean> => {
  try {
    const product = await ProductModel.findByProductId(productId);
    if (!product) return false;

    const skus = extractSkusFromProduct(product);
    if (skus.length === 0) return false;

    const graphqlData = await batchFetchProducts(skus);

    const variants = [...(product.variants || [])];
    let updated = false;

    for (let i = 0; i < variants.length; i++) {
      const sku = variants[i].sku;
      const graphqlProduct = graphqlData.get(sku);

      if (graphqlProduct) {
        if (graphqlProduct.price_range?.minimum_price?.final_price?.value) {
          variants[i].price = graphqlProduct.price_range.minimum_price.final_price.value.toString();
          updated = true;
        }
        if (graphqlProduct.name) {
          variants[i].title = graphqlProduct.name;
          updated = true;
        }
      }
    }

    if (updated && product.id) {
      await ProductModel.update(product.id, { variants });
      await ProductModel.updateSyncTimestamp([productId]);
    }

    return updated;
  } catch (error) {
    console.error(`Error syncing product ${productId}:`, error);
    return false;
  }
};

export default {
  syncEnabledProducts,
  getSyncHistory,
  syncSingleProduct,
};
