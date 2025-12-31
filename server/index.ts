// Main Server Entry Point
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { testConnection, initializeDatabase } from './config/db';
import productRoutes from './routes/products';
import syncRoutes from './routes/sync';
// import { initializeScheduler } from './cron/scheduler'; // Disabled for now

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.VITE_APP_URL || 'http://localhost:5173'
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/sync', syncRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Initialize database tables
    await initializeDatabase();

    // Cron scheduler disabled for now
    // initializeScheduler();

    // Start Express server
    app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('='.repeat(50));
      console.log('\nAvailable endpoints:');
      console.log('  GET  /health                  - Health check');
      console.log('  GET  /api/products            - List products');
      console.log('  GET  /api/products/enabled    - Get enabled products (for planner)');
      console.log('  GET  /api/products/stats      - Get statistics');
      console.log('  GET  /api/products/:id        - Get single product');
      console.log('  POST /api/products            - Create product');
      console.log('  PUT  /api/products/:id        - Update product');
      console.log('  PATCH /api/products/:id/toggle - Toggle product status');
      console.log('  DELETE /api/products/:id      - Delete product');
      console.log('  POST /api/products/bulk       - Bulk upsert products');
      console.log('  GET  /api/sync/status         - Get sync status');
      console.log('  POST /api/sync/trigger        - Trigger manual sync');
      console.log('  GET  /api/sync/history        - Get sync history');
      console.log('='.repeat(50));
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
