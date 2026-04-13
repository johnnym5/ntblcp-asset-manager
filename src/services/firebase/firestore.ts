/**
 * @fileOverview Hardened Firestore Service with RBAC Scope Enforcement.
 * Forensic update: Captures diffs and previous state automatically for the audit trail.
 * Phase 1105: Implemented State Scope Chunking to bypass Firestore "IN" limit of 30.
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
import { batchSetAssets as mirrorToRtdb, clearAssets as clearRtdb } from '@/lib/database';
import type { Asset, AppSettings, ActivityLogEntry, QueueOperation, ErrorLogEntry, ErrorLogStatus } from '@/types/domain';

export const FirestoreService = {
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

  async updateSettings(settings: Partial<AppSettings>) {
    if (!db) return;
    const settingsRef = doc(db, 'config', 'settings');
    const sanitized = sanitizeForFirestore(settings);
    
    setDoc(settingsRef, sanitized, { merge: true }).catch(err => {
      this.handlePermissionError(settingsRef, 'update', err, sanitized);
    });
  },

  /**
   * Fetches assets for projects. 
   * Hardened: Handles Firestore's 30-item limit for "IN" queries by chunking.
   */
  async getProjectAssets(grantId: string, stateScopes?: string[]): Promise<Asset[]> {
    if (!db) return [];
    const assetsRef = collection(db, 'assets');
    
    const hasStates = stateScopes && stateScopes.length > 0 && !stateScopes.includes('All');
    
    // Helper to execute query and return assets
    const fetchChunk = async (q: any) => {
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Asset));
    };

    try {
      if (hasStates) {
        // Firestore limits 'in' queries to 30 items. Nigeria has 37 states.
        const CHUNK_SIZE = 30;
        const stateChunks = [];
        for (let i = 0; i < stateScopes!.length; i += CHUNK_SIZE) {
          stateChunks.push(stateScopes!.slice(i, i + CHUNK_SIZE));
        }

        let allAssets: Asset[] = [];
        for (const chunk of stateChunks) {
          let q;
          if (grantId === 'ALL_PROJECTS') {
            q = query(assetsRef, where('location', 'in', chunk));
          } else {
            q = query(assetsRef, where('grantId', '==', grantId), where('location', 'in', chunk));
          }
          const chunkAssets = await fetchChunk(q);
          allAssets = [...allAssets, ...chunkAssets];
        }
        return allAssets;
      } else {
        // No state filtering
        let q;
        if (grantId === 'ALL_PROJECTS') {
          q = query(assetsRef, orderBy('location'));
        } else {
          q = query(assetsRef, where('grantId', '==', grantId));
        }
        return await fetchChunk(q);
      }
    } catch (err: any) {
      this.handlePermissionError(assetsRef.path, 'list', err);
      throw err;
    }
  },

  async saveAsset(asset: Asset, operation: QueueOperation = 'UPDATE'): Promise<void> {
    if (!db) return;

    const assetRef = doc(db, 'assets', asset.id);
    
    // Fetch current state for forensic diff and reversion buffer
    let oldData: any = null;
    let changes: Record<string, { old: any; new: any }> = {};
    try {
      const currentSnap = await getDoc(assetRef);
      if (currentSnap.exists()) {
        oldData = currentSnap.data();
        const keys = ['description', 'assetIdCode', 'serialNumber', 'location', 'custodian', 'status', 'condition', 'remarks'];
        keys.forEach(k => {
          const oldVal = (oldData as any)[k];
          const newVal = (asset as any)[k];
          if (oldVal !== newVal) {
            changes[k] = { old: oldVal || 'EMPTY', new: newVal || 'EMPTY' };
          }
        });
      }
    } catch (e) {}

    const validation = AssetSchema.safeParse(asset);
    if (!validation.success) return;

    // Inject historical buffer into the asset record
    const dataToSave = {
      ...validation.data,
      previousState: oldData || null,
      lastModified: new Date().toISOString()
    };

    const sanitized = sanitizeForFirestore(dataToSave);
    try {
      await setDoc(assetRef, sanitized, { merge: true });
      mirrorToRtdb([sanitized as Asset]).catch(() => {});
      
      await this.logActivity({
        assetId: asset.id,
        assetDescription: asset.description,
        operation,
        performedBy: asset.lastModifiedBy,
        userState: asset.lastModifiedByState || 'Unknown',
        changes: Object.keys(changes).length > 0 ? changes : undefined
      });
    } catch (err: any) {
      this.handlePermissionError(assetRef, 'update', err, sanitized);
      throw err;
    }
  },

  async restoreAsset(assetId: string, performedBy: string): Promise<void> {
    if (!db) return;
    const assetRef = doc(db, 'assets', assetId);
    const snap = await getDoc(assetRef);
    if (!snap.exists()) throw new Error("Document not found");

    const asset = snap.data() as Asset;
    if (!asset.previousState) throw new Error("No previous state detected");

    const restoredAsset = {
      ...asset,
      ...asset.previousState,
      previousState: null, // Clear the buffer after restore
      lastModified: new Date().toISOString(),
      lastModifiedBy: performedBy
    };

    await setDoc(assetRef, sanitizeForFirestore(restoredAsset));
    
    await this.logActivity({
      assetId,
      assetDescription: asset.description,
      operation: 'RESTORE',
      performedBy,
      userState: 'System',
      details: 'Deterministic rollback initiated.'
    });
  },

  async adjudicateAssetPulse(assetId: string, action: 'APPROVE' | 'REJECT'): Promise<void> {
    if (!db) return;
    const assetRef = doc(db, 'assets', assetId);
    const snap = await getDoc(assetRef);
    if (!snap.exists()) return;

    const asset = snap.data() as Asset;
    if (action === 'APPROVE' && asset.pendingChanges) {
      const updatedAsset = {
        ...asset,
        ...asset.pendingChanges,
        approvalStatus: undefined,
        pendingChanges: undefined,
        changeSubmittedBy: undefined,
        lastModified: new Date().toISOString()
      };
      await setDoc(assetRef, sanitizeForFirestore(updatedAsset));
    } else {
      await updateDoc(assetRef, {
        approvalStatus: undefined,
        pendingChanges: undefined,
        changeSubmittedBy: undefined
      });
    }
  },

  async purgeAllAssets(): Promise<number> {
    if (!db) return 0;
    const snap = await getDocs(collection(db, 'assets'));
    const total = snap.size;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 500) {
      const batch = writeBatch(db);
      docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    await clearRtdb();
    return total;
  },

  async logActivity(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) {
    if (!db) return;
    const logRef = collection(db, 'audit_logs');
    const data = { ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
    addDoc(logRef, sanitizeForFirestore(data)).catch(() => {});
  },

  async getGlobalActivity(limitCount: number = 100): Promise<ActivityLogEntry[]> {
    if (!db) return [];
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as ActivityLogEntry));
  },

  async getErrorLogs(): Promise<ErrorLogEntry[]> {
    if (!db) return [];
    const q = query(collection(db, 'error_logs'), orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as ErrorLogEntry));
  },

  async logErrorAudit(entry: ErrorLogEntry) {
    if (!db) return;
    const logRef = doc(db, 'error_logs', entry.id);
    setDoc(logRef, sanitizeForFirestore(entry)).catch(() => {});
  },

  async updateErrorStatus(id: string, status: ErrorLogStatus, adminComment?: string) {
    if (!db) return;
    updateDoc(doc(db, 'error_logs', id), { status, adminComment }).catch(() => {});
  },

  handlePermissionError(path: string | DocumentReference, operation: string, error: any, data?: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      const p = typeof path === 'string' ? path : path.path;
      const permissionError = new FirestorePermissionError({ path: p, operation: operation as any, requestResourceData: data });
      errorEmitter.emit('permission-error', permissionError);
      monitoring.trackError(permissionError, { action: operation, module: 'Firestore' }, 'CRITICAL');
    }
  }
};
