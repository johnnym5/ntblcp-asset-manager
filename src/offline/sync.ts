/**
 * @fileOverview Background Synchronization Engine.
 * Responsible for queue replay and conflict reconciliation.
 * Phase 75: Implemented Selective Sync Pulse for targeted group commitment.
 */

import { storage } from './storage';
import { getPendingOperations } from './queue';
import { FirestoreService } from '@/services/firebase/firestore';
import { logger } from '@/lib/logger';
import { addNotification } from '@/hooks/use-notifications';
import type { OfflineQueueEntry } from '@/types/domain';

let isSyncing = false;

/**
 * Processes a specific set of operations from the queue.
 * Used for selective group sync.
 */
export async function processSelectedSyncQueue(ids?: string[]): Promise<void> {
  if (isSyncing || typeof window === 'undefined' || !navigator.onLine) return;
  
  const allPending = await getPendingOperations();
  const targetOps = ids 
    ? allPending.filter(op => ids.includes(op.id))
    : allPending;

  if (targetOps.length === 0) return;

  isSyncing = true;
  logger.info(`Sync Engine: Processing ${targetOps.length} targeted operations...`);

  let successCount = 0;

  // Crucial: Process in chronological order to maintain state integrity
  const sortedOps = [...targetOps].sort((a, b) => a.timestamp - b.timestamp);

  for (const op of sortedOps) {
    try {
      // 1. Execute based on operation type
      switch (op.operation) {
        case 'CREATE':
        case 'UPDATE':
        case 'RESTORE':
          await FirestoreService.saveAsset(op.payload as any, op.operation);
          break;
        
        case 'DELETE':
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
      // Stop on first error to prevent data corruption for the same document in later steps
      break; 
    }
  }

  if (successCount > 0) {
    addNotification({
      title: "Synchronization Complete",
      description: `Successfully broadcast ${successCount} selected modifications.`
    });
  }

  isSyncing = false;
  logger.info('Sync Engine: Pulse Complete.');
}

/**
 * Standard entry point for full queue synchronization.
 */
export async function processSyncQueue(): Promise<void> {
  return processSelectedSyncQueue();
}
