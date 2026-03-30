/**
 * @fileOverview Virtual Database Service.
 * Abstracted orchestration layer for cross-database management (Firestore, RTDB, Local).
 */

import { FirestoreService } from './firebase/firestore';
import { storage } from '@/offline/storage';
import { getAssets as getRtdbAssets, getSettings as getRtdbSettings, batchSetAssets as setRtdbAssets } from '@/lib/database';
import type { StorageLayer, DBNode } from '@/types/virtual-db';
import type { Asset, AppSettings } from '@/types/domain';

// Logical mapping for Friendly Names
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
    
    // Core collections known to the app
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
          // Fetch from primary cloud
          const assets = await FirestoreService.getProjectAssets('ALL_PROJECTS'); 
          assets.forEach(a => nodes.push(this.mapAssetToNode(a, layer, 'assets')));
        } else if (collectionPath === 'config/settings') {
          const settings = await FirestoreService.getSettings();
          if (settings) nodes.push(this.mapToNode(settings, 'Governance Settings', layer, 'config/settings', 'settings'));
        }
      } else if (layer === 'RTDB') {
        if (collectionPath === 'assets') {
          const assets = await getRtdbAssets('ALL_PROJECTS');
          assets.forEach(a => nodes.push(this.mapAssetToNode(a, layer, 'assets')));
        }
      } else if (layer === 'LOCAL') {
        if (collectionPath === 'assets') {
          const assets = await storage.getAssets();
          assets.forEach(a => nodes.push(this.mapAssetToNode(a, layer, 'assets')));
        } else if (collectionPath === 'queue') {
          const queue = await storage.getQueue();
          queue.forEach(q => nodes.push(this.mapToNode(q, `Sync Operation: ${q.operation}`, layer, 'queue', q.id)));
        } else if (collectionPath === 'sandbox') {
          const sandbox = await storage.getSandbox();
          sandbox.forEach(a => nodes.push(this.mapAssetToNode(a, layer, 'sandbox')));
        }
      }
    } catch (e) {
      console.error(`VirtualDB: Failed to list docs for ${layer}:${collectionPath}`, e);
    }

    return nodes;
  }

  /**
   * Performs a side-by-side comparison of a node across all layers.
   */
  static async compareNodeAcrossLayers(path: string): Promise<Record<StorageLayer, any>> {
    const results: Record<StorageLayer, any> = {
      'FIRESTORE': null,
      'RTDB': null,
      'LOCAL': null
    };

    const [collection, id] = path.split('/');

    try {
      // Parallel fetch across the stack
      const [fData, rData, lData] = await Promise.all([
        collection === 'assets' ? FirestoreService.getProjectAssets('ALL_PROJECTS').then(list => list.find(a => a.id === id)) : null,
        collection === 'assets' ? getRtdbAssets('ALL_PROJECTS').then(list => list.find(a => a.id === id)) : null,
        collection === 'assets' ? storage.getAssets().then(list => list.find(a => a.id === id)) : null,
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
   * Updates a specific node in the chosen layer.
   */
  static async updateNode(layer: StorageLayer, path: string, data: any): Promise<void> {
    const [collection] = path.split('/');
    
    if (layer === 'FIRESTORE') {
      if (collection === 'assets') await FirestoreService.saveAsset(data);
      else if (collection === 'config') await FirestoreService.updateSettings(data);
    } else if (layer === 'RTDB') {
      if (collection === 'assets') await setRtdbAssets([data]);
    } else if (layer === 'LOCAL') {
      if (collection === 'assets') {
        const assets = await storage.getAssets();
        await storage.saveAssets(assets.map(a => a.id === data.id ? data : a));
      } else if (collection === 'settings') {
        await storage.saveSettings(data);
      }
    }
  }

  /**
   * Forces a node from one layer to overwrite another (Deterministic Sync).
   */
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
