// Sync API Routes - For triggering and monitoring product syncs
import { Router, Request, Response } from 'express';
import scheduler from '../cron/scheduler';
import { syncSingleProduct, getSyncHistory } from '../services/graphqlSync';

const router = Router();

// GET /api/sync/status - Get scheduler status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await scheduler.getSchedulerStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// POST /api/sync/trigger - Trigger manual sync
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const result = await scheduler.triggerManualSync();
    res.json({
      message: 'Manual sync completed',
      ...result
    });
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

// POST /api/sync/product/:productId - Sync a single product
router.post('/product/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const updated = await syncSingleProduct(productId);

    if (updated) {
      res.json({ message: 'Product synced successfully', updated: true });
    } else {
      res.json({ message: 'Product not updated (no changes or not found)', updated: false });
    }
  } catch (error) {
    console.error('Error syncing product:', error);
    res.status(500).json({ error: 'Failed to sync product' });
  }
});

// GET /api/sync/history - Get sync history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const history = await getSyncHistory(limit);
    res.json(history);
  } catch (error) {
    console.error('Error getting sync history:', error);
    res.status(500).json({ error: 'Failed to get sync history' });
  }
});

export default router;
