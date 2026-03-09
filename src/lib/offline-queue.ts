
'use client';

import { v4 as uuidv4 } from 'uuid';
import { getQueuedOps, saveQueuedOp, deleteQueuedOp, type OfflineOp } from './idb';
import { db } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { logger } from './logger';
import { addNotification } from '@/hooks/use-notifications';

/**
 * Enqueues a Firestore operation to be performed later when online.
 */
export async function enqueueOp(
  type: OfflineOp['type'],
  collection: string,
  payload: any
): Promise<void> {
  const op: OfflineOp = {
    id: uuidv4(),
    type,
    collection,
    payload,
    timestamp: Date.now(),
    status: 'pending',
  };

  await saveQueuedOp(op);
  logger.log(`Operation [${type}] for [${collection}] enqueued.`);
}

/**
 * Processes all pending operations in the queue sequentially.
 */
export async function processOfflineQueue(): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine || !db) return;

  const ops = await getQueuedOps();
  if (ops.length === 0) return;

  // Sort by timestamp to ensure sequential replay
  const pendingOps = ops
    .filter(op => op.status === 'pending')
    .sort((a, b) => a.timestamp - b.timestamp);

  if (pendingOps.length === 0) return;

  logger.log(`Processing ${pendingOps.length} queued offline operations...`);
  addNotification({ title: 'Syncing offline changes...' });

  let successCount = 0;

  for (const op of pendingOps) {
    try {
      const docRef = doc(db, op.collection, op.payload.id || 'settings');

      if (op.type === 'delete') {
        await deleteDoc(docRef);
      } else {
        // Handle create/update
        await setDoc(docRef, op.payload, { merge: true });
      }

      await deleteQueuedOp(op.id);
      successCount++;
    } catch (error) {
      logger.error(`Failed to process queued op [${op.id}]:`, error);
      // Mark as failed but continue with others? 
      // Usually, we stop to maintain sequential integrity for specific documents.
      break; 
    }
  }

  if (successCount > 0) {
    addNotification({ 
      title: 'Offline Sync Complete', 
      description: `Successfully replayed ${successCount} background operations.` 
    });
  }
}
