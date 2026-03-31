
/**
 * @fileOverview Hardened Firestore Service.
 * Implements deterministic validation and strict RBAC context.
 * Phase 50: Integrated Storage Offloading for visual evidence.
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
  updateDoc,
  type DocumentReference
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/errors';
import { sanitizeForFirestore } from '@/lib/utils';
import { AssetSchema } from '@/core/registry/validation';
import { monitoring } from '@/lib/monitoring';
import { FirebaseStorageService } from './storage';
import type { Asset, AppSettings, ActivityLogEntry, QueueOperation, ErrorLogEntry } from '@/types/domain';

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
   * Offloads base64 images to Firebase Storage.
   */
  async saveAsset(asset: Asset, operation: QueueOperation = 'UPDATE', changes?: any): Promise<void> {
    if (!db) return;

    // 1. Storage Offloading Pulse
    // If we have a base64 photo but no remote URL, offload it to Storage
    let finalPhotoUrl = asset.photoUrl;
    if (asset.photoDataUri && !asset.photoUrl) {
      try {
        finalPhotoUrl = await FirebaseStorageService.uploadAssetPhoto(asset.grantId, asset.id, asset.photoDataUri);
      } catch (e) {
        console.error("Firestore: Storage offload failed, proceeding with base64 fallback.");
      }
    }

    const assetToSave = {
      ...asset,
      photoUrl: finalPhotoUrl,
      // We clear the heavy base64 data once it's offloaded to the cloud
      photoDataUri: finalPhotoUrl ? undefined : asset.photoDataUri 
    };

    const validation = AssetSchema.safeParse(assetToSave);
    if (!validation.success) {
      monitoring.trackError(new Error("Validation Failure"), { 
        module: 'Firestore', 
        action: 'WRITE_VALIDATION', 
        assetId: asset.id 
      }, 'WARNING');
      return;
    }

    const assetRef = doc(db, 'assets', asset.id);
    const sanitized = sanitizeForFirestore(validation.data);
    
    try {
      const currentSnap = await getDoc(assetRef);
      const previousState = currentSnap.exists() ? currentSnap.data() : null;

      await setDoc(assetRef, {
        ...sanitized,
        previousState: previousState ? sanitizeForFirestore(previousState) : null
      }, { merge: true });
      
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
   * Permanent deletion from the cloud registry.
   */
  async deleteAsset(assetId: string): Promise<void> {
    if (!db) return;
    const assetRef = doc(db, 'assets', assetId);
    try {
      // Fetch to find grantId for storage deletion
      const snap = await getDoc(assetRef);
      if (snap.exists()) {
        const data = snap.data() as Asset;
        if (data.photoUrl) {
          await FirebaseStorageService.deleteAssetPhoto(data.grantId, assetId);
        }
      }
      await deleteDoc(assetRef);
    } catch (err: any) {
      this.handlePermissionError(assetRef, 'delete', err);
      throw err;
    }
  },

  /**
   * Commits an Error Log to the Administrative Audit collection.
   */
  async logErrorAudit(entry: ErrorLogEntry) {
    if (!db) return;
    try {
      await setDoc(doc(db, 'error_logs', entry.id), entry);
    } catch (e) {
      console.error("CRITICAL: Failed to archive error log", e);
    }
  },

  /**
   * Fetches all error logs for administrative review.
   */
  async getErrorLogs(): Promise<ErrorLogEntry[]> {
    if (!db) return [];
    const logsRef = collection(db, 'error_logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(100));
    try {
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as ErrorLogEntry);
    } catch (e) {
      console.error("Failed to fetch error logs", e);
      return [];
    }
  },

  /**
   * Updates an error log status (e.g., Resolved).
   */
  async updateErrorStatus(logId: string, status: ErrorLogEntry['status'], notes?: string) {
    if (!db) return;
    const logRef = doc(db, 'error_logs', logId);
    try {
      await updateDoc(logRef, { status, adminNotes: notes });
    } catch (e) {
      console.error("Failed to update error status", e);
    }
  },

  /**
   * Formal Activity Logging pulse.
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
    const q = query(logRef, orderBy('timestamp', 'desc'), limit(limitCount));
    try {
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as ActivityLogEntry));
    } catch (e) {
      console.error("Failed to fetch global activity pulse", e);
      return [];
    }
  },

  /**
   * Formal Adjudication Pulse.
   */
  async adjudicateAssetPulse(assetId: string, action: 'APPROVE' | 'REJECT', adminComment?: string) {
    if (!db) return;
    const assetRef = doc(db, 'assets', assetId);
    try {
      const snap = await getDoc(assetRef);
      if (!snap.exists()) return;
      const asset = snap.data() as Asset;

      if (action === 'APPROVE' && asset.pendingChanges) {
        const approvedData = {
          ...asset,
          ...asset.pendingChanges,
          approvalStatus: undefined,
          pendingChanges: undefined,
          changeSubmittedBy: undefined,
          adminComment,
          lastModified: new Date().toISOString(),
          lastModifiedBy: 'System Governance'
        };
        await setDoc(assetRef, sanitizeForFirestore(approvedData));
      } else {
        const rejectedData = {
          ...asset,
          approvalStatus: undefined,
          pendingChanges: undefined,
          changeSubmittedBy: undefined,
          adminComment,
          lastModified: new Date().toISOString(),
        };
        await setDoc(assetRef, sanitizeForFirestore(rejectedData));
      }
    } catch (err: any) {
      this.handlePermissionError(assetRef, 'update', err);
      throw err;
    }
  },

  /**
   * Reversion Pulse.
   */
  async restoreAsset(assetId: string, performedBy: string): Promise<void> {
    if (!db) return;
    const assetRef = doc(db, 'assets', assetId);
    try {
      const snap = await getDoc(assetRef);
      if (!snap.exists()) return;
      const asset = snap.data() as Asset;
      if (!asset.previousState) throw new Error("No restoration pulse available.");

      const restoredData = {
        ...asset.previousState,
        lastModified: new Date().toISOString(),
        lastModifiedBy: performedBy,
        previousState: null
      };
      await setDoc(assetRef, sanitizeForFirestore(restoredData));
    } catch (err: any) {
      this.handlePermissionError(assetRef, 'update', err);
      throw err;
    }
  },

  handlePermissionError(refOrPath: string | DocumentReference, operation: SecurityRuleContext['operation'], error: any, data?: any) {
    if (error?.code === 'permission-denied') {
      const path = typeof refOrPath === 'string' ? refOrPath : refOrPath.path;
      const permissionError = new FirestorePermissionError({
        path,
        operation,
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
      monitoring.trackError(permissionError, { action: operation, module: 'Firestore' }, 'CRITICAL');
    }
  }
};
