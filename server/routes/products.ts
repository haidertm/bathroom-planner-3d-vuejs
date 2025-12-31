// Product API Routes
import { Router, Request, Response } from 'express';
import ProductModel, { ProductFilters, Product } from '../models/Product';

const router = Router();

// GET /api/products - List all products with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: ProductFilters = {
      categories: req.query.categories
        ? (req.query.categories as string).split(',')
        : undefined,
      search: req.query.search as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      enabled: req.query.enabled !== undefined
        ? req.query.enabled === 'true'
        : undefined,
      sortBy: req.query.sortBy as ProductFilters['sortBy'],
      sortOrder: req.query.sortOrder as ProductFilters['sortOrder'],
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 12,
    };

    const result = await ProductModel.findAll(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/enabled - Get all enabled products (for frontend planner)
router.get('/enabled', async (req: Request, res: Response) => {
  try {
    const products = await ProductModel.findAllEnabled();

    // Transform to the format expected by the frontend (grouped by category)
    const groupedProducts: Record<string, any[]> = {};
    for (const product of products) {
      if (!groupedProducts[product.category]) {
        groupedProducts[product.category] = [];
      }
      groupedProducts[product.category].push({
        id: product.product_id,
        name: product.name,
        price: product.price,
        link: product.link,
        image: product.image,
        variantType: product.variant_type,
        features: product.features,
        variants: product.variants,
      });
    }

    res.json(groupedProducts);
  } catch (error) {
    console.error('Error fetching enabled products:', error);
    res.status(500).json({ error: 'Failed to fetch enabled products' });
  }
});

// GET /api/products/stats - Get product statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await ProductModel.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/products/:id - Get single product by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    const product = await ProductModel.findById(id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products - Create a new product
router.post('/', async (req: Request, res: Response) => {
  try {
    const productData = req.body;

    // Validate required fields
    if (!productData.product_id || !productData.name || !productData.category) {
      res.status(400).json({
        error: 'Missing required fields: product_id, name, and category are required'
      });
      return;
    }

    // Check if product_id already exists
    const existing = await ProductModel.findByProductId(productData.product_id);
    if (existing) {
      res.status(409).json({ error: 'Product with this ID already exists' });
      return;
    }

    const product = await ProductModel.create({
      product_id: productData.product_id,
      category: productData.category,
      name: productData.name,
      price: productData.price || '0',
      link: productData.link || '',
      image: productData.image || '',
      variant_type: productData.variant_type || 'Default',
      features: productData.features || [],
      variants: productData.variants || [],
      enabled: productData.enabled ?? true,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id - Update a product
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    const updates = req.body;
    const product = await ProductModel.update(id, updates);

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// PATCH /api/products/:id/toggle - Toggle product enabled status
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    const product = await ProductModel.toggleEnabled(id);

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error('Error toggling product status:', error);
    res.status(500).json({ error: 'Failed to toggle product status' });
  }
});

// DELETE /api/products/:id - Delete a product
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    const deleted = await ProductModel.delete(id);

    if (!deleted) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// POST /api/products/bulk - Bulk create/update products (for migration)
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const products = req.body.products;

    if (!Array.isArray(products) || products.length === 0) {
      res.status(400).json({ error: 'Products array is required' });
      return;
    }

    const result = await ProductModel.bulkUpsert(products);
    res.json({
      message: 'Bulk operation completed',
      ...result
    });
  } catch (error) {
    console.error('Error in bulk operation:', error);
    res.status(500).json({ error: 'Failed to process bulk operation' });
  }
});

export default router;
