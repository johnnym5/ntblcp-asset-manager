/**
 * @fileOverview Hardened Firestore Service.
 * Implements deterministic validation and strict RBAC context.
 * This module is the sole gateway for cloud data persistence.
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
  orderBy,
  limit,
  addDoc,
  type DocumentReference
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/errors';
import { sanitizeForFirestore } from '@/lib/utils';
import { AssetSchema } from '@/core/registry/validation';
import type { Asset, AppSettings, ActivityLogEntry, QueueOperation } from '@/types/domain';

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
   * Single record update with mandatory Zod validation and Activity Logging.
   */
  async saveAsset(asset: Asset, operation: QueueOperation = 'UPDATE', changes?: any): Promise<void> {
    if (!db) return;

    const validation = AssetSchema.safeParse(asset);
    if (!validation.success) {
      console.error("Firestore: Validation failed for asset write", validation.error);
      return;
    }

    const assetRef = doc(db, 'assets', asset.id);
    const sanitized = sanitizeForFirestore(validation.data);
    
    try {
      await setDoc(assetRef, sanitized, { merge: true });
      
      // Log the mutation pulse
      await this.logActivity({
        assetId: asset.id,
        assetDescription: asset.description,
        operation,
        performedBy: asset.lastModifiedBy,
        userState: asset.lastModifiedByState || 'Unknown',
        changes
      });

    } catch (err: any) {
      this.handlePermissionError(assetRef, 'update', err, sanitized);
      throw err;
    }
  },

  /**
   * Records a mutation pulse in the append-only activity log.
   */
  async logActivity(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) {
    if (!db) return;
    const logRef = collection(db, 'activity_log');
    try {
      await addDoc(logRef, {
        ...entry,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error("Failed to log activity pulse", e);
    }
  },

  /**
   * Fetches activity history for a specific asset.
   */
  async getAssetHistory(assetId: string): Promise<ActivityLogEntry[]> {
    if (!db) return [];
    const logRef = collection(db, 'activity_log');
    const q = query(
      logRef, 
      where('assetId', '==', assetId), 
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    try {
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as ActivityLogEntry));
    } catch (e) {
      console.error("Failed to fetch asset history pulse", e);
      return [];
    }
  },

  /**
   * Fetches global activity history.
   */
  async getGlobalActivity(limitCount: number = 100): Promise<ActivityLogEntry[]> {
    if (!db) return [];
    const logRef = collection(db, 'activity_log');
    const q = query(
      logRef, 
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    try {
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as ActivityLogEntry));
    } catch (e) {
      console.error("Failed to fetch global activity pulse", e);
      return [];
    }
  },

  /**
   * Permanent deletion from the cloud registry.
   */
  async deleteAsset(assetId: string): Promise<void> {
    if (!db) return;
    const assetRef = doc(db, 'assets', assetId);
    try {
      await deleteDoc(assetRef);
    } catch (err: any) {
      this.handlePermissionError(assetRef, 'delete', err);
      throw err;
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
