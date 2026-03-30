'use client';

/**
 * @fileOverview Abstraction layer for Firestore operations.
 * Implements strict error handling, batching, and data sanitization.
 */

import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  writeBatch,
  type Firestore,
  type DocumentReference
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/errors';
import { sanitizeForFirestore } from '@/lib/utils';
import type { Asset, AppSettings } from '@/types/domain';

export const FirestoreService = {
  /**
   * Fetches the global application configuration.
   */
  async getSettings(): Promise<AppSettings | null> {
    if (!db) return null;
    const settingsRef = doc(db, 'config', 'settings');
    try {
      const snap = await getDoc(settingsRef);
      return snap.exists() ? (snap.data() as AppSettings) : null;
    } catch (err: any) {
      this.handlePermissionError(settingsRef, 'get', err);
      throw err;
    }
  },

  /**
   * Updates global application configuration with merge.
   */
  updateSettings(settings: Partial<AppSettings>) {
    if (!db) return;
    const settingsRef = doc(db, 'config', 'settings');
    setDoc(settingsRef, settings, { merge: true }).catch(err => {
      this.handlePermissionError(settingsRef, 'update', err, settings);
    });
  },

  /**
   * Fetches assets for a specific project.
   */
  async getProjectAssets(grantId: string): Promise<Asset[]> {
    if (!db) return [];
    const assetsRef = collection(db, 'assets');
    const q = query(assetsRef, where('grantId', '==', grantId));
    try {
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Asset));
    } catch (err: any) {
      this.handlePermissionError(assetsRef.path, 'list', err);
      throw err;
    }
  },

  /**
   * Single record update.
   */
  saveAsset(asset: Asset) {
    if (!db) return;
    const assetRef = doc(db, 'assets', asset.id);
    const sanitized = sanitizeForFirestore(asset);
    setDoc(assetRef, sanitized, { merge: true }).catch(err => {
      this.handlePermissionError(assetRef, 'update', err, sanitized);
    });
  },

  /**
   * Atomic batch write for high-volume synchronization.
   */
  batchSaveAssets(assets: Asset[]) {
    if (!db) return;
    const batchSize = 500;
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = assets.slice(i, i + batchSize);
      chunk.forEach(asset => {
        const ref = doc(db, 'assets', asset.id);
        batch.set(ref, sanitizeForFirestore(asset), { merge: true });
      });
      batch.commit().catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'assets',
          operation: 'update',
          requestResourceData: { note: `Batch upload failed for ${chunk.length} items.` }
        }));
      });
    }
  },

  /**
   * Internal helper to wrap and emit Firestore permission errors.
   */
  handlePermissionError(refOrPath: string | DocumentReference, operation: SecurityRuleContext['operation'], error: any, data?: any) {
    if (error?.code === 'permission-denied') {
      const path = typeof refOrPath === 'string' ? refOrPath : refOrPath.path;
      const permissionError = new FirestorePermissionError({
        path,
        operation,
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  }
};
