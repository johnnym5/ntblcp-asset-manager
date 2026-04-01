/**
 * @fileOverview Hardened Firestore Service.
 * Phase 105: Reinforced Manual Tiered Sync (Local -> Firestore -> RTDB).
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
  writeBatch,
  type DocumentReference
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { errorEmitter, FirestorePermissionError } from '@/firebase';
import { sanitizeForFirestore } from '@/lib/utils';
import { AssetSchema } from '@/core/registry/validation';
import { monitoring } from '@/lib/monitoring';
import { batchSetAssets as mirrorToRtdb, updateSettings as mirrorSettingsToRtdb, clearAssets as clearRtdb } from '@/lib/database';
import type { Asset, AppSettings, ActivityLogEntry, QueueOperation, ErrorLogEntry, ErrorLogStatus } from '@/types/domain';

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

    // Mirroring pulse is manual/synced via Infrastructure workstation, but we maintain a hot-standby path
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
   * Fetches assets for the active project scope.
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
   * Tiered Mutation Pulse: Firestore Commit -> Shadow Mirror (RTDB) Broadcast.
   */
  async saveAsset(asset: Asset, operation: QueueOperation = 'UPDATE', changes?: any): Promise<void> {
    if (!db) return;

    // Filter out transient local fields before validation
    const assetToSave = { ...asset };
    delete (assetToSave as any).photoUrl;
    delete (assetToSave as any).photoDataUri;

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

      // 1. Primary Authority Commit (Firestore)
      await setDoc(assetRef, {
        ...sanitized,
        previousState: previousState ? sanitizeForFirestore(previousState) : null
      }, { merge: true });
      
      // 2. Tier 3: Mirror Pulse (RTDB Shadow)
      // This follows the FireStore commit to ensure authority integrity.
      mirrorToRtdb([sanitized as Asset]).catch(e => console.warn("Mirroring: Shadow pulse latent."));

      // 3. Activity Ledger Pulse
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

  /**
   * Deletes a single asset from Firestore.
   */
  async deleteAsset(id: string): Promise<void> {
    if (!db) return;
    const assetRef = doc(db, 'assets', id);
    try {
      await deleteDoc(assetRef);
    } catch (err: any) {
      this.handlePermissionError(assetRef, 'delete', err);
      throw err;
    }
  },

  /**
   * High-speed global purge of all assets.
   * Deterministic prepare for new data ingestion.
   */
  async purgeAllAssets(): Promise<number> {
    if (!db) return 0;
    const assetsRef = collection(db, 'assets');
    let snap;
    try {
      snap = await getDocs(assetsRef);
    } catch (err: any) {
      this.handlePermissionError(assetsRef.path, 'list', err);
      throw err;
    }
    
    const total = snap.size;
    if (total === 0) return 0;

    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    
    try {
      await batch.commit();
      // Wipe Shadow Tier as well
      await clearRtdb();
    } catch (err: any) {
      this.handlePermissionError(assetsRef.path, 'delete', err);
      throw err;
    }

    await this.logActivity({
      assetId: 'GLOBAL_PURGE',
      assetDescription: 'Registry Preparation: Full Asset Wipe',
      operation: 'DELETE',
      performedBy: 'Super Administrator',
      userState: 'SYSTEM_RECOVERY'
    });

    return total;
  },

  /**
   * Logs a technical incident to the resilience audit registry.
   */
  async logErrorAudit(entry: ErrorLogEntry) {
    if (!db) return;
    const errorRef = doc(db, 'error_logs', entry.id);
    try {
      await setDoc(errorRef, sanitizeForFirestore(entry));
    } catch (e: any) {
      this.handlePermissionError(errorRef, 'create', e, entry);
      console.error("Monitoring: Double-fault detected. Cloud logging failed.", e);
    }
  },

  async getErrorLogs(): Promise<ErrorLogEntry[]> {
    if (!db) return [];
    const errorRef = collection(db, 'error_logs');
    const q = query(errorRef, orderBy('timestamp', 'desc'), limit(100));
    try {
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as ErrorLogEntry));
    } catch (e: any) {
      this.handlePermissionError(errorRef.path, 'list', e);
      return [];
    }
  },

  async updateErrorStatus(id: string, status: ErrorLogStatus, adminComment?: string) {
    if (!db) return;
    const errorRef = doc(db, 'error_logs', id);
    const updates = { status, adminComment };
    updateDoc(errorRef, updates).catch(err => {
      this.handlePermissionError(errorRef, 'update', err, updates);
    });
  },

  async logActivity(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) {
    if (!db) return;
    const logRef = collection(db, 'audit_logs');
    try {
      const data = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      };
      const sanitized = sanitizeForFirestore(data);
      await addDoc(logRef, sanitized);
    } catch (e: any) {
      this.handlePermissionError(logRef.path, 'create', e, entry);
      console.error("Failed to log activity pulse", e);
    }
  },

  async getGlobalActivity(limitCount: number = 100): Promise<ActivityLogEntry[]> {
    if (!db) return [];
    const logRef = collection(db, 'audit_logs');
    const q = query(logRef, orderBy('timestamp', 'desc'), limit(limitCount));
    try {
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as ActivityLogEntry));
    } catch (e: any) {
      this.handlePermissionError(logRef.path, 'list', e);
      return [];
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
      const sanitized = sanitizeForFirestore(restoredData);
      await setDoc(assetRef, sanitized);
      
      await this.logActivity({
        assetId,
        assetDescription: (restoredData as any).description,
        operation: 'RESTORE',
        performedBy,
        userState: 'SYSTEM_RECOVERY'
      });
    } catch (err: any) {
      this.handlePermissionError(assetRef, 'update', err);
      throw err;
    }
  },

  /**
   * Centralized helper to create and emit FirestorePermissionError.
   * This is critical for Security Rules debugging and agentive fixing.
   */
  handlePermissionError(
    refOrPath: string | DocumentReference, 
    operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write', 
    error: any, 
    data?: any
  ) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      const path = typeof refOrPath === 'string' ? refOrPath : refOrPath.path;
      const permissionError = new FirestorePermissionError({
        path,
        operation,
        requestResourceData: data,
      });
      // Emit via central emitter for FirebaseErrorListener to catch and surface
      errorEmitter.emit('permission-error', permissionError);
      // Also log to internal resilience monitor
      monitoring.trackError(permissionError, { action: operation, module: 'Firestore' }, 'CRITICAL');
    }
  }
};
