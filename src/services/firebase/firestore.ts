/**
 * @fileOverview Hardened Firestore Service.
 * Implements deterministic validation and strict RBAC context.
 */

import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  collection, 
  query, 
  where, 
  writeBatch,
  type DocumentReference
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/errors';
import { sanitizeForFirestore } from '@/lib/utils';
import { AssetSchema } from '@/core/registry/validation';
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
   * Updates global configuration.
   * Deterministically sanitized.
   */
  updateSettings(settings: Partial<AppSettings>) {
    if (!db) return;
    const settingsRef = doc(db, 'config', 'settings');
    const sanitized = sanitizeForFirestore(settings);
    
    setDoc(settingsRef, sanitized, { merge: true }).catch(err => {
      this.handlePermissionError(settingsRef, 'update', err, sanitized);
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
   * Single record update with mandatory Zod validation.
   */
  saveAsset(asset: Asset) {
    if (!db) return;

    // DETERMINISTIC VALIDATION: Block dirty data at the boundary
    const validation = AssetSchema.safeParse(asset);
    if (!validation.success) {
      console.error("Firestore: Validation failed for asset write", validation.error);
      return;
    }

    const assetRef = doc(db, 'assets', asset.id);
    const sanitized = sanitizeForFirestore(validation.data);
    
    setDoc(assetRef, sanitized, { merge: true }).catch(err => {
      this.handlePermissionError(assetRef, 'update', err, sanitized);
    });
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
