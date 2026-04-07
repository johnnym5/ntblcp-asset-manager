/**
 * @fileOverview Hardened Firestore Service with RBAC Scope Enforcement.
 * Phase 10: Location-Aware Data Filtering & Audit Pulses.
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
import { isWithinScope } from '@/core/auth/rbac';
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

  async getProjectAssets(grantId: string, stateScopes?: string[]): Promise<Asset[]> {
    if (!db) return [];
    const assetsRef = collection(db, 'assets');
    
    let q;
    const hasStates = stateScopes && stateScopes.length > 0 && !stateScopes.includes('All');

    // Deterministic RBAC Query: We use 'location' as the primary filter for legacy data resilience
    if (grantId === 'ALL_PROJECTS') {
      q = hasStates 
        ? query(assetsRef, where('location', 'in', stateScopes))
        : query(assetsRef, orderBy('location'));
    } else {
      q = hasStates
        ? query(assetsRef, where('grantId', '==', grantId), where('location', 'in', stateScopes))
        : query(assetsRef, where('grantId', '==', grantId));
    }

    try {
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Asset));
    } catch (err: any) {
      this.handlePermissionError(assetsRef.path, 'list', err);
      throw err;
    }
  },

  async saveAsset(asset: Asset, operation: QueueOperation = 'UPDATE', userProfile?: any): Promise<void> {
    if (!db) return;

    // RBAC Scope Pulse
    if (userProfile && !isWithinScope(userProfile, asset)) {
      await this.logActivity({
        assetId: asset.id,
        assetDescription: asset.description,
        operation: 'ACCESS_DENIED',
        performedBy: userProfile.displayName,
        userState: userProfile.state,
        details: `Unauthorized write attempt outside scope: ${asset.location}`
      });
      throw new Error("ACCESS_DENIED: Record outside authorized regional scope.");
    }

    const assetRef = doc(db, 'assets', asset.id);
    const validation = AssetSchema.safeParse(asset);
    if (!validation.success) return;

    const sanitized = sanitizeForFirestore(validation.data);
    try {
      await setDoc(assetRef, sanitized, { merge: true });
      mirrorToRtdb([sanitized as Asset]).catch(() => {});
      
      await this.logActivity({
        assetId: asset.id,
        assetDescription: asset.description,
        operation,
        performedBy: asset.lastModifiedBy,
        userState: asset.lastModifiedByState || 'Unknown',
        roleContext: userProfile?.role
      });
    } catch (err: any) {
      this.handlePermissionError(assetRef, 'update', err, sanitized);
      throw err;
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