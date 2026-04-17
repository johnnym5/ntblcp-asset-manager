/**
 * @fileOverview Deterministic Operation Queue Manager.
 * Orchestrates the "Write-Ahead Logging" for offline-first parity.
 */

import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import type { OfflineQueueEntry, QueueOperation } from '@/types/domain';

/**
 * Enqueues a change for background synchronization.
 * This is the ONLY entry point for data mutations in the core logic.
 */
export async function enqueueMutation(
  operation: QueueOperation,
  collection: string,
  payload: any
): Promise<string> {
  const entry: OfflineQueueEntry = {
    id: uuidv4(),
    operation,
    collection,
    payload,
    status: 'PENDING',
    timestamp: Date.now(),
  };

  await storage.enqueue(entry);
  return entry.id;
}

/**
 * Retrieves all pending operations in chronological order.
 */
export async function getPendingOperations(): Promise<OfflineQueueEntry[]> {
  const all = await storage.getQueue();
  return all.filter(op => op.status === 'PENDING');
}
