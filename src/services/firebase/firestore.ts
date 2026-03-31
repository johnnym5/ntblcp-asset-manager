/**
 * @fileOverview Hardened Firestore Service.
 * Phase 73: Reinforced deep recursive sanitization for all log writes.
 * Prevents illegal undefined values from interrupting background audit pulses.
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
import { batchSetAssets as mirrorToRtdb, updateSettings as mirrorSettingsToRtdb } from '@/lib/database';
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
  async updateSettings(settings: Partial<AppSettings>) {
    if (!db) return;
    const settingsRef = doc(db, 'config', 'settings');
    const sanitized = sanitizeForFirestore(settings);
    
    setDoc(settingsRef, sanitized, { merge: true }).catch(err => {
      this.handlePermissionError(settingsRef, 'update', err, sanitized);
    });

    try {
      const fullSettings = await this.getSettings();
      if (fullSettings) {
        mirrorSettingsToRtdb({ ...fullSettings, ...settings });
      }
    } catch (e) {
      console.warn("Mirroring: Settings pulse latent.");
    }
  },

  /**
   * DEEP HYDRATION FETCH:
   * Fetches the entire relevant registry for the active project scope.
   */
  async getProjectAssets(grantId: string): Promise<Asset[]> {
    if (!db) return [];
    const assetsRef = collection(db, 'assets');
    
    const q = grantId === 'ALL_PROJECTS' 
      ? query(assetsRef)
      : query(assetsRef, where('grantId', '==', grantId));

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
  async saveAsset(asset: Asset, operation: QueueOperation = 'UPDATE', changes?: any): Promise<void> {
    if (!db) return;

    // Media Storage Offload Disabled
    const assetToSave = {
      ...asset,
      photoUrl: undefined,
      photoDataUri: undefined,
      signatureUrl: undefined,
      signatureDataUri: undefined
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
      
      mirrorToRtdb([sanitized as Asset]).catch(e => console.warn("Mirroring: Asset pulse latent."));

      await this.logActivity({
        assetId: asset.id,
        assetDescription: asset.description,
        operation,
        performedBy: asset.lastModifiedBy,
        userState: asset.lastModifiedByState || 'Unknown',
        changes: changes ? sanitizeForFirestore(changes) : undefined
      });

    } catch (err: any) {
      this.handlePermissionError(assetRef, 'update', err, sanitized);
      throw err;
    }
  },

  async logErrorAudit(entry: ErrorLogEntry) {
    if (!db) return;
    try {
      const sanitized = sanitizeForFirestore(entry);
      await setDoc(doc(db, 'error_logs', entry.id), sanitized);
    } catch (e) {
      console.error("CRITICAL: Failed to archive error log", e);
    }
  },

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

  async updateErrorStatus(logId: string, status: ErrorLogEntry['status'], notes?: string) {
    if (!db) return;
    const logRef = doc(db, 'error_logs', logId);
    try {
      const updates = sanitizeForFirestore({ status, adminNotes: notes });
      await updateDoc(logRef, updates);
    } catch (e) {
      console.error("Failed to update error status", e);
    }
  },

  async logActivity(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) {
    if (!db) return;
    const logRef = collection(db, 'activity_log');
    try {
      const data = {
        ...entry,
        timestamp: new Date().toISOString()
      };
      await addDoc(logRef, sanitizeForFirestore(data));
    } catch (e) {
      console.error("Failed to log activity pulse", e);
    }
  },

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