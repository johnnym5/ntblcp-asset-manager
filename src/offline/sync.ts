/**
 * @fileOverview Background Synchronization Engine.
 * Responsible for queue replay and conflict reconciliation.
 */

import { storage } from './storage';
import { getPendingOperations } from './queue';
import { FirestoreService } from '@/services/firebase/firestore';
import { logger } from '@/lib/logger';

let isSyncing = false;

/**
 * Replays the offline queue to the cloud services.
 * Implements deterministic sequential processing to maintain state integrity.
 */
export async function processSyncQueue(): Promise<void> {
  if (isSyncing || typeof window === 'undefined' || !navigator.onLine) return;
  
  const pending = await getPendingOperations();
  if (pending.length === 0) return;

  isSyncing = true;
  logger.log(`Sync Engine: Processing ${pending.length} queued operations...`);

  for (const op of pending) {
    try {
      // 1. Process by collection type
      if (op.collection === 'assets') {
        if (op.operation === 'UPDATE' || op.operation === 'CREATE') {
          // Use the abstracted service layer which has validation
          await FirestoreService.saveAsset(op.payload as any);
        }
        // Additional operation handlers go here
      }

      // 2. Dequeue on success
      await storage.dequeue(op.id);
      
    } catch (error) {
      logger.error(`Sync Engine: Failed to process op [${op.id}]`, error);
      // We stop the queue on error to prevent out-of-order state corruption
      break; 
    }
  }

  isSyncing = false;
  logger.log('Sync Engine: Pulse Complete.');
}

/**
 * Listen for network restoration to trigger sync.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processSyncQueue();
  });
}
