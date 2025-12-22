// Patch file to fix multi-select visual feedback
// This adds the necessary import and updates the multi-select methods

// Add this import at the top of eventHandlers.ts (around line 6-12):
import { outlinePassRef } from '../utils/helpers';

// The addToMultiSelection method should highlight each object individually
// and update the outline pass to include all selected objects
