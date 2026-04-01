/**
 * @fileOverview Virtual Database Service.
 * Abstracted orchestration layer for cross-database management (Firestore, RTDB, Local).
 * Phase 80: Enhanced with conflict detection and automated resolution pulses.
 */

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
        }
      } else if (layer === 'LOCAL') {
        if (collectionPath === 'assets') {
          const assets = await storage.getAssets();
          assets.forEach(a => nodes.push(this.mapAssetToNode(a, layer, 'assets')));
        } else if (collectionPath === 'queue') {
          const queue = await storage.getQueue();
          queue.forEach(q => nodes.push(this.mapToNode(q, `Queue Op: ${q.operation}`, layer, 'queue', q.id)));
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
   * Deterministic resolution of a conflict.
   */
  static async resolveConflict(path: string, resolution: any): Promise<void> {
    await Promise.all([
      this.updateNode('FIRESTORE', path, resolution),
      this.updateNode('LOCAL', path, resolution),
    ]);

    await FirestoreService.logActivity({
      assetId: path.split('/').pop() || 'UNKNOWN',
      assetDescription: `Conflict Resolved: ${path}`,
      operation: 'UPDATE',
      performedBy: 'Super Administrator',
      userState: 'RESOLUTION_WIZARD'
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
    } else if (layer === 'LOCAL') {
      if (collection === 'assets') {
        const assets = await storage.getAssets();
        const next = assets.some(a => a.id === data.id) 
          ? assets.map(a => a.id === data.id ? data : a) 
          : [data, ...assets];
        await storage.saveAssets(next);
      } else if (collection === 'config') {
        await storage.saveSettings(data);
      }
    }
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