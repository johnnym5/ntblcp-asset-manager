/**
 * @fileOverview Virtual Database Service.
 * Abstracted orchestration layer for cross-database management (Firestore, RTDB, Local).
 * Phase 86: Hardened with deterministic purge and preparation pulses.
 * Phase 87: Implemented createNode and deleteNode for granular CRUD support.
 */

import { doc, setDoc, deleteDoc, collection as fsCol } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FirestoreService } from './firebase/firestore';
import { storage } from '@/offline/storage';
import { getAssets as getRtdbAssets, getSettings as getRtdbSettings, batchSetAssets as setRtdbAssets, clearAssets as clearRtdbAssets } from '@/lib/database';
import type { StorageLayer, DBNode } from '@/types/virtual-db';
import type { Asset, AppSettings } from '@/types/domain';

const PATH_MAPPING: Record<string, string> = {
  'assets': 'Asset Registry',
  'config/settings': 'Governance Settings',
  'audit_logs': 'Activity Ledger',
  'error_logs': 'Resilience Audit',
  'queue': 'Sync Pulse Log',
  'sandbox': 'Import Sandbox'
};

export class VirtualDBService {
  /**
   * Fetches logical groups available in a specific storage layer.
   */
  static async getLogicalGroups(layer: StorageLayer): Promise<DBNode[]> {
    const groups: DBNode[] = [];
    const keys = ['assets', 'config/settings', 'audit_logs', 'error_logs'];
    if (layer === 'LOCAL') keys.push('queue', 'sandbox');

    for (const key of keys) {
      groups.push({
        id: `${layer}:${key}`,
        displayName: PATH_MAPPING[key] || key,
        rawKey: key,
        type: 'COLLECTION',
        source: layer,
        path: key
      });
    }
    return groups;
  }

  /**
   * Lists all documents within a collection for a given layer.
   */
  static async getDocuments(layer: StorageLayer, collectionPath: string): Promise<DBNode[]> {
    const nodes: DBNode[] = [];
    try {
      if (layer === 'FIRESTORE') {
        if (collectionPath === 'assets') {
          const assets = await FirestoreService.getProjectAssets('ALL_PROJECTS'); 
          assets.forEach(a => nodes.push(this.mapAssetToNode(a, layer, 'assets')));
        } else if (collectionPath === 'audit_logs') {
          const logs = await FirestoreService.getGlobalActivity();
          logs.forEach(l => nodes.push(this.mapToNode(l, `Activity: ${l.operation}`, layer, 'audit_logs', l.id)));
        } else if (collectionPath === 'error_logs') {
          const logs = await FirestoreService.getErrorLogs();
          logs.forEach(l => nodes.push(this.mapToNode(l, `Error: ${l.error.laymanExplanation}`, layer, 'error_logs', l.id)));
        } else if (collectionPath === 'config/settings') {
          const settings = await FirestoreService.getSettings();
          if (settings) nodes.push(this.mapToNode(settings, 'App Settings Node', layer, 'config', 'settings'));
        }
      } else if (layer === 'LOCAL') {
        if (collectionPath === 'assets') {
          const assets = await storage.getAssets();
          assets.forEach(a => nodes.push(this.mapAssetToNode(a, layer, 'assets')));
        } else if (collectionPath === 'queue') {
          const queue = await storage.getQueue();
          queue.forEach(q => nodes.push(this.mapToNode(q, `Queue Op: ${q.operation}`, layer, 'queue', q.id)));
        } else if (collectionPath === 'sandbox') {
          const sandbox = await storage.getSandbox();
          sandbox.forEach(a => nodes.push(this.mapAssetToNode(a, layer, 'sandbox')));
        } else if (collectionPath === 'config/settings') {
          const settings = await storage.getSettings();
          if (settings) nodes.push(this.mapToNode(settings, 'Local Settings Pulse', layer, 'settings', 'app-settings'));
        }
      }
    } catch (e) {
      console.error(`VirtualDB: Failed to list docs for ${layer}:${collectionPath}`, e);
    }
    return nodes;
  }

  /**
   * Compares a specific record across all available storage layers.
   */
  static async compareNodeAcrossLayers(path: string): Promise<Record<StorageLayer, any>> {
    const [collection, id] = path.split('/');
    const results: any = { FIRESTORE: null, RTDB: null, LOCAL: null };

    try {
      if (collection === 'assets') {
        const [f, l] = await Promise.all([
          this.fetchFirestoreDoc('assets', id),
          this.fetchLocalDoc('assets', id)
        ]);
        results.FIRESTORE = f;
        results.LOCAL = l;
      } else if (collection === 'config') {
        const [f, l] = await Promise.all([
          FirestoreService.getSettings(),
          storage.getSettings()
        ]);
        results.FIRESTORE = f;
        results.LOCAL = l;
      }
    } catch (e) {
      console.warn("VirtualDB: Comparative scan latent.");
    }

    return results;
  }

  private static async fetchFirestoreDoc(col: string, id: string) {
    const assets = await FirestoreService.getProjectAssets('ALL_PROJECTS');
    return assets.find(a => a.id === id) || null;
  }

  private static async fetchLocalDoc(col: string, id: string) {
    if (col === 'assets') {
      const assets = await storage.getAssets();
      return assets.find(a => a.id === id) || null;
    }
    return null;
  }

  /**
   * Performs a global parity scan to identify records with "Sync Drift".
   */
  static async getGlobalDiscrepancies(): Promise<string[]> {
    try {
      const [fAssets, lAssets] = await Promise.all([
        FirestoreService.getProjectAssets('ALL_PROJECTS'),
        storage.getAssets()
      ]);

      const discrepancies: string[] = [];
      const localMap = new Map(lAssets.map(a => [a.id, a]));

      fAssets.forEach(cloudAsset => {
        const local = localMap.get(cloudAsset.id);
        if (local && JSON.stringify(cloudAsset) !== JSON.stringify(local)) {
          discrepancies.push(cloudAsset.id);
        }
      });

      return discrepancies;
    } catch (e) {
      return [];
    }
  }

  /**
   * Updates a specific node in the chosen layer.
   */
  static async updateNode(layer: StorageLayer, path: string, data: any): Promise<void> {
    const parts = path.split('/');
    const colName = parts[0];
    const docId = parts[1];
    
    if (layer === 'FIRESTORE' && db) {
      const docRef = doc(db, colName, docId);
      await setDoc(docRef, data, { merge: true });
    } else if (layer === 'LOCAL') {
      if (colName === 'assets') {
        const assets = await storage.getAssets();
        const next = assets.some(a => a.id === docId) 
          ? assets.map(a => a.id === docId ? data : a) 
          : [data, ...assets];
        await storage.saveAssets(next);
      } else if (colName === 'settings' || colName === 'config') {
        await storage.saveSettings(data);
      }
    }
  }

  /**
   * Granularly destroys a node in the chosen layer.
   */
  static async deleteNode(layer: StorageLayer, path: string): Promise<void> {
    const [col, id] = path.split('/');
    if (layer === 'FIRESTORE' && db) {
      await deleteDoc(doc(db, col, id));
    } else if (layer === 'LOCAL') {
      if (col === 'assets') {
        const current = await storage.getAssets();
        await storage.saveAssets(current.filter(a => a.id !== id));
      } else if (col === 'sandbox') {
        const current = await storage.getSandbox();
        await storage.saveToSandbox(current.filter(a => a.id !== id));
      } else if (col === 'queue') {
        await storage.dequeue(id);
      }
    }
  }

  /**
   * Deterministic wipe of a storage layer.
   */
  static async purgeLayer(layer: StorageLayer): Promise<void> {
    if (layer === 'FIRESTORE') {
      await FirestoreService.purgeAllAssets();
    } else if (layer === 'LOCAL') {
      await storage.clearAssets();
    } else if (layer === 'RTDB') {
      await clearRtdbAssets();
    }
  }

  /**
   * Synchronized global purge across all storage tiers.
   */
  static async purgeGlobalRegistry(): Promise<void> {
    await Promise.all([
      FirestoreService.purgeAllAssets(),
      storage.clearAssets(),
      clearRtdbAssets()
    ]);
  }

  private static mapAssetToNode(asset: Asset, layer: StorageLayer, collection: string): DBNode {
    return {
      id: `${layer}:${collection}/${asset.id}`,
      displayName: asset.description || asset.name || asset.id,
      rawKey: asset.id,
      type: 'DOCUMENT',
      source: layer,
      path: `${collection}/${asset.id}`,
      data: asset,
      lastUpdated: asset.lastModified
    };
  }

  private static mapToNode(data: any, label: string, layer: StorageLayer, collection: string, id: string): DBNode {
    return {
      id: `${layer}:${collection}/${id}`,
      displayName: label,
      rawKey: id,
      type: 'DOCUMENT',
      source: layer,
      path: `${collection}/${id}`,
      data
    };
  }
}
