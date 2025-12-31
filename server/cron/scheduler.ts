// Cronjob Scheduler - Runs daily at 9 AM
import cron from 'node-cron';
import { syncEnabledProducts, getSyncHistory } from '../services/graphqlSync';

// Track if scheduler is running
let isSchedulerRunning = false;
let scheduledTask: cron.ScheduledTask | null = null;

// Initialize the cron scheduler
export const initializeScheduler = (): void => {
  if (isSchedulerRunning) {
    console.log('Scheduler is already running');
    return;
  }

  // Schedule to run at 9:00 AM every day
  // Cron format: second(optional) minute hour day-of-month month day-of-week
  // '0 9 * * *' = At 09:00 every day
  scheduledTask = cron.schedule('0 9 * * *', async () => {
    console.log('='.repeat(50));
    console.log(`[${new Date().toISOString()}] Starting scheduled product sync...`);
    console.log('='.repeat(50));

    try {
      const result = await syncEnabledProducts();

      console.log('\nSync Result:');
      console.log(`  Success: ${result.success}`);
      console.log(`  Products Updated: ${result.productsUpdated}`);
      console.log(`  Products Failed: ${result.productsFailed}`);

      if (result.errors.length > 0) {
        console.log('  Errors:');
        result.errors.forEach((err, i) => console.log(`    ${i + 1}. ${err}`));
      }

      console.log(`\n[${new Date().toISOString()}] Scheduled sync completed`);
      console.log('='.repeat(50));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Scheduled sync failed:`, error);
    }
  }, {
    scheduled: true,
    timezone: 'Europe/London' // UK timezone
  });

  isSchedulerRunning = true;
  console.log('Cron scheduler initialized - will run daily at 9:00 AM (Europe/London)');
};

// Stop the scheduler
export const stopScheduler = (): void => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    isSchedulerRunning = false;
    console.log('Cron scheduler stopped');
  }
};

// Check if scheduler is running
export const isRunning = (): boolean => {
  return isSchedulerRunning;
};

// Manual trigger for testing
export const triggerManualSync = async (): Promise<{
  success: boolean;
  productsUpdated: number;
  productsFailed: number;
  errors: string[];
}> => {
  console.log('Manual sync triggered...');
  const result = await syncEnabledProducts();
  return {
    success: result.success,
    productsUpdated: result.productsUpdated,
    productsFailed: result.productsFailed,
    errors: result.errors,
  };
};

// Get next scheduled run time
export const getNextRunTime = (): Date | null => {
  if (!isSchedulerRunning) return null;

  const now = new Date();
  const next = new Date(now);

  // Set to 9 AM today
  next.setHours(9, 0, 0, 0);

  // If 9 AM has passed today, schedule for tomorrow
  if (now > next) {
    next.setDate(next.getDate() + 1);
  }

  return next;
};

// Get scheduler status
export const getSchedulerStatus = async (): Promise<{
  isRunning: boolean;
  nextRunTime: Date | null;
  recentSyncs: any[];
}> => {
  const recentSyncs = await getSyncHistory(5);

  return {
    isRunning: isSchedulerRunning,
    nextRunTime: getNextRunTime(),
    recentSyncs,
  };
};

export default {
  initializeScheduler,
  stopScheduler,
  isRunning,
  triggerManualSync,
  getNextRunTime,
  getSchedulerStatus,
};
