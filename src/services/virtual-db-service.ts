/**
 * @fileOverview Virtual Database Service.
 * Abstracted orchestration layer for cross-database management (Firestore, RTDB, Local).
 * Phase 47: Refined document listing and hardened global discrepancy pulse.
 */

import { FirestoreService } from './firebase/firestore';
import { storage } from '@/offline/storage';
import { getAssets as getRtdbAssets, getSettings as getRtdbSettings, batchSetAssets as setRtdbAssets, clearAssets as clearRtdbAssets } from '@/lib/database';
import type { StorageLayer, DBNode } from '@/types/virtual-db';
import type { Asset, AppSettings } from '@/types/domain';

const PATH_MAPPING: Record<string, string> = {
  'assets': 'Asset Registry',
  'config/settings': 'Governance Settings',
  'activity_log': 'Activity Ledger',
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
    const keys = ['assets', 'config/settings', 'activity_log', 'error_logs'];
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
        } else if (collectionPath === 'config/settings') {
          const settings = await FirestoreService.getSettings();
          if (settings) nodes.push(this.mapToNode(settings, 'Production Settings Pulse', layer, 'config/settings', 'settings'));
        } else if (collectionPath === 'activity_log') {
          const logs = await FirestoreService.getGlobalActivity();
          logs.forEach(l => nodes.push(this.mapToNode(l, `Activity: ${l.operation}`, layer, 'activity_log', l.id)));
        } else if (collectionPath === 'error_logs') {
          const logs = await FirestoreService.getErrorLogs();
          logs.forEach(l => nodes.push(this.mapToNode(l, `Incident: ${l.severity}`, layer, 'error_logs', l.id)));
        }
      } else if (layer === 'RTDB') {
        if (collectionPath === 'assets') {
          const assets = await getRtdbAssets('ALL_PROJECTS');
          assets.forEach(a => nodes.push(this.mapAssetToNode(a, layer, 'assets')));
        } else if (collectionPath === 'config/settings') {
          const settings = await getRtdbSettings();
          if (settings) nodes.push(this.mapToNode(settings, 'Shadow Mirror Settings', layer, 'config/settings', 'settings'));
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
          if (settings) nodes.push(this.mapToNode(settings, 'Local Settings Pulse', layer, 'config/settings', 'settings'));
        }
      }
    } catch (e) {
      console.error(`VirtualDB: Failed to list docs for ${layer}:${collectionPath}`, e);
    }
    return nodes;
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
   * Performs a side-by-side comparison of a node across all layers.
   */
  static async compareNodeAcrossLayers(path: string): Promise<Record<StorageLayer, any>> {
    const results: Record<StorageLayer, any> = { 'FIRESTORE': null, 'RTDB': null, 'LOCAL': null };
    const [collection, id] = path.split('/');

    try {
      const [fData, rData, lData] = await Promise.all([
        collection === 'assets' 
          ? FirestoreService.getProjectAssets('ALL_PROJECTS').then(list => list.find(a => a.id === id)) 
          : (collection === 'config' ? FirestoreService.getSettings() : null),
        collection === 'assets' 
          ? getRtdbAssets('ALL_PROJECTS').then(list => list.find(a => a.id === id)) 
          : (collection === 'config' ? getRtdbSettings() : null),
        collection === 'assets' 
          ? storage.getAssets().then(list => list.find(a => a.id === id)) 
          : (collection === 'config' ? storage.getSettings() : null),
      ]);
      results.FIRESTORE = fData || null;
      results.RTDB = rData || null;
      results.LOCAL = lData || null;
    } catch (e) {
      console.error("VirtualDB: Parity scan failed", e);
    }
    return results;
  }

  /**
   * Performs a deterministic wipe of a specific storage layer.
   * High-risk administrative pulse.
   */
  static async purgeLayer(layer: StorageLayer): Promise<void> {
    if (layer === 'FIRESTORE') {
      const assets = await FirestoreService.getProjectAssets('ALL_PROJECTS');
      for (const a of assets) {
        await FirestoreService.deleteAsset(a.id);
      }
    } else if (layer === 'RTDB') {
      await clearRtdbAssets();
    } else if (layer === 'LOCAL') {
      await storage.clearAssets();
      await storage.clearSandbox();
    }

    await FirestoreService.logActivity({
      assetId: 'SYSTEM',
      assetDescription: `Infrastructure Wipe: ${layer}`,
      operation: 'DELETE',
      performedBy: 'Super Administrator',
      userState: 'ROOT'
    });
  }

  /**
   * Updates a specific node in the chosen layer.
   */
  static async updateNode(layer: StorageLayer, path: string, data: any): Promise<void> {
    const [collection] = path.split('/');
    if (layer === 'FIRESTORE') {
      if (collection === 'assets') await FirestoreService.saveAsset(data, 'UPDATE');
      else if (collection === 'config') await FirestoreService.updateSettings(data);
    } else if (layer === 'RTDB') {
      if (collection === 'assets') await setRtdbAssets([data]);
      else if (collection === 'config') await setRtdbAssets([data]); // Assuming similar mapping
    } else if (layer === 'LOCAL') {
      if (collection === 'assets' || collection === 'sandbox') {
        const assets = await storage.getAssets();
        await storage.saveAssets(assets.map(a => a.id === data.id ? data : a));
      } else if (collection === 'config' || collection === 'settings') {
        await storage.saveSettings(data);
      }
    }
  }

  /**
   * Restores a record to its previous state buffer.
   */
  static async restoreNode(layer: StorageLayer, path: string): Promise<void> {
    const layers = await this.compareNodeAcrossLayers(path);
    const data = layers[layer];
    if (data?.previousState) {
      const restored = { ...data.previousState, lastModified: new Date().toISOString() };
      await this.updateNode(layer, path, restored);
    }
  }

  static async syncNode(path: string, fromLayer: StorageLayer, toLayer: StorageLayer): Promise<void> {
    const layers = await this.compareNodeAcrossLayers(path);
    const data = layers[fromLayer];
    if (!data) throw new Error(`Source layer [${fromLayer}] is empty at path [${path}]`);
    await this.updateNode(toLayer, path, data);
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
