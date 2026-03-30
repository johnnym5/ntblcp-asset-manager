/**
 * @fileOverview Background Synchronization Engine.
 * Responsible for queue replay and conflict reconciliation.
 */

import { storage } from './storage';
import { getPendingOperations } from './queue';
import { FirestoreService } from '@/services/firebase/firestore';
import { logger } from '@/lib/logger';
import { addNotification } from '@/hooks/use-notifications';

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
  logger.info(`Sync Engine: Processing ${pending.length} queued operations...`);

  let successCount = 0;

  for (const op of pending) {
    try {
      // 1. Process by operation type
      switch (op.operation) {
        case 'CREATE':
        case 'UPDATE':
          await FirestoreService.saveAsset(op.payload as any);
          break;
        
        case 'DELETE':
          // The payload for a delete operation contains the ID
          const idToDelete = (op.payload as any).id;
          if (idToDelete) {
            await FirestoreService.deleteAsset(idToDelete);
          }
          break;

        default:
          logger.warn(`Sync Engine: Unknown operation type [${op.operation}]`);
      }

      // 2. Dequeue on success
      await storage.dequeue(op.id);
      successCount++;
      
    } catch (error) {
      logger.error(`Sync Engine: Failed to process op [${op.id}]`, error);
      // We stop the queue on error to prevent out-of-order state corruption for the remaining items
      break; 
    }
  }

  if (successCount > 0) {
    addNotification({
      title: "Synchronization Heartbeat",
      description: `Successfully broadcast ${successCount} local modifications to the cloud registry.`
    });
  }

  isSyncing = false;
  logger.info('Sync Engine: Pulse Complete.');
}

/**
 * Listen for network restoration to trigger sync.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processSyncQueue();
  });
}